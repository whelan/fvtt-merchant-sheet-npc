import CurrencyCalculator from "./CurrencyCalculator";
// @ts-ignore
// import Item5e from "../../../../systems/dnd5e/module/item/entity.js";
import MerchantSheet from "../MerchantSheet";
import MerchantSheetNPCHelper from "../MerchantSheetNPCHelper";
import {PropertiesToSource} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import * as Console from "console";
import Globals from "../../Globals";

export default class World5eCurrencyCalculator extends CurrencyCalculator {

	async onDropItemCreate(itemData: PropertiesToSource<ItemData>, caller: MerchantSheet) {
		// Create a Consumable spell scroll on the Inventory tab
		if ( (itemData.type === "spell")) {
			const scroll = await this.createScroll(itemData);
			// @ts-ignore
			return caller.callSuperOnDropItemCreate(scroll);
		}

		return caller.callSuperOnDropItemCreate(itemData);
	}

	async createScrollFromSpell(spell: PropertiesToSource<ItemData>): Promise<PropertiesToSource<ItemData>> {
		const itemData =  spell;
		// const {actionType, description, source, activation, duration, target, range, damage, save, level} = itemData.data;
		// @ts-ignore
		let level = spell.data.level;
		// @ts-ignore
		let description = spell.data.description;
		// @ts-ignore

		// Get scroll data
		// @ts-ignore
		const scrollUuid = `Compendium.${CONFIG.DND5E.sourcePacks.ITEMS}.${CONFIG.DND5E.spellScrollIds[level]}`;
		const scrollItem = await fromUuid(scrollUuid);
		// @ts-ignore
		const scrollData = scrollItem.toObject();
		delete scrollData._id;

		// Split the scroll description into an intro paragraph and the remaining details
		const scrollDescription = scrollData.data.description.value;
		const pdel = "</p>";
		const scrollIntroEnd = scrollDescription.indexOf(pdel);
		const scrollIntro = scrollDescription.slice(0, scrollIntroEnd + pdel.length);
		const scrollDetails = scrollDescription.slice(scrollIntroEnd + pdel.length);

		// Create a composite description from the scroll description and the spell details
		const desc = `${scrollIntro}<hr/><h3>${itemData.name} (Level ${level})</h3><hr/>${description.value}<hr/><h3>Scroll Details</h3><hr/>${scrollDetails}`;

		let clone = duplicate(itemData);
		clone.name = `${(<Game>game).i18n.localize("DND5E.SpellScroll")}: ${itemData.name}`;
		clone.img = scrollData.img
		clone.type = "consumable";
		// @ts-ignore
		clone.data.description.value = desc.trim()
		// @ts-ignore
		return clone;
	}

	async createScroll(itemData: PropertiesToSource<ItemData>): Promise<PropertiesToSource<ItemData>> {
		return this.createScrollFromSpell(itemData);
	}

    getStandard(): any {
        //@ts-ignore
        return game.settings.get("world-currency-5e", "Standard");
    }

    actorCurrency(actor: Actor) {
        //@ts-ignore
        let standard = this.getStandard();
        // @ts-ignore
        return actor.data.data.currency[standard];
    }

    buyerHaveNotEnoughFunds(itemCostInGold:number, buyerFunds: any) {
        return itemCostInGold > buyerFunds;
    }

    updateActorWithNewFunds(buyer: Actor, buyerFunds: any) {
         // @ts-ignore
        let standardKey = "data.currency." + this.getStandard();
        console.log("Merchant sheet | buyer and funds", buyer,buyerFunds)
        buyer.update({[standardKey]: buyerFunds });
    }

    subtractAmountFromActor(buyer: Actor, buyerFunds: any, itemCostInGold: number) {
        buyerFunds = buyerFunds - itemCostInGold;
        this.updateActorWithNewFunds(buyer, buyerFunds);
        console.log(`Merchant Sheet | Funds after purchase: ${buyerFunds}`);
    }

    addAmountForActor(seller: Actor, sellerFunds: any, price: number) {
        sellerFunds = (sellerFunds * 1) + (price * 1);
        this.updateActorWithNewFunds(seller, sellerFunds);
        console.log(`Merchant Sheet | Funds after sell: ${sellerFunds}`);
    }

    priceInText(itemCostInGold: number): string {
        //@ts-ignore
        let standard = this.getStandard();
        // @ts-ignore
        return itemCostInGold + " " + this.abbreviation();
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
      super.initSettings();
  }

    gpToStandard(n: number) {
        //@ts-ignore
        let standard = this.getStandard();
        //@ts-ignore
        return n * CONFIG.DND5E.currencies.gp.conversion[standard];
    }

    standardToGp(n: number) {
        // @ts-ignore
        let standard = this.getStandard();
        // @ts-ignore
        return n / CONFIG.DND5E.currencies.gp.conversion[standard];
    }

    getPriceFromItem(item: Item) {
        // @ts-ignore
        return this.gpToStandard(item.data.price);
    }

    getPriceItemKey() {
        return "data.price";
    }

    getPrice(priceValue: number): any {
        // @ts-ignore
        return this.standardToGp(priceValue);
    }

    currency(): string {
        //@ts-ignore
        let standard = this.getStandard();
        // @ts-ignore
        return CONFIG.DND5E.currencies[standard].label;
    }

    abbreviation(): string {
        //@ts-ignore
        let standard = this.getStandard();
        // @ts-ignore
        return " " + CONFIG.DND5E.currencies[standard].abbreviation;
    }

    getPriceOutputWithModifier(basePrice: any, modifier: number): string {
        return this.gpToStandard((Math.round((<number>basePrice) * modifier * 100) / 100)).toLocaleString('en') + this.abbreviation();
    }
}
