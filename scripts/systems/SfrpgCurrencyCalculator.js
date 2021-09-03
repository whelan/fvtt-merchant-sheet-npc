import CurrencyCalculator from "./CurrencyCalculator.js";

export default class SfrpgCurrencyCalculator extends CurrencyCalculator {

    actorCurrency(actor) {
        return actor.data.data.currency.credit;
    }

    updateActorWithNewFunds(buyer, buyerFunds) {
        buyer.update({ "data.currency.credit": buyerFunds });
    }

    prepareItems(items) {

        console.log("Merchant Sheet | Prepare Features");
        console.log(items);
        // // Actions
        const features = {
            ammunition: {
                label: game.i18n.localize("MERCHANTNPC.ammunition"),
                items: items.ammunition,
                type: "ammunition"
            },
            augmentation: {
                label: game.i18n.localize("MERCHANTNPC.augmentation"),
                items: items.augmentation,
                type: "augmentation"
            },
            consumable: {
                label: game.i18n.localize("MERCHANTNPC.consumable"),
                items: items.consumable,
                type: "consumable"
            },
            container: {
                label: game.i18n.localize("MERCHANTNPC.container"),
                items: items.container,
                type: "container"
            },
            equipment: {
                label: game.i18n.localize("MERCHANTNPC.equipment"),
                items: items.equipment,
                type: "equipment"
            },
            fusion: {
                label: game.i18n.localize("MERCHANTNPC.fusion"),
                items: items.fusion,
                type: "fusion"
            },
            goods: {
                label: game.i18n.localize("MERCHANTNPC.goods"),
                items: items.goods,
                type: "goods"
            },
            hybrid: {
                label: game.i18n.localize("MERCHANTNPC.hybrid"),
                items: items.hybrid,
                type: "hybrid"
            },
            magic: {
                label: game.i18n.localize("MERCHANTNPC.magic"),
                items: items.magic,
                type: "magic"
            },
            shield: {
                label: game.i18n.localize("MERCHANTNPC.shield"),
                items: items.shield,
                type: "shield"
            },
            spell: {
                label: game.i18n.localize("MERCHANTNPC.spell"),
                items: items.spell,
                type: "spell"
            },
            technological: {
                label: game.i18n.localize("MERCHANTNPC.technological"),
                items: items.technological,
                type: "technological"
            },
            upgrade: {
                label: game.i18n.localize("MERCHANTNPC.upgrade"),
                items: items.upgrade,
                type: "Upgrade"
            },
            weapon: {
                label: game.i18n.localize("MERCHANTNPC.weapon"),
                items: items.weapon,
                type: "weapon"
            },
            weaponAccessory: {
                label: game.i18n.localize("MERCHANTNPC.weaponAccessory"),
                items: items.weaponAccessory,
                type: "weaponAccessory"
            },
        };

        //console.log("Loot Sheet | Prepare Items");
        // Iterate through items, allocating to containers
        // for (let i of items) {
        // features.gear.items = items.gear;
        features.ammunition.items.sort(this.compare());
        features.augmentation.items.sort(this.compare());
        features.consumable.items.sort(this.compare());
        features.container.items.sort(this.compare());
        features.equipment.items.sort(this.compare());
        features.fusion.items.sort(this.compare());
        features.goods.items.sort(this.compare());
        features.hybrid.items.sort(this.compare());
        features.magic.items.sort(this.compare());
        features.shield.items.sort(this.compare());
        features.spell.items.sort(this.compare());
        features.technological.items.sort(this.compare());
        features.upgrade.items.sort(this.compare());
        features.weapon.items.sort(this.compare());
        features.weaponAccessory.items.sort(this.compare());

        return features;
    }

    compare() {
        return function (a, b) {
            return a.name.localeCompare(b.name);
        };
    }

    getPriceFromItem(item) {
        return item.data.data.price;
    }

    getPriceItemKey() {
        return "data.price";
    }

}
