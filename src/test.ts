import { bool, float32, float64, i32, i64, i8, u16, u32, u64, u8 } from "./numeric";
import { Properties, Struct, structArray } from "./structArray";

const N = 300_000;
const schema = {
	a: u32,
	b: i32,
	c: i32,
	d: u32
}
const FooArray = structArray(schema);

let start = performance.now();
const structs = new FooArray(N);
for(let i =0; i < N; i++) {
	structs.push({
		a: i,
		b: i+1,
		c: i+2,
		d: i+3
	});
}
let end = performance.now();
console.log(`Creating structArray of length ${N} took ${end-start}ms`)

start = performance.now()
const array = new Array(N);
for(let i =0; i < N; i++) {
	array.push({
		a: i,
		b: i+1,
		c: i+2,
		d: i+3
	});
}
end = performance.now()

console.log(`Creating array of length ${N} took ${end-start}ms`)