import Logger from "./Utils/Logger";
import MerchantSettings from "./Utils/MerchantSettings";
import MerchantSheet from "./merchant/MerchantSheet";

import PreloadTemplates from "./PreloadTemplates";
import Globals from "./Globals";
import MerchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";
import csvParser from "csv-parse/lib/sync";


Hooks.once("init", async () => {
	await PreloadTemplates();
});

Hooks.once("setup", () => {
	const csvParser = require('csv-parse/lib/sync');

	const csv = 'type,part\r\nunicorn,horn\r\nrainbow,pink';
//
	const records = csvParser(csv, {
		columns: false,
		autoParse: true,
		skip_empty_lines: true
	});
	console.log(records);

	Logger.Log("Template module is being setup.")
});

Hooks.once("ready", () => {
	MerchantSettings.Get().RegisterSettings();
   Logger.Ok("Template module is now ready.");
	const g = game as Game;
	g.socket?.on(Globals.ModuleName,data => {
		console.log("Merchant sheet | processing socket request", g.user?.isGM, data.processorId, g.user?.id)

		if (g.user?.isGM && data.processorId === g.user?.id) {
			console.log("Merchant Sheet | buy processing by GM ", data)
			MerchantSheetNPCHelper.buyTransactionFromPlayer(data);
		}
		if (data.type === "error" && data.targetId === g.user?.character?.id) {
			console.log("Merchant sheet | Transaction Error: ", data.message);
			return ui.notifications?.error(data.message);
		}
	});

});

// const csv = require('csv-parser')
// const fs = require('fs')
// const results = [];
//
// fs.createReadStream('data.csv')
// 	.pipe(csv())
// 	.on('data', (data) => results.push(data))
// 	.on('end', () => {
// 		console.log(results);
// 		// [
// 		//   { NAME: 'Daffy Duck', AGE: '24' },
// 		//   { NAME: 'Bugs Bunny', AGE: '22' }
// 		// ]
// 	});
Actors.registerSheet("core", MerchantSheet, {
	label: "merchant NPC",
	types: ["npc"],
	makeDefault: false
});

