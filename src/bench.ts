import { Bool, bool, float32, i16, I32, i32, u32 } from "./numeric";
import { SchemaOf, Struct, StructArray, structArray, StructArrayConstructor } from "./structArray";
import { run, bench, group } from "mitata";

const N = 300_000;
let StructArray: StructArrayConstructor<{
	a: I32;
	b: Bool;
	c: I32;
	d: I32;
}>;

class Foo {
	constructor(
		public a: number,
		public b: boolean,
		public c: number,
		public d: number
	) {}
}

// Just a check, to verify that Foo has the expected shape
const _: Struct<Schema> = new Foo(1, true, 1, 1);

type Schema = SchemaOf<typeof StructArray>;

function compilation() {
	StructArray = structArray({
		a: i32,
		b: bool,
		c: i32,
		d: i32,
	});
}

let structs: StructArray<Schema>;
let array: Array<Foo>;

function createStructArrayWithPush() {
	structs = new StructArray();
	for (let i = 0; i < N; i++) {
		structs.push({
			a: i,
			b: true,
			c: i + 2,
			d: i + 3,
		});
	}
}

function createArrayWithPush() {
	array = [];
	for (let i = 0; i < N; i++) {
		const foo = new Foo(i, true, i+2, i+3)
		array.push(foo);
	}
}

function createStructArrayWithSet() {
	structs = new StructArray(N);
	for (let i = 0; i < N; i++) {
		structs.set(i, {
			a: i,
			b: true,
			c: i + 2,
			d: i + 3,
		});
	}
}

function createArrayWithSet() {
	array = new Array(N);
	for (let i = 0; i < N; i++) {
		const foo = new Foo(i, true, i+2, i+3)
		array[i] = foo;
	}
}

function readStructProperties() {
	let total = 0;
	structs.move(0);
	for (let i = 0; i < N; i++) {
		total += - structs.a + structs.d - structs.c;
		structs.next();
	}
	return total;
}

function readStructObject() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = structs.get(i);
		total += - o.a + o.d - o.c;
	}
	return total;
}

function readArray() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = array[i];
		total += - o.a + o.d - o.c;
	}
	return total;
}

function readStruct1Property() {
	let total = 0;
	structs.move(0);
	for (let i = 0; i < N; i++) {
		total += structs.c;
		structs.next();
	}
	return total;
}

function readStructObject1Property() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = structs.get(i);
		total += o.c;
	}
	return total;
}

function readArray1Property() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = array[i];
		total += o.c;
	}
	return total;
}

const M = 300_000;
const SwapArray = structArray({
	a: i16,
	b: bool,
	c: float32,
	d: u32,
	e: u32,
});

const swapStructs = new SwapArray();
const swapArray: Array<Struct<SchemaOf<typeof SwapArray>>> = [];
for (let i = 0; i < M; i++) {
	const s = { a: i, b: true, c: i - 1, d: 3, e: 4 };
	swapStructs.push(s);
	swapArray.push(s);
}

function benchSwapStructs() {
	for (let i = 0; i < M - 1; i++) {
		swapStructs.swap(i, i + 1);
	}
}
function benchSwapArray() {
	for (let i = 0; i < M - 1; i++) {
		const o = swapArray[i];
		swapArray[i] = swapArray[i + 1];
		swapArray[i + 1] = o;
	}
}

bench("Compilation time", compilation);

group("Array creation", () => {
	bench("Array w/ push", createArrayWithPush);
	bench("Array w/ set", createArrayWithSet);
	bench("StructArray w/ push", createStructArrayWithPush);
	bench("StructArray w/ set", createStructArrayWithSet);
});

group("Array read (all 4 properties)", () => {
	bench("StructArray w/ get", readStructObject);
	bench("StructArray w/ property accessors", readStructProperties);
	bench("Array", readArray);
});

group("Array read (1 property out of 4)", () => {
	bench("StructArray w/ get", readStructObject1Property);
	bench("StructArray w/ property accessors", readStruct1Property);
	bench("Array", readArray1Property);
});

group(`Swap ${M} structs of size ${swapStructs.structSize}`, () => {
	bench(`StructArray`, benchSwapStructs);
	bench(`Array`, benchSwapArray);
});

await run({
	avg: true,
	collect: true,
	min_max: true,
	percentiles: true,
});
