var currencyCalculator;

async function systemCurrencyCalculator() {
    let currencyModuleImport = "./systems/"+game.system.id.charAt(0).toUpperCase() + game.system.id.slice(1) + "CurrencyCalculator.js";
    console.log("Merchant Sheet | importing " + currencyModuleImport);
    await import(currencyModuleImport).then((obj) => currencyCalculator = new obj.default()).catch(
        (reason) => {
            console.log(reason);
            import("./systems/CurrencyCalculator.js").then((obj) => currencyCalculator = new obj.default());
        }
    );
    currencyCalculator.initSettings();
}

function errorMessageToActor(target, message) {
    let allowNoTargetGM = game.settings.get("merchantsheetnpc", "allowNoGM")
    if (allowNoTargetGM) {
        ui.notifications.error(message);
    } else {
        game.socket.emit(MerchantSheetNPC.SOCKET, {
            type: "error",
            targetId: target.id,
            message: message
        });
    }
}



class MerchantSheetNPCHelper
{
    /**
     * Retrieve the loot permission for a player, given the current actor data.
     *
     * It first tries to get an entry from the actor's permissions, if none is found it uses default, otherwise returns 0.
     *
     */
    static getMerchantPermissionForPlayer(actorData, player) {
        let defaultPermission = actorData.permission.default;
        if (player.data._id in actorData.permission) {
            return actorData.permission[player.data._id];
        }
        else if (typeof defaultPermission !== "undefined") {
            return defaultPermission;
        }
        else {
            return 0;
        }
    }
}

class QuantityDialog extends Dialog {
    constructor(callback, options) {
        if (typeof (options) !== "object") {
            options = {};
        }

        let applyChanges = false;
        super({
            title: game.i18n.localize("MERCHANTNPC.quantity"),
            content: `
            <form>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="1">
                </div>
            </form>`,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: options.acceptLabel ? options.acceptLabel : game.i18n.localize("MERCHANTNPC.item-buy"),
                    callback: () => applyChanges = true
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: game.i18n.localize("MERCHANTNPC.cancel")
                },
            },
            default: "yes",
            close: () => {
                if (applyChanges) {
                    var quantity = document.getElementById('quantity').value

                    if (isNaN(quantity)) {
                        return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-quantityInvalid"))
                    }

                    callback(quantity);

                }
            }
        });
    }
}
class SellerQuantityDialog extends Dialog {
    constructor(callback, options) {
        if (typeof (options) !== "object") {
            options = {};
        }

        let applyChanges = false;
        super({
            title: game.i18n.localize("MERCHANTNPC.quantity"),
            content: `
            <form>
                <div class="form-group">
                    <label>Quantity:</label>
                    <input type=number min="1" id="quantity" name="quantity" value="{{test}}">
                </div>
            </form>`,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: options.acceptLabel ? options.acceptLabel : game.i18n.localize("MERCHANTNPC.sell"),
                    callback: () => applyChanges = true
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: game.i18n.localize("MERCHANTNPC.cancel")
                },
            },
            default: "yes",
            close: () => {
                if (applyChanges) {
                    var quantity = document.getElementById('quantity').value

                    if (isNaN(quantity)) {
                        return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-quantityInvalid"))
                    }

                    callback(quantity);

                }
            }
        });
    }
}

async function findSpellPack(pack) {
    if (pack !== 'none') {
        return (await game.packs.filter(s => s.metadata.name === pack))[0]
    }
    return undefined;
}

class MerchantSheetNPC extends ActorSheet {

    static SOCKET = "module.merchantsheetnpc";

