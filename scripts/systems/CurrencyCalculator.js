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
        buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Merchant Sheet | Funds after purchase: ${buyerFunds}`);
    }

    addAmountForActor(seller, sellerFunds, price) {
        sellerFunds = (sellerFunds*1) + (price*1);
        this.updateActorWithNewFunds(seller,sellerFunds);
        console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        buyer.update({ "data.currency": buyerFunds });
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

    async onDropItemCreate(itemData, caller) {
        return caller.callSuperOnDropItemCreate(itemData);
    }

    async createScroll(itemData) {
        return itemData;
    }


    getPriceFromItem(item) {
        return item.data.price;
    }

    getPriceItemKey() {
        return "data.price";
    }

}
