import { Bool, I16, I31, I8, U16, U31, U32, U8 } from "./numeric";

const MAX = Math.pow(2, 31) - 1;

type RopeValues = Bool | U8 | U16 | U31 | I8 | I16 | I31;
export type RopeSchema = Record<string, RopeValues>;

export function structRope<S extends RopeSchema>(schema: S) {

}