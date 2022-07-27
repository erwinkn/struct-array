import { bool, float32, float64, i16, i32, i64, i8, u16, u32, u64, u8 } from "./numeric";
import { Properties, SchemaOf, Struct, StructArray, structArray } from "./structArray";
import { run, bench, group, baseline } from "mitata";

const N = 300_000;
const StructArray = structArray({
	a: i32,
	b: i32,
	c: i32,
	d: i32,
});

type Schema = SchemaOf<typeof StructArray>;
let structs: StructArray<Schema>;
let array: Array<Struct<Schema>>;

function createStructArray() {
	structs = new StructArray(N);
	for (let i = 0; i < N; i++) {
		structs.push({
			a: i,
			b: i + 1,
			c: i + 2,
			d: i + 3,
		});
	}
}

function createStructArrayWithSet() {
	structs = new StructArray(N);
	for (let i = 0; i < N; i++) {
		structs.set(i, {
			a: i,
			b: i + 1,
			c: i + 2,
			d: i + 3,
		});
	}
}

function createArray() {
	array = [];
	for (let i = 0; i < N; i++) {
		array.push({
			a: i,
			b: i + 1,
			c: i + 2,
			d: i + 3,
		});
	}
}

function readStructArray() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = structs.get(i);
		total += o.b - o.a + o.d - o.c;
	}
	return total;
}

function readArray() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = array[i];
		total += o.b - o.a + o.d - o.c;
	}
	return total;
}

function readStructArray1() {
	let total = 0;
	structs.move(0);
	for (let i = 0; i < N; i++) {
		total += structs.a;
		structs.move(i);
	}
	return total;
}

function readArray1() {
	let total = 0;
	for (let i = 0; i < N; i++) {
		const o = array[i];
		total += o.a;
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
	const s = { a: i, b: true, c: i - 1, d:3, e: 4 };
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
		swapArray[i+1] = o;
	}
}

group("Array creation", () => {
	bench("Array", createArray), bench("StructArray", createStructArray), bench("StructArray with set", createStructArrayWithSet);
});

group("Array read (full)", () => {
	bench("StructArray", readStructArray), bench("Array", readArray);
});

group("Array read (1 property)", () => {
	bench("StructArray", readStructArray1), bench("Array", readArray1);
});

group(`Swap ${M} structs of size ${swapStructs.structSize}`, () => {
	bench(`StructArray`, benchSwapStructs);
	bench(`Array`, benchSwapArray);
});

await run();
