import Globals from "../Globals";
import * as Console from "console";
import Logger from "../Utils/Logger";
import MerchantSheetData from "./MerchantSheetData";
import MerchantSheetNPCHelper from "./MerchantSheetNPCHelper";
import PermissionPlayer from "./PermissionPlayer";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import Dnd5eCurrencyCalculator from "./systems/Dnd5eCurrencyCalculator";

let currencyCalculator: CurrencyCalculator;

function systemCurrencyCalculator() {
	if (currencyCalculator === null || currencyCalculator === undefined) {
		let currencyModuleImport = (<Game>game).system.id.charAt(0).toUpperCase() + (<Game>game).system.id.slice(1) + "CurrencyCalculator";
		if (currencyModuleImport === 'Dnd5eCurrencyCalculator') {
			currencyCalculator = new Dnd5eCurrencyCalculator();
			currencyCalculator.initSettings();
		} else {
			currencyCalculator = new CurrencyCalculator();
			currencyCalculator.initSettings();
		}
	}
}


class MerchantSheet extends ActorSheet {

	get template() {
		systemCurrencyCalculator();
		let g = game as Game;
		Handlebars.registerHelper('equals', function (arg1, arg2, options) {
			// @ts-ignore
			return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
			// @ts-ignore
			return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('merchantsheetprice', function (basePrice, modifier) {
			if (modifier === 'undefined') {
				// @ts-ignore
				this.actor.setFlag(Globals.ModuleName, "priceModifier", 1.0);
				modifier = 1.0;
			}
			// if (!stackModifier) await this.actor.setFlag(moduleName, "stackModifier", 20);

			Logger.Log("basePrice: " + basePrice + " modifier: " + modifier)

			return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en');
		});

		Handlebars.registerHelper('merchantsheetstackweight', function (weight, qty) {
			let showStackWeight = g.settings.get(Globals.ModuleName, "showStackWeight");
			if (showStackWeight) {
				return `/${(weight * qty).toLocaleString('en')}`;
			} else {
				return ""
			}

		});

		Handlebars.registerHelper('merchantsheetweight', function (weight) {
			return (Math.round(weight * 1e5) / 1e5).toString();
		});

		Handlebars.registerHelper('itemInfinity', function (qty) {
			return (qty === Number.MAX_VALUE)
		});

		return "./modules/" + Globals.ModuleName + "/templates/npc-sheet.html";
	}

	static get defaultOptions() {
		const options = super.defaultOptions;

		mergeObject(options, {
			classes: ["sheet actor npc npc-sheet merchant-sheet-npc"],
			width: 890,
			height: 750
		});
		return options;
	}

	getData(options: any): any {
		systemCurrencyCalculator();

		Logger.Log("getData")
		let g = game as Game;
		// @ts-ignore
		const sheetData: MerchantSheetData = super.getData();

		// Prepare GM Settings
		// @ts-ignore
		let merchant = this.prepareGMSettings(sheetData.actor);

		// Prepare isGM attribute in sheet Data

		if (g.user?.isGM) {
			sheetData.isGM = true;
		} else {
			sheetData.isGM = false;
		}


		let priceModifier: number = 1.0;
		let moduleName = "merchantsheetnpc";
		priceModifier = <number> this.actor.getFlag(moduleName, "priceModifier");

		let stackModifier: number = 20;
		stackModifier = <number> this.actor.getFlag(moduleName, "stackModifier");
		let totalWeight = 0;

		sheetData.totalItems = this.actor.data.items.size;
		sheetData.priceModifier = priceModifier;
		sheetData.stackModifier = stackModifier;

		sheetData.sections = currencyCalculator.prepareItems(this.actor.itemTypes);
		sheetData.merchant = merchant;
		sheetData.owner = sheetData.isGM;
		Logger.Log("SheetData: ", sheetData)
		// Return data for rendering
		// @ts-ignore
		return sheetData;
	}

	prepareGMSettings(actorData: Actor) {
		let g = game as Game;
		const playerData: PermissionPlayer[] = [];
		const observers: any[] = [];

		let players = g.users?.players;
		let commonPlayersPermission = -1;
		if (players === undefined) {
			return {};
		}
		for (let p of players) {
			if (p === undefined) {
				continue;
			}
			let player = <PermissionPlayer> p;
			//     // get the name of the primary actor for a player
			// @ts-ignore
			const actor = g.actors.get(player.data.character);
			//
			if (actor) {

				Logger.Log("Player: " + player.data.name + " actor ", actor.data)


				player.actor = actor.data.name;
				player.actorId = actor.data._id;
				player.playerId = player.data._id;

				//
				player.merchantPermission = MerchantSheetNPCHelper.getMerchantPermissionForPlayer(this.actor.data, player);
				//
				if (player.merchantPermission >= 2 && !observers.includes(actor.data._id)) {
					observers.push(actor.data._id);
				}

				//Set icons and permission texts for html
				if (commonPlayersPermission < 0) {
					commonPlayersPermission = player.merchantPermission;
				} else if (commonPlayersPermission !== player.merchantPermission) {
					commonPlayersPermission = 999;
				}

				player.icon = this.getPermissionIcon(player.merchantPermission);
				player.merchantPermissionDescription = this.getPermissionDescription(player.merchantPermission);
				playerData.push(player);
			}
		}

		return {
			players: playerData,
			observerCount: observers.length,
			playersPermission: commonPlayersPermission,
			playersPermissionIcon: this.getPermissionIcon(commonPlayersPermission),
			playersPermissionDescription: this.getPermissionDescription(commonPlayersPermission)
		}
	}

	private getPermissionIcon(merchantPermission: number): string {
		const icons = {
			0: '<i class="far fa-circle"></i>',
			2: '<i class="fas fa-eye"></i>',
			999: '<i class="fas fa-users"></i>'
		};
		// @ts-ignore
		return icons[merchantPermission];
	}

	private getPermissionDescription(merchantPermission: number): string {
		const description  = {
			0: (<Game>game).i18n.localize("MERCHANTNPC.permission-none-help"),
			2: (<Game>game).i18n.localize("MERCHANTNPC.permission-observer-help"),
			999: (<Game>game).i18n.localize("MERCHANTNPC.permission-all-help")
		};
		// @ts-ignore
		return description[merchantPermission];
	}

	async callSuperOnDropItemCreate(itemData: PropertiesToSource<ItemData>) {
		// Create the owned item as normal
		return super._onDropItemCreate(itemData);
	}

}
export default MerchantSheet;