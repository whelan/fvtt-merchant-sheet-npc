import CurrencyCalculator from "./CurrencyCalculator.js";

const conversionRates = {
    "pp": 1,
    "gp": CONFIG.DND5E.currencyConversion.gp.each,
    "ep": CONFIG.DND5E.currencyConversion.ep.each,
    "sp": CONFIG.DND5E.currencyConversion.sp.each,
    "cp": CONFIG.DND5E.currencyConversion.cp.each
};

const compensationCurrency = {"pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp"};


export default class Dnd5eCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.currency;
    }

    buyerHaveNotEnoughFunds(itemCostInGold, buyerFunds) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);

        return itemCostInPlatinum > buyerFundsAsPlatinum;
    }

    convertToPlatinum(buyerFunds) {
        let buyerFundsAsPlatinum = buyerFunds["pp"];
        buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        return buyerFundsAsPlatinum;
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        console.log("Merchant hseet | buyer and funds", buyer,buyerFunds)
        buyer.update({ "data.currency": buyerFunds });
    }


    subtractAmountFromActor(buyer, buyerFunds, itemCostInGold) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        let convertCurrency = game.settings.get("merchantsheetnpc", "convertCurrency");

        if (convertCurrency) {
            buyerFundsAsPlatinum -= itemCostInPlatinum;

            // Remove every coin we have
            for (let currency in buyerFunds) {
                buyerFunds[currency] = 0
            }

            // Give us fractions of platinum coins, which will be smoothed out below
            buyerFunds["pp"] = buyerFundsAsPlatinum

        } else {
            // We just pay in partial platinum.
            // We dont care if we get partial coins or negative once because we compensate later
            buyerFunds["pp"] -= itemCostInPlatinum

            // Now we exchange all negative funds with coins of lower value
            // We dont need to care about running out of money because we checked that earlier
            for (let currency in buyerFunds) {
                let amount = buyerFunds[currency]
                // console.log(`${currency} : ${amount}`);
                if (amount >= 0) continue;

                // If we have ever so slightly negative cp, it is likely due to floating point error
                // We dont care and just give it to the player
                if (currency == "cp") {
                    buyerFunds["cp"] = 0;
                    continue;
                }

                let compCurrency = compensationCurrency[currency]

                buyerFunds[currency] = 0;
                buyerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
                // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
            }
        }

        // console.log(`Smoothing out`);
        // Finally we exchange partial coins with as little change as possible
        for (let currency in buyerFunds) {
            let amount = buyerFunds[currency]

            // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);

            // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
            // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
            // If we would floor 15.99999999999918 everything explodes
            let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
            buyerFunds[currency] = newFund;

            // console.log(`New Buyer funds ${currency}: ${buyerFunds[currency]}`);
            let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                buyerFunds[compCurrency] += toAdd
                // console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
            }
        }
        // buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Merchant sheet | Funds after purchase: ${buyerFunds}`);
    }

    addAmountForActor(seller, sellerFunds, itemCostInGold) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(sellerFunds);

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        let convertCurrency = game.settings.get("merchantsheetnpc", "convertCurrency");

        if (convertCurrency) {
            buyerFundsAsPlatinum += itemCostInPlatinum;

            // Remove every coin we have
            for (let currency in sellerFunds) {
                sellerFunds[currency] = 0
            }

            // Give us fractions of platinum coins, which will be smoothed out below
            sellerFunds["pp"] = buyerFundsAsPlatinum

        } else {
            // We just pay in partial platinum.
            // We dont care if we get partial coins or negative once because we compensate later
            sellerFunds["pp"] += itemCostInPlatinum

            // Now we exchange all negative funds with coins of lower value
            // We dont need to care about running out of money because we checked that earlier
            for (let currency in sellerFunds) {
                let amount = sellerFunds[currency]
                // console.log(`${currency} : ${amount}`);
                if (amount >= 0) continue;

                // If we have ever so slightly negative cp, it is likely due to floating point error
                // We dont care and just give it to the player
                if (currency == "cp") {
                    sellerFunds["cp"] = 0;
                    continue;
                }

                let compCurrency = compensationCurrency[currency]

                sellerFunds[currency] = 0;
                sellerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
                // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
            }
        }

        // console.log(`Smoothing out`);
        // Finally we exchange partial coins with as little change as possible
        for (let currency in sellerFunds) {
            let amount = sellerFunds[currency]

            // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);

            // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
            // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
            // If we would floor 15.99999999999918 everything explodes
            let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
            sellerFunds[currency] = newFund;

            // console.log(`New Buyer funds ${currency}: ${sellerFunds[currency]}`);
            let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                sellerFunds[compCurrency] += toAdd
                // console.log(`Added ${toAdd} to ${compCurrency} it is now ${sellerFunds[compCurrency]}`);
            }
        }
        // sellerFunds = sellerFunds - itemCostInGold;
        this.updateActorWithNewFunds(seller,sellerFunds);
        console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
    }

    priceInText(itemCostInGold) {
        return itemCostInGold + " gp";
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
            equipment: {
                label: "Equipment",
                items: [],
                type: "equipment"
            },
            consumables: {
                label: "Consumables",
                items: [],
                type: "consumable"
            },
            tools: {
                label: "Tools",
                items: [],
                type: "tool"
            },
            containers: {
                label: "Containers",
                items: [],
                type: "container"
            },
            loot: {
                label: "Loot",
                items: [],
                type: "loot"
            },

        };
        features.weapons.items = items.weapon
        features.weapons.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.equipment.items = items.equipment
        features.equipment.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.consumables.items = items.consumable
        features.consumables.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.tools.items = items.tool
        features.tools.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.containers.items = items.backpack
        features.containers.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        features.loot.items = items.loot
        features.loot.items.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        return features;
    }


    initSettings() {
        game.settings.register("merchantsheetnpc", "convertCurrency", {
            name: "Convert currency after purchases?",
            hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
            scope: "world",
            config: true,
            default: false,
            type: Boolean
        });
    }

}
