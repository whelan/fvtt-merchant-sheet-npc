import Logger from "./Utils/Logger";
import MerchantSettings from "./Utils/MerchantSettings";
import MerchantSheet from "./merchant/MerchantSheet";
import TransactionHelper from "./Utils/TransactionHelper";

import PreloadTemplates from "./PreloadTemplates";
import Globals from "./Globals";


Hooks.once("init", async () => {
	const g = game as Game;
	g.socket?.on(Globals.ModuleName,data => {
		console.log("Merchant sheet | processing socket request", g.user?.isGM, data.processorId, g.user?.id)

		if (g.user?.isGM && data.processorId === g.user?.id) {
			console.log("Merchant Sheet | buy processing by GM ", data)
			// buyTransactionFromPlayer(data);
		}
		if (data.type === "error" && data.targetId === g.user?.character?.id) {
			console.log("Merchant sheet | Transaction Error: ", data.message);
			return ui.notifications?.error(data.message);
		}
	});
	await PreloadTemplates();
});

Hooks.once("setup", () => {
   Logger.Log("Template module is being setup.")
});

Hooks.once("ready", () => {
	MerchantSettings.Get().RegisterSettings();
   Logger.Ok("Template module is now ready.");
});

Actors.registerSheet("core", MerchantSheet, {
	label: "merchant NPC",
	types: ["npc"],
	makeDefault: false
});
