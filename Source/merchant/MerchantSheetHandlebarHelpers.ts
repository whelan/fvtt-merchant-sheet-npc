import Globals from '../Globals';

/**
 * Handles setting up all handlebar helpers
 */
export default class HandlebarHelpersMerchantSheet {

  /**
   * Registers the handlebar helpers
   */
  registerHelpers(currencyCalculator:any,merchantSheetNPC:any) {
	Handlebars.registerHelper('equals', function (arg1, arg2, options) {
		// @ts-ignore
		return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
	});
	Handlebars.registerHelper('inputStyle', function (options) {
		return currencyCalculator.inputStyle();
	});

	Handlebars.registerHelper('sectionStyle', function (options) {
		return currencyCalculator.sectionStyle();
	});

	Handlebars.registerHelper('editorStyle', function (options) {
		return currencyCalculator.editorStyle();
	});

	Handlebars.registerHelper('shouldItemBeVisible', function (item, quantity: number, isGM: boolean, options) {
		return isGM || (merchantSheetNPC.isItemShown(item) && quantity > 0);
	});

	Handlebars.registerHelper('getItemQuantity', function (quantity, options) {
		return currencyCalculator.getQuantity(quantity);
	});

	Handlebars.registerHelper('getItemWeight', function (itemData, options) {
		return currencyCalculator.getWeight(itemData);
	});
	Handlebars.registerHelper('getPriceCurrency', function () {
		return currencyCalculator.currency();
	});

	Handlebars.registerHelper('unequals', function (arg1, arg2, options) {
		// @ts-ignore
		return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
	});
	Handlebars.registerHelper('isPermissionShown', function () {
		return currencyCalculator.isPermissionShown();
	});


	Handlebars.registerHelper('itemSelected', function (key: string): string {
		let selectedKey: any = (<Game>game).settings.get(Globals.ModuleName, "itemCompendium")
		console.log(key, " - ", selectedKey)
		if (key === selectedKey) {
			return 'selected';
		}
		return '';
	});

	Handlebars.registerHelper('getTypeLocalized', function (key: string): string {
		return (<Game>game).i18n.localize("MERCHANTNPC." + key)
	});

	Handlebars.registerHelper('merchantsheetprice', function (basePrice, modifier) {
		if (modifier === 'undefined') {
			// @ts-ignore
			this.actor.setFlag(Globals.ModuleName, "priceModifier", 1.0);
			modifier = 1.0;
		}
		// if (!stackModifier) await this.actor.setFlag(m oduleName, "stackModifier", 20);

		return currencyCalculator.getPriceOutputWithModifier(basePrice, modifier);
	});

	Handlebars.registerHelper('merchantsheetstackweight', function (weight, qty, infinity) {
		let showStackWeight = game.settings?.get(Globals.ModuleName, "showStackWeight");
		if (showStackWeight) {
			let value = weight * qty;
			if (qty === Number.MAX_VALUE || value > 1000000000 || infinity) {
				return "/-"
			} else {
				return `/${value.toLocaleString('en')}`;
			}
		} else {
			return ""
		}

	});

	Handlebars.registerHelper('merchantsheetweight', function (weight) {
		return (Math.round(weight * 1e5) / 1e5).toString();
	});

	Handlebars.registerHelper('isItemShow', function (item: Item) {
		return merchantSheetNPC.isItemShown(item);
	});

	Handlebars.registerHelper('itemInfinity', function (qty, infinity) {
		return infinity || (qty === Number.MAX_VALUE)
	});

	Handlebars.registerHelper('merchantNotInfinity', function (infinity) {
		return !infinity
	});
  }
}
