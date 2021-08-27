import CurrencyCalculator from "./CurrencyCalculator.js";

export default class SwadeCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.details.currency;
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
        features.gear.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.armor.items = items.armor;
        features.armor.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.shields.items = items.shield;
        features.shields.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.weapons.items = items.weapon;
        features.weapons.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        return features;
    }
    getPriceFromItem(item) {
        return item.data.data.price;
    }

    getPriceItemKey() {
        return "data.price";
    }

}
