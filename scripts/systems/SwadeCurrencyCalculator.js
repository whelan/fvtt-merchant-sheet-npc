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
        items = items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        for (let i of items) {
            i.img = i.img || DEFAULT_TOKEN;
            //console.log("Loot Sheet | item", i);

            // Features
            if (i.type === "weapon") features.weapons.items.push(i);
            else if (i.type === "armor") features.armor.items.push(i);
            else if (i.type === "shield") features.shields.items.push(i);
            else if (i.type === "gear") features.gear.items.push(i);
            else features.gear.items.push(i);
        }

        return features;
    }

}
