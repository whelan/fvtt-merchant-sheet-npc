import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import MerchantSheet from "../MerchantSheet";
import Logger from "../../Utils/Logger";

export default class CurrencyCalculator {

	initialized = false;
	/**
	 * Base class for calculation for currencies. .
	 *
	 *
	 */

	actorCurrency(actor: Actor) {
		// @ts-ignore
		return actor.data.data.currency;
	}

	buyerHaveNotEnoughFunds(itemCostInGold: number, buyerFunds: number) {
		return itemCostInGold > buyerFunds;
	}

	subtractAmountFromActor(buyer: Actor, buyerFunds: number, itemCostInGold: number) {
		buyerFunds = buyerFunds - itemCostInGold;
		this.updateActorWithNewFunds(buyer, buyerFunds);
		console.log(`Merchant Sheet | Funds after purchase: ${buyerFunds}`);
	}

	addAmountForActor(seller: Actor, sellerFunds: number, price: number) {
		sellerFunds = (sellerFunds * 1) + (price * 1);
		this.updateActorWithNewFunds(seller, sellerFunds);
		console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
	}

	updateActorWithNewFunds(buyer: Actor, buyerFunds: number) {
		buyer.update({"data.currency": buyerFunds});
	}

	priceInText(itemCostInGold: number): string {
		return itemCostInGold.toString();
	}


	public initSettings() {
		this.initialized = true;
	}

	public prepareItems(items: any) {
		console.log("Merchant Sheet | Prepare basic Features");

		const features = {
			weapons: {
				label: "All",
				items: items,
				type: "all"
			}
		}
		return features;
	}

	async onDropItemCreate(itemData: PropertiesToSource<ItemData>, caller: MerchantSheet) {
		return caller.callSuperOnDropItemCreate(itemData);
	}

	async createScroll(itemData: PropertiesToSource<ItemData>): Promise<PropertiesToSource<ItemData>> {
		return itemData;
	}


	getPriceFromItem(item: any) {
		// @ts-ignore
		return item.data.price;
	}

	getPriceItemKey() {
		return "data.price";
	}

	getDescription(chatData: any): string {
		return chatData.value;
	}

	getQuantity(quantity: any): number {
		return quantity;
	}

	getQuantityKey(): string {
		return "data.quantity"
	}

	getWeight(itemData: any) {
		return itemData.weight;
	}

	getPriceOutputWithModifier(basePrice: any, modifier: number): string {
		return (Math.round((<number>basePrice) * modifier * 100) / 100).toLocaleString('en')
	}

	getPrice(priceValue: number): any {
		return priceValue;
	}

	currency(): string {
		return '';
	}

	setQuantityForItemData(data: any, quantity: number) {
		Logger.Log("Changing quantity for item and set quantity", data, quantity)
		data.quantity = quantity;
	}

	inputStyle(): string {
		return ""
	}

	editorStyle() {
		return ""
	}

	isPermissionShown() {
		return true;
	}

	sectionStyle() {
		return ""
	}
}