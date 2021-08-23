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
                label: "Ammunition",
                items: items.ammunition,
                type: "ammunition"
            },
            augmentation: {
                label: "Augmentation",
                items: items.augmentation,
                type: "augmentation"
            },
            consumable: {
                label: "Consumable",
                items: items.consumable,
                type: "consumable"
            },
            container: {
                label: "Container",
                items: items.container,
                type: "container"
            },
            equipment: {
                label: "Equipment",
                items: items.equipment,
                type: "equipment"
            },
            fusion: {
                label: "Fusion",
                items: items.fusion,
                type: "fusion"
            },
            goods: {
                label: "Foods",
                items: items.goods,
                type: "goods"
            },
            hybrid: {
                label: "Hybrid",
                items: items.hybrid,
                type: "hybrid"
            },
            magic: {
                label: "Magic",
                items: items.magic,
                type: "magic"
            },
            shield: {
                label: "Shield",
                items: items.shield,
                type: "shield"
            },
            spell: {
                label: "Spell",
                items: items.spell,
                type: "spell"
            },
            technological: {
                label: "Technological",
                items: items.technological,
                type: "technological"
            },
            upgrade: {
                label: "Upgrade",
                items: items.upgrade,
                type: "Upgrade"
            },
            weapon: {
                label: "Weapon",
                items: items.weapon,
                type: "weapon"
            },
            weaponAccessory: {
                label: "Weapon accessory",
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
}
