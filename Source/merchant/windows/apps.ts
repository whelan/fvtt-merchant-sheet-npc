import Globals from "../../Globals";
import Logger from "../../Utils/Logger";
import MerchantGenerator from "../model/MerchantGenerator";
import MerchantSheet from "../MerchantSheet";

export class Generator extends Application {
	actor
	constructor(object: Actor, options: any) {
		super();
		this.actor = object
	}

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.id = "generate-items";
		options.title = "Generate Items";
		options.template = "modules/" + Globals.ModuleName + "/templates/generator.html";
		options.width = 600;
		options.height = "auto";
		options.resizable = false;
		return options;

	}

	getData() {
		return {
			rolltables: (<Game>game).tables,
			data: {rolltables: (<Game>game).tables}
		};
	}

	activateListeners(html: JQuery<HTMLElement>) {
		// Change roll bonus
		html.find('.generate-items').on('click', () => {
			Logger.Log("Generator called")
			let generatorInput = new MerchantGenerator(
				MerchantSheet.getHtmlInputStringValue("data.rolltable", document),
				MerchantSheet.getHtmlInputStringValue("data.shopQty", document),
				MerchantSheet.getHtmlInputStringValue("data.itemQty", document),
				MerchantSheet.getHtmlInputNumberValue("data.itemQtyLimit", document),
				MerchantSheet.getHtmlInputStringValue("data.itemPrice", document),
				MerchantSheet.getHtmlInputBooleanValue("data.clearInventory", document),
				MerchantSheet.getHtmlInputBooleanValue("data.importAll", document)
			);
			if (validateInput(generatorInput)) {
				MerchantSheet.generateItems(this.actor, generatorInput);
			}
			console.log("Generate: ", generatorInput);

		});
		super.activateListeners(html);

		function validateInput(generatorInput: MerchantGenerator) {
			if (!generatorInput.table) {
				ui.notifications?.error("For generating items a table needs to be selected")
				return false;
			}

			return true;
		}
	}


}
