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

    buyerHaveNotEnoughFunds(itemCostInGold:number, buyerFunds: number) {
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
		let money = game.wfrp4e.market.payCommand(priceAmount.gc+'gc '+priceAmount.ss+'ss ' + priceAmount.bp+'bp',buyer,{'suppressMessage':true});
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
	isPermissionShown() {
		return false;
	}

}
