import Logger from "./Utils/Logger";
import MerchantSettings from "./Utils/MerchantSettings";
import MerchantSheet from "./merchant/MerchantSheet";

import PreloadTemplates from "./PreloadTemplates";
import merchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";
import MoveItemsPacket from "./merchant/model/MoveItemsPacket";
import MerchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";


function getTypesForSheet() {
	if ((<Game>game).system.id === 'sfrpg') {
		return ['npc','npc2'];
	}
	return ['npc'];
}

Hooks.once("init", async () => {
	await PreloadTemplates();

	Actors.registerSheet("core", MerchantSheet, {
		label: "Merchant NPC",
		types: getTypesForSheet(),
		makeDefault: false
	});

	// if ((<Game>game).system.id === 'Sfrpg') {
	// 	Actors.registerSheet("sfrpg", SfrpgMerchantSheet, {
	// 		label: "Merchant NPC",
	// 		types: ['npc2'],
	// 		makeDefault: false
	// 	});
	// }
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
	console.log("MERCHANT SHEET SYSTEM: " + (<Game>game).system.id);
	MerchantSettings.Get().RegisterSettings();
	new MerchantSheetNPCHelper().systemCurrencyCalculator().registerSystemSettings();
	Logger.Ok("Template module is now ready.");
});



