import CurrencyCalculator from "./CurrencyCalculator";
import {ItemData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

export default class SwadeCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor: Actor) {
        // @ts-ignore
		return actor.data.data.details.currency;
    }

    updateActorWithNewFunds(buyer: Actor, buyerFunds: number) {
        buyer.update({ "data.details.currency": buyerFunds });
    }

    prepareItems(items: any) {

        console.log("Merchant Sheet | Prepare Features");
        // Actions
        const features = {
            weapons: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.weapons"),
                items: [],
                type: "weapon"
            },
            armor: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.armor"),
                items: [],
                type: "armor"
            },
            shields: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.shields"),
                items: [],
                type: "shield"
            },
            gear: {
                label: (<Game>game).i18n.localize("MERCHANTNPC.gear"),
                items: [],
                type: "gear"
            }
        };

        //console.log("Loot Sheet | Prepare Items");
        // Iterate through items, allocating to containers
        // for (let i of items) {
        features.gear.items = items.gear;
        features.gear.items.sort(this.compare());
        features.armor.items = items.armor;
        features.armor.items.sort(this.compare());
        features.shields.items = items.shield;
        features.shields.items.sort(this.compare());
        features.weapons.items = items.weapon;
        features.weapons.items.sort(this.compare());

        return features;
    }

	public compare() {
		return function (a: ItemData, b: ItemData) {
			return a.name.localeCompare(b.name);
		};
	}


	getPriceFromItem(item: Item) {
        // @ts-ignore
		return item.data.data.price;
    }

    getPriceItemKey() {
        return "data.price";
    }

    priceInText(itemCostInGold: number) {
        return itemCostInGold + ' ' + (<Game>game).settings.get("swade","currencyName");
    }

	getDescription(chatData: any): string {
		return chatData;
	}


}
