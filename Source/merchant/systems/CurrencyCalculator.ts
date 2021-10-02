import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import MerchantSheet from "../MerchantSheet";

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

	async createScroll(itemData: PropertiesToSource<ItemData>) {
		return itemData;
	}


	getPriceFromItem(item: Item) {
		// @ts-ignore
		return item.data.price;
	}

	getPriceItemKey() {
		return "data.price";
	}

	// static prepareItems(itemTypes: Record<BaseItem["data"]["type"], Array<InstanceType<ConfiguredDocumentClass<typeof foundry.documents.BaseItem>>>>) {
	// 	return {};
	// }
}