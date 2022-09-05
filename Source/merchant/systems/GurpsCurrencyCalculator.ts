import CurrencyCalculator from "./CurrencyCalculator";
// @ts-ignore
import MerchantSheet from "../MerchantSheet";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import Globals from "../../Globals";
import MerchantCurrency from "../model/MerchantCurrency";
import HtmlHelpers from "../../Utils/HtmlHelpers";
import Logger from "../../Utils/Logger";
import MerchantDragSource from "../model/MerchantDragSource";
import AddItemHolder from "../model/AddItemHolder";




export default class GurpsCurrencyCalculator extends CurrencyCalculator {
	currencyName = 'Money'

	// useEP: unknown = true;

	async onDropItemCreate(itemData: PropertiesToSource<ItemData>, caller: MerchantSheet) {
		// Create a Consumable spell scroll on the Inventory tab
		if ((itemData.type === "spell")) {
			const scroll = await this.createScroll(itemData);
			// @ts-ignore
			return caller.callSuperOnDropItemCreate(scroll);
		}
		return caller.callSuperOnDropItemCreate(itemData);
	}

	async createScrollFromSpell(spell: PropertiesToSource<ItemData>): Promise<PropertiesToSource<ItemData>> {
		const itemData = spell;
		// const {actionType, description, source, activation, duration, target, range, damage, save, level} = itemData.data;
		// @ts-ignore
		let level = spell.data.level;
		// @ts-ignore
		let description = spell.data.description;
		// @ts-ignore

		// Get scroll data
		// @ts-ignore
		const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
		const scrollItem = await fromUuid(scrollUuid);
		// @ts-ignore
		const scrollData = scrollItem.toObject();
		delete scrollData._id;
		// Split the scroll description into an intro paragraph and the remaining details
		const scrollDescription = scrollData.data.description.value;
		const pdel = "</p>";
		const scrollIntroEnd = scrollDescription.indexOf(pdel);
		const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
		const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

		// Create a composite description from the scroll description and the spell details
		const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

		let clone = duplicate(itemData);
		clone.name = `${game.i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`;
		clone.img = scrollData.img
		clone.type = "consumable";
		// @ts-ignore
		clone.data.description.value = desc.trim()
		// @ts-ignore
		return clone;
	}

	async createScroll(itemData: PropertiesToSource<ItemData>): Promise<PropertiesToSource<ItemData>> {
		return this.createScrollFromSpell(itemData);
	}

	getItemForActor(actor: Actor, name: string): any {
		console.log("Find "+name+" from actor", actor)
		// @ts-ignore
		return actor.findEquipmentByName(name)
	}

	actorCurrency(actor: Actor): number {
		// @ts-ignore
		let currencyItem = this.getItemForActor(actor, this.currencyName);
		console.log("actor currency", currencyItem, actor)
		if (currencyItem !== undefined) {
			// @ts-ignore
			return currencyItem[0].count;
		}
		return 0
	}

	merchantCurrency(actor: Actor): MerchantCurrency[] {
		return [
			{
				name: this.currencyName,
				value: 0
			}
		];
	}

	buyerHaveNotEnoughFunds(itemCostInGold: number, buyerFunds: any) {

		// let itemCostInCopper = this.convertCurrencyToLowest({gp: itemCostInGold})
		// let buyerFundsAsCopper = this.convertCurrencyToLowest(buyerFunds);
		// console.log("item price > buyerFundsInCopper", itemCostInCopper, buyerFundsAsCopper)
		return itemCostInGold > buyerFunds;
	}

	updateActorWithNewFunds(buyer: Actor, buyerFunds: any) {
		let currencyItem = this.getItemForActor(buyer, this.currencyName);
		console.log("update currency", currencyItem[1],buyerFunds)
		// @ts-ignore
		buyer.updateEqtCount(currencyItem[1], buyerFunds)
	}


	subtractAmountFromActor(buyer: Actor, buyerFunds: any, itemCostInGold: number) {
		buyerFunds = this.calculateNewBuyerFunds(itemCostInGold, buyerFunds);
		// buyerFunds = buyerFunds - itemCostInGold;
		this.updateActorWithNewFunds(buyer, buyerFunds);
		console.log(`Merchant sheet | Funds after purchase: ${buyerFunds}`);
	}


