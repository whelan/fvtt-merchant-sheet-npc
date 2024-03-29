import {ActorData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import PermissionPlayer from "./PermissionPlayer";
import Globals from "../Globals";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import Dnd5eCurrencyCalculator from "./systems/Dnd5eCurrencyCalculator";
import World5eCurrencyCalculator from "./systems/World5eCurrencyCalculator";
import SfrpgCurrencyCalculator from "./systems/SfrpgCurrencyCalculator";
import GurpsCurrencyCalculator from "./systems/GurpsCurrencyCalculator";
import SwadeCurrencyCalculator from "./systems/SwadeCurrencyCalculator";
import Logger from "../Utils/Logger";
import Wfrp4eCurrencyCalculator from "./systems/Wfrp4eCurrencyCalculator";
import MoveItemsPacket from "./model/MoveItemsPacket";
import MerchantCurrencyPacket from "./model/MerchantCurrencyPacket";
import CurrencyAction from "./model/CurrencyAction";
import MerchantDragSource from "./model/MerchantDragSource";
import AddItemHolder from "./model/AddItemHolder";

let currencyCalculator: CurrencyCalculator;

class MerchantSheetNPCHelper {

	public static getElementById(elementId: string): HTMLInputElement {
		return <HTMLInputElement>document.getElementById(elementId);
	}

	public systemCurrencyCalculator(): CurrencyCalculator {
		if (currencyCalculator === null || currencyCalculator === undefined) {
			let currencyModuleImport = game.system.id.charAt(0).toUpperCase() + game.system.id.slice(1) + "CurrencyCalculator";
			Logger.Log("System currency to get: " + currencyModuleImport);
			if (game.modules.get("world-currency-5e")?.active) {
				currencyCalculator = new World5eCurrencyCalculator();
				currencyCalculator.initSettings();
			} else if (currencyModuleImport === 'Dnd5eCurrencyCalculator') {
				currencyCalculator = new Dnd5eCurrencyCalculator();
				currencyCalculator.initSettings();
			} else if (currencyModuleImport === 'SfrpgCurrencyCalculator') {
				// @ts-ignore
				currencyCalculator = new SfrpgCurrencyCalculator();
				Logger.Log("Getting star finder", currencyCalculator);
				currencyCalculator.initSettings();
			} else if (currencyModuleImport === 'SwadeCurrencyCalculator') {
				currencyCalculator = new SwadeCurrencyCalculator();
				currencyCalculator.initSettings();
			} else if (currencyModuleImport === 'Wfrp4eCurrencyCalculator') {
				currencyCalculator = new Wfrp4eCurrencyCalculator();
				currencyCalculator.initSettings();
			} else if (currencyModuleImport === 'GurpsCurrencyCalculator') {
				currencyCalculator = new GurpsCurrencyCalculator();
				currencyCalculator.initSettings();
			} else {
				currencyCalculator = new CurrencyCalculator();
				currencyCalculator.initSettings();
			}
		}
		return currencyCalculator;
	}

	public getMerchantPermissionForPlayer(actorData: Actor, player: PermissionPlayer): number {
		// @ts-ignore
		let defaultPermission = actorData.ownership.default;
		if (player.id === null) {
			return 0;
		}
		// @ts-ignore
		if (player.id in actorData.ownership) {
			// @ts-ignore
			return actorData.ownership[player.id];
		} else if (typeof defaultPermission !== "undefined") {
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
		const description = {
			0: game.i18n.localize("MERCHANTNPC.permission-none-help"),
			2: game.i18n.localize("MERCHANTNPC.permission-observer-help"),
			999: game.i18n.localize("MERCHANTNPC.permission-all-help")
		};
		// @ts-ignore
		return description[merchantPermission];
	}

	public updatePermissions(actorData: Actor, playerId: string, newLevel: number, event: JQuery.ClickEvent) {
		// Read player permission on this actor and adjust to new level
		console.log("Merchant sheet | _updatePermission ", actorData, playerId, newLevel, event)
		let currentPermissions = duplicate(actorData.data.permission);
		// @ts-ignore
		currentPermissions[playerId] = newLevel;
		// Save updated player permissions
		// @ts-ignore
		console.log("Merchant sheet | _updatePermission ", currentPermissions, actorData.ownership)
		// @ts-ignore
		const merchantPermissions: PermissionControl = new PermissionControl(actorData);
		console.log("Merchant sheet | _updatePermission merchantPermissions", merchantPermissions)
		// @ts-ignore
		merchantPermissions._updateObject(event, currentPermissions);
	}

	public async changePrice(event: JQuery.ClickEvent, actor: Actor) {
		event.preventDefault();
		console.log("Merchant sheet | Change item price");
		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

		// @ts-ignore
		const item: Item = actor.getEmbeddedDocument("Item", itemId);
		const template_file = "modules/" + Globals.ModuleName + "/templates/change_price.html";
		const template_data = {price: currencyCalculator.getPriceFromItem(item)};
		const rendered_html = await renderTemplate(template_file, template_data);

		let d = new Dialog({
			title: game.i18n.localize('MERCHANTNPC.priceDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						item.update({[currencyCalculator.getPriceItemKey()]: currencyCalculator.getPrice(document.getElementById("price-value").value)});
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: game.i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Change price Cancelled")
				}
			},
			default: "one",
			close: () => console.log("Merchant sheet | Change price Closed")
		});
		d.render(true);
	}

	public deleteItem(event: JQuery.ClickEvent, actor: Actor) {
		event.preventDefault();
		console.log("Merchant sheet | Delete Item clicked");
		let itemId: string;
		// @ts-ignore
		itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
		actor.deleteEmbeddedDocuments("Item", [itemId]);
	}

	public async onItemSummary(event: JQuery.ClickEvent, actor: Actor) {
		event.preventDefault();
		let li = $(event.currentTarget).parents(".merchant-item"),
			item = actor.items.get(li.data("item-id")),
			// @ts-ignore
			chatData = await item.getChatData({secrets: actor.isOwner});
		// Toggle summary
		if (li.hasClass("expanded")) {
			let summary = li.children(".merchant-item-summary");
			summary.slideUp(200, () => summary.remove());
		} else {

			let div = $(`<div class="merchant-item-summary">${currencyCalculator.getDescription(chatData.description)}</div>`);
			li.append(div.hide());
			div.slideDown(200);
		}
		li.toggleClass("expanded");
	}

	public onSectionSummary(event: JQuery.ClickEvent) {
		event.preventDefault();
		let div = event.currentTarget.nextElementSibling;
		// Toggle summary
		if (div.classList.contains("expanded")) {
			div.hidden = true;
			div.classList.remove("expanded")
		} else {
			div.hidden = false;
			div.classList.add("expanded")
		}
	}

	public async changeQuantity(event: JQuery.ClickEvent, actor: Actor) {
		event.preventDefault();
		Logger.Log("Change quantity");
		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

		// @ts-ignore
		const item: Item = actor.getEmbeddedDocument("Item", itemId);
		const template_file = "modules/" + Globals.ModuleName + "/templates/change_quantity.html";
		// @ts-ignore
		const quantity = currencyCalculator.getQuantityFromItem(item);
		const infinityActivated = (quantity === Number.MAX_VALUE ? 'checked' : '');
		// @ts-ignore
		const template_data = {
			quantity: quantity,
			infinity: infinityActivated
		};
		const rendered_html = await renderTemplate(template_file, template_data);
		let d = new Dialog({
			title: game.i18n.localize('MERCHANTNPC.quantityDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						let itemFound = currencyCalculator.findItemByNameForActor(actor,currencyCalculator.getNameFromItem(item));
						// @ts-ignore
						if (document.getElementById("quantity-infinity").checked) {
							currencyCalculator.setQuantityForItem(actor,itemFound,Number.MAX_VALUE)
						} else {
							// @ts-ignore
							let newQuantity: number = document.getElementById("quantity-value").value;
							currencyCalculator.setQuantityForItem(actor,itemFound,newQuantity)

						}
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: game.i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Change quantity Cancelled")
				}
			},
			default: "one",
			close: () => Logger.Log("Change quantity Closed")
		});
		d.render(true);
	}


	private async transaction(seller: Actor, buyer: Actor, itemId: string, quantity: number) {
		console.log(`Buying item: ${seller}, ${buyer}, ${itemId}, ${quantity}`);

		let sellItem = seller.getEmbeddedDocument("Item", itemId);
		// If the buyer attempts to buy more then what's in stock, buy all the stock.
		if (sellItem !== undefined && currencyCalculator.getQuantityNumber(sellItem) < quantity) {
			// @ts-ignore
			quantity = currencyCalculator.getQuantity(currencyCalculator.getQuantityNumber(sellItem));
		}

		// On negative quantity we show an error
		if (quantity < 0) {
			this.errorMessageToActor(buyer, game.i18n.localize("MERCHANTNPC.error-negativeAmountItems"));
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

		if (currencyCalculator.buyerHaveNotEnoughFunds(itemCostInGold, buyerFunds)) {
			this.errorMessageToActor(buyer, game.i18n.localize("MERCHANTNPC.error-noFunds"));
			return;
		}

		currencyCalculator.subtractAmountFromActor(buyer, buyerFunds, itemCostInGold);
		let chatPrice = currencyCalculator.priceInText(itemCostInGold);
		let service = seller.getFlag(Globals.ModuleName, "service");
		if (!service) {
			// Update buyer's funds
			// @ts-ignore
			let keepItem: Boolean = seller.getFlag(Globals.ModuleName, "keepDepleted");
			Logger.Log("keepDepleted", keepItem)
			let moved = await helper.moveItems(seller, buyer, [{itemId, quantity}], !keepItem);
			for (let m of moved) {
				this.chatMessage(
					seller, buyer,
					game.i18n.format('MERCHANTNPC.buyText', {
						buyer: buyer.name,
						quantity: quantity,
						itemName: m.item.name,
						chatPrice: chatPrice
					}),
					m.item, false);
			}
		} else {
			// @ts-ignore
			this.chatMessage(seller, buyer, game.i18n.format('MERCHANTNPC.buyText', {
				buyer: buyer.name,
				quantity: quantity,
				// @ts-ignore
				itemName: sellItem.name,
				chatPrice: chatPrice
				// @ts-ignore
			}), sellItem, service);
		}
	}

	private chatMessage(speaker: Actor, owner: Actor, message: string, item: MerchantDragSource | Item, service: Boolean) {
		if (game.settings.get(Globals.ModuleName, "buyChat")) {
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
				user: game.user.id,
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
		// let allowNoTargetGM = game.settings.get(Globals.ModuleName, "allowNoGM")
		// if (allowNoTargetGM) {
		ui.notifications?.error(message);
		// } else {
		// 	// @ts-ignore
		// 	game.socket.emit(Globals.Socket, {
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
			let buyer = game.actors.get(data.buyerId);
			// @ts-ignore
			let seller = canvas.tokens.get(data.tokenId);

			if (buyer && seller && seller.actor) {
				helper.transaction(seller.actor, buyer, data.itemId, data.quantity);
			} else if (!seller) {
				ui.notifications?.error(game.i18n.localize("MERCHANTNPC.playerOtherScene"));
			}
		}
	}

	public async sellItem(target: Actor, dragSource: MerchantDragSource, sourceActor: Actor, quantity: number, totalItemsPrice: number) {
		let sellerFunds = currencyCalculator.actorCurrency(sourceActor);
		let chatPrice = currencyCalculator.priceInText(totalItemsPrice);
		console.log("Add amount to Actor", sellerFunds,chatPrice,sourceActor)
		console.log("subtract amount to Actor", sellerFunds,chatPrice,target)
		currencyCalculator.addAmountForActor(sourceActor, sellerFunds, totalItemsPrice)
		if (target.getFlag(Globals.ModuleName, "limitedCurrency")) {
			let buyerFunds = duplicate(currencyCalculator.actorCurrency(target));
			console.log("merchant currency", target, currencyCalculator.actorCurrency(target))
			if (currencyCalculator.buyerHaveNotEnoughFunds(totalItemsPrice, buyerFunds)) {
				let message = game.i18n.localize('MERCHANTNPC.merchantNotEnoughMoney');
				throw message
			} else {
				let allowNoTargetGM = game.settings.get(Globals.ModuleName, "allowNoGM")
				let packet: MerchantCurrencyPacket | undefined;
				if (!allowNoTargetGM) {
					packet = new MerchantCurrencyPacket();
					packet.action = CurrencyAction.Subtract
					if (target.id) {
						packet.actorId = target.id;
					}
					console.log("Target: ", target)
					// @ts-ignore
					let tokenActor = target.parent;
					if (tokenActor) {
						let actorLink: boolean = tokenActor.data.actorLink
						if (!actorLink) {
							if (tokenActor.parent) {
								// @ts-ignore
								let sceneId = canvas.scene.id;
								// @ts-ignore
								if (sceneId) {
									packet.sceneId = sceneId;
								}
								packet.tokenId = tokenActor.id;
								packet.actorLink = false;
							}
						}
					}
					packet.currency = buyerFunds;
					packet.price = totalItemsPrice;
					if (packet) {
						// @ts-ignore
						game.socket.emit(Globals.Socket, packet);
					}
				}

			}
		}
		// @ts-ignore
		this.chatMessage(sourceActor, target, game.i18n.format('MERCHANTNPC.sellText', {
			seller: sourceActor.name,
			quantity: quantity,
			itemName: dragSource.name,
			chatPrice: chatPrice
		}), dragSource, false);
	}

	public async moveItems(source: Actor, destination: Actor, items: any[], deleteItemFromSource: boolean) {
		const updates = [];
		const deletes = [];
		const additions = [];
		// @ts-ignore
		const destUpdates = [];
		const results = [];
		let allowNoTargetGM = game.settings.get(Globals.ModuleName, "allowNoGM")
		for (let i of items) {
			console.log(i)
			// @ts-ignore
			let itemId = i.itemId;
			let itemName = i.itemName;
			// @ts-ignore
			let quantity = Number(i.quantity);
			let item = source.getEmbeddedDocument("Item", itemId);
			if (item === undefined) {
				item = currencyCalculator.findItemByNameForActor(source,itemName)
			}
			let infinity = source.getFlag(Globals.ModuleName, "infinity");
			// Move all items if we select more than the quantity.
			console.log("Item found " + itemName, item, itemName)

			// @ts-ignore
			let quantityFromItem = currencyCalculator.getQuantityFromItem(item);
			if (quantityFromItem < quantity) {
				// @ts-ignore
				quantity = quantityFromItem;
			}
			let newItem = currencyCalculator.duplicateItemFromActor(item,source)
				// duplicate(item);
			// @ts-ignore
			let update = currencyCalculator.getUpdateObject(quantityFromItem,quantity,item, itemId, infinity)

			// @ts-ignore
			if (update[currencyCalculator.getQuantityKey()] === 0 && !allowNoTargetGM && deleteItemFromSource) {
				deletes.push(itemId);
			} else {
				updates.push(update);
			}
			// currencyCalculator.setQuantityForItem(destination, newItem, quantity);
			results.push({
				item: newItem,
				quantity: quantity
			});
			let destItem = currencyCalculator.findItemByNameForActor(destination,currencyCalculator.getNameFromItem(newItem));
			Logger.Log("move Item from source to destination with item", source, destination, itemId, item, destItem);
			console.log("destItem", destItem)
			if (currencyCalculator.isItemNotFound(destItem)) {
				additions.push(new AddItemHolder(newItem,i));
			} else if (destItem !== undefined) {
				// @ts-ignore
				currencyCalculator.updateItemAddToArray(destination,destUpdates,destItem,quantity)
			}
		}
		let packet = null;
		if (source.isOwner) {
			if (deletes.length > 0) {
				await currencyCalculator.deleteItemsOnActor(source, deletes);
			}
			if (updates.length > 0) {
				await currencyCalculator.updateItemsOnActor(source,updates);
			}
		} else if (!allowNoTargetGM) {
			packet = new MoveItemsPacket();
			if (source.id) {
				packet.actorId = source.id;
			}
			packet.deletes = deletes;
			packet.updates = updates;



			let actorLink: boolean = !source.isToken
			Logger.Log("Token control" , source, actorLink)
			if (!actorLink) {
				if (source.parent) {
					// @ts-ignore
					let sceneId = canvas.scene.id;
					// @ts-ignore
					Logger.Log("Scene", canvas.scene.id)
					if (sceneId) {
						packet.sceneId = sceneId;
					}
					// @ts-ignore
					packet.tokenId = source.token.id;
					packet.actorLink = false;
				}
			}
			if (packet) {
				// @ts-ignore
				game.socket.emit(Globals.Socket, packet);
			}
		}
		console.log("Destination", destination)
		if (destination.isOwner) {
			console.log("Destination is owner")
			if (additions.length > 0) {
				await currencyCalculator.addItemsToActor(destination, additions);
			}

			if (destUpdates.length > 0) {
				// @ts-ignore
				await currencyCalculator.updateItemsOnActor(destination, destUpdates);
			}
		} else if (!allowNoTargetGM) {
			packet = new MoveItemsPacket();
			if (destination.id) {
				packet.actorId = destination.id;
			}
			packet.additions = additions;
			// @ts-ignore
			packet.updates = destUpdates;
			if (packet) {
				// @ts-ignore
				game.socket.emit(Globals.Socket, packet);
			}

		}

		return results;
	}

	public initModifiers(actor: Actor) {
		let priceModifier = actor.getFlag(Globals.ModuleName, "priceModifier");
		let sellModifier = actor.getFlag(Globals.ModuleName, "buyModifier");
		let sellerStack = actor.getFlag(Globals.ModuleName, "stackModifier");
		if (priceModifier === undefined) {
			actor.setFlag(Globals.ModuleName, "priceModifier", 1.0);
		}
		if (sellModifier === undefined) {
			actor.setFlag(Globals.ModuleName, "buyModifier", 0.5);
		}
		if (sellerStack === undefined) {
			actor.setFlag(Globals.ModuleName, "stackModifier", 20);
		}
		actor.render();
	}


	static async updateActorWithPacket(packet: MoveItemsPacket) {
		let actor: Actor | null = null;
		if (packet.actorLink) {
			// @ts-ignore
			actor = await game.actors.get(packet.actorId);
		} else {
			// @ts-ignore
			let scene: Scene = await game.scenes.get(packet.sceneId);

			// @ts-ignore
			let token: TokenDocument = await scene.tokens.get(packet.tokenId);
			if (token.getActor()) {
				actor = token.getActor();
			}
		}
		if (!actor) {
			return;
		}
		Logger.Log("Actor updating", actor);
		if (packet.deletes.length > 0) {
			await currencyCalculator.deleteItemsOnActor(actor,packet.deletes)
			Logger.Log("delete Items ", packet.deletes)
		}

		if (packet.updates.length > 0) {
			Logger.Log("update packet Items ", packet.updates)
			await currencyCalculator.updateItemsOnActor(actor,packet.updates)
		}

		if (packet.additions.length > 0) {
			Logger.Log("add Items ", packet.additions)
			await currencyCalculator.addItemsToActor(actor,packet.additions)
		}
	}

	onGeneratorSelectorChanged(event: JQuery.ChangeEvent<any, null, any, any>) {
		let expandedElement: HTMLElement | null = document.getElementById('merchant-table');
		let hideElement: HTMLElement | null = document.getElementById('merchant-compendium');
		if (event.currentTarget.value !== 'table') {
			hideElement = document.getElementById('merchant-table');
			expandedElement = document.getElementById('merchant-compendium');
		}
		if (expandedElement != null && hideElement != null) {
			expandedElement.hidden = false
			expandedElement.classList.add("expanded")
			hideElement.hidden = true
			hideElement.classList.remove("expanded")
		}
	}

	showItemToPlayers(event: JQuery.ClickEvent, actor: Actor, toggle: boolean) {
		let li = $(event.currentTarget).parents(".merchant-item"),
			item = actor.items.get(li.data("item-id"))
		item?.setFlag(Globals.ModuleName, "showItem", toggle);
	}

	isItemShown(item: Item) {
		let showItem: boolean | undefined = <boolean | undefined>item.getFlag(Globals.ModuleName, "showItem")
		return (showItem === undefined || showItem)
	}

	static async updateCurrencyWithPacket(packet: MerchantCurrencyPacket) {
		let actor: Actor | null = null;
		if (packet.actorLink) {
			// @ts-ignore
			actor = await game.actors.get(packet.actorId);
		} else {
			// @ts-ignore
			let scene: Scene = await game.scenes.get(packet.sceneId);

			// @ts-ignore
			let token: TokenDocument = await scene.tokens.get(packet.tokenId);
			if (token.getActor()) {
				actor = token.getActor();
			}
		}
		if (!actor) {
			return;
		}
		if (packet.action === CurrencyAction.Subtract) {
			currencyCalculator.subtractAmountFromActor(actor, packet.currency, packet.price);
		} else if (packet.action === CurrencyAction.Add) {
			currencyCalculator.addAmountForActor(actor, packet.currency, packet.price);
		}
	}
}

let helper = new MerchantSheetNPCHelper();


export default MerchantSheetNPCHelper;