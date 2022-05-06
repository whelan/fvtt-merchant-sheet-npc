import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import MerchantSheet from "../MerchantSheet";
import Logger from "../../Utils/Logger";
import MerchantCurrency from "../model/MerchantCurrency";
import HtmlHelpers from "../../Utils/HtmlHelpers";
import MerchantDragSource from "../model/MerchantDragSource";


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
	getQuantityNumber(itemData: any): number {
		return itemData.quantity;
	}

	getPriceOutputWithModifier(basePriceItem: Item, modifier: number): string {
		// @ts-ignore
		let basePrice = basePriceItem.data.data.price
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
	public registerSystemSettings() {

	}

	merchantCurrency(actor: Actor): MerchantCurrency[] {
		return [{"Currency": this.actorCurrency(actor)}];
	}

	updateMerchantCurrency(actor: Actor) {
		let currency: number = HtmlHelpers.getHtmlInputNumberValue("currency-Currency", document);
		this.updateActorWithNewFunds(actor,currency);
	}

	deleteItemsOnActor(source: Actor, deletes: any[]) {
		return source.deleteEmbeddedDocuments("Item", deletes);
	}

	updateItemsOnActor(destination: Actor, destUpdates: any[]) {
		return destination.updateEmbeddedDocuments("Item", destUpdates);
	}

	addItemsToActor(destination: Actor, additions: any[]) {
		return destination.createEmbeddedDocuments("Item", additions);
	}

	findItemByNameForActor(destination: Actor, name: string) {
		return destination.data.items.find(i => i.name == name)
	}

	isItemNotFound(destItem: Item | undefined) {
		return destItem === undefined;
	}

	updateItemAddToArray(destUpdates: any[], destItem: any, quantity: number) {
		// @ts-ignore
		this.setQuantityForItemData(destItem.data.data, Number(this.getQuantity(this.getQuantityNumber(destItem.data.data))) + quantity)

		// @ts-ignore
		if (this.getQuantity(this.getQuantityNumber(destItem.data.data)) < 0) {
			// @ts-ignore
			this.setQuantityForItemData(destItem.data.data, 0)
		}
		// @ts-ignore
		const destUpdate = {
			_id: destItem.id,
			// @ts-ignore
			[this.getQuantityKey()]: this.getQuantity(this.getQuantityNumber(destItem.data.data))
		};
		destUpdates.push(destUpdate);

	}

	isDropAccepted(dragSource: any) {
		return dragSource.type == "Item" && dragSource.actorId
	}

	getMerchantDragSource(dragSource: any): MerchantDragSource | undefined{
		if (dragSource.actorId === undefined || dragSource.type !== 'Item') {
			return undefined;
		}
		return new MerchantDragSource(this.getQuantity(this.getQuantityNumber(dragSource.data.data)),
			dragSource.actorId,
			this.getPriceFromItem(dragSource.data),
			dragSource.data.name,
			dragSource.data._id,
			dragSource,
			dragSource.data.img
		);
	}

	getQuantityFromItem(item: Item): number {
		return this.getQuantity(this.getQuantityNumber(item.data.data));
	}

	setQuantityForItem(newItem: any, quantity: number) {
		this.setQuantityForItemData(newItem.data, quantity)
	}

	getNameFromItem(newItem: any): string {
		return newItem.name;
	}

	getUpdateObject(quantityFromItem: number, quantity: number, item: any, itemId: any, infinity: boolean) {
		return {
			_id: itemId,
				// @ts-ignore
				[currencyCalculator.getQuantityKey()]: quantityFromItem >= Number.MAX_VALUE - 10000 || infinity ? Number.MAX_VALUE : quantityFromItem - quantity
		};
	}
}