	public calculateNewBuyerFunds(itemCostInGold: number, funds: any): any {
		if ((funds - itemCostInGold) < 0) {
			throw "Could not do the transaction"
		}

		let buyerFunds = funds;
		buyerFunds -= itemCostInGold
		return buyerFunds;
	}

	addAmountForActor(seller: Actor, sellerFunds: any, itemCostInGold: number) {
		sellerFunds =  Number(sellerFunds) + Number(itemCostInGold);
		this.updateActorWithNewFunds(seller, sellerFunds);
	}

	getPriceOutputWithModifier(basePriceItem: Item, modifier: number) {
		// @ts-ignore
		let basePrice = basePriceItem.data.data.eqt.cost
		return this.priceInText((basePrice * modifier * 100) / 100)
	}

	getWeight(itemData: any) {
		// @ts-ignore
		return itemData.eqt.weight;
	}

	getQuantityNumber(itemData: any): number {
		// @ts-ignore
		return itemData.eqt.count;
	}


	priceInText(itemCostInGold: number): string {

		return '' + itemCostInGold;
	}

	public prepareItems(items: any) {

		console.log("Merchant Sheet | Prepare Features", items);
		// Actions
		const features = {
			weapons: {
				label: game.i18n.localize("MERCHANTNPC.weapons"),
				items: [],
				type: "weapon"
			},
			equipment: {
				label: game.i18n.localize("MERCHANTNPC.equipment"),
				items: [],
				type: "equipment"
			},
			consumables: {
				label: game.i18n.localize("MERCHANTNPC.consumables"),
				items: [],
				type: "consumable"
			},
			tools: {
				label: game.i18n.localize("MERCHANTNPC.tools"),
				items: [],
				type: "tool"
			},
			containers: {
				label: game.i18n.localize("MERCHANTNPC.containers"),
				items: [],
				type: "container"
			},
			loot: {
				label: game.i18n.localize("MERCHANTNPC.loot"),
				items: [],
				type: "loot"
			},

		};
		// @ts-ignore
		features.weapons.items = items.weapon
		// features.weapons.items.sort(this.sort());
		// @ts-ignore
		features.equipment.items = items.equipment
		// features.equipment.items.sort(this.sort());

		// @ts-ignore
		features.consumables.items = items.consumable
		// features.consumables.items.sort(this.sort());
		// @ts-ignore
		features.tools.items = items.tool
		// features.tools.items.sort(this.sort());

		// @ts-ignore
		features.containers.items = items.backpack
		// features.containers.items.sort(this.sort());
		// @ts-ignore
		features.loot.items = items.loot
		// features.loot.items.sort(this.sort());
		return features;
	}


	public sort() {
		return function (a: ItemData, b: ItemData) {
			return a.name.localeCompare(b.name);
		};
	}

	public initSettings() {

		this.registerSystemSettings();
		super.initSettings();
	}

	public registerSystemSettings() {
		// game.settings.register(Globals.ModuleName, "useEP", {
		// 	name: game.i18n.format("MERCHANTNPC.global-settings.use-ep-name"),
		// 	hint: game.i18n.format("MERCHANTNPC.global-settings.use-ep-hint"),
		// 	scope: "world",
		// 	config: true,
		// 	default: true,
		// 	type: Boolean
		// });
	}

	getPriceFromItem(item: Item) {
		console.log(item)
		// @ts-ignore
		return item.system.eqt.cost;
	}

	getPriceItemKey() {
		return "data.eqt.cost";
	}

	currency(): string {
		return this.currencyName;
	}

	updateMerchantCurrency(actor: Actor) {
		let currencyInputName = "currency-" + this.currencyName
		console.log("find input: " + currencyInputName)
		let currency: number = HtmlHelpers.getHtmlInputNumberValue(currencyInputName, document);
		this.updateActorWithNewFunds(actor, currency);
	}

