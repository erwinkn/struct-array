import { JSValue, PropertyValues } from "./numeric";

export type Schema = Record<string | number, PropertyValues>;

export type Struct<S extends Schema> = {
	[K in keyof S]: JSValue<S[K]>;
};

export type StructArray<S extends Schema> = {
	length: number;
	readonly structSize: number;
	move(index: number): void;
	next(): void;
	get(index: number): Struct<S>;
	set(index: number, value: Struct<S>): void;
	swap(left: number, right: number): void;
	pop(): void;
	popValue(): Struct<S>;
	push(struct: Struct<S>): void;
	grow(capacity: number): void;
} & Struct<S>;

export type SchemaOf<T> = T extends Struct<infer S>
	? S
	: T extends StructArray<infer S>
	? S
	: T extends StructArrayConstructor<infer S>
	? S
	: never;

export type ItemOf<T> = Struct<SchemaOf<T>>;

export type Properties<S extends Schema> = S[keyof S];

export interface StructArrayConstructor<S extends Schema> {
	new (): StructArray<S>;
	new (length: number): StructArray<S>;
}

// Internal names are short because we have to do minification by hand in raw JS strings
type InternalStructArray<S extends Schema> = StructArray<S> & {
	// Prototype properties
	structSize: number;
	$s: S;
	$c: number;
	// Instance properties
	$v: DataView;
	$o: number;
};

function dataViewType(val: Exclude<PropertyValues, Boolean>) {
	const base = val.type === "f" ? "Float" : val.type === "u" ? "Uint" : "Int";
	const big = val.size > 4 ? "Big" : "";
	const bits = val.size * 8;
	return big + base + bits;
}

// TODO: Add bitflags and packing
// TODO: Add option to disable packing
// TODO: Add support for arbitrary string in property names
//       -> will increase bundle size and decrease perf for those properties, so maybe just don't do it

// Note: I apologize about the lack of spaces in the raw JS strings, this is for bundle size
// Minified names for internal variables:
// - `o` or `$o` = offset
// - `c` or `$c` = capacity
// - `$s` = schema
// - `$v` = view = DataView
// - `x` = argument to the function
export function structArray<S extends Schema>(
	schema: S
): StructArrayConstructor<S> {
	let bytesUsed = 0;
	const prototype = {} as any;
	let getProperties = "";
	let setProperties = "";
	for (const key of Object.keys(schema)) {
		const val = schema[key];
		// Use 1 byte for booleans (for now)
		if (val.type === "b") {
			setProperties += `this.$v.setUint8(o+${bytesUsed},x.${key});`;
			getProperties += `${key}:!!v.getUint8(o+${bytesUsed}),`;
			Object.defineProperty(prototype, key, {
				enumerable: true,
				get: new Function(
					`return !!this.$v.getUint8(this.$o+${bytesUsed})`
				) as any,
				set: new Function(
					"x",
					`this.$v.setUint8(this.$o+${bytesUsed},x)`
				) as any,
			});
			bytesUsed += 1;
		} else if (val.type === "u" || val.type === "i" || val.type === "f") {
			setProperties += `this.$v.set${dataViewType(
				val
			)}(o+${bytesUsed}, x.${key});`;
			getProperties += `${key}:v.get${dataViewType(val)}(o+${bytesUsed}),`;
			Object.defineProperty(prototype, key, {
				enumerable: true,
				get: new Function(
					`return this.$v.get${dataViewType(val)}(this.$o+${bytesUsed})`
				) as any,
				set: new Function(
					"x",
					`this.$v.set${dataViewType(val)}(this.$o+${bytesUsed},x)`
				) as any,
			});
			bytesUsed += val.size;
		}
		// } else {
		// 	throw new Error("Unsupported data type: " + val.type);
		// }
	}
	// --- Internal stuff ---
	// Properties
	prototype.$s = schema;
	// [grow]
	prototype.grow = function (this: InternalStructArray<S>, capacity: number) {
		// if (this.length > capacity) {
		// 	throw new Error(`Cannot shrink capacity below length`);
		// }
		const bytes = new Uint8Array(this.$v.buffer);
		const resizedBytes = new Uint8Array(capacity * this.structSize);
		resizedBytes.set(bytes);
		this.$v = new DataView(resizedBytes.buffer);
		// We could compute the capacity every time it is read with an accessor function,
		// (capacity = this.$v.buffer.byteLength / this.structSize)
		// but we only change the capacity in one place and writing it explicitly makes it faster.
		this.$c = capacity;
	};

	// --- Public stuff ---

	// Properties
	prototype.structSize = bytesUsed;
	// [move]
	prototype.move = function (this: InternalStructArray<S>, index: number) {
		this.$o = index * this.structSize;
	};
	// [next]
	prototype.next = function (this: InternalStructArray<S>) {
		this.$o += this.structSize;
	};
	// [get]
	prototype.get = new Function(
		"i",
		`var o=i*this.structSize;var v=this.$v;return {${getProperties}}`
	);
	// [set]
	prototype.set = new Function(
		"i",
		"x",
		`var o=i*this.structSize;${setProperties}`
	);
	// [push]
	prototype.push = new Function(
		"x",
		`var l=this.length;if(l === this.$c)this.grow(2*l);var o=l*this.structSize;${setProperties}this.length++`
	);
	// [swap]
	// About 10-50x faster than creating buffer slices and swapping the raw bytes.
	// Using slices gets more interesting as struct sizes grow, but unless you have gigantic structs,
	// this is faster.
	// Bonus: easier to understand.
	prototype.swap = function (
		this: InternalStructArray<S>,
		left: number,
		right: number
	) {
		const r = this.get(right);
		this.set(right, this.get(left));
		this.set(left, r);
	};
	// [pop]
	prototype.pop = function (this: InternalStructArray<S>) {
		this.length -= 1;
	};
	// [popValue]
	prototype.popValue = function (this: InternalStructArray<S>): Struct<S> {
		this.length -= 1;
		// Technically the data is still there
		return this.get(this.length);
	};

	// --- Constructor ---
	// `c` is the capacity in this function (minified name)
	// the `c=c||12` sets the capacity to 12, if not explicitly provided
	const constructor = new Function(
		"c",
		`c=c||12;this.$o=0;this.length=0;this.$c=c;this.$v=new DataView(new ArrayBuffer(c*${bytesUsed}))`
	);
	constructor.prototype = prototype;
	return constructor as any;
}
