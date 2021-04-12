import CurrencyCalculator from "./CurrencyCalculator.js";

export default class Dnd5eCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.currency;
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        buyer.update({ "data.currency": buyerFunds });
    }
}
