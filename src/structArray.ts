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
	insert(index: number, value: Struct<S>): void;
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

export type Properties<S extends Schema> = S[keyof S];

export interface StructArrayConstructor<S extends Schema> {
	new (): StructArray<S>;
	new (length: number): StructArray<S>;
}

type InternalStructArray<S extends Schema> = StructArray<S> & {
	// Prototype properties
	structSize: number;
	$$schema: S;
	$$capacity: number;
	// Instance properties
	$$view: DataView;
	$$offset: number;
};

function dataViewType(val: Exclude<PropertyValues, Boolean>) {
	const base = val.type === "float" ? "Float" : val.type === "unsigned" ? "Uint" : "Int";
	const big = val.size > 4 ? "Big" : "";
	const bits = val.size * 8;
	return big + base + bits;
}

// TODO: Add option to disable packing
// TODO: Extract as many text constants as possible to ensure easy changes
// TODO: Optimize property access in `set` method by checking if we can use `.` access beforehand
// -> Actually just add support for arbitrary string in property names
export function structArray<S extends Schema>(schema: S): StructArrayConstructor<S> {
	let bytesUsed = 0;
	const prototype = {} as any;
	let getProperties = "";
	let setProperties = "";
	for (const key of Object.keys(schema)) {
		const val = schema[key];
		// Use 1 byte for booleans (for now)
		if (val.type === "boolean") {
			setProperties += `this.$$view.setUint8(offset + ${bytesUsed}, value.${key});`;
			getProperties += `${key}:!!this.$$view.getUint8(offset + ${bytesUsed}),`;
			Object.defineProperty(prototype, key, {
				enumerable: true,
				get: new Function(`return !!this.$$view.getUint8(this.$$offset + ${bytesUsed});`) as any,
				set: new Function(
					"value",
					`this.$$view.setUint8(this.$$offset + ${bytesUsed}, value);`
				) as any,
			});
			bytesUsed += 1;
		} else if (val.type === "unsigned" || val.type === "signed" || val.type === "float") {
			setProperties += `this.$$view.set${dataViewType(val)}(offset + ${bytesUsed}, value.${key});`;
			getProperties += `${key}:this.$$view.get${dataViewType(val)}(offset + ${bytesUsed}),`;
			Object.defineProperty(prototype, key, {
				enumerable: true,
				get: new Function(
					`return this.$$view.get${dataViewType(val)}(this.$$offset + ${bytesUsed});`
				) as any,
				set: new Function(
					"value",
					`this.$$view.set${dataViewType(val)}(this.$$offset + ${bytesUsed}, value);`
				) as any,
			});
			bytesUsed += val.size;
		} else {
			throw new Error("Unsupported data type");
		}
	}
	// --- Internal stuff ---
	// Properties
	prototype.$$schema = schema;
	// [grow]
	prototype.grow = function (this: InternalStructArray<S>, capacity: number) {
		if (this.length > capacity) {
			throw new Error(`Cannot shrink capacity to ${capacity} when length is ${this.length}`);
		}
		const bytes = new Uint8Array(this.$$view.buffer);
		const resizedBytes = new Uint8Array(capacity * this.structSize);
		resizedBytes.set(bytes);
		this.$$view = new DataView(resizedBytes.buffer);
		// We could compute the capacity every time it is read with an accessor function,
		// (capacity = this.$$view.buffer.byteLength / this.structSize)
		// but we only change the capacity in one place and writing it explicitly makes it faster.
		this.$$capacity = capacity;
	};

	// --- Public stuff ---

	// Properties
	prototype.structSize = bytesUsed;
	// [move]
	prototype.move = function (this: InternalStructArray<S>, index: number) {
		this.$$offset = index * this.structSize;
	};
	// [next]
	prototype.next = function (this: InternalStructArray<S>) {
		this.$$offset += this.structSize;
	};
	// [get]
	prototype.get = new Function("index", 
		`const offset = index * this.structSize; return {${getProperties}};`
	);
	// [set]
	prototype.set = new Function(
		"index",
		"value",
		`const offset = index * this.structSize; ${setProperties}`
	);
	// [push]
	prototype.push = new Function(
		"value",
		`if(this.length === this.$$capacity) {
			this.grow(2 * this.length);
		 }
		 const offset = this.length * this.structSize;
		 ${setProperties}
		 this.length += 1;
		`
	);
	// [swap]
	// About 10-50x faster than creating buffer slices and swapping the raw bytes.
	// Using slices gets more interesting as struct sizes grow, but unless you have gigantic structs,
	// this is faster.
	// Bonus: easier to understand.
	prototype.swap = function (this: InternalStructArray<S>, left: number, right: number) {
		const l = this.get(left);
		const r = this.get(right);
		this.set(right, l);
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
	// TODO: add initialization logic
	const constructor = new Function(
		"capacity",
		"capacity = capacity || 12; this.$$offset = 0; this.length = 0; this.$$capacity = capacity;" +
			`this.$$view = new DataView(new ArrayBuffer(capacity * ${bytesUsed}));`
	);
	constructor.prototype = prototype;
	return constructor as any;
}
