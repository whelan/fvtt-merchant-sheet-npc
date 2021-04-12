import CurrencyCalculator from "./CurrencyCalculator.js";

export default class Dnd5eCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.currency;
    }

    buyerHaveNotEnoughFunds(itemCostInGold, buyerFunds) {
        return itemCostInGold > buyerFunds;
    }

    subtractAmountFromActor(buyer, buyerFunds, itemCostInGold) {
        buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Funds after purchase: ${buyerFunds}`);
    }

    priceInText(itemCostInGold) {
        return itemCostInGold;
    }


}
