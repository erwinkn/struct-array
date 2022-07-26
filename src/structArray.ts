import { bool, JSValue, PropertyValues, u32, u64 } from "./numeric";

export type Schema = Record<string | number, PropertyValues>;

export type Struct<S extends Schema> = {
	[K in keyof S]: JSValue<S[K]>;
};

export type StructArray<S extends Schema> = {
	readonly length: number;
	move(index: number): void;
	set(index: number, value: Struct<S>): void;
	swap(left: number, right: number): void;
	insert(index: number, value: Struct<S>): void;
	pop(): Struct<S>;
	pop(n: number): Array<Struct<S>>;
	push(struct: Struct<S>): void;
	push(structs: Array<Struct<S>>): void;
} & Struct<S>;

export type Properties<S extends Schema> = S[keyof S];

export interface StructArrayConstructor<S extends Schema> {
	new (): StructArray<S>;
	new (length: number): StructArray<S>;
}

type HasBuffer = {
	$view: DataView;
};

type InternalStructArray<S extends Schema> = StructArray<S> & {
	// Prototype properties
	structSize: number;
	$$schema: S;
	$$capacity: number;
	// Instance properties
	$$view: DataView;
	$$offset: number;
	length: number;
	grow(): void;
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
	let setMethod = "const offset = index * this.structSize;";
	for (const key of Object.keys(schema)) {
		const val = schema[key];
		// Use 1 byte for booleans (for now)
		if (val.type === "boolean") {
			setMethod += `this.$$view.setUint8(offset + ${bytesUsed}, value.${key});`;
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
			setMethod += `this.$$view.set${dataViewType(val)}(offset + ${bytesUsed}, value.${key});`;
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
	prototype.structSize = bytesUsed;
	prototype.$$schema = schema;
	prototype.move = function (this: InternalStructArray<S>, index: number) {
		this.$$offset = index * this.structSize;
	};
	prototype.grow = function (this: InternalStructArray<S>) {
		let capacity = Math.min(this.$$capacity * 2, Number.MAX_SAFE_INTEGER);
		if(capacity === 0) {
			capacity = 24;
		}

		const bytes = new Uint8Array(this.$$view.buffer);
		const resizedBytes = new Uint8Array(capacity * this.structSize);
		resizedBytes.set(bytes)
		this.$$view = new DataView(resizedBytes.buffer);
		// We could compute the capacity every time it is read with an accessor function,
		// (capacity = this.$$view.buffer.byteLength / this.structSize)
		// but we only change the capacity in one place and writing it explicitly makes it faster.
		this.$$capacity = capacity;
	};
	prototype.set = new Function("index", "value", setMethod);
	prototype.push = function (this: InternalStructArray<S>, value: Struct<S>) {
		if (this.length === this.$$capacity) {
			this.grow();
		}
		this.set(this.length, value);
		this.length += 1;
	};

	// TODO: add initialization logic
	const constructor = new Function(
		"capacity",
		"capacity = capacity || 0; this.$$offset = 0; this.length = 0; this.$$capacity = capacity;" +
			`this.$$view = new DataView(new ArrayBuffer(capacity * ${bytesUsed}));`
	);
	constructor.prototype = prototype;
	return constructor as any;
}
