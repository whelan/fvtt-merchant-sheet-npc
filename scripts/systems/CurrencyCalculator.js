export default class CurrencyCalculator {
    /**
     * Base class for calculation for currencies. .
     *
     *
     */

    actorCurrency(actor) {
        return actor.data.data.currency;
    }

    buyerHaveNotEnoughFunds(itemCostInGold, buyerFunds) {
        return itemCostInGold > buyerFunds;
    }

    subtractAmountFromActor(buyer, buyerFunds, itemCostInGold) {
        console.log('base calculator')
        buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Funds after purchase: ${buyerFunds}`);
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        console.log('Base update Buyer');
        // buyer.update({ "data.currency": buyerFunds });
    }

    priceInText(itemCostInGold) {
        return itemCostInGold;
    }

    initSettings() {

    }

    prepareItems(items) {
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
}