	deleteItemsOnActor(actor: Actor, deletes: any[]) {
		return actor.deleteEmbeddedDocuments("Item", deletes);
	}

	updateItemsOnActor(actor: Actor, destUpdates: any[]) {
		for (const destUpdate of destUpdates) {
			if (Array.isArray(destUpdate)) {
				// @ts-ignore
				actor.updateEqtCount(destUpdate[1], destUpdate[0].count)
			} else {
				// @ts-ignore
				actor.updateEqtCount(destUpdate._id, destUpdate.count)
			}

		}
		return actor.updateEmbeddedDocuments("Item", []);
	}

	getUpdateObject(quantityFromItem: number, quantity: number, item: any, itemId: any, infinity: boolean) {
		if (Array.isArray(item)) {
			// @ts-ignore
			return {
				_id: item[1],
				// @ts-ignore
				count: quantityFromItem >= Number.MAX_VALUE - 10000 || infinity ? Number.MAX_VALUE : quantityFromItem - quantity
			};
		}
		return {
			_id: itemId,
			// @ts-ignore
			[this.getQuantityKey()]: quantityFromItem >= Number.MAX_VALUE - 10000 || infinity ? Number.MAX_VALUE : quantityFromItem - quantity
		};

	}


	getNameFromItem(newItem: any): string {
		if (Array.isArray(newItem)) {
			return newItem[0].name;
		}
		return newItem.name;
	}

	setQuantityForItem(newItem: any, quantity: number) {
		if (Array.isArray(newItem)) {
			newItem[0].count = quantity;
		} else {
			this.setQuantityForItemData(newItem.data, quantity)
		}
	}

	setQuantityForItemData(data: any, quantity: number) {
		// @ts-ignore
		Logger.Log("Changing quantity for item and set quantity", data, quantity)
		// @ts-ignore
		data.eqt.count = quantity;
	}

	addItemsToActor(actor: Actor, additions: AddItemHolder[]) {
		console.log("Add item", additions)
		for (const addition of additions) {
			console.log("Add item", addition)
			let itemToAdd;
			if (Array.isArray(addition.newItem)) {
				itemToAdd = addition.origItem.data
			} else {
				itemToAdd = addition.newItem;
			}
			console.log("Add item to Actor", itemToAdd)
			// @ts-ignore
			actor.addNewItemData(itemToAdd);
		}
		return actor.createEmbeddedDocuments("Item", []);
	}

	findItemByNameForActor(actor: Actor, name: string) {
		return this.getItemForActor(actor, name);
	}

	isItemNotFound(destItem: any | undefined) {
		if (destItem === undefined) {
			return true;
		}
		if (Array.isArray(destItem)) {
			for (const destItemElement of destItem) {
				if (destItemElement !== undefined) {
					return false;
				}
			}
		}
		return true;
	}

	updateItemAddToArray(destUpdates: any[], destItem: any, quantity: number) {
		destItem[0].count = destItem[0].count+quantity;
		destUpdates.push(destItem)
	}
	getQuantityKey(): string {
		return "data.eqt.count"
	}

	isDropAccepted(dragSource: any) {
		return dragSource.type === "equipment" && dragSource.actorid
	}

	getMerchantDragSource(dragSource: any): MerchantDragSource | undefined{
		if (dragSource.actorid === undefined || dragSource.type !== "equipment") {
			return undefined;
		}
		console.log("DragSource",dragSource)
		return new MerchantDragSource(this.getQuantityNumber(dragSource.itemData.data),
			dragSource.actorid,
			this.getPriceFromItem(dragSource.itemData),
			dragSource.itemData.name,
			dragSource._id,
			dragSource,
			dragSource.itemData.img
		);
	}

	getQuantityFromItem(item: any): number {
		if (Array.isArray(item)) {
			return item[0].count
		} else {
			return this.getQuantity(this.getQuantityNumber(item.data.data));
		}
	}

	duplicateItemFromActor(item: any, source: Actor) {
		let foundItem = source.data.items.find(i => i.name == this.getNameFromItem(item));
		if (foundItem === undefined) {
			return duplicate(item);
		}
		return duplicate(foundItem);
	}


}