import CurrencyCalculator from "./CurrencyCalculator";

// @ts-ignore
// import Item5e from "../../../../systems/dnd5e/module/item/entity.js";
import MerchantSheet from "../MerchantSheet";
import MerchantSheetNPCHelper from "../MerchantSheetNPCHelper";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import * as Console from "console";
import Globals from "../../Globals";
import Logger from "../../Utils/Logger";
// @ts-ignore



export default class Wfrp4eCurrencyCalculator extends CurrencyCalculator {

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
		if (scrollItem === undefined) {
			return undefined;
		}
		// @ts-ignore
		const scrollData = scrollItem.data;
		if (scrollData === undefined) {
			return undefined;
		}

		// Split the scroll description into an intro paragraph and the remaining details
		let scrollDescription = '';
		if (scrollData !== undefined && scrollData.data !== undefined && scrollData.data.description !== undefined) {
			scrollDescription = scrollData.data.description.value;
		}
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
		let price = this.getBPprice(game.wfrp4e.market.getCharacterMoney(actor.items))
		console.log("Actor currency: ", price);
		return price;
    }

    buyerHaveNotEnoughFunds(itemCostInGold:number, buyerFunds: any) {
		let buyerFundInBP = this.getBPprice(buyerFunds);
		return itemCostInGold > buyerFundInBP
        // let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        // let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);
		//
        // return itemCostInPlatinum > buyerFundsAsPlatinum;
    }

    convertToPlatinum(buyerFunds: any) {
		return 1;
        // let buyerFundsAsPlatinum = buyerFunds["pp"];
        // buyerFundsAsPlatinum += buyerFunds["gp"] / conversionRates["gp"];
        // buyerFundsAsPlatinum += buyerFunds["ep"] / conversionRates["gp"] / conversionRates["ep"];
        // buyerFundsAsPlatinum += buyerFunds["sp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"];
        // buyerFundsAsPlatinum += buyerFunds["cp"] / conversionRates["gp"] / conversionRates["ep"] / conversionRates["sp"] / conversionRates["cp"];
		//
        // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);
		//
        // return buyerFundsAsPlatinum;
    }

    updateActorWithNewFunds(buyer: Actor, buyerFunds: any) {
        console.log("Merchant sheet | buyer and funds", buyer,buyerFunds)
        buyer.update({ "data.currency": buyerFunds });
    }


    subtractAmountFromActor(buyer: Actor, buyerFunds: any, itemCostInGold: number) {
		// @ts-ignore
		game.wfrp4e.market.payCommand('0gc 0ss ' + itemCostInGold+'bp',buyer);

		// @ts-ignore
        // let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        // let buyerFundsAsPlatinum = this.convertToPlatinum(buyerFunds);

        // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);
		//
        // let convertCurrency = (<Game>game).settings.get(Globals.ModuleName, "convertCurrency");
		//
        // if (convertCurrency) {
        //     buyerFundsAsPlatinum -= itemCostInPlatinum;
		//
        //     // Remove every coin we have
        //     for (let currency in buyerFunds) {
        //         buyerFunds[currency] = 0
        //     }
		//
        //     // Give us fractions of platinum coins, which will be smoothed out below
        //     buyerFunds["pp"] = buyerFundsAsPlatinum
		//
        // } else {
        //     // We just pay in partial platinum.
        //     // We dont care if we get partial coins or negative once because we compensate later
        //     buyerFunds["pp"] -= itemCostInPlatinum
		//
        //     // Now we exchange all negative funds with coins of lower value
        //     // We dont need to care about running out of money because we checked that earlier
        //     for (let currency in buyerFunds) {
        //         let amount = buyerFunds[currency]
        //         // console.log(`${currency} : ${amount}`);
        //         if (amount >= 0) continue;
		//
        //         // If we have ever so slightly negative cp, it is likely due to floating point error
        //         // We dont care and just give it to the player
        //         if (currency == "cp") {
        //             buyerFunds["cp"] = 0;
        //             continue;
        //         }
		//
        //         // @ts-ignore
		// 		let compCurrency = compensationCurrency[currency]
		//
        //         buyerFunds[currency] = 0;
        //         // @ts-ignore
		// 		buyerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
        //         // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
        //     }
        // }
		//
        // // console.log(`Smoothing out`);
        // // Finally we exchange partial coins with as little change as possible
        // for (let currency in buyerFunds) {
        //     let amount = buyerFunds[currency]
		//
        //     // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);
		//
        //     // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
        //     // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
        //     // If we would floor 15.99999999999918 everything explodes
        //     let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
        //     buyerFunds[currency] = newFund;
		//
        //     // console.log(`New Buyer funds ${currency}: ${buyerFunds[currency]}`);
        //     // @ts-ignore
		// 	let compCurrency = compensationCurrency[currency]
		//
        //     // We dont care about fractions of CP
        //     if (currency != "cp") {
        //         // We calculate the amount of lower currency we get for the fraction of higher currency we have
        //         // @ts-ignore
		// 		let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
        //         buyerFunds[compCurrency] += toAdd
        //         // console.log(`Added ${toAdd} to ${compCurrency} it is now ${buyerFunds[compCurrency]}`);
        //     }
        // }
        // // buyerFunds = buyerFunds - itemCostInGold;
        // this.updateActorWithNewFunds(buyer,buyerFunds);
        console.log(`Merchant sheet | Funds after purchase: ${buyerFunds}`);
    }

    addAmountForActor(seller: Actor, sellerFunds: any, itemCostInGold: number) {

        // let itemCostInPlatinum = itemCostInGold / conversionRates["gp"]
        // let buyerFundsAsPlatinum = this.convertToPlatinum(sellerFunds);
		//
        // console.log(`buyerFundsAsPlatinum : ${buyerFundsAsPlatinum}`);
		//
        // let convertCurrency = (<Game>game).settings.get(Globals.ModuleName, "convertCurrency");
		//
        // if (convertCurrency) {
        //     buyerFundsAsPlatinum += itemCostInPlatinum;
		//
        //     // Remove every coin we have
        //     for (let currency in sellerFunds) {
        //         sellerFunds[currency] = 0
        //     }
		//
        //     // Give us fractions of platinum coins, which will be smoothed out below
        //     sellerFunds["pp"] = buyerFundsAsPlatinum
		//
        // } else {
        //     // We just pay in partial platinum.
        //     // We dont care if we get partial coins or negative once because we compensate later
        //     sellerFunds["pp"] += itemCostInPlatinum
		//
        //     // Now we exchange all negative funds with coins of lower value
        //     // We dont need to care about running out of money because we checked that earlier
        //     for (let currency in sellerFunds) {
        //         let amount = sellerFunds[currency]
        //         // console.log(`${currency} : ${amount}`);
        //         if (amount >= 0) continue;
		//
        //         // If we have ever so slightly negative cp, it is likely due to floating point error
        //         // We dont care and just give it to the player
        //         if (currency == "cp") {
        //             sellerFunds["cp"] = 0;
        //             continue;
        //         }
		//
        //         // @ts-ignore
		// 		let compCurrency = compensationCurrency[currency]
		//
        //         sellerFunds[currency] = 0;
        //         // @ts-ignore
		// 		sellerFunds[compCurrency] += amount * conversionRates[compCurrency]; // amount is a negative value so we add it
        //         // console.log(`Substracted: ${amount * conversionRates[compCurrency]} ${compCurrency}`);
        //     }
        // }
		//
        // // console.log(`Smoothing out`);
        // // Finally we exchange partial coins with as little change as possible
        // for (let currency in sellerFunds) {
        //     let amount = sellerFunds[currency]
		//
        //     // console.log(`${currency} : ${amount}: ${conversionRates[currency]}`);
		//
        //     // We round to 5 decimals. 1 pp is 1000cp, so 5 decimals always rounds good enough
        //     // We need to round because otherwise we get 15.99999999999918 instead of 16 due to floating point precision
        //     // If we would floor 15.99999999999918 everything explodes
        //     let newFund = Math.floor(Math.round(amount * 1e5) / 1e5);
        //     sellerFunds[currency] = newFund;
		//
        //     // console.log(`New Buyer funds ${currency}: ${sellerFunds[currency]}`);
        //     // @ts-ignore
		// 	let compCurrency = compensationCurrency[currency]
		//
        //     // We dont care about fractions of CP
        //     if (currency != "cp") {
        //         // We calculate the amount of lower currency we get for the fraction of higher currency we have
        //         // @ts-ignore
		// 		let toAdd = Math.round((amount - newFund) * 1e5) / 1e5 * conversionRates[compCurrency]
        //         sellerFunds[compCurrency] += toAdd
        //         // console.log(`Added ${toAdd} to ${compCurrency} it is now ${sellerFunds[compCurrency]}`);
        //     }
        // }
        // // sellerFunds = sellerFunds - itemCostInGold;
        // this.updateActorWithNewFunds(seller,sellerFunds);
        console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
    }

    priceInText(itemCostInGold: number): string {
		//X GC Y SS Z BP
        return itemCostInGold + " gp";
    }

    public prepareItems(items: any) {

        console.log("Merchant Sheet | Prepare Features");
        // Actions
        const features = {
			ammunition: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.ammunition"),
                items: [],
                type: "ammunition"
            },
			armour: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.armour"),
                items: [],
                type: "armour"
            },
            weapons: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.weapons"),
                items: [],
                type: "weapon"
            },
            container: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.container"),
                items: [],
                type: "container"
            },
            spell: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.spell"),
                items: [],
                type: "spell"
            },

        };
		// @ts-ignore
        features.weapons.items = items.weapon
        features.weapons.items.sort(this.sort());
		// @ts-ignore
        features.armour.items = items.armour
        features.armour.items.sort(this.sort());
		// @ts-ignore
        features.ammunition.items = items.ammunition
        features.ammunition.items.sort(this.sort());
		// @ts-ignore
        features.container.items = items.container
        features.container.items.sort(this.sort());
		// @ts-ignore
        features.spell.items = items.spell
        features.spell.items.sort(this.sort());
        return features;
    }


	public sort() {
		return function (a: ItemData, b: ItemData) {
			return a.name.localeCompare(b.name);
		};
	}

	public initSettings() {
		// @ts-ignore
		let makeSomeChange = game.wfrp4e.market.makeSomeChange(100,false);
		//data.price.gc/ss/bp
		console.log(makeSomeChange);
		super.initSettings();
    }

    getPriceFromItem(item: Item) {
        // @ts-ignore
		return this.getBPprice(item.data.data.price);

    }

    getPriceItemKey() {
        return "data.price";
    }

	getQuantity(quantity: any): number {
		return quantity.value;
	}
	getQuantityKey(): string {
		return "data.quantity.value"
	}
	setQuantityForItemData(data: any, quantity: number) {
		Logger.Log("Changing quantity for item and set quantity", data, quantity)
		data.quantity.value = quantity;
	}

	getWeight(itemData: any) {
		return itemData.encumbrance.value;
	}

	getPriceOutputWithModifier(basePrice: any, modifier: number): string {
		console.log("price: ", basePrice)
		let baseAmount = this.getBPprice(basePrice);
		let priceCalculated = Math.round(Math.round(baseAmount * modifier * 100) / 100);

		// @ts-ignore
		let priceAmount = game.wfrp4e.market.makeSomeChange(priceCalculated,false);
		// @ts-ignore
		return game.wfrp4e.market.amountToString(priceAmount);
	}


	private getBPprice(basePrice: any) {
		let gc: number = basePrice.gc * 240
		let ss: number = basePrice.ss * 12
		let bp: number = basePrice.bp

		let baseAmount: number = gc + +ss + +bp;
		return baseAmount;
	}

	getPrice(priceValue: number): any {
		// @ts-ignore
		let amount = game.wfrp4e.market.makeSomeChange(priceValue,true);
		amount.label = "Price";
		amount.type = "String";
		return amount;
	}

	currency(): string {
		return 'BP';
	}
}
