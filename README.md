# struct-array

Store your objects as a flat array of data, with no hassle & no memory overhead. Optimized for performance using the dirtiest JavaScript tricks in the book.

### Benchmarks

- TODO: using functions vs getters + setters
- TODO: constructor function compiled as `new Function(...)` vs. assigning object properties vs prototype trickery
- TODO: `Object.preventExtensions()` and `Object.seal()` on created objects (if even possible)
- TODO: `Object.create()` in constructor and return that, instead of assigning to `this`