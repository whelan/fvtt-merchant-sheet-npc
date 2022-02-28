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
        return caller.callSuperOnDropItemCreate(itemData);
    }


    actorCurrency(actor: Actor) {
        // @ts-ignore
		let moneyItemInventory = actor.getItemTypes("money").map(i => i.toObject())
        // @ts-ignore
		let charMoney = game.wfrp4e.market.getCharacterMoney(moneyItemInventory);
        // @ts-ignore
		return this.getBPprice(this.getBasePriceFromItem(charMoney,moneyItemInventory))
    }

 	getBasePriceFromItem(characterMoney: any, moneyItemInventory: any) {
		return {
			gc: moneyItemInventory[characterMoney.gc].data.quantity.value,
			ss: moneyItemInventory[characterMoney.ss].data.quantity.value,
			bp: moneyItemInventory[characterMoney.bp].data.quantity.value
		}
	}

    buyerHaveNotEnoughFunds(itemCostInGold:number, buyerFunds: number) {
		Logger.Log("Cost and funds", itemCostInGold,buyerFunds)
		return itemCostInGold > buyerFunds
    }

    convertToPlatinum(buyerFunds: any) {
		return 1;
    }

    updateActorWithNewFunds(buyer: Actor, buyerFunds: any) {
        console.log("Merchant sheet | buyer and funds", buyer,buyerFunds)
        buyer.update({ "data.currency": buyerFunds });
    }


    subtractAmountFromActor(buyer: Actor, buyerFunds: any, itemCostInGold: number) {
		// @ts-ignore
		let priceCalculated = Math.round(itemCostInGold);

		// @ts-ignore
		let priceAmount = game.wfrp4e.market.makeSomeChange(priceCalculated,false);

		// @ts-ignore
		let gc = game.i18n.localize("MARKET.Abbrev.GC").toLowerCase();
		// @ts-ignore
		let ss = game.i18n.localize("MARKET.Abbrev.SS").toLowerCase();
		// @ts-ignore
		let bp = game.i18n.localize("MARKET.Abbrev.BP").toLowerCase();
		// @ts-ignore
		let money = game.wfrp4e.market.payCommand(priceAmount.gc + gc + priceAmount.ss + ss + priceAmount.bp + bp, buyer, { 'suppressMessage': true });
		if (money) {
			buyer.updateEmbeddedDocuments("Item", money);
		}
    }

    addAmountForActor(seller: Actor, sellerFunds: any, itemCostInGold: number) {
		// @ts-ignore
		let priceCalculated = Math.round(itemCostInGold);
		console.log("Sold for: ", priceCalculated)
		// @ts-ignore
		let priceAmount = game.wfrp4e.market.makeSomeChange(priceCalculated,false);

		// @ts-ignore
		let money = game.wfrp4e.market.creditCommand(priceAmount.gc+'gc '+priceAmount.ss+'ss ' + priceAmount.bp+'bp',seller,{'suppressMessage':true});
		if (money) {
			seller.updateEmbeddedDocuments("Item", money);
		}
    }

    priceInText(itemCostInGold: number): string {
		let priceCalculated = Math.round(itemCostInGold);

		// @ts-ignore
		let priceAmount = game.wfrp4e.market.makeSomeChange(priceCalculated,false);

		//X GC Y SS Z BP
        return priceAmount.gc + "GC "+ priceAmount.ss + "SS "+ priceAmount.bp +"BP";
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
			clothingAccessories: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.clothingAccessories"),
                items: [],
                type: "clothingAccessories"
            },
			foodAndDrink: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.foodAndDrink"),
                items: [],
                type: "foodAndDrink"
            },
			toolsAndKits: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.toolsAndKits"),
                items: [],
                type: "toolsAndKits"
            },
			booksAndDocuments: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.booksAndDocuments"),
                items: [],
                type: "booksAndDocuments"
            },
			tradeTools: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.tradeTools"),
                items: [],
                type: "tradeTools"
            },
			drugsPoisonsHerbsDraughts: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.drugsPoisonsHerbsDraughts"),
                items: [],
                type: "drugsPoisonsHerbsDraughts"
            },
			ingredient: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.ingredient"),
                items: [],
                type: "ingredient"
            },
            misc: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.misc"),
                items: [],
                type: "misc"
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

		let itemTrappings = items.trapping;
		itemTrappings.sort(this.sort());
		features.clothingAccessories.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'clothingAccessories';
		});
		features.foodAndDrink.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'foodAndDrink';
		});
		features.toolsAndKits.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'toolsAndKits';
		});
		features.booksAndDocuments.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'booksAndDocuments';
		});
		features.tradeTools.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'tradeTools';
		});
		features.misc.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'misc';
		});
		features.ingredient.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'ingredient';
		});
		features.drugsPoisonsHerbsDraughts.items = itemTrappings.filter((element: any) => {
			return element.data.data.trappingType !== undefined && element.data.data.trappingType.value !== undefined && element.data.data.trappingType.value  === 'drugsPoisonsHerbsDraughts';
		});
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

    getPriceFromItem(item:any) {
        // @ts-ignore
		return this.getBPprice(item.data.price);

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
		data.quantity.value = quantity;
	}

	getWeight(itemData: any) {
		return itemData.encumbrance.value;
	}

	getPriceOutputWithModifier(basePrice: any, modifier: number): string {
		let baseAmount = this.getBPprice(basePrice);
		let priceCalculated = Math.round(Math.round(baseAmount * modifier * 100) / 100);

		// @ts-ignore
		let priceAmount = game.wfrp4e.market.makeSomeChange(priceCalculated,false);
		// @ts-ignore
		return game.wfrp4e.market.amountToString(priceAmount);
	}


	private getBPprice(basePrice: any): number {
		let gc: number = basePrice.gc * 240
		let ss: number = basePrice.ss * 12
		let bp: number = basePrice.bp

		return gc + +ss + +bp;
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

	inputStyle(): string {
		return "color: white; background: black"
	}
	editorStyle(): string {
		return "background: none; color: white"
	}
	sectionStyle(): string {
		return "color: black"
	}
	isPermissionShown() {
		return false;
	}

}
