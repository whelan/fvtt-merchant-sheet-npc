import assert from "assert"

let moduleName = "merchantsheetnpc";
export default {
	ModuleName: moduleName,
 	Socket: "module."+moduleName,
	IsModule: true,
}

// Pop some fairly universal types that we might use

export type Pair<T> = [string, T];
export const Assert = (value: unknown): void => assert(value);