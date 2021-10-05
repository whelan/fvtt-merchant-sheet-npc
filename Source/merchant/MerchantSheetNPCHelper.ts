import {
	ActorData,
	ItemData,
	TokenData
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import PermissionPlayer from "./PermissionPlayer";
import Globals from "../Globals";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import Dnd5eCurrencyCalculator from "./systems/Dnd5eCurrencyCalculator";
import MerchantSheet from "./MerchantSheet";

let currencyCalculator: CurrencyCalculator;

class MerchantSheetNPCHelper {

	public systemCurrencyCalculator(): CurrencyCalculator {
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

	public getMerchantPermissionForPlayer(actorData: ActorData, player: PermissionPlayer): number {
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

	public getPermissionIcon(merchantPermission: number): string {
		const icons = {
			0: '<i class="far fa-circle"></i>',
			2: '<i class="fas fa-eye"></i>',
			999: '<i class="fas fa-users"></i>'
		};
		// @ts-ignore
		return icons[merchantPermission];
	}

	public getPermissionDescription(merchantPermission: number): string {
		const description  = {
			0: (<Game>game).i18n.localize("MERCHANTNPC.permission-none-help"),
			2: (<Game>game).i18n.localize("MERCHANTNPC.permission-observer-help"),
			999: (<Game>game).i18n.localize("MERCHANTNPC.permission-all-help")
		};
		// @ts-ignore
		return description[merchantPermission];
	}

	public updatePermissions(actorData: Actor, playerId: string, newLevel: number, event: JQuery.ClickEvent) {
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

	public async changePrice(event: JQuery.ClickEvent) {
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

	private async transaction(seller: Actor, buyer: Actor, itemId: string, quantity: number) {
		console.log(`Buying item: ${seller}, ${buyer}, ${itemId}, ${quantity}`);

		let sellItem = seller.getEmbeddedDocument("Item", itemId);
		// If the buyer attempts to buy more then what's in stock, buy all the stock.
		if (sellItem !== undefined && sellItem.data.data.quantity < quantity) {
			quantity = sellItem.data.data.quantity;
		}

		// On negative quantity we show an error
		if (quantity < 0) {
			this.errorMessageToActor(buyer, (<Game>game).i18n.localize("MERCHANTNPC.error-negativeAmountItems"));
			return;
		}

		// On 0 quantity skip everything to avoid error down the line
		if (quantity == 0) {
			return;
		}

		let sellerModifier = seller.getFlag(Globals.ModuleName, "priceModifier");
		let sellerStack = seller.getFlag(Globals.ModuleName, "stackModifier");
		if (sellerModifier === 'undefined') {
			sellerModifier = 1.0;
		}
		// @ts-ignore
		if (sellerStack !== undefined && quantity > sellerStack) quantity = sellerStack;

		// @ts-ignore
		let itemCostInGold = Math.round(currencyCalculator.getPriceFromItem(sellItem) * sellerModifier * 100) / 100;

		itemCostInGold *= quantity;
		let currency = currencyCalculator.actorCurrency(buyer);

		let buyerFunds = duplicate(currency);

		if (currencyCalculator.buyerHaveNotEnoughFunds(itemCostInGold,buyerFunds)) {
			this.errorMessageToActor(buyer, (<Game>game).i18n.localize("MERCHANTNPC.error-noFunds"));
			return;
		}

		currencyCalculator.subtractAmountFromActor(buyer,buyerFunds,itemCostInGold);

		// Update buyer's funds

		let moved = await helper.moveItems(seller, buyer, [{ itemId, quantity }]);

		let chatPrice = currencyCalculator.priceInText(itemCostInGold);
		for (let m of moved) {
			this.chatMessage(
				seller, buyer,
				(<Game>game).i18n.format('MERCHANTNPC.buyText', {buyer: buyer.name, quantity: quantity, itemName: m.item.name, chatPrice: chatPrice}),
				m.item);
		}
	}

	private chatMessage(speaker: Actor, owner: Actor, message: string, item: Item) {
		if ((<Game>game).settings.get(Globals.ModuleName, "buyChat")) {
			message = `
            <div class="chat-card item-card" data-actor-id="${owner.id}" data-item-id="${item.id}">
                <header class="card-header flexrow">
                    <div class= "merchant-item-image" style="background-image: url(${item.img})"></div>
                    <h3 class="item-name">${item.name}</h3>
                </header>

                <div class="message-content">
                    <p>` + message + `</p>
                </div>
            </div>
            `;
			ChatMessage.create({
				// @ts-ignore
				user: (<Game>game).user.id,
				speaker: {
					// @ts-ignore
					actor: speaker,
					alias: speaker.name
				},
				content: message
			});
		}
	}

	public errorMessageToActor(target: Actor, message: string) {
		// let allowNoTargetGM = (<Game>game).settings.get(Globals.ModuleName, "allowNoGM")
		// if (allowNoTargetGM) {
			ui.notifications?.error(message);
		// } else {
		// 	// @ts-ignore
		// 	(<Game>game).socket.emit(Globals.Socket, {
		// 		type: "error",
		// 		targetId: target.id,
		// 		message: message
		// 	});
		// }
	}


	static buyTransactionFromPlayer(data: any) {
		console.log("Merchant sheet | buyTransaction ", data)
		if (data.type === "buy") {
			// @ts-ignore
			let buyer = (<Game>game).actors.get(data.buyerId);
			// @ts-ignore
			let seller = canvas.tokens.get(data.tokenId);

			if (buyer && seller && seller.actor) {
				helper.transaction(seller.actor, buyer, data.itemId, data.quantity);
			} else if (!seller) {
				ui.notifications?.error((<Game>game).i18n.localize("MERCHANTNPC.playerOtherScene"));
			}
		}
	}

	private async moveItems(source: Actor, destination: Actor, items: any[]) {
		const updates = [];
		const deletes = [];
		const additions = [];
		const destUpdates = [];
		const results = [];
		for (let i of items) {
			// @ts-ignore
			let itemId = i.itemId;
			// @ts-ignore
			let quantity = Number(i.quantity);
			let item = source.getEmbeddedDocument("Item", itemId);

			// Move all items if we select more than the quantity.
			if (item !== undefined && item.data.data.quantity < quantity) {
				// @ts-ignore
				quantity = Number(item.data.data.quantity);
			}

			let newItem = duplicate(item);
			// @ts-ignore
			const update = { _id: itemId, "data.quantity": item.data.data.quantity >= (Number.MAX_VALUE-10000) ? Number.MAX_VALUE : item.data.data.quantity - quantity };
			let allowNoTargetGM = (<Game>game).settings.get(Globals.ModuleName, "allowNoGM")

			if (update["data.quantity"] === 0 && !allowNoTargetGM) {
				deletes.push(itemId);
			}
			else {
				updates.push(update);
			}

			newItem.data.quantity = quantity;
			results.push({
				item: newItem,
				quantity: quantity
			});
			let destItem = destination.data.items.find(i => i.name == newItem.name);
			if (destItem === undefined) {
				additions.push(newItem);
			} else {
				//console.log("Existing Item");
				// @ts-ignore
				destItem.data.data.quantity = Number(destItem.data.data.quantity) + Number(newItem.data.quantity);
				// @ts-ignore
				if (destItem.data.data.quantity < 0) {
				// @ts-ignore
					destItem.data.data.quantity = 0;
				}
				// @ts-ignore
				const destUpdate = { _id: destItem._id, "data.quantity": destItem.data.data.quantity };
				destUpdates.push(destUpdate);
			}
		}

		if (deletes.length > 0) {

			await source.deleteEmbeddedDocuments("Item", deletes);
		}

		if (updates.length > 0) {
			await source.updateEmbeddedDocuments("Item", updates);
		}

		if (additions.length > 0) {
			await destination.createEmbeddedDocuments("Item", additions);
		}

		if (destUpdates.length > 0) {
			await destination.updateEmbeddedDocuments("Item", destUpdates);
		}

		return results;
	}


}

let helper = new MerchantSheetNPCHelper();



export default MerchantSheetNPCHelper;