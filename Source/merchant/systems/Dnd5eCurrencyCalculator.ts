import CurrencyCalculator from "./CurrencyCalculator";
// @ts-ignore
// import Item5e from "../../../../systems/dnd5e/module/item/entity.js";
import MerchantSheet from "../MerchantSheet";
import MerchantSheetNPCHelper from "../MerchantSheetNPCHelper";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import * as Console from "console";
import Globals from "../../Globals";

let conversionRates = {"pp": 1,
	"gp": 1,
	"ep": 1,
	"sp": 1,
	"cp": 1
};


const compensationCurrency = {"pp": "gp", "gp": "ep", "ep": "sp", "sp": "cp"};


export default class Dnd5eCurrencyCalculator extends CurrencyCalculator {

    async onDropItemCreate(itemData: PropertiesToSource<ItemData>, caller: MerchantSheet) {
        // Create a Consumable spell scroll on the Inventory tab
        if ( (itemData.type === "spell")) {
            const scroll = await this.createScroll(itemData);
            itemData = scroll.data;
        }

        return caller.callSuperOnDropItemCreate(itemData);
    }

	async createScrollFromSpell(spell: any) {

		// Get spell data
		const itemData =  spell.toObject();
		const {actionType, description, source, activation, duration, target, range, damage, save, level} = itemData.data;

		// Get scroll data
		// @ts-ignore
		const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
		const scrollItem = fromUuid(scrollUuid);
		// @ts-ignore
		const scrollData = scrollItem.data;

		// Split the scroll description into an intro paragraph and the remaining details
		const scrollDescription = scrollData.data.description.value;
		const pdel = '</p>';
		const scrollIntroEnd = scrollDescription.indexOf(pdel);
		const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
		const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

		// Create a composite description from the scroll description and the spell details
		const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

		// Create the spell scroll data
		const spellScrollData = foundry.utils.mergeObject(scrollData, {
			name: `${(<Game>game).i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`,
			img: itemData.img,
			data: {
				"description.value": desc.trim(),
				source,
				actionType,
				activation,
				duration,
				target,
				range,
				damage,
				save,
				level
			}
		});
		// @ts-ignore
		return new this(spellScrollData);
	}

	async createScroll(itemData: PropertiesToSource<ItemData>) {
        return await this.createScrollFromSpell(itemData);
    }

    actorCurrency(actor: Actor) {
        // @ts-ignore
		return actor.data.data.currency;
    }

    buyerHaveNotEnoughFunds(itemCostInGold:number, buyerFunds: any) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);

        return itemCostInPlatinum > buyerFundsAsPlatinum;
    }

    convertToPlatinum(buyerFunds: any) {
        let buyerFundsAsPlatinum = buyerFunds["pp"];
        buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        return buyerFundsAsPlatinum;
    }

    updateActorWithNewFunds(buyer: Actor, buyerFunds: any) {
        console.log("Merchant sheet | buyer and funds", buyer,buyerFunds)
        buyer.update({ "data.currency": buyerFunds });
    }


    subtractAmountFromActor(buyer: Actor, buyerFunds: any, itemCostInGold: number) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        let convertCurrency = (<Game>game).settings.get(Globals.ModuleName, "convertCurrency");

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

                // @ts-ignore
				let compCurrency = compensationCurrency[currency]

                buyerFunds[currency] = 0;
                // @ts-ignore
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
            // @ts-ignore
			let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                // @ts-ignore
				let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                buyerFunds[compCurrency] += toAdd
                // console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
            }
        }
        // buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Merchant sheet | Funds after purchase: ${buyerFunds}`);
    }

    addAmountForActor(seller: Actor, sellerFunds: any, itemCostInGold: number) {

        let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        let buyerFundsAsPlatinum = this.convertToPlatinum(sellerFunds);

        console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);

        let convertCurrency = (<Game>game).settings.get(Globals.ModuleName, "convertCurrency");

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

                // @ts-ignore
				let compCurrency = compensationCurrency[currency]

                sellerFunds[currency] = 0;
                // @ts-ignore
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
            // @ts-ignore
			let compCurrency = compensationCurrency[currency]

            // We dont care about fractions of CP
            if (currency != "cp") {
                // We calculate the amount of lower currency we get for the fraction of higher currency we have
                // @ts-ignore
				let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
                sellerFunds[compCurrency] += toAdd
                // console.log(`Added ${toAdd} to ${compCurrency} it is now ${sellerFunds[compCurrency]}`);
            }
        }
        // sellerFunds = sellerFunds - itemCostInGold;
        this.updateActorWithNewFunds(seller,sellerFunds);
        console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
    }

    priceInText(itemCostInGold: number): string {
        return itemCostInGold + " gp";
    }

    public prepareItems(items: any) {

        console.log("Merchant Sheet | Prepare Features");
        // Actions
        const features = {
            weapons: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.weapons"),
                items: [],
                type: "weapon"
            },
            equipment: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.equipment"),
                items: [],
                type: "equipment"
            },
            consumables: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.consumables"),
                items: [],
                type: "consumable"
            },
            tools: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.tools"),
                items: [],
                type: "tool"
            },
            containers: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.containers"),
                items: [],
                type: "container"
            },
            loot: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.loot"),
                items: [],
                type: "loot"
            },

        };
		// @ts-ignore
        features.weapons.items = items.weapon
        features.weapons.items.sort(this.sort());
		// @ts-ignore
        features.equipment.items = items.equipment
        features.equipment.items.sort(this.sort());

		// @ts-ignore
		features.consumables.items = items.consumable
        features.consumables.items.sort(this.sort());
		// @ts-ignore
        features.tools.items = items.tool
        features.tools.items.sort(this.sort());

		// @ts-ignore
		features.containers.items = items.backpack
        features.containers.items.sort(this.sort());
		// @ts-ignore
        features.loot.items = items.loot
        features.loot.items.sort(this.sort());
        return features;
    }


	public sort() {
		return function (a: ItemData, b: ItemData) {
			return a.name.localeCompare(b.name);
		};
	}

	public initSettings() {
		(<Game>game).settings.register(Globals.ModuleName, "convertCurrency", {
            name: "Convert currency after purchases?",
            hint: "If enabled, all currency will be converted to the highest denomination possible after a purchase. If disabled, currency will subtracted simply.",
            scope: "world",
            config: true,
            default: false,
            type: Boolean
        });
$
		conversionRates = {"pp": 1,
			// @ts-ignore
			"gp": CONFIG.DND5E.currencies.gp.conversion.each,
			// @ts-ignore
			"ep": CONFIG.DND5E.currencies.ep.conversion.each,
			// @ts-ignore
			"sp": CONFIG.DND5E.currencies.sp.conversion.each,
			// @ts-ignore
			"cp": CONFIG.DND5E.currencies.cp.conversion.each
		};
		super.initSettings();
    }

    getPriceFromItem(item: Item) {
        // @ts-ignore
		return item.data.data.price;
    }

    getPriceItemKey() {
        return "data.price";
    }


}
