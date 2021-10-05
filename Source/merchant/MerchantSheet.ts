import Globals from "../Globals";
import Logger from "../Utils/Logger";
import MerchantSheetData from "./MerchantSheetData";
import MerchantSheetNPCHelper from "./MerchantSheetNPCHelper";
import PermissionPlayer from "./PermissionPlayer";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import Dnd5eCurrencyCalculator from "./systems/Dnd5eCurrencyCalculator";
import MerchantSettings from "../Utils/MerchantSettings";

let currencyCalculator: CurrencyCalculator;
let merchantSheetNPC = new MerchantSheetNPCHelper();

class MerchantSheet extends ActorSheet {

	get template() {
		currencyCalculator = merchantSheetNPC.systemCurrencyCalculator();
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
			// if (!stackModifier) await this.actor.setFlag(m oduleName, "stackModifier", 20);

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
		currencyCalculator = merchantSheetNPC.systemCurrencyCalculator();

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
				player.merchantPermission = merchantSheetNPC.getMerchantPermissionForPlayer(this.actor.data, player);
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

				player.icon = merchantSheetNPC.getPermissionIcon(player.merchantPermission);
				player.merchantPermissionDescription = merchantSheetNPC.getPermissionDescription(player.merchantPermission);
				playerData.push(player);
			}
		}

		return {
			players: playerData,
			observerCount: observers.length,
			playersPermission: commonPlayersPermission,
			playersPermissionIcon: merchantSheetNPC.getPermissionIcon(commonPlayersPermission),
			playersPermissionDescription: merchantSheetNPC.getPermissionDescription(commonPlayersPermission)
		}
	}


	async callSuperOnDropItemCreate(itemData: PropertiesToSource<ItemData>) {
		// Create the owned item as normal
		return super._onDropItemCreate(itemData);
	}

	activateListeners(html: JQuery) {
		super.activateListeners(html);
		// Toggle Permissions
		html.find('.permission-proficiency').click(ev => this.onCyclePermissionProficiency(ev));
		html.find('.permission-proficiency-bulk').click(ev => this.onCyclePermissionProficiencyBulk(ev));
		//
		// // Price Modifier
		html.find('.price-modifier').click(ev => this.buyFromMerchantModifier(ev));
		html.find('.buy-modifier').click(ev => this.sellToMerchantModifier(ev));
		html.find('.stack-modifier').click(ev => this.stackModifier(ev));
		html.find('.csv-import').click(ev => this.csvImport(ev));
		//
		// html.find('.merchant-settings').change(ev => this._merchantSettingChange(ev));
		// html.find('.update-inventory').click(ev => this._merchantInventoryUpdate(ev));
		//
		// // Buy Item
		html.find('.item-buy').click(ev => this.buyItem(ev));
		html.find('.item-buystack').click(ev => this.buyItem(ev, 1));
		html.find('.item-delete').click(ev => this.deleteItem(ev));
		html.find('.change-item-quantity').click(ev => this.changeQuantity(ev));
		html.find('.change-item-price').click(ev => merchantSheetNPC.changePrice(ev));
		html.find('.merchant-item .item-name').click(event => this.onItemSummary(event));

	}

	private onItemSummary(event: JQuery.ClickEvent) {
		event.preventDefault();
		let li = $(event.currentTarget).parents(".merchant-item"),
			item = this.actor.items.get(li.data("item-id")),
			// @ts-ignore
			chatData = item.getChatData({secrets: this.actor.isOwner});
		// Toggle summary
		if ( li.hasClass("expanded") ) {
			let summary = li.children(".merchant-item-summary");
			summary.slideUp(200, () => summary.remove());
		} else {
			let div = $(`<div class="merchant-item-summary">${chatData.description.value}</div>`);
			li.append(div.hide());
			div.slideDown(200);
		}
		li.toggleClass("expanded");
	}


	private onCyclePermissionProficiency(event: JQuery.ClickEvent) {

		event.preventDefault();

		let actorData = this.actor;

		let field = $(event.currentTarget).siblings('input[type="hidden"]');

		let newLevel = this.getNewLevel(field);

		let playerId = field[0].name;

		merchantSheetNPC.updatePermissions(actorData, playerId, newLevel, event);

		// @ts-ignore
		this._onSubmit(event);
	}

	private onCyclePermissionProficiencyBulk(event: JQuery.ClickEvent) {
		event.preventDefault();

		let actorData = this.actor.data;

		let field = $(event.currentTarget).parent().siblings('input[type="hidden"]');
		let newLevel = this.getNewLevel(field);

		let users = (<Game>game).users?.contents;

		let currentPermissions = duplicate(actorData.permission);
		if (users !== undefined) {
			for (let u of users) {
				if (u.data.role === 1 || u.data.role === 2) {
					// @ts-ignore
					currentPermissions[u.data._id] = newLevel;
				}
			}
			const merchantPermissions = new PermissionControl(this.actor);
			// @ts-ignore
			merchantPermissions._updateObject(event, currentPermissions)

			// @ts-ignore
			this._onSubmit(event);
		}
	}


	private getNewLevel(field: JQuery<HTMLElement>) {
		let level = 0;
		let fieldVal = field.val();
		if (typeof fieldVal === 'string') {
			level = parseFloat(fieldVal);
		}

		const levels = [0, 2]; //const levels = [0, 2, 3];

		let idx = levels.indexOf(level);
		return levels[(idx === levels.length - 1) ? 0 : idx + 1];
	}

	async buyFromMerchantModifier(event: JQuery.ClickEvent) {
		event.preventDefault();

		let priceModifier = await this.actor.getFlag(Globals.ModuleName, "priceModifier");
		if (priceModifier === 'undefined') priceModifier = 1.0;

		// @ts-ignore
		priceModifier = Math.round(priceModifier * 100);
		const template_file = "modules/"+Globals.ModuleName+"/templates/buy_from_merchant.html";
		const template_data = { priceModifier: priceModifier};
		const rendered_html = await renderTemplate(template_file, template_data);

		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.buyMerchantDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						let newPriceModifier = document.getElementById("price-modifier-percent").value;
						if (newPriceModifier === 0) {
							this.actor.setFlag(Globals.ModuleName, "priceModifier", 0)
						} else {
							// @ts-ignore
							this.actor.setFlag(Globals.ModuleName, "priceModifier", newPriceModifier / 100)
						}
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => Logger.Log("Price Modifier Cancelled")
				}
			},
			default: "two",
			close: () => Logger.Log("Price Modifier Closed")
		});
		d.render(true);
	}

	async sellToMerchantModifier(event: JQuery.ClickEvent) {
		event.preventDefault();

		let buyModifier = await this.actor.getFlag("merchantsheetnpc", "buyModifier");
		if (buyModifier === 'undefined') {
			buyModifier = 0.5;
		}

		// @ts-ignore
		buyModifier = Math.round(buyModifier * 100);

		const template_file = "modules/"+Globals.ModuleName+"/templates/sell_to_merchant.html";
		const template_data = { buyModifier: buyModifier};
		const rendered_html = await renderTemplate(template_file, template_data);

		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.sellToMerchantDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						let priceModifier = document.getElementById("price-modifier-percent").value;
						if (priceModifier === 0) {
							this.actor.setFlag(Globals.ModuleName, "buyModifier", 0)
						} else {
							this.actor.setFlag(Globals.ModuleName, "buyModifier", priceModifier / 100)
						}

					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Buy Modifier Cancelled")
				}
			},
			default: "two",
			close: () => console.log("Merchant sheet | Buy Modifier Closed")
		});
		d.render(true);
	}


	async changeQuantity(event: JQuery.ClickEvent) {
		event.preventDefault();
		console.log("Merchant sheet | Change quantity");
		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

		// @ts-ignore
		const item: Item = this.actor.getEmbeddedDocument("Item", itemId);
		const template_file = "modules/"+Globals.ModuleName+"/templates/change_quantity.html";
		// @ts-ignore
		const quantity = item.data.data.quantity;
		const infinityActivated = (quantity === Number.MAX_VALUE?'checked':'');
		// @ts-ignore
		const template_data = { quantity: quantity,
			infinity: infinityActivated
		};
		const rendered_html = await renderTemplate(template_file, template_data);
		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.quantityDialog-title'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						if (document.getElementById("quantity-infinity").checked) {
							this.actor.updateEmbeddedDocuments("Item",[{_id: itemId, "data.quantity": Number.MAX_VALUE}])
						} else {
							// @ts-ignore
							let newQuantity: number = document.getElementById("quantity-value").value;
							this.actor.updateEmbeddedDocuments("Item",[{
								_id: itemId,
								"data.quantity": newQuantity
							}])
						}
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Change quantity Cancelled")
				}
			},
			default: "two",
			close: () => console.log("Merchant sheet | Change quantity Closed")
		});
		d.render(true);
	}

	async stackModifier(event: JQuery.ClickEvent) {
		event.preventDefault();

		let stackModifier = await this.actor.getFlag(Globals.ModuleName, "stackModifier");
		if (!stackModifier) stackModifier = 20;

		const template_file = "modules/"+Globals.ModuleName+"/templates/stack_modifier.html";
		const template_data = { stackModifier: stackModifier};
		const rendered_html = await renderTemplate(template_file, template_data);

		// @ts-ignore
		let stackModifierValue = document.getElementById("stack-modifier").value;
		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.stack-modifier'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => this.actor.setFlag(Globals.ModuleName, "stackModifier",  stackModifierValue / 1)
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
				}
			},
			default: "two",
			close: () => console.log("Merchant sheet | Stack Modifier Closed")
		});
		d.render(true);
	}


	async csvImport(event: JQuery.ClickEvent) {
		event.preventDefault();

		const template_file = "modules/"+Globals.ModuleName+"/templates/csv-import.html";

		const template_data = {compendiums: MerchantSettings.getCompendiumnsChoices()};
		const rendered_html = await renderTemplate(template_file, template_data);


		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.csv-import'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						// @ts-ignore
						let pack = document.getElementById("csv-pack-name").value;
						// @ts-ignore
						let scrollStart = document.getElementById("csv-scroll-name-value").value;
						// @ts-ignore
						let priceCol = document.getElementById("csv-price-value").value;
						// @ts-ignore
						let nameCol = document.getElementById("csv-name-value").value;
						// @ts-ignore
						let input = document.getElementById("csv").value;
						let csvInput = {
							pack: pack,
							scrollStart: scrollStart,
							priceCol: priceCol,
							nameCol: nameCol,
							input: input
						}
						// @ts-ignore
						this.createItemsFromCSV(this.actor, csvInput)

					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
				}
			},
			default: "two",
			close: () => console.log("Merchant sheet | Stack Modifier Closed")
		});
		d.render(true);
	}

	async createItemsFromCSV(actor: Actor, csvInput: any) {
		let split = csvInput.input.split('\n');
		let csvItems = split.map(function mapCSV(text: string) {
			let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
			for (l of text) {
				if ('"' === l) {
					if (s && l === p) row[i] += l;
					s = !s;
				} else if ((',' === l || '|' === l) && s) l = row[++i] = '';
				else if ('\n' === l && s) {
					if ('\r' === p) row[i] = row[i].slice(0, -1);
					row = ret[++r] = [l = '']; i = 0;
				} else row[i] += l;
				p = l;
			}
			return ret;
		});

		let itemPack = (await (<Game>game).packs.filter(s => s.metadata.name === (<Game>game).settings.get(Globals.ModuleName, "itemCompendium")))[0];
		let spellPack = await this.findSpellPack(csvInput.pack)
		let nameCol = Number(csvInput.nameCol)-1
		let priceCol = -1
		if (csvInput.priceCol !== undefined) {
			priceCol = Number(csvInput.priceCol) - 1
		}
		console.log("Merchant sheet | csvItems", csvItems)
		for (let csvItem of csvItems) {
			if (csvItem[0].length > 0 && csvItem[0][0].length > 0) {
				let item = csvItem[0];
				let name = item[nameCol].trim();
				let price = 0
				if (priceCol >= 0) {
					price = item[priceCol];
				}
				let storeItems = [];
				if (name.startsWith(csvInput.scrollStart) && spellPack !== undefined) {
					let nameSub = name.substr(csvInput.scrollStart.length, name.length).trim()
					let spellItem = await spellPack.index.filter(i => i.name === nameSub)
					for (const spellItemElement of spellItem) {
						let itemData = await spellPack.getDocument(spellItemElement._id);
						// @ts-ignore
						let itemFound = await currencyCalculator.createScroll(itemData)
						if (itemFound !== undefined) {
							// @ts-ignore
							itemFound.data.name = itemFound.name;
							console.log("created item: ", itemFound)
							storeItems.push(itemFound.data)
						}
					}
				} else {
					let items = await itemPack.index.filter(i => i.name === name)
					for (const itemToStore of items) {
						let loaded = await itemPack.getDocument(itemToStore._id);
						storeItems.push(duplicate(loaded))
					}

				}
				for (let itemToStore of storeItems) {
					if (price > 0 && (itemToStore.data.price === undefined || itemToStore.data.price === 0)) {
						itemToStore.update({[currencyCalculator.getPriceItemKey()]: price});
					}
				}
				let existingItem = await actor.items.find(it => it.data.name == name);
				//
				if (existingItem === undefined) {
					console.log("Create item on actor: ", storeItems)
					await actor.createEmbeddedDocuments("Item", storeItems);
				}
				else {
					// @ts-ignore
					let newQty = Number(existingItem.data.data.quantity) + Number(1);
					await existingItem.update({ "data.quantity": newQty});
				}
			}
		}
		await this.collapseInventory(actor)
		return undefined;
	}

	private deleteItem(event: JQuery.ClickEvent) {
		event.preventDefault();
		console.log("Merchant sheet | Delete Item clicked");
		let itemId: string;
		// @ts-ignore
		itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
		this.actor.deleteEmbeddedDocuments("Item", [itemId]);
	}

	async findSpellPack(pack: any) {
		if (pack !== 'none') {
			return (await (<Game>game).packs.filter(s => s.metadata.name === pack))[0]
		}
		return undefined;
	}

	async collapseInventory(actor: Actor) {
		// @ts-ignore
		var groupBy = function(xs, key) {
			// @ts-ignore
			return xs.reduce(function(rv, x) {
				(rv[x[key]] = rv[x[key]] || []).push(x);
				return rv;
			}, {});
		};
		let itemGroupList = groupBy(actor.items, 'name');
		let itemsToBeDeleted = [];
		for (const [key, value] of Object.entries(itemGroupList)) {
			// @ts-ignore
			var itemToUpdateQuantity = value[0];
			// @ts-ignore
			for(let extraItem of value) {
				if (itemToUpdateQuantity !== extraItem) {
					let newQty = Number(itemToUpdateQuantity.data.data.quantity) + Number(extraItem.data.data.quantity);
					await itemToUpdateQuantity.update({ "data.quantity": newQty});
					itemsToBeDeleted.push(extraItem.id);
				}
			}
		}
		await actor.deleteEmbeddedDocuments("Item", itemsToBeDeleted);
	}

	buyItem(event: JQuery.ClickEvent, stack: number = 0) {
		event.preventDefault();
		console.log("Merchant sheet | Buy Item clicked");

		let targetGm: any = null;
		(<Game>game).users?.forEach((u) => {
			if (u.isGM && u.active && u.viewedScene === (<Game>game).user?.viewedScene) {
				targetGm = u;
			}
		});
		let allowNoTargetGM = (<Game>game).settings.get("merchantsheetnpc", "allowNoGM")
		let gmId = null;

		if (!allowNoTargetGM && !targetGm) {
			Logger.Log("No Valid GM",allowNoTargetGM)
			// @ts-ignore
			return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-noGM"));
		} else if (!allowNoTargetGM) {
			gmId = targetGm.data._id;
		}

		if (this.token === null) {
			// @ts-ignore
			return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-noToken"));
		}
		// @ts-ignore
		if (!game.user.actorId) {
			// @ts-ignore
			return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-noCharacter"));
		}

		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
		let stackModifier = $(event.currentTarget).parents(".merchant-item").attr("data-item-stack");
		// @ts-ignore
		const item: ItemData = this.actor.getEmbeddedDocument("Item", itemId);

		const packet = {
			type: "buy",
			// @ts-ignore
			buyerId: (<Game>game).user.actorId,
			tokenId: this.token.id,
			itemId: itemId,
			quantity: 1,
			processorId: gmId
		};
		console.log(stackModifier)
		// @ts-ignore
		console.log(item.data.data.quantity)

		if (stack || event.shiftKey) {
			// @ts-ignore
			if (item.data.data.quantity < stackModifier) {
				// @ts-ignore
				packet.quantity = item.data.data.quantity;
			} else {
				// @ts-ignore
				packet.quantity = stackModifier;
			}
			// if (allowNoTargetGM) {
				// @ts-ignore
			MerchantSheetNPCHelper.buyTransactionFromPlayer(packet)
			// } else {
			// 	console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
			// 	(<Game>game).socket?.emit(Globals.Socket, packet);
			// }
			return;
		}

		// @ts-ignore
		let d = new QuantityDialog((quantity) => {
				packet.quantity = quantity;
				// if (allowNoTargetGM) {
					MerchantSheetNPCHelper.buyTransactionFromPlayer(packet)
				// } else {
				// 	console.log("MerchantSheet.ts", "Sending buy request to " + targetGm.name, packet);
				// 	MerchantSheetNPCHelper.buyTransactionFromPlayer(packet);
				// }
			},
			{
				acceptLabel: "Purchase"
			}
		);
		d.render(true);
	}


}
class QuantityDialog extends Dialog {
	constructor(callback: any, options: any) {
		if (typeof (options) !== "object") {
			options = {};
		}

		let applyChanges = false;
		super({
			title: (<Game>game).i18n.localize("MERCHANTNPC.quantity"),
			content: `
            <form>
                <div class="form-group">
                    <label>` + (<Game>game).i18n.localize("MERCHANTNPC.quantity")+ `:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="1">
                </div>
            </form>`,
			buttons: {
				yes: {
					icon: "<i class='fas fa-check'></i>",
					label: options.acceptLabel ? options.acceptLabel : (<Game>game).i18n.localize("MERCHANTNPC.item-buy"),
					callback: () => applyChanges = true
				},
				no: {
					icon: "<i class='fas fa-times'></i>",
					label: (<Game>game).i18n.localize("MERCHANTNPC.cancel")
				},
			},
			default: "yes",
			close: () => {
				if (applyChanges) {
					// @ts-ignore
					var quantity = document.getElementById('quantity').value

					if (isNaN(quantity)) {
						// @ts-ignore
						return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-quantityInvalid"))
					}

					callback(quantity);

				}
			}
		});
	}
}
class SellerQuantityDialog extends Dialog {
	constructor(callback: any, options: any) {
		if (typeof (options) !== "object") {
			options = {};
		}

		let applyChanges = false;
		super({
			title: (<Game>game).i18n.localize("MERCHANTNPC.quantity"),
			content: `
            <form>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="{{test}}">
                </div>
            </form>`,
			buttons: {
				yes: {
					icon: "<i class='fas fa-check'></i>",
					label: options.acceptLabel ? options.acceptLabel : (<Game>game).i18n.localize("MERCHANTNPC.sell"),
					callback: () => applyChanges = true
				},
				no: {
					icon: "<i class='fas fa-times'></i>",
					label: (<Game>game).i18n.localize("MERCHANTNPC.cancel")
				},
			},
			default: "yes",
			close: () => {
				if (applyChanges) {
					// @ts-ignore
					var quantity = document.getElementById('quantity').value

					if (isNaN(quantity)) {
						// @ts-ignore
						return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-quantityInvalid"))
					}

					callback(quantity);

				}
			}
		});
	}
}

export default MerchantSheet;