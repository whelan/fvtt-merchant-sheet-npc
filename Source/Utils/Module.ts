import {ModuleData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import Globals from "../Globals";

export const GetModuleInformation = async (): Promise<ModuleData> => {
	const module = await fetch(Globals.IsModule ? "modules/" : "systems/" + Globals.ModuleName + "/module.json")
	return await module.json();
};