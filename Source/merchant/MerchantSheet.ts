import Globals from "../Globals";
import Logger from "../Utils/Logger";
import MerchantSheetData from "./model/MerchantSheetData";
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
import {GeneratorWindow} from "./windows/GeneratorWindow";
import HandlebarHelpersMerchantSheet from "./MerchantSheetHandlebarHelpers";
import MerchantDragSource from "./model/MerchantDragSource";

let currencyCalculator: CurrencyCalculator;
let merchantSheetNPC = new MerchantSheetNPCHelper();
const csvParser = require('csv-parse/lib/sync');

class MerchantSheet extends ActorSheet {

	get template() {
		currencyCalculator = merchantSheetNPC.systemCurrencyCalculator();
		new HandlebarHelpersMerchantSheet().registerHelpers(currencyCalculator,merchantSheetNPC);
		Handlebars.registerHelper('getQuantity', function (itemData, options) {
			return currencyCalculator.getQuantityNumber(itemData);
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

		sheetData.limitedCurrency = <boolean>this.actor.getFlag(Globals.ModuleName, "limitedCurrency");
		let priceModifier: number = <number>this.actor.getFlag(Globals.ModuleName, "priceModifier");
		sheetData.infinity = <boolean>this.actor.getFlag(Globals.ModuleName, "infinity");
		sheetData.isService = <boolean>this.actor.getFlag(Globals.ModuleName, "service");
		sheetData.isBuyStack = !(<boolean>this.actor.getFlag(Globals.ModuleName, "hideBuyStack"));
		let stackModifier: number = <number>this.actor.getFlag(Globals.ModuleName, "stackModifier");

		sheetData.totalItems = this.actor.data.items.size;
		sheetData.priceModifier = priceModifier;
		sheetData.stackModifier = stackModifier;
		sheetData.currencies = currencyCalculator.merchantCurrency(this.actor);
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

		html.find('.currency-update').on('click', ev => this.updateMerchantCurrencies(ev));
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
		html.find('.items-list .items-header').on('click', event => merchantSheetNPC.onSectionSummary(event));
		html.find('.gm-section').on('click', event => merchantSheetNPC.onSectionSummary(event));
		html.find(".item-add").on('click', this.onItemCreate.bind(this));
		html.find(".item-edit").on('click', this.onItemEdit.bind(this));
		html.find(".item-show").on('click', event =>merchantSheetNPC.showItemToPlayers(event, this.actor,true));
		html.find(".item-hide").on('click', event => merchantSheetNPC.showItemToPlayers(event, this.actor,false));
	}


	private async merchantSettingChange(event: JQuery.ClickEvent) {
		event.preventDefault();
		const template_file = "modules/" + Globals.ModuleName + "/templates/settings.html";
		Logger.Log("infinity: ", this.actor.getFlag(Globals.ModuleName, "infinity"), this.actor)
		const template_data = {
			disableSell: this.actor.getFlag(Globals.ModuleName, "disableSell") ? "checked" : "",
			limitedCurrency: this.actor.getFlag(Globals.ModuleName, "limitedCurrency") ? "checked" : "",
			keepDepleted: this.actor.getFlag(Globals.ModuleName, "keepDepleted") ? "checked" : "",
			service: this.actor.getFlag(Globals.ModuleName, "service") ? "checked" : "",
			hideBuyStack: this.actor.getFlag(Globals.ModuleName, "hideBuyStack") ? "checked" : "",
			maxBuyPercentage: this.actor.getFlag(Globals.ModuleName, "maxBuyPercentage")
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
						this.actor.setFlag(Globals.ModuleName, "limitedCurrency", MerchantSheetNPCHelper.getElementById("limited-currency").checked);
						this.actor.setFlag(Globals.ModuleName, "keepDepleted", MerchantSheetNPCHelper.getElementById("keep-depleted").checked);
						this.actor.setFlag(Globals.ModuleName, "service", MerchantSheetNPCHelper.getElementById("service").checked);
						this.actor.setFlag(Globals.ModuleName, "hideBuyStack", MerchantSheetNPCHelper.getElementById("hide-buy-stack").checked);
						this.actor.setFlag(Globals.ModuleName, "maxBuyPercentage", MerchantSheetNPCHelper.getElementById("max-buy-percentage").value);

					}
				},
				two: {
					icon: '<i class="fas fa-times"></i>',
					label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
					callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
				}
			},
			default: "one",
			close: () => console.log("Merchant sheet | Stack Modifier Closed")
		});
		d.render(true);
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
		let maxValue = await this.actor.getFlag(Globals.ModuleName, "maxBuyPercentage");
		if (maxValue === undefined) {
			maxValue = 200;
		}
		console.log("maxValue",maxValue)
		if (priceModifier === 'undefined') priceModifier = 1.0;

		// @ts-ignore
		priceModifier = Math.round(priceModifier * 100);
		const template_file = "modules/" + Globals.ModuleName + "/templates/buy_from_merchant.html";
		const template_data = {priceModifier: priceModifier, maxValue: maxValue};
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
			default: "one",
			close: () => Logger.Log("Price Modifier Closed")
		});
		d.render(true);
	}

	async sellToMerchantModifier(event: JQuery.ClickEvent) {
		event.preventDefault();

		let buyModifier = await this.actor.getFlag(Globals.ModuleName, "buyModifier");
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
			default: "one",
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
			default: "one",
			close: () => console.log("Merchant sheet | Stack Modifier Closed")
		});
		d.render(true);
	}


	async generator(event: JQuery.ClickEvent) {
		event.preventDefault();
		new GeneratorWindow(this.actor,{}).render(true);
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
			default: "one",
			close: () => console.log("Merchant sheet | Stack Modifier Closed")
		});
		d.render(true);
	}

	static getHtmlInputStringValue(input: string, document: Document): string {
		return (<HTMLInputElement>document.getElementById(input)).value;
	}

	static getHtmlInputNumberValue(input: string, document: Document): number {
		return parseInt((<HTMLInputElement>document.getElementById(input)).value, 10);
	}

	static getHtmlInputBooleanValue(input: string, document: Document): boolean {
		return (<HTMLInputElement>document.getElementById(input)).checked;
	}

	public static async generateItems(actor: Actor, generatorInput: MerchantGenerator) {
		let itemsToGenerate: number | undefined = 1;

		if (generatorInput.shopItemsRoll) {
			let shopQtyRoll = new Roll(generatorInput.shopItemsRoll);
			itemsToGenerate = shopQtyRoll.roll({async: false}).total;
		}
		if (generatorInput.clearShop) {
			let ids = actor.items.map(i => MerchantSheet.getIdFromField(i));
			await actor.deleteEmbeddedDocuments("Item", ids);
		}
		if(itemsToGenerate === undefined) {
			return ui.notifications?.error("Could not roll a number")
		}
		let createItems: Item[] = [];
		if (generatorInput.selected === 'table') {
			// @ts-ignore
			let rolltable = (<Game>game).tables.getName(generatorInput.table);

			if (!rolltable) {
				console.log(`Merchant sheet | No Rollable Table found with name "${generatorInput.table}".`);
				return ui.notifications?.error(`No Rollable Table found with name "${generatorInput.table}".`);
			}
			for (let i = 0; i < itemsToGenerate; i++) {
				let results: TableResult[]
				if (generatorInput.importAllItems) {
					results = rolltable.results.contents;
				} else {
					// @ts-ignore
					const rollResult = await rolltable.draw({ displayChat: false });
					results = rollResult.results
				}

				for (const drawItem of results) {
					let drawItemdata: TableResultData = drawItem.data;
					let collection: string | undefined = drawItemdata.collection

					if (collection === undefined) {
						continue
					}
					let compendium = await (<Game>game).packs?.get(collection);
					if (compendium === undefined) {
						continue
					}
					// @ts-ignore
					let item: Item = await compendium.getDocument(drawItemdata.resultId)
					this.addItemToCollection(item, generatorInput, createItems);
				}
			}
		} else if (generatorInput.selected === 'compendium') {
			let compendium: CompendiumCollection<CompendiumCollection.Metadata> | undefined = await MerchantSheet.findSpellPack(generatorInput.compendium);

			if (!compendium) {
				console.log(`Merchant sheet | No Compendium found with name "${compendium}".`);
				return ui.notifications?.error(`No Compendium found with name "${compendium}".`);
			}

			// console.log("Compendium", compendium.getData())
				if (generatorInput.importAllItems ) {
					for (const itemId of compendium.index.contents) {
						let item: any = await compendium.getDocument(itemId._id)
						if (this.determineIfObjectIsItem(item)) {
							this.addItemToCollection(item, generatorInput, createItems);
						}
					}
				} else {
					for (let i = 0; i < itemsToGenerate; i++) {
						let itemIndex = Math.floor(Math.random() * (compendium.index.size));
						let itemId = compendium.index.contents[itemIndex]._id;

						let item: any = await compendium.getDocument(itemId)
						if (this.determineIfObjectIsItem(item)) {
							this.addItemToCollection(item, generatorInput, createItems);
						}
					}
				}

		}
		// @ts-ignore
		await actor.createEmbeddedDocuments("Item", createItems)
		await this.collapseInventory(actor)
	}
	private static determineIfObjectIsItem(toBeDetermined: any): toBeDetermined is Item {
		if((toBeDetermined as Item).type){
			return true
		}
		return false
	}

	private static addItemToCollection(item: Item, generatorInput: MerchantGenerator, createItems: Item[]) {
		let duplicatedItem = duplicate(item);
		if (generatorInput.itemQuantityRoll) {
			this.generateQuantity(duplicatedItem, generatorInput.itemQuantityRoll, generatorInput.itemQuantityMax);
		}
		if (generatorInput.itemPriceRoll) {
			this.generatePrice(duplicatedItem, generatorInput.itemPriceRoll);
		}
		// @ts-ignore
		createItems.push(duplicatedItem);
	}

	private static getIdFromField(i: Item): string {
		if (i.id) {
			return i.id;
		}
		return ""
	}

	private static generatePrice(duplicatedItem: any, itemPriceRoll: string) {
		let roll = new Roll(itemPriceRoll);
		let price: number | undefined = roll.roll({async: false}).total;
		if (price) {
			duplicatedItem[currencyCalculator.getPriceItemKey()] = currencyCalculator.getPrice(price);
		}

	}
	private static generateQuantity(duplicatedItem: any, itemQuantityRoll: string, itemQuantityMax: number) {
		let roll = new Roll(itemQuantityRoll);
		let quantity: number | undefined = roll.roll({async: false}).total;
		if (quantity !== undefined && itemQuantityMax < quantity) {
			duplicatedItem[currencyCalculator.getQuantityKey()] = itemQuantityMax
		} else if (quantity) {
			duplicatedItem[currencyCalculator.getQuantityKey()] = quantity
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

		let itemPack = await MerchantSheet.findSpellPack(csvInput.itemPack);
		let spellPack = await MerchantSheet.findSpellPack(csvInput.pack)
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
		await MerchantSheet.collapseInventory(actor)
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

	static async findSpellPack(pack: any) {
		if (pack !== 'none') {
			return (await (<Game>game).packs.filter(s => s.metadata.name === pack))[0]
		}
		return undefined;
	}

	static async collapseInventory(actor: Actor) {
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
					let newQty = currencyCalculator.getQuantity(currencyCalculator.getQuantityNumber(itemToUpdateQuantity.data.data)) + currencyCalculator.getQuantity(currencyCalculator.getQuantityNumber(extraItem.data.data));
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
			if (u.isGM && u.active) {
				targetGm = u;
			}
		});
		let allowNoTargetGM = (<Game>game).settings.get(Globals.ModuleName, "allowNoGM")
		let gmId = null;
		

		if (!allowNoTargetGM && !targetGm) {
			Logger.Log("No Valid GM", allowNoTargetGM)
			// @ts-ignore
			return ui.notifications.error((<Game>game).i18n.localize("MERCHANTNPC.error-noGM"));
		} else if (!allowNoTargetGM) {
			gmId = targetGm.data._id;
		} else if (allowNoTargetGM) {
			ui.notifications?.info((<Game>game).i18n.localize("MERCHANTNPC.info-noGM"));
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
			default: "one",
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

	private updateMerchantCurrencies(ev: JQuery.ClickEvent<any, undefined, any, any>) {
		currencyCalculator.updateMerchantCurrency(this.actor);

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


// @ts-ignore
Hooks.on('dropActorSheetData', async function (target: Actor, sheet: any, dragSource: any, user: any) {

	if (!isActorMerchant(target)) {
		Logger.Log("Actor is not a merchant",target);
		return false;
	}

	let disableSell = target.getFlag(Globals.ModuleName, "disableSell");
	if (disableSell !== undefined && disableSell) {
		Logger.Log("Disabled sell");
		return false;
	}

	// @ts-ignore
	function checkCompatable(a, b) {
		if (a == b) return false;
	}
	let merchantDragSource: MerchantDragSource | undefined = currencyCalculator.getMerchantDragSource(dragSource);
	if (merchantDragSource === undefined || merchantDragSource == null) {
		Logger.Log("Could not make the merchantDragSource");
		return;
	}

	if (!target.data._id) {
		Logger.Log("Target has no data._id?",target);
		return;
	}
	if (merchantDragSource.quantity <= 0) {
		Logger.Log("Quantity invalid",merchantDragSource.quantity);
		(ui.notifications || new Notifications).error((<Game>game).i18n.localize("MERCHANTNPC.invalidQuantity"));
		return;
	}
	if (target.data._id == merchantDragSource.actorId) {
		Logger.Log("Seller and buyer the same");
		// ignore dropping on self
		return;
	}
	let sourceActor = (<Game>game).actors?.get(merchantDragSource.actorId);
	if (sourceActor === undefined) {
		Logger.Log("Seller not found");
		return false;
	}
	Logger.Log("Drop item", merchantDragSource, target);

	let actor = <Actor>sourceActor;
	// if both source and target have the same type then allow deleting original item.
	// this is a safety check because some game systems may allow dropping on targets
	// that don't actually allow the GM or player to see the inventory, making the item
	// inaccessible.
	console.log(target)
	// @ts-ignore
	let buyModifier: number = target.getFlag(Globals.ModuleName, "buyModifier")
	if (!buyModifier === undefined) buyModifier = 0.5;



	let price = currencyCalculator.priceInText(buyModifier * merchantDragSource.itemPrice);
	var html = "<div>" + (<Game>game).i18n.format('MERCHANTNPC.sell-items-player', {
		name: merchantDragSource.name,
		price: price
	}) + "</div>";
	html += '<div><input name="quantity-modifier" id="quantity-modifier" type="range" min="0" max="' + merchantDragSource.quantity + '" value="1" class="slider"></div>';
	html += '<div><label>' + (<Game>game).i18n.localize("MERCHANTNPC.quantity") + ':</label> <input style="' + currencyCalculator.inputStyle() + '" type=number min="0" max="' + merchantDragSource.quantity + '" value="1" id="quantity-modifier-display"></div> <input type="hidden" id="quantity-modifier-price" value = "' + (buyModifier * merchantDragSource.itemPrice) + '"/>';
	html += '<script>var pmSlider = document.getElementById("quantity-modifier"); var pmDisplay = document.getElementById("quantity-modifier-display"); var total = document.getElementById("quantity-modifier-total"); var price = document.getElementById("quantity-modifier-price"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value;  total.value =this.value * price.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';
	html += '<div>' + (<Game>game).i18n.localize("MERCHANTNPC.total") + '<input style="' + currencyCalculator.inputStyle() + '" readonly type="text"  value="' + (merchantDragSource.itemPrice * buyModifier) + '" id = "quantity-modifier-total"/> </div>';

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
					let itemId = merchantDragSource?.itemId
					let itemName = merchantDragSource?.name
					// @ts-ignore
					let value: number = MerchantSheet.getHtmlInputStringValue("quantity-modifier-total", document);
					// @ts-ignore
					merchantSheetNPC.sellItem(target, merchantDragSource, sourceActor, quantity, value).then(() => {
						merchantSheetNPC.moveItems(actor, target, [{itemId, quantity,itemName}], true);
					}).catch(reason => {
						ui.notifications?.error(reason)
						console.error(reason, reason.stack);
					})
				}
			},
			two: {
				icon: '<i class="fas fa-times"></i>',
				label: (<Game>game).i18n.localize('MERCHANTNPC.cancel'),
				callback: () => console.log("Merchant sheet | Price Modifier Cancelled")
			}
		},
		default: "one",
		close: () => console.log("Merchant sheet | Price Modifier Closed")
	});
	d.render(true);
});


export default MerchantSheet;
