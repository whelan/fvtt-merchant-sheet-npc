import Logger from "./Utils/Logger";
import MerchantSettings from "./Utils/MerchantSettings";
import MerchantSheet from "./merchant/MerchantSheet";

import PreloadTemplates from "./PreloadTemplates";
import merchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";
import MerchantSheetNPCHelper from "./merchant/MerchantSheetNPCHelper";
import MoveItemsPacket from "./merchant/model/MoveItemsPacket";
import MerchantCurrencyPacket from "./merchant/model/MerchantCurrencyPacket";
import PacketType from "./merchant/model/PacketType";


function getTypesForSheet() {
	if ((<Game>game).system.id === 'sfrpg') {
		return ['npc','npc2'];
	} else if ((<Game>game).system.id === 'gurps') {
		return ['character'];
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
	socket.on('module.merchantsheetnpc', (packet: MoveItemsPacket | MerchantCurrencyPacket) => {
		// @ts-ignore
		if (!(<Game>game).user?.isGM || packet === undefined) {
			return;
		}

		if (packet.type === PacketType.MERCHANT_CURRENCY) {
			let merchantPacket = packet as MerchantCurrencyPacket;
			console.log("currency packet", packet); // expected: "foo bar bat"
			MerchantSheetNPCHelper.updateCurrencyWithPacket(merchantPacket);
		} else if (packet.type === PacketType.MOVE_ITEMS) {
			let moveItemsPacket = packet as MoveItemsPacket;
			merchantSheetNPCHelper.updateActorWithPacket(moveItemsPacket)
		}
	})

	Logger.Log("Template module is being setup.")
});

Hooks.once("ready", () => {
	console.log("MERCHANT SHEET SYSTEM: " + (<Game>game).system.id);
	MerchantSettings.Get().RegisterSettings();
	new MerchantSheetNPCHelper().systemCurrencyCalculator().registerSystemSettings();
	Logger.Ok("Template module is now ready.");
});