    get template() {
        // adding the #equals and #unequals handlebars helper
        Handlebars.registerHelper('equals', function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('merchantsheetprice', function (basePrice, modifier) {
            if (modifier === 'undefined') {
                this.actor.setFlag("merchantsheetnpc", "priceModifier", 1.0);
                modifier = 1.0;
            }
            // if (!stackModifier) await this.actor.setFlag(moduleName, "stackModifier", 20);

            console.log ("Merchant sheet | basePrice: "+ basePrice + " modifier: " + modifier)

            return (Math.round(basePrice * modifier * 100) / 100).toLocaleString('en');
        });

        Handlebars.registerHelper('merchantsheetstackweight', function (weight, qty) {
            let showStackWeight = game.settings.get("merchantsheetnpc", "showStackWeight");
            if (showStackWeight) {
                return `/${(weight * qty).toLocaleString('en')}`;
            }
            else {
                return ""
            }

        });

        Handlebars.registerHelper('merchantsheetweight', function (weight) {
            return (Math.round(weight * 1e5) / 1e5).toString();
        });

        Handlebars.registerHelper('itemInfinity', function (qty) {
            return (qty === Number.MAX_VALUE)
        });

        const path = "./module/templates/actors/";
        if (!game.user.isGM && this.actor.limited) return path + "limited-sheet.html";
        return "modules/merchantsheetnpc/template/npc-sheet.html";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["sheet actor npc npc-sheet merchant-sheet-npc"],
            width: 890,
            height: 750
        });
        return options;
    }

    async getData() {
        const sheetData = super.getData();

        // Prepare GM Settings
        let merchant = this.prepareGMSettings(sheetData.actor);

        // Prepare isGM attribute in sheet Data

        if (game.user.isGM) sheetData.isGM = true;
        else sheetData.isGM = false;


        let priceModifier = 1.0;
        let moduleName = "merchantsheetnpc";
        priceModifier = await this.actor.getFlag(moduleName, "priceModifier");

        let stackModifier = 20;
        stackModifier = await this.actor.getFlag(moduleName, "stackModifier");
        let totalWeight = 0;

        sheetData.totalItems = this.actor.data.items.length;
        sheetData.priceModifier = priceModifier;
        sheetData.stackModifier = stackModifier;
        sheetData.sections = currencyCalculator.prepareItems(this.actor.itemTypes);
        sheetData.merchant = merchant;
        sheetData.owner = sheetData.isGM;
        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
     */
    activateListeners(html) {
        super.activateListeners(html);
            // Toggle Permissions
        html.find('.permission-proficiency').click(ev => this._onCyclePermissionProficiency(ev));
        html.find('.permission-proficiency-bulk').click(ev => this._onCyclePermissionProficiencyBulk(ev));

        // Price Modifier
        html.find('.price-modifier').click(ev => this._priceModifier(ev));
        html.find('.buy-modifier').click(ev => this._buyModifier(ev));
        html.find('.stack-modifier').click(ev => this._stackModifier(ev));
        html.find('.csv-import').click(ev => this._csvImport(ev));

        html.find('.merchant-settings').change(ev => this._merchantSettingChange(ev));
        html.find('.update-inventory').click(ev => this._merchantInventoryUpdate(ev));

        // Buy Item
        html.find('.item-buy').click(ev => this._buyItem(ev));
        html.find('.item-buystack').click(ev => this._buyItem(ev, 1));
        html.find('.item-delete').click(ev => this._deleteItem(ev));
        html.find('.change-item-quantity').click(ev => this._changeQuantity(ev));
        html.find('.change-item-price').click(ev => this._changePrice(ev));
        html.find('.merchant-item .item-name').click(event => this._onItemSummary(event));


        // Roll Table
        //html.find('.sheet-type').change(ev => this._changeSheetType(ev, html));

    }

    /* -------------------------------------------- */

    /**
     * Handle merchant settings change
     * @private
     */
    async _merchantSettingChange(event, html) {
        event.preventDefault();
        console.log("Merchant sheet | Merchant settings changed");

        const moduleNamespace = "merchantsheetnpc";
        const expectedKeys = ["rolltable", "shopQty", "itemQty", "itemQtyLimit", "clearInventory", "itemOnlyOnce"];

        let targetKey = event.target.name.split('.')[3];


        if (expectedKeys.indexOf(targetKey) === -1) {
            console.log(`Merchant sheet | Error changing stettings for "${targetKey}".`);
            return ui.notifications.error(game.i18n.format("MERCHANTNPC.error-changeSettings", {target: targetKey}))
        }

        if (targetKey == "clearInventory" || targetKey == "itemOnlyOnce") {
            console.log(targetKey + " set to " + event.target.checked);
            await this.actor.setFlag(moduleNamespace, targetKey, event.target.checked);
        } else if (event.target.value) {
            console.log(targetKey + " set to " + event.target.value);
            console.log("A");
            await this.actor.setFlag(moduleNamespace, targetKey, event.target.value);
        } else {
            console.log(targetKey + " set to " + event.target.value);
            console.log("B");
            await this.actor.unsetFlag(moduleNamespace, targetKey, event.target.value);
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle merchant inventory update
     * @private
     */
    async _merchantInventoryUpdate(event, html) {
        event.preventDefault();

        const moduleNamespace = "merchantsheetnpc";
        const rolltableName = this.actor.getFlag(moduleNamespace, "rolltable");
        const shopQtyFormula = this.actor.getFlag(moduleNamespace, "shopQty") || "1";
        const itemQtyFormula = this.actor.getFlag(moduleNamespace, "itemQty") || "1";
        const itemQtyLimit = this.actor.getFlag(moduleNamespace, "itemQtyLimit") || "0";
        const clearInventory = this.actor.getFlag(moduleNamespace, "clearInventory");
        const itemOnlyOnce = this.actor.getFlag(moduleNamespace, "itemOnlyOnce");
        const reducedVerbosity = game.settings.get(moduleNamespace, "reduceUpdateVerbosity");

        let shopQtyRoll = new Roll(shopQtyFormula);
        shopQtyRoll.roll();

        let rolltable = game.tables.getName(rolltableName);
        if (!rolltable) {
            // console.log(`Merchant sheet | No Rollable Table found with name "${rolltableName}".`);
            return ui.notifications.error(`No Rollable Table found with name "${rolltableName}".`);
        }

        if (itemOnlyOnce) {
            if (rolltable.results.length < shopQtyRoll.total)  {
                return ui.notifications.error(`Cannot create a merchant with ${shopQtyRoll.total} unqiue entries if the rolltable only contains ${rolltable.results.length} items`);
            }
        }

        // console.log(rolltable);

        if (clearInventory) {

            let currentItems = this.actor.data.items.map(i => i._id);
            await this.actor.deleteEmbeddedDocuments("Item", currentItems);
            // console.log(currentItems);
        }

        console.log(`Merchant sheet | Adding ${shopQtyRoll.result} new items`);

        if (!itemOnlyOnce) {
            for (let i = 0; i < shopQtyRoll.total; i++) {
                const rollResult = rolltable.roll();
                //console.log(rollResult);
                let newItem = null;

                if (rollResult.results[0].collection === "Item") {
                    newItem = game.items.get(rollResult.results[0].resultId);
                }
                else {
                    // Try to find it in the compendium
                    const items = game.packs.get(rollResult.results[0].collection);
                    // console.log(items);
                    // dnd5eitems.getIndex().then(index => console.log(index));
                    // let newItem = dnd5eitems.index.find(e => e.id === rollResult.results[0].resultId);
                    // items.getEntity(rollResult.results[0].resultId).then(i => console.log(i));
                    newItem = await items.getEntity(rollResult.results[0].resultId);
                }
                if (!newItem || newItem === null) {
                    // console.log(`Merchant sheet | No item found "${rollResult.results[0].resultId}".`);
                    return ui.notifications.error(`No item found "${rollResult.results[0].resultId}".`);
                }

                if (newItem.type === "spell") {
                    newItem = await Item5e.createScrollFromSpell(newItem)
                }

                let itemQtyRoll = new Roll(itemQtyFormula);
                itemQtyRoll.roll();
                console.log(`Merchant sheet | Adding ${itemQtyRoll.total} x ${newItem.name}`)

                // newitem.data.data.quantity = itemQtyRoll.result;

                let existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                if (existingItem === undefined) {
                    await this.actor.createEmbeddedDocuments("Item", newItem);
                    console.log(`Merchant sheet | ${newItem.name} does not exist.`);
                    existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                    if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                        await existingItem.update({ "data.quantity": itemQtyLimit });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                    } else {
                        await existingItem.update({ "data.quantity": itemQtyRoll.total });
                        if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                    }
                }
                else {
                    console.log(`Merchant sheet | Item ${newItem.name} exists.`);

                    let newQty = Number(existingItem.data.data.quantity) + Number(itemQtyRoll.total);

                    if (itemQtyLimit > 0 && Number(itemQtyLimit) === Number(existingItem.data.data.quantity)) {
                        if (!reducedVerbosity) ui.notifications.info(`${newItem.name} already at maximum quantity (${itemQtyLimit}).`);
                    }
                    else if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(newQty)) {
                        //console.log("Exceeds existing quantity, limiting");
                        await existingItem.update({ "data.quantity": itemQtyLimit });
                        if (!reducedVerbosity) ui.notifications.info(`Added additional quantity to ${newItem.name} to the specified maximum of ${itemQtyLimit}.`);
                    } else {
                        await existingItem.update({ "data.quantity": newQty });
                        if (!reducedVerbosity) ui.notifications.info(`Added additional ${itemQtyRoll.total} quantity to ${newItem.name}.`);
                    }
                }
            }
        }
        else {
            // Get a list which contains indexes of all possible results

            const rolltableIndexes = []

            // Add one entry for each weight an item has
            for (let index in [...Array(rolltable.results.length).keys()]) {
                let numberOfEntries = rolltable.data.results[index].weight
                for (let i = 0; i < numberOfEntries; i++) {
                    rolltableIndexes.push(index);
                }
            }

            // Shuffle the list of indexes
            var currentIndex = rolltableIndexes.length, temporaryValue, randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {

                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = rolltableIndexes[currentIndex];
                rolltableIndexes[currentIndex] = rolltableIndexes[randomIndex];
                rolltableIndexes[randomIndex] = temporaryValue;
            }

            // console.log(`Rollables: ${rolltableIndexes}`)

            let indexesToUse = [];
            let numberOfAdditionalItems = 0;
            // Get the first N entries from our shuffled list. Those are the indexes of the items in the roll table we want to add
            // But because we added multiple entries per index to account for weighting, we need to increase our list length until we got enough unique items
            while (true)
            {
                let usedEntries = rolltableIndexes.slice(0, shopQtyRoll.total + numberOfAdditionalItems);
                // console.log(`Distinct: ${usedEntries}`);
                let distinctEntris = [...new Set(usedEntries)];

                if (distinctEntris.length < shopQtyRoll.total) {
                    numberOfAdditionalItems++;
                    // console.log(`numberOfAdditionalItems: ${numberOfAdditionalItems}`);
                    continue;
                }

                indexesToUse = distinctEntris
                // console.log(`indexesToUse: ${indexesToUse}`)
                break;
            }

            for (const index of indexesToUse)
            {
                let itemQtyRoll = new Roll(itemQtyFormula);
                itemQtyRoll.roll();

                let newItem = null

                if (rolltable.results[index].collection === "Item") {
                    newItem = game.items.get(rolltable.results[index].resultId);
                }
                else {
                    //Try to find it in the compendium
                    const items = game.packs.get(rolltable.results[index].collection);
                    newItem = await items.getEntity(rolltable.results[index].resultId);
                }
                if (!newItem || newItem === undefined) {
                    return ui.notifications.error(`No item found "${rolltable.results[index].resultId}".`);
                }

                if (newItem.type === "spell") {
                    newItem = await Item5e.createScrollFromSpell(newItem)
                }

                await this.actor.createEmbeddedDocuments("Item", newItem);
                let existingItem = this.actor.items.find(item => item.data.name == newItem.name);

                if (itemQtyLimit > 0 && Number(itemQtyLimit) < Number(itemQtyRoll.total)) {
                    await existingItem.update({ "data.quantity": itemQtyLimit });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyLimit} x ${newItem.name}.`);
                } else {
                    await existingItem.update({ "data.quantity": itemQtyRoll.total });
                    if (!reducedVerbosity) ui.notifications.info(`Added new ${itemQtyRoll.total} x ${newItem.name}.`);
                }
            }
        }
    }


    /* -------------------------------------------- */

    /**
     * Handle buy item
     * @private
     */
    _deleteItem(event) {
        event.preventDefault();
        console.log("Merchant sheet | Delete Item clicked");
        let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
        this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    }

        /* -------------------------------------------- */

    /**
     * Handle buy item
     * @private
     */
    _buyItem(event, stack = 0) {
        event.preventDefault();
        console.log("Merchant sheet | Buy Item clicked");

        let targetGm = null;
        game.users.forEach((u) => {
            if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
                targetGm = u;
            }
        });
        let allowNoTargetGM = game.settings.get("merchantsheetnpc", "allowNoGM")
        let gmId = null;
        console.log("MErchant sheet | targetGM ",targetGm)

        if (!allowNoTargetGM && !targetGm) {
            console.log("MErchant sheet | no Valid GM",allowNoTargetGM)
            return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-noGM"));
        } else if (!allowNoTargetGM) {
            console.log("MErchant sheet | gmId",targetGm.data._id)
            gmId = targetGm.data._id;
        }

        if (this.token === null) {
            return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-noToken"));
        }
        if (!game.user.actorId) {
            return ui.notifications.error(game.i18n.localize("MERCHANTNPC.error-noCharacter"));
        }

        let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");
        let stackModifier = $(event.currentTarget).parents(".merchant-item").attr("data-item-stack");
        const item = this.actor.getEmbeddedDocument("Item", itemId);

        const packet = {
            type: "buy",
            buyerId: game.user.actorId,
            tokenId: this.token.id,
            itemId: itemId,
            quantity: 1,
            processorId: gmId
        };
        console.log(stackModifier)
        console.log(item.data.data.quantity)

        if (stack || event.shiftKey) {
            if (item.data.data.quantity < stackModifier) {
                packet.quantity = item.data.data.quantity;
            } else {
                packet.quantity = stackModifier;
            }
            if (allowNoTargetGM) {
                buyTransactionFromPlayer(packet)
            } else {
                console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
                game.socket.emit(MerchantSheetNPC.SOCKET, packet);
            }
            return;
        }

        let d = new QuantityDialog((quantity) => {
                packet.quantity = quantity;
                if (allowNoTargetGM) {
                    buyTransactionFromPlayer(packet)
                } else {
                    console.log("MerchantSheet", "Sending buy request to " + targetGm.name, packet);
                    game.socket.emit(MerchantSheetNPC.SOCKET, packet);
                }
            },
            {
                acceptLabel: "Purchase"
            }
        );
        d.render(true);
    }


    /**
     * Handle price modifier
     * @private
     */
    async _priceModifier(event) {
        event.preventDefault();
        //console.log("Merchant sheet | Price Modifier clicked");
        //console.log(this.actor.isToken);

        let priceModifier = await this.actor.getFlag("merchantsheetnpc", "priceModifier");
        if (priceModifier === 'undefined') priceModifier = 1.0;

        priceModifier = Math.round(priceModifier * 100);
        const template_file = "modules/merchantsheetnpc/template/buy_from_merchant.html";
        const template_data = { priceModifier: priceModifier};
        const rendered_html = await renderTemplate(template_file, template_data);

        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.buyMerchantDialog-title'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => {
                        let priceModifier = document.getElementById("price-modifier-percent").value;
                        if (priceModifier === 0) {
                            this.actor.setFlag("merchantsheetnpc", "priceModifier", 0)
                        } else {
                            this.actor.setFlag("merchantsheetnpc", "priceModifier", document.getElementById("price-modifier-percent").value / 100)
                        }
                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Price Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Price Modifier Closed")
        });
        d.render(true);
    }

    /**
     * Handle buy modifier
     * @private
     */
    async _buyModifier(event) {
        event.preventDefault();

        let buyModifier = await this.actor.getFlag("merchantsheetnpc", "buyModifier");
        if (buyModifier === 'undefined') {
            buyModifier = 0.5;
        }

        buyModifier = Math.round(buyModifier * 100);

        const template_file = "modules/merchantsheetnpc/template/sell_to_merchant.html";
        const template_data = { buyModifier: buyModifier};
        const rendered_html = await renderTemplate(template_file, template_data);

        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.sellToMerchantDialog-title'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => {
                        let priceModifier = document.getElementById("price-modifier-percent").value;
                        if (priceModifier === 0) {
                            this.actor.setFlag("merchantsheetnpc", "buyModifier", 0)
                        } else {
                            this.actor.setFlag("merchantsheetnpc", "buyModifier", priceModifier / 100)
                        }

                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Buy Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Buy Modifier Closed")
        });
        d.render(true);
    }

    /**
     * Handle stack
     * @private
     */
    async _changePrice(event) {
        event.preventDefault();
        console.log("Merchant sheet | Change item price");
        let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

        const item = this.actor.getEmbeddedDocument("Item", itemId);
        const template_file = "modules/merchantsheetnpc/template/change_price.html";
        const template_data = { price: currencyCalculator.getPriceFromItem(item)};
        const rendered_html = await renderTemplate(template_file, template_data);

        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.priceDialog-title'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => {
                        item.update({[currencyCalculator.getPriceItemKey()]: document.getElementById("price-value").value});
                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Change price Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Change price Closed")
        });
        d.render(true);
    }


    /**
     * Handle stack
     * @private
     */
    async _changeQuantity(event) {
        event.preventDefault();
        console.log("Merchant sheet | Change quantity");
        let itemId = $(event.currentTarget).parents(".merchant-item").attr("data-item-id");

        const item = this.actor.getEmbeddedDocument("Item", itemId);
        const template_file = "modules/merchantsheetnpc/template/change_quantity.html";
        const template_data = { quantity: item.data.data.quantity,
            infinity: (item.data.data.quantity === Number.MAX_VALUE?'checked':'')
        };
        const rendered_html = await renderTemplate(template_file, template_data);
        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.quantityDialog-title'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => {
                        if (document.getElementById("quantity-infinity").checked) {
                            this.actor.updateEmbeddedDocuments("Item",[{_id: itemId, "data.quantity": Number.MAX_VALUE}])
                        } else {
                            this.actor.updateEmbeddedDocuments("Item",[{
                                _id: itemId,
                                "data.quantity": document.getElementById("quantity-value").value
                            }])
                        }
                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Change quantity Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Change quantity Closed")
        });
        d.render(true);
    }

    /**
     * Handle stack modifier
     * @private
     */
    async _stackModifier(event) {
        event.preventDefault();

        let stackModifier = await this.actor.getFlag("merchantsheetnpc", "stackModifier");
        if (!stackModifier) stackModifier = 20;

        const template_file = "modules/merchantsheetnpc/template/stack_modifier.html";
        const template_data = { stackModifier: stackModifier};
        const rendered_html = await renderTemplate(template_file, template_data);

        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.stack-modifier'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => this.actor.setFlag("merchantsheetnpc", "stackModifier",  document.getElementById("stack-modifier").value / 1)
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Stack Modifier Closed")
        });
        d.render(true);
    }


    /**
     * Handle csv-import
     * @private
     */
    async _csvImport(event) {
        event.preventDefault();

        const template_file = "modules/merchantsheetnpc/template/csv-import.html";
        const template_data = {compendiums: getCompendiumnsChoices()};
        const rendered_html = await renderTemplate(template_file, template_data);


        let d = new Dialog({
            title: game.i18n.localize('MERCHANTNPC.csv-import'),
            content: rendered_html,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('MERCHANTNPC.update'),
                    callback: () => {
                        let csvInput = {
                            pack: document.getElementById("csv-pack-name").value,
                            scrollStart: document.getElementById("csv-scroll-name-value").value,
                            priceCol: document.getElementById("csv-price-value").value,
                            nameCol: document.getElementById("csv-name-value").value,
                            input: document.getElementById("csv").value
                        }
                        this.createItemsFromCSV(this.actor, csvInput)

                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('MERCHANTNPC.cancel'),
                    callback: () => console.log("Merchant sheet | Stack Modifier Cancelled")
                }
            },
            default: "two",
            close: () => console.log("Merchant sheet | Stack Modifier Closed")
        });
        d.render(true);
    }

    async createItemsFromCSV(actor, csvInput) {
        let split = csvInput.input.split('\n');
        let csvItems = split.map(function mapCSV(text) {
            let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
            for (l of text) {
                if ('"' === l) {
                    if (s && l === p) row[i] += l;
                    s = !s;
                } else if ((',' === l || '|' === l) && s) l = row[++i] = '';
                else if ('\n' === l && s) {
                    if ('\r' === p) row[i] = row[i].slice(0, -1);
                    row = ret[++r] = [l = '']; i = 0;
                } else row[i] += l;
                p = l;
            }
            return ret;
        });

        let itemPack = (await game.packs.filter(s => s.metadata.name === game.settings.get("merchantsheetnpc", "itemCompendium")))[0];
        let spellPack = await findSpellPack(csvInput.pack)
        let nameCol = Number(csvInput.nameCol)-1
        let priceCol = -1
        if (csvInput.priceCol !== undefined) {
            priceCol = Number(csvInput.priceCol) - 1
        }
        console.log("Merchant sheet | csvItems", csvItems)
        for (let csvItem of csvItems) {
            if (csvItem[0].length > 0 && csvItem[0][0].length > 0) {
                let item = csvItem[0];
                let name = item[nameCol].trim();
                let price = 0
                if (priceCol >= 0) {
                    price = item[priceCol];
                }
                let storeItems = [];
                if (name.startsWith(csvInput.scrollStart) && spellPack !== undefined) {
                    let nameSub = name.substr(csvInput.scrollStart.length, name.length).trim()
                    let spellItem = await spellPack.index.filter(i => i.name === nameSub)
                    for (const spellItemElement of spellItem) {
                        let itemData = await spellPack.getDocument(spellItemElement._id);
                        let itemFound = await currencyCalculator.createScroll(itemData)
                        if (itemFound !== undefined) {
                            itemFound.data.name = itemFound.name;
                            console.log("created item: ", itemFound)
                            storeItems.push(itemFound.data)
                        }
                    }
                } else {
                    let items = await itemPack.index.filter(i => i.name === name)
                    for (const itemToStore of items) {
                        let loaded = await itemPack.getDocument(itemToStore._id);
                        storeItems.push(duplicate(loaded))
                    }

                }
                for (let itemToStore of storeItems) {
                    if (price > 0 && (itemToStore.data.price === undefined || itemToStore.data.price === 0)) {
                        itemToStore.update({[currencyCalculator.getPriceItemKey()]: price});
                    }
                }
                let existingItem = await actor.items.find(it => it.data.name == name);
                //
                if (existingItem === undefined) {
                    console.log("Create item on actor: ", storeItems)
                    await actor.createEmbeddedDocuments("Item", storeItems);
                }
                else {
                    let newQty = Number(existingItem.data.data.quantity) + Number(1);
                    await existingItem.update({ "data.quantity": newQty});
                }
            }
        }
        await collapseInventory(actor)
        return undefined;
    }




    /* -------------------------------------------- */

    /**
     * Handle cycling permissions
     * @private
     */
    _onCyclePermissionProficiency(event) {

        event.preventDefault();

        //console.log("Merchant sheet | this.actor.data.permission", this.actor.data.permission);


        let actorData = this.actor;


        let field = $(event.currentTarget).siblings('input[type="hidden"]');

        let level = parseFloat(field.val());
        if (typeof level === undefined) level = 0;

        //console.log("Merchant sheet | current level " + level);

        const levels = [0, 3, 2]; //const levels = [0, 2, 3];

        let idx = levels.indexOf(level),
            newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

        //console.log("Merchant sheet | new level " + newLevel);

        let playerId = field[0].name;

        //console.log("Merchant sheet | Current actor: " + playerId);

        this._updatePermissions(actorData, playerId, newLevel, event);

        this._onSubmit(event);
    }

    /* -------------------------------------------- */

    _onItemSummary(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".merchant-item"),
            item = this.actor.items.get(li.data("item-id")),
            chatData = item.getChatData({secrets: this.actor.isOwner});
        // Toggle summary
        if ( li.hasClass("expanded") ) {
            let summary = li.children(".merchant-item-summary");
            summary.slideUp(200, () => summary.remove());
        } else {
            let div = $(`<div class="merchant-item-summary">${chatData.description.value}</div>`);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass("expanded");
    }

    /**
     * Handle cycling bulk permissions
     * @private
     */
    _onCyclePermissionProficiencyBulk(event) {
        event.preventDefault();

        let actorData = this.actor.data;

        let field = $(event.currentTarget).parent().siblings('input[type="hidden"]');
        let level = parseFloat(field.val());
        if (typeof level === undefined || level === 999) level = 0;

        const levels = [0, 2]; //const levels = [0, 2, 3];

        let idx = levels.indexOf(level),
            newLevel = levels[(idx === levels.length - 1) ? 0 : idx + 1];

        let users = game.users.contents;

        let currentPermissions = duplicate(actorData.permission);
        for (let u of users) {
            if (u.data.role === 1 || u.data.role === 2) {
                currentPermissions[u.data._id] = newLevel;
            }
        }
        const merchantPermissions = new PermissionControl(this.actor);
        merchantPermissions._updateObject(event, currentPermissions)

        this._onSubmit(event);
    }

    _updatePermissions(actorData, playerId, newLevel, event) {
        // Read player permission on this actor and adjust to new level
        console.log("Merchant sheet | _updatePermission ",actorData, playerId, newLevel, event)
        let currentPermissions = duplicate(actorData.data.permission);
        currentPermissions[playerId] = newLevel;
        // Save updated player permissions
        console.log("Merchant sheet | _updatePermission ",currentPermissions, actorData.data.permission)
        const merchantPermissions = new PermissionControl(this.actor.data);
        console.log("Merchant sheet | _updatePermission merchantPermissions",merchantPermissions)
        // actorData.update(currentPermissions)
        merchantPermissions._updateObject(event, currentPermissions);
    }

    /* -------------------------------------------- */


    /* -------------------------------------------- */


    /**
     * Get the font-awesome icon used to display the permission level.
     * @private
     */
    _getPermissionIcon(level) {
        console.log("Merchant sheet _getPermissionIcon | level ", level);
        const icons = {
            0: '<i class="far fa-circle"></i>',
            2: '<i class="fas fa-eye"></i>',
            999: '<i class="fas fa-users"></i>'
        };
        return icons[level];
    }

    /* -------------------------------------------- */

    /**
     * Get the font-awesome icon used to display the permission level.
     * @private
     */
    _getPermissionDescription(level) {
        const description = {
            0: game.i18n.localize("MERCHANTNPC.permission-none-help"),
            2: game.i18n.localize("MERCHANTNPC.permission-observer-help"),
            999: game.i18n.localize("MERCHANTNPC.permission-all-help")
        };
        return description[level];
    }


    /* -------------------------------------------- */

    /**
     * Prepares GM settings to be rendered by the Merchant sheet.
     * @private
     */
    prepareGMSettings(actorData) {
        const playerData = [],
            observers = [];

        let players = game.users.players;
        let commonPlayersPermission = -1;


        for (let player of players) {

        //     // get the name of the primary actor for a player
            const actor = game.actors.get(player.data.character);
        //
            if (actor) {

                console.log(player.data.name)
                console.log(actor.data)


                player.actor = actor.data.name;
                player.actorId = actor.data._id;
                player.playerId = player.data._id;

        //
                player.merchantPermission = MerchantSheetNPCHelper.getMerchantPermissionForPlayer(this.actor.data, player);
        //
                if (player.merchantPermission >= 2 && !observers.includes(actor.data._id)) {
                    observers.push(actor.data._id);
                }

                //Set icons and permission texts for html
                if (commonPlayersPermission < 0) {
                    commonPlayersPermission = player.merchantPermission;
                } else if (commonPlayersPermission !== player.merchantPermission) {
                    commonPlayersPermission = 999;
                }

                player.icon = this._getPermissionIcon(player.merchantPermission);
                player.merchantPermissionDescription = this._getPermissionDescription(player.merchantPermission);
                playerData.push(player);
            }
        }

        let merchant = {}
        merchant.players = playerData;
        merchant.observerCount = observers.length;
        merchant.playersPermission = commonPlayersPermission;
        merchant.playersPermissionIcon = this._getPermissionIcon(commonPlayersPermission);
        merchant.playersPermissionDescription = this._getPermissionDescription(commonPlayersPermission);
        return merchant
    }

    async _onDropItemCreate(itemData) {
        console.log(itemData);
        return currencyCalculator.onDropItemCreate(itemData,this);

    }

    async callSuperOnDropItemCreate(itemData) {
        // Create the owned item as normal
        return super._onDropItemCreate(itemData);
    }

}

//Register the Merchant sheet
Actors.registerSheet("core", MerchantSheetNPC, {
    types: ["npc"],
    makeDefault: false
});

async function sellItem(target, dragSource, sourceActor, quantity, totalItemsPrice) {
    let sellerFunds = currencyCalculator.actorCurrency(sourceActor);
    currencyCalculator.addAmountForActor(sourceActor,sellerFunds,totalItemsPrice)
}

Hooks.on('updateActor', (actor, data) => {
    if (actor.getFlag("core", "sheetClass") === 'core.MerchantSheetNPC') {
        initModifiers(actor);
    }
});

Hooks.on('createActor', (actor, data) => {
    if (actor.sheet.template === 'modules/merchantsheetnpc/template/npc-sheet.html') {
        initModifiers(actor);
    }
});

async function collapseInventory(actor) {
    var groupBy = function(xs, key) {
        return xs.reduce(function(rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    };
    let itemGroupList = groupBy(actor.items, 'name');
    let itemsToBeDeleted = [];
    for (const [key, value] of Object.entries(itemGroupList)) {
        var itemToUpdateQuantity = value[0];
        for(let extraItem of value) {
            if (itemToUpdateQuantity !== extraItem) {
                let newQty = Number(itemToUpdateQuantity.data.data.quantity) + Number(extraItem.data.data.quantity);
                await itemToUpdateQuantity.update({ "data.quantity": newQty});
                itemsToBeDeleted.push(extraItem.id);
            }
        }
    }
    await actor.deleteEmbeddedDocuments("Item", itemsToBeDeleted);
}


function initModifiers(actor) {
    let priceModifier = actor.getFlag("merchantsheetnpc", "priceModifier");
    let sellModifier = actor.getFlag("merchantsheetnpc", "buyModifier");
    let sellerStack = actor.getFlag("merchantsheetnpc", "stackModifier");
    if (priceModifier === undefined) {
        actor.setFlag("merchantsheetnpc", "priceModifier", 1.0);
    }
    if (sellModifier === undefined) {
        actor.setFlag("merchantsheetnpc", "buyModifier", 0.5);
    }
    if (sellerStack === undefined) {
        actor.setFlag("merchantsheetnpc", "stackModifier", 20);
    }
    actor.render();
}

async function addItemToActor(dragSource, target, quantity) {
    console.log(target.items)
    console.log(target.items)
    let existingItem = await target.items.find(it => it.data.name == dragSource.data.name);

    if (existingItem === undefined) {
        target.createEmbeddedDocuments("Item", [dragSource]);
    }
    else {
        console.log(`Merchant sheet | Item ${existingItem.name} exists.`);
        let newQty = Number(existingItem.data.data.quantity) + Number(quantity);
        existingItem.update({ "data.quantity": newQty});
    }

    collapseInventory(target);

}

async function moveItems(source, destination, items) {
    const updates = [];
    const deletes = [];
    const additions = [];
    const destUpdates = [];
    const results = [];
    for (let i of items) {
        let itemId = i.itemId;
        let quantity = Number(i.quantity);
        let item = source.getEmbeddedDocument("Item", itemId);

        // Move all items if we select more than the quantity.
        if (item.data.data.quantity < quantity) {
            quantity = Number(item.data.data.quantity);
        }

        let newItem = duplicate(item);
        const update = { _id: itemId, "data.quantity": item.data.data.quantity >= (Number.MAX_VALUE-10000) ? Number.MAX_VALUE : item.data.data.quantity - quantity };
        let allowNoTargetGM = game.settings.get("merchantsheetnpc", "allowNoGM")

        if (update["data.quantity"] === 0 && !allowNoTargetGM) {
            deletes.push(itemId);
        }
        else {
            updates.push(update);
        }

        newItem.data.quantity = quantity;
        results.push({
            item: newItem,
            quantity: quantity
        });
        let destItem = destination.data.items.find(i => i.name == newItem.name);
        if (destItem === undefined) {
            additions.push(newItem);
        } else {
            //console.log("Existing Item");
            destItem.data.data.quantity = Number(destItem.data.data.quantity) + Number(newItem.data.quantity);
            if (destItem.data.data.quantity < 0) {
                destItem.data.data.quantity = 0;
            }
            const destUpdate = { _id: destItem._id, "data.quantity": destItem.data.data.quantity };
            destUpdates.push(destUpdate);
        }
    }

    if (deletes.length > 0) {

        await source.deleteEmbeddedDocuments("Item", deletes);
    }

    if (updates.length > 0) {
        await source.updateEmbeddedDocuments("Item", updates);
    }

    if (additions.length > 0) {
        await destination.createEmbeddedDocuments("Item", additions);
    }

    if (destUpdates.length > 0) {
        await destination.updateEmbeddedDocuments("Item", destUpdates);
    }

    return results;
}


Hooks.on('dropActorSheetData',(target,sheet,dragSource,user)=>{
    function checkCompatable(a,b){
        if(a==b) return false;
    }
    if(dragSource.type=="Item" && dragSource.actorId) {
        if(!target.data._id) {
            console.warn("Merchant sheet | target has no data._id?",target);
            return;
        }
        if(target.data._id ==  dragSource.actorId) return;  // ignore dropping on self
        let sourceActor = game.actors.get(dragSource.actorId);
        console.log("Merchant sheet | drop item");
        console.log(dragSource)
        if(sourceActor && target.sheet.template === 'modules/merchantsheetnpc/template/npc-sheet.html') {
            // if both source and target have the same type then allow deleting original item.
            // this is a safety check because some game systems may allow dropping on targets
            // that don't actually allow the GM or player to see the inventory, making the item
            // inaccessible.
            console.log(target)
            let buyModifier = target.getFlag("merchantsheetnpc", "buyModifier")
            if (!buyModifier) buyModifier = 0.5;


            var html = "<p>"+game.i18n.format('MERCHANTNPC.sell-items-player',{name: dragSource.data.name, price: currencyCalculator.priceInText(buyModifier * dragSource.data.data.price)})+"</p>";
            html += '<p><input name="quantity-modifier" id="quantity-modifier" type="range" min="0" max="'+dragSource.data.data.quantity+'" value="1" class="slider"></p>';
            html += '<p><label>'+game.i18n.localize("MERCHANTNPC.quantity")+':</label> <input type=number min="0" max="'+dragSource.data.data.quantity+'" value="1" id="quantity-modifier-display"></p> <input type="hidden" id="quantity-modifier-price" value = "'+(buyModifier * dragSource.data.data.price)+'"/>';
            html += '<script>var pmSlider = document.getElementById("quantity-modifier"); var pmDisplay = document.getElementById("quantity-modifier-display"); var total = document.getElementById("quantity-modifier-total"); var price = document.getElementById("quantity-modifier-price"); pmDisplay.value = pmSlider.value; pmSlider.oninput = function() { pmDisplay.value = this.value;  total.value =this.value * price.value; }; pmDisplay.oninput = function() { pmSlider.value = this.value; };</script>';
            html += '<p>'+game.i18n.localize("MERCHANTNPC.total")+'<input readonly type="text"  value="'+(buyModifier * dragSource.data.data.price)+'" id = "quantity-modifier-total"/> </p>' ;

            let d = new Dialog({
                title: game.i18n.localize("MERCHANTNPC.sell-item"),
                content: html,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('MERCHANTNPC.sell'),
                        callback: () => {
                            let quantity = document.getElementById("quantity-modifier").value;
                            let itemId = dragSource.data._id
                            // addItemToActor(dragSource,target,quantity);
                            moveItems(sourceActor, target, [{ itemId, quantity }]);
                            sellItem(target, dragSource, sourceActor, quantity, document.getElementById("quantity-modifier-total").value)
                        }
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('MERCHANTNPC.cancel'),
                        callback: () => console.log("Merchant sheet | Price Modifier Cancelled")
                    }
                },
                default: "two",
                close: () => console.log("Merchant sheet | Price Modifier Closed")
            });
            d.render(true);
        }
    }
});

function getCompendiumnsChoices() {
    let myobject = {"none": "None"};
    game.packs.map(function mapCompendiums(key,index) {
        if (key.metadata.entity === 'Item') {
            myobject[key.metadata.name] = key.metadata.label
        }
    });
    return myobject;
}
Hooks.once("ready", () => {
    game.settings.register("merchantsheetnpc", "itemCompendium", {
        name: game.i18n.format("MERCHANTNPC.pickItemCompendium"),
        hint: game.i18n.format("MERCHANTNPC.pickItemCompendium_hint"),
        scope: "world",
        config: true,
        type: String,
        choices: getCompendiumnsChoices(),
        default: "none",
    })
});

function chatMessage(speaker, owner, message, item) {
    if (game.settings.get("merchantsheetnpc", "buyChat")) {
        message = `
            <div class="chat-card item-card" data-actor-id="${owner.id}" data-item-id="${item.id}">
                <header class="card-header flexrow">
                    <div class= "merchant-item-image" style="background-image: url(${item.img})"></div>
                    <h3 class="item-name">${item.name}</h3>
                </header>

                <div class="message-content">
                    <p>` + message + `</p>
                </div>
            </div>
            `;
        ChatMessage.create({
            user: game.user.id,
            speaker: {
                actor: speaker,
                alias: speaker.name
            },
            content: message
        });
    }
}


async function transaction(seller, buyer, itemId, quantity) {
    console.log(`Buying item: ${seller}, ${buyer}, ${itemId}, ${quantity}`);

    let sellItem = seller.getEmbeddedDocument("Item", itemId);
    // If the buyer attempts to buy more then what's in stock, buy all the stock.
    if (sellItem.data.data.quantity < quantity) {
        quantity = sellItem.data.data.quantity;
    }

    // On negative quantity we show an error
    if (quantity < 0) {
        errorMessageToActor(buyer, game.i18n.localize("MERCHANTNPC.error-negativeAmountItems"));
        return;
    }

    // On 0 quantity skip everything to avoid error down the line
    if (quantity == 0) {
        return;
    }

    let sellerModifier = seller.getFlag("merchantsheetnpc", "priceModifier");
    let sellerStack = seller.getFlag("merchantsheetnpc", "stackModifier");
    if (sellerModifier === 'undefined') {
        sellerModifier = 1.0;
    }
    if (!sellerStack && quantity > sellerStack) quantity = sellerStack;

    let itemCostInGold = Math.round(currencyCalculator.getPriceFromItem(sellItem) * sellerModifier * 100) / 100;

    itemCostInGold *= quantity;
    let currency = currencyCalculator.actorCurrency(buyer);

    let buyerFunds = duplicate(currency);

    if (currencyCalculator.buyerHaveNotEnoughFunds(itemCostInGold,buyerFunds)) {
        errorMessageToActor(buyer, game.i18n.localize("MERCHANTNPC.error-noFunds"));
        return;
    }

    currencyCalculator.subtractAmountFromActor(buyer,buyerFunds,itemCostInGold);

    // Update buyer's funds

    let moved = await moveItems(seller, buyer, [{ itemId, quantity }]);

    let chatPrice = currencyCalculator.priceInText(itemCostInGold);
    for (let m of moved) {
        chatMessage(
            seller, buyer,
            game.i18n.format('MERCHANTNPC.buyText', {buyer: buyer.name, quantity: quantity, itemName: m.item.name, chatPrice: chatPrice}),
            m.item);
    }
}


function buyTransactionFromPlayer(data) {
    console.log("Merchant sheet | buyTransaction ", data)
    if (data.type === "buy") {
        let buyer = game.actors.get(data.buyerId);
        let seller = canvas.tokens.get(data.tokenId);

        if (buyer && seller && seller.actor) {
            console.log()
            transaction(seller.actor, buyer, data.itemId, data.quantity);
        } else if (!seller) {
            ui.notifications.error(game.i18n.localize("MERCHANTNPC.playerOtherScene"));
        }
    }
}

Hooks.once("init", () => {
    systemCurrencyCalculator().then(() => console.log("Merchant Sheet | System calculator is loaded"));

    Handlebars.registerHelper('ifeq', function (a, b, options) {
        if (a == b) { return options.fn(this); }
        return options.inverse(this);
    });

    game.settings.register("merchantsheetnpc", "buyChat", {
        name: "Display chat message for purchases?",
        hint: "If enabled, a chat message will display purchases of items from the Merchant sheet.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "showStackWeight", {
        name: "Show Stack Weight?",
        hint: "If enabled, shows the weight of the entire stack next to the item weight",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "reduceUpdateVerbosity", {
        name: "Reduce Update Shop Verbosity",
        hint: "If enabled, no notifications will be created every time an item is added to the shop.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("merchantsheetnpc", "allowNoGM", {
        name: "Allow transactions without GM",
        hint: "If enabled, transactions can happen even without the GM is active.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.socket.on(MerchantSheetNPC.SOCKET, data => {
        console.log("Merchant sheet | processing socket request", game.user.isGM, data.processorId, game.user.id)

        if (game.user.isGM && data.processorId === game.user.id) {
            console.log("Merchant Sheet | buy processing by GM ", data)
            buyTransactionFromPlayer(data);
        }
        if (data.type === "error" && data.targetId === game.user.actorId) {
            console.log("Merchant sheet | Transaction Error: ", data.message);
            return ui.notifications.error(data.message);
        }
    });



});
