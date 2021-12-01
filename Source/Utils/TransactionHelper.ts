import Globals, {Assert, Pair} from "../Globals";
import Logger from "./Logger";
import {ConfiguredCollectionClassForName} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/foundry.js/game";


class TransactionHelper {
	public buyTransactionFromPlayer({data}: { data: any }) {
		const g = game as Game;
		console.log("Merchant sheet | buyTransaction ", data)
		if (data.type === "buy") {
			const buyer = (g.actors || new Actors()).get(data.buyerId);
			const seller = (g.canvas.tokens || new TokenLayer()).get(data.tokenId);

			if (buyer && seller && seller.actor) {
				console.log()
				this.transaction(seller.actor, buyer, data.itemId, data.quantity);
			} else if (!seller) {
				(ui.notifications || new Notifications).error(g.i18n.localize("MERCHANTNPC.playerOtherScene"));
			}
		}
	}

	public transaction(seller: Actor, buyer: any, itemId: any, quantity: any) {
		const g = game as Game;
		console.log(`Buying item: ${seller}, ${buyer}, ${itemId}, ${quantity}`);

		let sellItem = <Item>seller.getEmbeddedDocument("Item", itemId);
		// If the buyer attempts to buy more then what's in stock, buy all the stock.
		// @ts-ignore
		if (sellItem !== null && currencyCalculator.getQuantity(sellItem.data.data.quantity) < quantity) {
			// @ts-ignore
			quantity = currencyCalculator.getQuantity(sellItem.data.data.quantity);
		}

		// On negative quantity we show an error
		if (quantity < 0) {
			// errorMessageToActor(buyer, g.i18n.localize("MERCHANTNPC.error-negativeAmountItems"));
			return;
		}

		// On 0 quantity skip everything to avoid error down the line
		if (quantity == 0) {
			return;
		}

		let sellerModifier: number = <number>seller.getFlag("merchantsheetnpc", "priceModifier");
		const sellerStack: number = <number>seller.getFlag("merchantsheetnpc", "stackModifier");
		if (sellerModifier === null) {
			sellerModifier = 1.0;
		}
		if (!sellerStack && quantity > sellerStack) quantity = sellerStack;

		// let itemCostInGold = Math.round(currencyCalculator.getPriceFromItem(sellItem) * sellerModifier * 100) / 100;

		// itemCostInGold *= quantity;
		// let currency = currencyCalculator.actorCurrency(buyer);

		// let buyerFunds = duplicate(currency);

		// if (currencyCalculator.buyerHaveNotEnoughFunds(itemCostInGold,buyerFunds)) {
		// 	errorMessageToActor(buyer, game.i18n.localize("MERCHANTNPC.error-noFunds"));
		// 	return;
		// }

		// currencyCalculator.subtractAmountFromActor(buyer,buyerFunds,itemCostInGold);

		// Update buyer's funds

		// let moved = await moveItems(seller, buyer, [{ itemId, quantity }]);

		// let chatPrice = currencyCalculator.priceInText(itemCostInGold);
		// for (let m of moved) {
		// 	chatMessage(
		// 		seller, buyer,
		// 		game.i18n.format('MERCHANTNPC.buyText', {buyer: buyer.name, quantity: quantity, itemName: m.item.name, chatPrice: chatPrice}),
		// 		m.item);
		// }
	}


}

export default TransactionHelper