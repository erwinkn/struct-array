import { bool, float32, i16, u32 } from "./numeric";
import { structArray } from "./structArray";

const StructArray = structArray({
	a: i16,
	b: bool,
	c: float32,
});

const structs = new StructArray(3);
structs.push({ a: 1, b: false, c: 2 });
structs.push({ a: 2, b: true, c: 4 });
structs.swap(0, 1);
console.log(structs.get(0));
console.log(structs.get(1));
