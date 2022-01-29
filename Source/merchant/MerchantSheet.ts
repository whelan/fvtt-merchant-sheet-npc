import Globals from "../Globals";
import Logger from "../Utils/Logger";
import MerchantSheetData from "./MerchantSheetData";
import MerchantSheetNPCHelper from "./MerchantSheetNPCHelper";
import PermissionPlayer from "./PermissionPlayer";
import {
	ItemData,
	TableResultData
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import CurrencyCalculator from "./systems/CurrencyCalculator";
import MerchantSettings from "../Utils/MerchantSettings";
import QuantityChanger from "./model/QuantityChanger";
import MerchantGenerator from "./model/MerchantGenerator";

let currencyCalculator: CurrencyCalculator;
let merchantSheetNPC = new MerchantSheetNPCHelper();
const csvParser = require('csv-parse/lib/sync');


class MerchantSheet extends ActorSheet {

	get template() {
		currencyCalculator = merchantSheetNPC.systemCurrencyCalculator();
		let g = game as Game;
		Handlebars.registerHelper('equals', function (arg1, arg2, options) {
			// @ts-ignore
			return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
		});
		Handlebars.registerHelper('inputStyle', function (options) {
			return currencyCalculator.inputStyle();
		});

		Handlebars.registerHelper('sectionStyle', function (options) {
			return currencyCalculator.sectionStyle();
		});

		Handlebars.registerHelper('editorStyle', function (options) {
			return currencyCalculator.editorStyle();
		});

		Handlebars.registerHelper('shouldItemBeVisible', function (quantity, isGM, options) {
			return isGM || quantity > 0;
		});

		Handlebars.registerHelper('getItemQuantity', function (quantity, options) {
			return currencyCalculator.getQuantity(quantity);
		});

		Handlebars.registerHelper('getItemWeight', function (itemData, options) {
			return currencyCalculator.getWeight(itemData);
		});
		Handlebars.registerHelper('getPriceCurrency', function () {
			return currencyCalculator.currency();
		});

		Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
			// @ts-ignore
			return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
		});
		Handlebars.registerHelper('isPermissionShown', function () {
			return currencyCalculator.isPermissionShown();
		});


		Handlebars.registerHelper('itemSelected', function (key: string): string {
			let selectedKey: any = (<Game>game).settings.get(Globals.ModuleName, "itemCompendium")
			console.log(key, " - ", selectedKey)
			if (key === selectedKey) {
				return 'selected';
			}
			return '';
		});

		Handlebars.registerHelper('getTypeLocalized', function (key: string): string {
			return (<Game>game).i18n.localize("MERCHANTNPC." + key)
		});

		Handlebars.registerHelper('merchantsheetprice', function (basePrice, modifier) {
			if (modifier === 'undefined') {
				// @ts-ignore
				this.actor.setFlag(Globals.ModuleName, "priceModifier", 1.0);
				modifier = 1.0;
			}
			// if (!stackModifier) await this.actor.setFlag(m oduleName, "stackModifier", 20);

			return currencyCalculator.getPriceOutputWithModifier(basePrice, modifier);
		});

		Handlebars.registerHelper('merchantsheetstackweight', function (weight, qty, infinity) {
			let showStackWeight = g.settings.get(Globals.ModuleName, "showStackWeight");
			if (showStackWeight) {
				let value = weight * qty;
				if (qty === Number.MAX_VALUE || value > 1000000000 || infinity) {
					return "/-"
				} else {
					return `/${value.toLocaleString('en')}`;
				}
			} else {
				return ""
			}

		});

		Handlebars.registerHelper('merchantsheetweight', function (weight) {
			return (Math.round(weight * 1e5) / 1e5).toString();
		});

		Handlebars.registerHelper('itemInfinity', function (qty, infinity) {
			return infinity || (qty === Number.MAX_VALUE)
		});

		return getSheetTemplateName();
	}

	static get defaultOptions() {
		const options = super.defaultOptions;

		mergeObject(options, {
			classes: ["sheet actor npc npc-sheet merchant-sheet-npc wfrp4e"],
			width: 890,
			height: 750
		});
		return options;
	}

	getData(options: any): any {

		// @ts-ignore
		const sheetData: MerchantSheetData = super.getData();
		if (!isActorMerchant(sheetData.actor)) {
			return;
		}
		currencyCalculator = merchantSheetNPC.systemCurrencyCalculator();

		let g = game as Game;

		// Prepare GM Settings

		// @ts-ignore
		let merchant = this.prepareGMSettings(sheetData.actor);

		// Prepare isGM attribute in sheet Data

		if (g.user?.isGM) {
			sheetData.isGM = true;
		} else {
			sheetData.isGM = false;
		}

		sheetData.isPermissionShown = sheetData.isGM && currencyCalculator.isPermissionShown();

		let priceModifier: number = 1.0;
		let moduleName = "merchantsheetnpc";
		priceModifier = <number>this.actor.getFlag(moduleName, "priceModifier");
		sheetData.infinity = <boolean>this.actor.getFlag(moduleName, "infinity");
		sheetData.isService = <boolean>this.actor.getFlag(moduleName, "service");

		let stackModifier: number = 20;
		stackModifier = <number>this.actor.getFlag(moduleName, "stackModifier");
		let totalWeight = 0;

		sheetData.totalItems = this.actor.data.items.size;
		sheetData.priceModifier = priceModifier;
		sheetData.stackModifier = stackModifier;

		sheetData.sections = currencyCalculator.prepareItems(this.actor.itemTypes);
		sheetData.merchant = merchant;
		sheetData.owner = sheetData.isGM;
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
			let player = <PermissionPlayer>p;
			//     // get the name of the primary actor for a player
			// @ts-ignore
			const actor = g.actors.get(player.data.character);
			//
			if (actor) {
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

	async _onDropItemCreate(itemData: PropertiesToSource<ItemData>) {
		return currencyCalculator.onDropItemCreate(itemData, this);
	}

	async callSuperOnDropItemCreate(itemData: PropertiesToSource<ItemData>) {
		// Create the owned item as normal
		return super._onDropItemCreate(itemData);
	}

	onItemCreate(event: any) {
		event.preventDefault();
		const header = event.currentTarget;
		console.log(header)
		console.log(header.dataset)
		const type = header.dataset.type;
		const itemData = {
			name: (<Game>game).i18n.format("MERCHANTNPC.item-new", {type: (<Game>game).i18n.localize(`MERCHANTNPC.${type.toLowerCase()}`)}),
			type: type,
			data: foundry.utils.deepClone(header.dataset)
		};
		delete itemData.data.type;
		return this.actor.createEmbeddedDocuments("Item", [itemData]);
	}

	onItemEdit(event: any) {
		event.preventDefault();
		// @ts-ignore
		let itemId: string = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
		const item = this.actor.items.get(itemId);

		// @ts-ignore
		return item.sheet.render(true);
	}

	activateListeners(html: JQuery) {
		super.activateListeners(html);
		// Toggle Permissions
		html.find('.permission-proficiency').on('click', ev => this.onCyclePermissionProficiency(ev));
		html.find('.permission-proficiency-bulk').on('click', ev => this.onCyclePermissionProficiencyBulk(ev));
		//
		// // Price Modifier
		html.find('.price-modifier').on('click', ev => this.buyFromMerchantModifier(ev));
		html.find('.buy-modifier').on('click', ev => this.sellToMerchantModifier(ev));
		html.find('.stack-modifier').on('click', ev => this.stackModifier(ev));
		html.find('.csv-import').on('click', ev => this.csvImport(ev));
		html.find('.generator').on('click', ev => this.generator(ev));
		// @ts-ignore
		html.find('.change-quantity-all').on('click', ev => this.changeQuantityForItems(ev));
		html.find('.merchant-settings').on('click', ev => this.merchantSettingChange(ev));
		// html.find('.merchant-settings').change(ev => this.merchantSettingChange(ev));
		// html.find('.update-inventory').on('click',ev => this.merchantInventoryUpdate(ev));
		//
		// // Buy Item
		html.find('.item-buy').on('click', ev => this.buyItem(ev));
		html.find('.item-buystack').on('click', ev => this.buyItem(ev, 1));
		html.find('.item-delete').on('click', ev => merchantSheetNPC.deleteItem(ev, this.actor));
		html.find('.change-item-quantity').on('click', ev => merchantSheetNPC.changeQuantity(ev, this.actor));
		html.find('.change-item-price').on('click', ev => merchantSheetNPC.changePrice(ev, this.actor));
		html.find('.merchant-item .item-name').on('click', event => merchantSheetNPC.onItemSummary(event, this.actor));
		html.find(".item-add").on('click', this.onItemCreate.bind(this));
		html.find(".item-edit").on('click', this.onItemEdit.bind(this));
	}

	// async merchantInventoryUpdate(event: JQuery.ClickEvent) {
	// 	event.preventDefault();
	//
	// 	const moduleNamespace = "merchantsheetnpc";
	// 	const rolltableName = this.actor.getFlag(moduleNamespace, "rolltable");
	// 	const shopQtyFormula = this.actor.getFlag(moduleNamespace, "shopQty") || "1";
	// 	const itemQtyFormula = this.actor.getFlag(moduleNamespace, "itemQty") || "1";
	// 	const itemQtyLimit = this.actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
	// 	const clearInventory = this.actor.getFlag(moduleNamespace, "clearInventory");
	// 	const itemOnlyOnce = this.actor.getFlag(moduleNamespace, "itemOnlyOnce");
	// 	const reducedVerbosity = game.settings.get(moduleNamespace, "reduceUpdateVerbosity");
	//
	// 	let shopQtyRoll = new Roll(shopQtyFormula);
	// 	shopQtyRoll.roll();
	//
	// 	let rolltable = game.tables.getName(rolltableName);
	// 	if (!rolltable) {
	// 		// console.log(`Merchant sheet | No Rollable Table found with name "${rolltableName}".`);
	// 		return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
	// 	}
	//
	// 	if (itemOnlyOnce) {
	// 		if (rolltable.results.length < shopQtyRoll.total)  {
	// 			return ui.notifications.error(`Cannot create a merchant with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
	// 		}
	// 	}
	//
	// 	// console.log(rolltable);
	//
	// 	if (clearInventory) {
	//
	// 		let currentItems = this.actor.data.items.map(i => i._id);
	// 		await this.actor.deleteEmbeddedDocuments("Item", currentItems);
	// 		// console.log(currentItems);
	// 	}
	//
	// 	console.log(`Merchant sheet | Adding ${shopQtyRoll.result} new items`);
	//
	// 	if (!itemOnlyOnce) {
	// 		for (let i = 0; i < shopQtyRoll.total; i++) {
	// 			const rollResult = rolltable.roll();
	// 			//console.log(rollResult);
	// 			let newItem = null;
	//
	// 			if (rollResult.results[0].collection === "Item") {
	// 				newItem = game.items.get(rollResult.results[0].resultId);
	// 			}
	// 			else {
	// 				// Try to find it in the compendium
	// 				const items = game.packs.get(rollResult.results[0].collection);
	// 				// console.log(items);
	// 				// dnd5eitems.getIndex().then(index => console.log(index));
	// 				// let newItem = dnd5eitems.index.find(e => e.id === rollResult.results[0].resultId);
	// 				// items.getEntity(rollResult.results[0].resultId).then(i => console.log(i));
	// 				newItem = await items.getEntity(rollResult.results[0].resultId);
	// 			}
	// 			if (!newItem || newItem === null) {
	// 				// console.log(`Merchant sheet | No item found "${rollResult.results[0].resultId}".`);
	// 				return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);
	// 			}
	//
	// 			if (newItem.type === "spell") {
	// 				newItem = await Item5e.createScrollFromSpell(newItem)
	// 			}
	//
	// 			let itemQtyRoll = new Roll(itemQtyFormula);
	// 			itemQtyRoll.roll();
	// 			console.log(`Merchant sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)
	//
	// 			// newitem.data.data.quantity = itemQtyRoll.result;
	//
	// 			let existingItem = this.actor.items.find(item => item.data.name == newItem.name);
	//
	// 			if (existingItem === undefined) {
	// 				await this.actor.createEmbeddedDocuments("Item", newItem);
	// 				console.log(`Merchant sheet | ${newItem.name} does not exist.`);
	// 				existingItem = this.actor.items.find(item => item.data.name == newItem.name);
	//
	// 				if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
	// 					await existingItem.update({ "data.quantity": itemQtyLimit });
	// 					if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
	// 				} else {
	// 					await existingItem.update({ "data.quantity": itemQtyRoll.total });
	// 					if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
	// 				}
	// 			}
	// 			else {
	// 				console.log(`Merchant sheet | Item ${newItem.name} exists.`);
	//
	// 				let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);
	//
	// 				if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
	// 					if (!reducedVerbosity) ui.notifications.info(`${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
	// 				}
	// 				else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
	// 					//console.log("Exceeds existing quantity, limiting");
	// 					await existingItem.update({ "data.quantity": itemQtyLimit });
	// 					if (!reducedVerbosity) ui.notifications.info(`Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
	// 				} else {
	// 					await existingItem.update({ "data.quantity": newQty });
	// 					if (!reducedVerbosity) ui.notifications.info(`Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
	// 				}
	// 			}
	// 		}
	// 	}
	// 	else {
	// 		// Get a list which contains indexes of all possible results
	//
	// 		const rolltableIndexes = []
	//
	// 		// Add one entry for each weight an item has
	// 		for (let index in [...Array(rolltable.results.length).keys()]) {
	// 			let numberOfEntries = rolltable.data.results[index].weight
	// 			for (let i = 0; i < numberOfEntries; i++) {
	// 				rolltableIndexes.push(index);
	// 			}
	// 		}
	//
	// 		// Shuffle the list of indexes
	// 		var currentIndex = rolltableIndexes.length, temporaryValue, randomIndex;
	//
	// 		// While there remain elements to shuffle...
	// 		while (0 !== currentIndex) {
	//
	// 			// Pick a remaining element...
	// 			randomIndex = Math.floor(Math.random() * currentIndex);
	// 			currentIndex -= 1;
	//
	// 			// And swap it with the current element.
	// 			temporaryValue = rolltableIndexes[currentIndex];
	// 			rolltableIndexes[currentIndex] = rolltableIndexes[randomIndex];
	// 			rolltableIndexes[randomIndex] = temporaryValue;
	// 		}
	//
	// 		// console.log(`Rollables: ${rolltableIndexes}`)
	//
	// 		let indexesToUse = [];
	// 		let numberOfAdditionalItems = 0;
	// 		// Get the first N entries from our shuffled list. Those are the indexes of the items in the roll table we want to add
	// 		// But because we added multiple entries per index to account for weighting, we need to increase our list length until we got enough unique items
	// 		while (true)
	// 		{
	// 			let usedEntries = rolltableIndexes.slice(0, shopQtyRoll.total + numberOfAdditionalItems);
	// 			// console.log(`Distinct: ${usedEntries}`);
	// 			let distinctEntris = [...new Set(usedEntries)];
	//
	// 			if (distinctEntris.length < shopQtyRoll.total) {
	// 				numberOfAdditionalItems++;
	// 				// console.log(`numberOfAdditionalItems: ${numberOfAdditionalItems}`);
	// 				continue;
	// 			}
	//
	// 			indexesToUse = distinctEntris
	// 			// console.log(`indexesToUse: ${indexesToUse}`)
	// 			break;
	// 		}
	//
	// 		for (const index of indexesToUse)
	// 		{
	// 			let itemQtyRoll = new Roll(itemQtyFormula);
	// 			itemQtyRoll.roll();
	//
	// 			let newItem = null
	//
	// 			if (rolltable.results[index].collection === "Item") {
	// 				newItem = game.items.get(rolltable.results[index].resultId);
	// 			}
	// 			else {
	// 				//Try to find it in the compendium
	// 				const items = game.packs.get(rolltable.results[index].collection);
	// 				newItem = await items.getEntity(rolltable.results[index].resultId);
	// 			}
	// 			if (!newItem || newItem === undefined) {
	// 				return ui.notifications.error(`No item found "${rolltable.results[index].resultId}".`);
	// 			}
	//
	// 			if (newItem.type === "spell") {
	// 				newItem = await Item5e.createScrollFromSpell(newItem)
	// 			}
	//
	// 			await this.actor.createEmbeddedDocuments("Item", newItem);
	// 			let existingItem = this.actor.items.find(item => item.data.name == newItem.name);
	//
	// 			if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
	// 				await existingItem.update({ "data.quantity": itemQtyLimit });
	// 				if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
	// 			} else {
	// 				await existingItem.update({ "data.quantity": itemQtyRoll.total });
	// 				if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
	// 			}
	// 		}
	// 	}
	// }


	private async merchantSettingChange(event: JQuery.ClickEvent) {
		event.preventDefault();
		const template_file = "modules/" + Globals.ModuleName + "/templates/settings.html";
		Logger.Log("infinity: ", this.actor.getFlag(Globals.ModuleName, "infinity"), this.actor)
		const template_data = {
			disableSell: this.actor.getFlag(Globals.ModuleName, "disableSell") ? "checked" : "",
			keepDepleted: this.actor.getFlag(Globals.ModuleName, "keepDepleted") ? "checked" : "",
			service: this.actor.getFlag(Globals.ModuleName, "service") ? "checked" : ""
		};
		const rendered_html = await renderTemplate(template_file, template_data);


		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.settings'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						this.actor.setFlag(Globals.ModuleName, "disableSell", MerchantSheetNPCHelper.getElementById("disable-sell").checked);
						this.actor.setFlag(Globals.ModuleName, "keepDepleted", MerchantSheetNPCHelper.getElementById("keep-depleted").checked);
						this.actor.setFlag(Globals.ModuleName, "service", MerchantSheetNPCHelper.getElementById("service").checked);

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

	// private async merchantSettingChange(event: JQuery.ChangeEvent<any, null, any, any>) {
	// 	event.preventDefault();
	// 	console.log("Merchant sheet | Merchant settings changed");
	//
	// 	const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce"];
	//
	// 	let targetKey = event.target.name.split('.')[3];
	//
	//
	// 	if (expectedKeys.indexOf(targetKey) === -1) {
	// 		console.log(`Merchant sheet | Error changing stettings for "${targetKey}".`);
	// 		return ui.notifications?.error((<Game>game).i18n.format("MERCHANTNPC.error-changeSettings", {target: targetKey}))
	// 	}
	//
	// 	if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
	// 		console.log(targetKey + " set to " + event.target.checked);
	// 		await this.actor.setFlag(Globals.ModuleName, targetKey, event.target.checked);
	// 	} else if (event.target.value) {
	// 		console.log(targetKey + " set to " + event.target.value);
	// 		await this.actor.setFlag(Globals.ModuleName, targetKey, event.target.value);
	// 	} else {
	// 		console.log(targetKey + " set to " + event.target.value);
	// 		await this.actor.unsetFlag(Globals.ModuleName, targetKey);
	// 	}
	// }

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
		const template_file = "modules/" + Globals.ModuleName + "/templates/buy_from_merchant.html";
		const template_data = {priceModifier: priceModifier};
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
						let newPriceModifier = MerchantSheet.getHtmlInputNumberValue("price-modifier-percent", document);
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

		const template_file = "modules/" + Globals.ModuleName + "/templates/sell_to_merchant.html";
		const template_data = {buyModifier: buyModifier};
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
						let priceModifier = MerchantSheet.getHtmlInputNumberValue("price-modifier-percent", document);
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


	async stackModifier(event: JQuery.ClickEvent) {
		event.preventDefault();

		let stackModifier = await this.actor.getFlag(Globals.ModuleName, "stackModifier");
		if (!stackModifier) stackModifier = 20;

		const template_file = "modules/" + Globals.ModuleName + "/templates/stack_modifier.html";
		const template_data = {stackModifier: stackModifier};
		const rendered_html = await renderTemplate(template_file, template_data);

		// @ts-ignore
		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.stack-modifier'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						let stackModifierValue = MerchantSheetNPCHelper.getElementById("stack-modifier").value;
						this.actor.setFlag(Globals.ModuleName, "stackModifier", parseInt(stackModifierValue))
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


	async generator(event: JQuery.ClickEvent) {
		event.preventDefault();

		const template_file = "modules/" + Globals.ModuleName + "/templates/generator.html";

		const template_data = {
			rolltables: (<Game>game).tables,
			compendiums: MerchantSettings.getCompendiumnsChoices(),
			data: {}
		};
		const rendered_html = await renderTemplate(template_file, template_data);

		function validateInput(generatorInput: MerchantGenerator) {
			if (!generatorInput.table) {
				ui.notifications?.error("For generating items a table needs to be selected")
				return false;
			}
			if (!generatorInput.shopItemsRoll || !Roll.validate(generatorInput.shopItemsRoll)) {
				ui.notifications?.error("A correct item roll formula needs to be used like 1d20 instead of " + generatorInput.shopItemsRoll)
				return false;
			}

			return true;
		}

		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.generator'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.generate'),

					callback: () => {
						Logger.Log("Generator called")
						let generatorInput = new MerchantGenerator(
							MerchantSheet.getHtmlInputStringValue("data.rolltable", document),
							MerchantSheet.getHtmlInputStringValue("data.shopQty", document),
							MerchantSheet.getHtmlInputStringValue("data.itemQty", document),
							MerchantSheet.getHtmlInputNumberValue("data.itemQtyLimit", document),
							MerchantSheet.getHtmlInputStringValue("data.itemPrice", document),
							MerchantSheet.getHtmlInputBooleanValue("data.clearInventory", document)
						);
						if (validateInput(generatorInput)) {
							this.generateItems(this.actor, generatorInput);
						}
						console.log("Generate: ", generatorInput);
						d.render(true);
					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => {
						Logger.Log("Generator finished")
					}
				}

			},
			default: "one"
		});
		d.render(true);

	}

	async csvImport(event: JQuery.ClickEvent) {

		event.preventDefault();

		const template_file = "modules/" + Globals.ModuleName + "/templates/csv-import.html";

		const template_data = {
			itemTypes: (<Game>game).system.documentTypes.Item,
			compendiums: MerchantSettings.getCompendiumnsChoices()
		};
		const rendered_html = await renderTemplate(template_file, template_data);


		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.csv-import'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						let csvInput = {
							pack: MerchantSheet.getHtmlInputStringValue("csv-pack-name", document),
							itemPack: MerchantSheet.getHtmlInputStringValue("csv-item-name", document),
							scrollStart: MerchantSheet.getHtmlInputStringValue("csv-scroll-name-value", document),
							priceCol: MerchantSheet.getHtmlInputStringValue("csv-price-value", document),
							nameCol: MerchantSheet.getHtmlInputStringValue("csv-name-value", document),
							skip: MerchantSheet.getHtmlInputBooleanValue("csv-skip-value", document),
							input: MerchantSheet.getHtmlInputStringValue("csv", document),
							type: MerchantSheet.getHtmlInputStringValue("csv-type-name", document)
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

	private static getHtmlInputStringValue(input: string, document: Document): string {
		return (<HTMLInputElement>document.getElementById(input)).value;
	}

	private static getHtmlInputNumberValue(input: string, document: Document): number {
		return parseInt((<HTMLInputElement>document.getElementById(input)).value, 10);
	}

	private static getHtmlInputBooleanValue(input: string, document: Document): boolean {
		return (<HTMLInputElement>document.getElementById(input)).checked;
	}

	async generateItems(actor: Actor, generatorInput: MerchantGenerator) {
		console.log(generatorInput.shopItemsRoll)
		let shopQtyRoll = new Roll(generatorInput.shopItemsRoll);
		console.log(shopQtyRoll)
		let itemsToGenerate: number | undefined = shopQtyRoll.roll({async: false}).total;
		console.log(itemsToGenerate);
		if(itemsToGenerate === undefined) {
			return ui.notifications?.error("Could not roll a number")
		}
		//
		// @ts-ignore
		let rolltable = (<Game>game).tables.getName(generatorInput.table);

		if (!rolltable) {
			console.log(`Merchant sheet | No Rollable Table found with name "${generatorInput.table}".`);
			return ui.notifications?.error(`No Rollable Table found with name "${generatorInput.table}".`);
		}
		let createItems: Item[] = [];
		for (let i = 0; i < itemsToGenerate; i++) {
			const rollResult = await rolltable.draw();
			console.log(rollResult);

			// @ts-ignore
			let newItem: Item | undefined= null;
			for (const drawItem of rollResult.results) {
				console.log(drawItem)
				let drawItemdata: TableResultData = drawItem.data;
				let collection: string | undefined = drawItemdata.collection
				// @ts-ignore
				let drawItemBase = drawItem.text;
				console.log("text for rollResult", drawItemBase, drawItemBase.startsWith("@Compendium"))

				if (drawItemBase.startsWith("@Compendium")) {
					if (collection === undefined) {
						console.log("Collection not found: ", collection)
						continue
					}
					let compendium = await (<Game>game).packs?.get(collection);
					if (compendium === undefined) {
						console.log("compendium not exist: ", compendium)
						continue
					}
					// @ts-ignore
					let item: Item = await compendium.getDocument(drawItemdata.resultId)
					console.log("Item found: ", item)
					let duplicatedItem = duplicate(item);
					if (generatorInput.itemQuantityRoll) {
						this.generateQuantity(duplicatedItem,generatorInput.itemQuantityRoll,generatorInput.itemQuantityMax);
					}
					// @ts-ignore
					createItems.push(duplicatedItem);
				}
			}

			// @ts-ignore
			// let rollTableItem = rollResult.results[0];
			// if (rollTableItem.collection === "Item") {
			// 	newItem = (<Game>game).items?.get(rollTableItem.resultId);
			// }
			// if (!newItem || newItem === null || newItem === undefined) {
			// 	// console.log(`Merchant sheet | No item found "${rollResult.results[0].resultId}".`);
			// 	return ui.notifications?.error(`No item found "${rollTableItem.resultId}".`);
			// }
			//
			// if (newItem.type === "spell") {
			// 	// @ts-ignore
			// 	newItem = await currencyCalculator.createScroll(newItem);
			// }

			// let itemQtyRoll = new Roll(itemQtyFormula);
			// itemQtyRoll.roll();
			// console.log(`Merchant sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)
			//
			// // newitem.data.data.quantity = itemQtyRoll.result;
			//
			// let existingItem = this.actor.items.find(item => item.data.name == newItem.name);
			//
			// if (existingItem === undefined) {
			// 	await this.actor.createEmbeddedDocuments("Item", newItem);
			// 	console.log(`Merchant sheet | ${newItem.name} does not exist.`);
			// 	existingItem = this.actor.items.find(item => item.data.name == newItem.name);
			//
			// 	if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
			// 		await existingItem.update({"data.quantity": itemQtyLimit});
			// 		if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
			// 	} else {
			// 		await existingItem.update({"data.quantity": itemQtyRoll.total});
			// 		if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
			// 	}
			// } else {
			// 	console.log(`Merchant sheet | Item ${newItem.name} exists.`);
			//
			// 	let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);
			//
			// 	if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
			// 		if (!reducedVerbosity) ui.notifications.info(`${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
			// 	} else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
			// 		//console.log("Exceeds existing quantity, limiting");
			// 		await existingItem.update({"data.quantity": itemQtyLimit});
			// 		if (!reducedVerbosity) ui.notifications.info(`Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
			// 	} else {
			// 		await existingItem.update({"data.quantity": newQty});
			// 		if (!reducedVerbosity) ui.notifications.info(`Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
			// 	}
			// }
		}
		console.log(createItems)
		// @ts-ignore
		await actor.createEmbeddedDocuments("Item", createItems)
		await this.collapseInventory(actor)
	}

	private generateQuantity(duplicatedItem: any, itemQuantityRoll: string, itemQuantityMax: number) {
		let roll = new Roll(itemQuantityRoll);
		let quantity: number | undefined = roll.roll({async: false}).total;
		if (quantity !== undefined && itemQuantityMax < quantity) {
			// @ts-ignore
			duplicatedItem.data.quantity = itemQuantityMax;
		} else if (quantity) {
			// @ts-ignore
			duplicatedItem.data.quantity = quantity;
		}

	}

	async createItemsFromCSV(actor: Actor, csvInput: any) {
		let startLine = 1;
		if (csvInput.skip) {
			startLine++;
		}
		const records = csvParser(csvInput.input, {
			columns: false,
			autoParse: true,
			skip_empty_lines: true,
			from_line: startLine
		});

		let itemPack = await this.findSpellPack(csvInput.itemPack);
		let spellPack = await this.findSpellPack(csvInput.pack)
		let nameCol = Number(csvInput.nameCol) - 1
		let priceCol = -1
		if (csvInput.priceCol !== undefined) {
			priceCol = Number(csvInput.priceCol) - 1
		}
		console.log("Merchant sheet | csvItems", records)
		for (let csvItem of records) {
			let price = 0;
			if (csvItem.length > 0 && csvItem[nameCol].length > 0) {
				let name = csvItem[nameCol].trim();
				if (priceCol >= 0) {
					price = csvItem[priceCol];
				}
				let storeItems: any[] = [];
				if (name.startsWith(csvInput.scrollStart) && spellPack !== undefined) {
					let nameSub = name.substr(csvInput.scrollStart.length, name.length).trim()
					let spellItem = await spellPack.index.filter(i => i.name === nameSub)
					for (const spellItemElement of spellItem) {
						let itemData = await spellPack.getDocument(spellItemElement._id);
						// @ts-ignore
						let itemFound = await currencyCalculator.createScroll(itemData.data)
						if (itemFound !== undefined) {
							// @ts-ignore
							storeItems.push(itemFound)
						}
					}
				} else {
					let items: any[] = [];
					if (itemPack !== undefined) {
						items = itemPack.index.filter(i => i.name === name)
						for (const itemToStore of items) {
							let loaded = await itemPack.getDocument(itemToStore._id);
							storeItems.push(duplicate(loaded))
						}
					}
					if (items.length === 0) {
						this.crateNewItem(name, price, csvInput.type, storeItems);
					}
				}
				for (let itemToStore of storeItems) {
					// @ts-ignore
					if (price > 0 && (itemToStore?.data?.price === undefined || itemToStore?.data?.price === 0)) {
						// @ts-ignore

						itemToStore.update({[currencyCalculator.getPriceItemKey()]: price});
					}
				}
				// @ts-ignore
				let existingItem = await actor.items.find(it => it.data.name == name);
				//
				// @ts-ignore
				if (existingItem === undefined) {
					// @ts-ignore
					console.log("Create item on actor: ", storeItems)
					// @ts-ignore
					await actor.createEmbeddedDocuments("Item", storeItems);
				} else {
					// @ts-ignore
					let newQty = currencyCalculator.getQuantity(existingItem.data.data.quantity) + Number(1);
					// @ts-ignore
					await existingItem.update({"data.quantity": newQty});
				}
			}
		}
		await this.collapseInventory(actor)
		return undefined;
	}

	private crateNewItem(name: string, price: number, type: string, storeItems: any[]) {
		const itemData = {
			name: name,
			type: type,
			data: foundry.utils.deepClone({type: 'consumable', price: price})
		};
		// @ts-ignore
		delete itemData.data.type;
		storeItems.push(itemData);
	}

	async findSpellPack(pack: any) {
		if (pack !== 'none') {
			return (await (<Game>game).packs.filter(s => s.metadata.name === pack))[0]
		}
		return undefined;
	}

	async collapseInventory(actor: Actor) {
		// @ts-ignore
		var groupBy = function (xs, key) {
			// @ts-ignore
			return xs.reduce(function (rv, x) {
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
			for (let extraItem of value) {
				if (itemToUpdateQuantity !== extraItem) {
					let newQty = currencyCalculator.getQuantity(itemToUpdateQuantity.data.data.quantity) + currencyCalculator.getQuantity(extraItem.data.data.quantity);
					await itemToUpdateQuantity.update({"data.quantity": newQty});
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
			Logger.Log("No Valid GM", allowNoTargetGM)
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
		if (!(<Game>game).user.actorId) {
			// @ts-ignore
			return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-noCharacter"));
		}

		let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
		let stackModifier = $(event.currentTarget).parents(".merchant-item").attr("data-item-stack");
		// @ts-ignore
		const item: ItemData = this.actor.getEmbeddedDocument("Item", itemId);
		// @ts-ignore
		if (currencyCalculator.getQuantity(item.data.data.quantity) <= 0) {
			return (ui.notifications || new Notifications).error((<Game>game).i18n.localize("MERCHANTNPC.invalidQuantity"));
		}
		const packet = {
			type: "buy",
			// @ts-ignore
			buyerId: (<Game>game).user.actorId,
			tokenId: this.token.id,
			itemId: itemId,
			quantity: 1,
			processorId: gmId
		};
		// @ts-ignore
		let service = this.token.actor.getFlag(Globals.ModuleName, "service");
		if (stack || event.shiftKey) {
			// @ts-ignore
			if (currencyCalculator.getQuantity(item.data.data.quantity) < stackModifier) {
				// @ts-ignore
				packet.quantity = currencyCalculator.getQuantity(item.data.data.quantity);
			} else {
				// @ts-ignore
				packet.quantity = stackModifier;
			}
			MerchantSheetNPCHelper.buyTransactionFromPlayer(packet)
		} else if (service) {
			packet.quantity = 1;
			MerchantSheetNPCHelper.buyTransactionFromPlayer(packet)
		} else {
			// @ts-ignore
			let d = new QuantityDialog((quantity) => {
					packet.quantity = quantity;
					MerchantSheetNPCHelper.buyTransactionFromPlayer(packet)
				},
				{
					acceptLabel: "Purchase"
				}
			);
			d.render(true);
		}
	}


	private async changeQuantityForItems(event: JQuery.ClickEvent<any, null, any, any>) {

		event.preventDefault();

		const template_file = "modules/" + Globals.ModuleName + "/templates/change_all_quantity.html";
		const template_data = {infinity: this.actor.getFlag(Globals.ModuleName, "infinity") ? "checked" : ""};
		const rendered_html = await renderTemplate(template_file, template_data);


		let d = new Dialog({
			title: (<Game>game).i18n.localize('MERCHANTNPC.quantity'),
			content: rendered_html,
			buttons: {
				one: {
					icon: '<i class="fas fa-check"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.update'),
					callback: () => {
						let quantityChanger = new QuantityChanger(MerchantSheetNPCHelper.getElementById("quantity-infinity").checked, MerchantSheetNPCHelper.getElementById("quantity-value").value);
						this.updateQuantityForAllItems(this.actor, quantityChanger)

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

	private updateQuantityForAllItems(actor: Actor, quantityChanger: QuantityChanger) {
		actor.setFlag(Globals.ModuleName, "infinity", quantityChanger.infinity);
		if (quantityChanger.infinity) {
			return;
		}

		let itemQtyFormula = MerchantSheetNPCHelper.getElementById("quantity-value").value
		if (!itemQtyFormula || /^\s*$/.test(itemQtyFormula)) {
			return;
		}
		let items = actor.items;
		let updates: Array<Record<string, unknown>> = [];
		items.forEach(item => {
			let itemQtyRoll = new Roll(itemQtyFormula);
			let itemId = item.id;
			let total = itemQtyRoll.roll({async: false}).total;
			updates.push({_id: itemId, [currencyCalculator.getQuantityKey()]: total});
		});
		actor.updateEmbeddedDocuments("Item", updates);
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
                    <label>` + (<Game>game).i18n.localize("MERCHANTNPC.quantity") + `:</label>
                    <input style="` + currencyCalculator.inputStyle() + `" type=number min="1" id="quantity" name="quantity" value="1">
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

function getSheetTemplateName() {
	return './modules/' + Globals.ModuleName + '/templates/npc-sheet.html';
}

function isActorMerchant(actor: Actor) {
	// @ts-ignore
	return actor._sheet?.template === getSheetTemplateName();
}

function checkInitModifiers(actor: Actor) {
	if (isActorMerchant(actor)) {
		merchantSheetNPC.initModifiers(actor);
	}

}

Hooks.on('updateActor', async function (actor: Actor, options: any, data: any) {
	checkInitModifiers(actor);
})

Hooks.on('createActor', async function (actor: Actor, options: any, data: any) {
	checkInitModifiers(actor);
})


Hooks.on('dropActorSheetData', async function (target: Actor, sheet: any, dragSource: any, user: any) {
	let disableSell = target.getFlag(Globals.ModuleName, "disableSell");
	if (disableSell !== undefined && disableSell) {
		return false;
	}

	// @ts-ignore
	function checkCompatable(a, b) {
		if (a == b) return false;
	}

	if (dragSource.type == "Item" && dragSource.actorId) {
		if (!target.data._id) {
			console.warn("Merchant sheet | target has no data._id?", target);
			return;
		}
		if (currencyCalculator.getQuantity(dragSource.data.data.quantity) <= 0) {
			(ui.notifications || new Notifications).error((<Game>game).i18n.localize("MERCHANTNPC.invalidQuantity"));
			return;
		}
		if (target.data._id == dragSource.actorId) return;  // ignore dropping on self
		let sourceActor = (<Game>game).actors?.get(dragSource.actorId);
		Logger.Log("Drop item", dragSource, target);

		if (sourceActor !== undefined && isActorMerchant(target)) {
			let actor = <Actor>sourceActor;
			// if both source and target have the same type then allow deleting original item.
			// this is a safety check because some game systems may allow dropping on targets
			// that don't actually allow the GM or player to see the inventory, making the item
			// inaccessible.
			console.log(target)
			// @ts-ignore
			let buyModifier: number = target.getFlag(Globals.ModuleName, "buyModifier")
			if (!buyModifier === undefined) buyModifier = 0.5;


			let itemPrice = currencyCalculator.getPriceFromItem(dragSource.data);
			let price = currencyCalculator.priceInText(buyModifier * itemPrice);
			var html = "<div>" + (<Game>game).i18n.format('MERCHANTNPC.sell-items-player', {
				name: dragSource.data.name,
				price: price
			}) + "</div>";
			html += '<div><input name="quantity-modifier" id="quantity-modifier" type="range" min="0" max="' + currencyCalculator.getQuantity(dragSource.data.data.quantity) + '" value="1" class="slider"></div>';
			html += '<div><label>' + (<Game>game).i18n.localize("MERCHANTNPC.quantity") + ':</label> <input style="' + currencyCalculator.inputStyle() + '" type=number min="0" max="' + currencyCalculator.getQuantity(dragSource.data.data.quantity) + '" value="1" id="quantity-modifier-display"></div> <input type="hidden" id="quantity-modifier-price" value = "' + (buyModifier * itemPrice) + '"/>';
			html += '<script>var pmSlider = document.getElementById("quantity-modifier"); var pmDisplay = document.getElementById("quantity-modifier-display"); var total = document.getElementById("quantity-modifier-total"); var price = document.getElementById("quantity-modifier-price"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value;  total.value =this.value * price.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';
			html += '<div>' + (<Game>game).i18n.localize("MERCHANTNPC.total") + '<input style="' + currencyCalculator.inputStyle() + '" readonly type="text"  value="' + (itemPrice * buyModifier) + '" id = "quantity-modifier-total"/> </div>';

			let d = new Dialog({
				title: (<Game>game).i18n.localize("MERCHANTNPC.sell-item"),
				content: html,
				buttons: {
					one: {
						icon: '<i class="fas fa-check"></i>',
						label: (<Game>game).i18n.localize('MERCHANTNPC.sell'),
						callback: () => {
							// @ts-ignore
							let quantity = MerchantSheet.getHtmlInputStringValue("quantity-modifier", document);
							let itemId = dragSource.data._id
							// addItemToActor(dragSource,target,quantity);
							merchantSheetNPC.moveItems(actor, target, [{itemId, quantity}], true);
							// @ts-ignore
							let value: number = MerchantSheet.getHtmlInputStringValue("quantity-modifier-total", document);
							// @ts-ignore
							merchantSheetNPC.sellItem(target, dragSource, sourceActor, quantity, value)
						}
					},
					two: {
						icon: '<i class="fas fa-times"></i>',
						label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
						callback: () => console.log("Merchant sheet | Price Modifier Cancelled")
					}
				},
				default: "two",
				close: () => console.log("Merchant sheet | Price Modifier Closed")
			});
			d.render(true);
		}
	}
});


export default MerchantSheet;