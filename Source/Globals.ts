import assert from "assert"

export default {
	ModuleName: "merchantsheetnpc",
	IsModule: true,
}

// Pop some fairly universal types that we might use

export type Pair<T> = [string, T];
export const Assert = (value: unknown): void => assert(value);