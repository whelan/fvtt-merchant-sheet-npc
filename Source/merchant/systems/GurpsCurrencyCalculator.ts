import CurrencyCalculator from "./CurrencyCalculator";
// @ts-ignore
import MerchantSheet from "../MerchantSheet";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import Globals from "../../Globals";
import MerchantCurrency from "../model/MerchantCurrency";
import HtmlHelpers from "../../Utils/HtmlHelpers";
import Logger from "../../Utils/Logger";




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
		clone.name = `${(<Game>game).i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`;
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

	getCurrencyItem(actor: Actor): any {
		// @ts-ignore
		return actor.findEquipmentByName(this.currencyName)
	}

	actorCurrency(actor: Actor): number {
		// @ts-ignore
		let currencyItem = this.getCurrencyItem(actor);
		console.log("actor currency", currencyItem,actor)
		if (currencyItem !== undefined) {
			// @ts-ignore
			return currencyItem[0].count;
		}
		return 0
	}

	merchantCurrency(actor: Actor): MerchantCurrency[] {
		return [
			{
				name: "$",
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
		let currencyItem = this.getCurrencyItem(buyer);
		// @ts-ignore
		buyer.updateEqtCount(currencyItem.key,buyerFunds)
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

		return ''+itemCostInGold;
	}

	public prepareItems(items: any) {

		console.log("Merchant Sheet | Prepare Features", items);
		// Actions
		const features = {
			weapons: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.weapons"),
				items: [],
				type: "weapon"
			},
			equipment: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.equipment"),
				items: [],
				type: "equipment"
			},
			consumables: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.consumables"),
				items: [],
				type: "consumable"
			},
			tools: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.tools"),
				items: [],
				type: "tool"
			},
			containers: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.containers"),
				items: [],
				type: "container"
			},
			loot: {
				label: (<Game>game).i18n.localize("MERCHANTNPC.loot"),
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
		// (<Game>game).settings.register(Globals.ModuleName, "useEP", {
		// 	name: (<Game>game).i18n.format("MERCHANTNPC.global-settings.use-ep-name"),
		// 	hint: (<Game>game).i18n.format("MERCHANTNPC.global-settings.use-ep-hint"),
		// 	scope: "world",
		// 	config: true,
		// 	default: true,
		// 	type: Boolean
		// });
	}

	getPriceFromItem(item: Item) {
		console.log(item)
		// @ts-ignore
		return item.data.eqt.cost;
	}

	getPriceItemKey() {
		return "data.eqt.cost";
	}

	currency(): string {
		return 'GP';
	}

	updateMerchantCurrency(actor: Actor) {
		let currency: number = HtmlHelpers.getHtmlInputNumberValue("currency-"+this.currencyName, document);
		this.updateActorWithNewFunds(actor,currency);
	}

	deleteItemsOnActor(actor: Actor, deletes: any[]) {
		return actor.deleteEmbeddedDocuments("Item", deletes);
	}

	updateItemsOnActor(actor: Actor, destUpdates: any[]) {
		console.log("update",actor,destUpdates)
		return actor.updateEmbeddedDocuments("Item", destUpdates);
	}

	setQuantityForItemData(data: any, quantity: number) {
		// @ts-ignore
		Logger.Log("Changing quantity for item and set quantity", data, quantity)
		// @ts-ignore
		data.eqt.count = quantity;
	}

	addItemsToActor(actor: Actor, additions: any[]) {
		for (const addition of additions) {
			// @ts-ignore
			actor.addNewItemData(addition);
		}
		return actor.createEmbeddedDocuments("Item",[]);
	}

}