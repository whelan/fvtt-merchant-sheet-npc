import CurrencyCalculator from "./CurrencyCalculator.js";

export default class SwadeCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.details.currency;
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        buyer.update({ "data.details.currency": buyerFunds });
    }

    prepareItems(items) {

        console.log("Merchant Sheet | Prepare Features");
        // Actions
        const features = {
            weapons: {
                label: "Weapons",
                items: [],
                type: "weapon"
            },
            armor: {
                label: "Armor",
                items: [],
                type: "armor"
            },
            shields: {
                label: "Shields",
                items: [],
                type: "shield"
            },
            gear: {
                label: "Gear",
                items: [],
                type: "gear"
            }
        };

        //console.log("Loot Sheet | Prepare Items");
        // Iterate through items, allocating to containers
        // for (let i of items) {
        features.gear.items = items.gear;
        features.armor.items = items.armor;
        features.shields.items = items.shield;
        features.weapons.items = items.weapon;
        // }

        return features;
    }

}
