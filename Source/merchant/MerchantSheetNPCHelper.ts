import {ActorData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import PermissionPlayer from "./PermissionPlayer";
import Globals from "../Globals";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import Dnd5eCurrencyCalculator from "./systems/Dnd5eCurrencyCalculator";

let currencyCalculator: CurrencyCalculator;
class MerchantSheetNPCHelper {

	static systemCurrencyCalculator(): CurrencyCalculator {
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
		return currencyCalculator;
	}

	static getMerchantPermissionForPlayer(actorData: ActorData, player: PermissionPlayer): number {
		let defaultPermission = actorData.permission.default;
		if (player.data._id === null) {
			return 0;
		}
		if (player.data._id in actorData.permission) {
			// @ts-ignore
			return actorData.permission[player.data._id];
		}
		else if (typeof defaultPermission !== "undefined") {
			return defaultPermission;
		}

		return 0;
	}

	static getPermissionIcon(merchantPermission: number): string {
		const icons = {
			0: '<i class="far fa-circle"></i>',
			2: '<i class="fas fa-eye"></i>',
			999: '<i class="fas fa-users"></i>'
		};
		// @ts-ignore
		return icons[merchantPermission];
	}

	static getPermissionDescription(merchantPermission: number): string {
		const description  = {
			0: (<Game>game).i18n.localize("MERCHANTNPC.permission-none-help"),
			2: (<Game>game).i18n.localize("MERCHANTNPC.permission-observer-help"),
			999: (<Game>game).i18n.localize("MERCHANTNPC.permission-all-help")
		};
		// @ts-ignore
		return description[merchantPermission];
	}

	static updatePermissions(actorData: Actor, playerId: string, newLevel: number, event: JQuery.ClickEvent) {
		// Read player permission on this actor and adjust to new level
		console.log("Merchant sheet | _updatePermission ",actorData, playerId, newLevel, event)
		let currentPermissions = duplicate(actorData.data.permission);
		// @ts-ignore
		currentPermissions[playerId] = newLevel;
		// Save updated player permissions
		console.log("Merchant sheet | _updatePermission ",currentPermissions, actorData.data.permission)
		// @ts-ignore
		const merchantPermissions: PermissionControl = new PermissionControl(actorData.data);
		console.log("Merchant sheet | _updatePermission merchantPermissions",merchantPermissions)
		// @ts-ignore
		merchantPermissions._updateObject(event, currentPermissions);
	}

	static async changePrice(event: JQuery.ClickEvent) {
		event.preventDefault();
		console.log("Merchant sheet | Change item price");
		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

		// @ts-ignore
		const item: Item = this.actor.getEmbeddedDocument("Item", itemId);
		const template_file = "modules/"+Globals.ModuleName+"/templates/change_price.html";
		const template_data = { price: currencyCalculator.getPriceFromItem(item)};
		const rendered_html = await renderTemplate(template_file, template_data);

		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.priceDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						item.update({[currencyCalculator.getPriceItemKey()]: document.getElementById("price-value").value});
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Change price Cancelled")
				}
			},
			default: "two",
			close: () => console.log("Merchant sheet | Change price Closed")
		});
		d.render(true);
	}


}
export default MerchantSheetNPCHelper;