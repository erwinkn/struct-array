import { bool, float32, i32, u8 } from "./numeric";
import { ItemOf, structArray } from "./structArray";

const StructArray = structArray({
	a: i32,
	b: u8,
	c: bool,
	d: float32,
});

const structs = new StructArray();
structs.push({
	a: 2,
	b: 1,
	c: true,
	d: 3.5,
});

// You can move to a location and read / set the properties from there
structs.move(0);
console.log(structs.a); // => 2
console.log(structs.c); // => true
structs.c = false;
console.log(structs.c); // => false

// Or you can just get the struct at an index
console.log(structs.get(0)); // => { a: 2, b: 1, c: true, d: 3.5 }
