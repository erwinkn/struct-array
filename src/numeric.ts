// --- Boolean ---
export type Bool = {
	type: "b";
	size: 1;
};

// --- Bitflag ---
export type Bitflag<Bits extends number> = {
	type: "bitflag";
	size: Bits;
};

// --- Unsigned integers ---
export type U8 = {
	type: "u";
	size: 1;
};
export type U16 = {
	type: "u";
	size: 2;
};
export type U31 = {
	type: "smi";
};
export type U32 = {
	type: "u";
	size: 4;
};
// Stored as 8 bytes, but guaranteed to always return a number and not a bigint
export type U53 = {
	type: "u";
	size: 8;
};
export type U64 = {
	type: "u";
	size: 8;
};

// --- Signed integers ---
export type I8 = {
	type: "i";
	size: 1;
};
export type I16 = {
	type: "i";
	size: 2;
};
export type I31 = {
	type: "smi";
};
export type I32 = {
	type: "i";
	size: 4;
};
// I54 because JavaScript supports up to 53-bit integers, not including the sign bit
// Stored as 8 bytes, but guaranteed to always return a number and not a bigint
export type I54 = {
	type: "i";
	size: 8;
};
export type I64 = {
	type: "i";
	size: 8;
};

// Floats
export type Float32 = {
	type: "f";
	size: 4;
};

export type Float64 = {
	type: "f";
	size: 8;
};

export type PropertyValues =
	| Bool
	| U8
	| U16
	| U32
	| U53
	| U64
	| I8
	| I16
	| I32
	| I54
	| I64
	| Float32
	| Float64;

export type JSValue<T extends PropertyValues> = T extends Bool
	? boolean
	: T extends U64 | I64
	? bigint
	: number;

export const bool: Bool = {
	type: "b",
	size: 1,
};

export const u8: U8 = {
	type: "u",
	size: 1,
};

export const u16: U16 = {
	type: "u",
	size: 2,
};

export const u32: U32 = {
	type: "u",
	size: 4,
};

export const u53: U53 = {
	type: "u",
	size: 8,
};

export const u64: U64 = {
	type: "u",
	size: 8,
};

export const i8: I8 = {
	type: "i",
	size: 1,
};

export const i16: I16 = {
	type: "i",
	size: 2,
};

export const i32: I32 = {
	type: "i",
	size: 4,
};

export const i54: I54 = {
	type: "i",
	size: 8,
};

export const i64: I64 = {
	type: "i",
	size: 8,
};

export const float32: Float32 = {
	type: "f",
	size: 4,
};

export const float64: Float64 = {
	type: "f",
	size: 8,
};