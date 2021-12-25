import Logger from "./Utils/Logger";
import MerchantSettings from "./Utils/MerchantSettings";
import MerchantSheet from "./merchant/MerchantSheet";

import PreloadTemplates from "./PreloadTemplates";
import Globals from "./Globals";
import MerchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";
import csvParser from "csv-parse/lib/sync";
import MoveItemsPacket from "./merchant/model/MoveItemsPacket";
import merchantSheet from "./merchant/MerchantSheet";
import merchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";


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
	// @ts-ignore
	socket.on('module.merchantsheetnpc', (packet: MoveItemsPacket) => {
		// @ts-ignore
		if (!(<Game>game).user.isGM) {
			return;
		}
		merchantSheetNPCHelper.updateActorWithPacket(packet)
		console.log("test", packet); // expected: "foo bar bat"
	})

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

