import Globals, {Assert, Pair} from "../Globals";
import Logger from "./Logger";



class MerchantSettings {
	private constructor() {
		Logger.Ok("Loading configuration settings.")
		const g = game as Game;
		this.SettingsList = [
			["buyChat", {
				name: "Display chat message for purchases?",
				hint: "If enabled, a chat message will display purchases of items from the Merchant sheet.",
				scope: "world",
				config: true,
				default: true,
				type: Boolean
			}],
			["showStackWeight", {
				name: "Show Stack Weight?",
				hint: "If enabled, shows the weight of the entire stack next to the item weight",
				scope: "world",
				config: true,
				default: false,
				type: Boolean
			}],
			["reduceUpdateVerbosity", {
				name: "Reduce Update Shop Verbosity",
				hint: "If enabled, no notifications will be created every time an item is added to the shop.",
				scope: "world",
				config: true,
				default: true,
				type: Boolean
			}],
			["allowNoGM", {
				name: "Allow transactions without GM",
				hint: "If enabled, transactions can happen even without the GM is active.",
				scope: "world",
				config: true,
				default: false,
				type: Boolean
			}],
			// Add settings items here
			["itemCompendium", {
				name: g.i18n.format("MERCHANTNPC.pickItemCompendium"),
				hint: g.i18n.format("MERCHANTNPC.pickItemCompendium_hint"),
				scope: "world",
				config: true,
				type: String,
				choices: MerchantSettings.getCompendiumnsChoices(),
				default: "none",
				onChange: val => this.changeCompendium(val),

			}]
		];
	}

	public static getCompendiumnsChoices() {
		const g = game as Game;

		var myobject: {[k: string]: any} = {"none": "None"};
		g.packs.forEach((item) => {
			myobject[item.metadata.name] = item.metadata.label;
		});
		return myobject;
	}

	private changeCompendium(val: any) {
		Logger.Ok("The item compendium to use is: " + val);
	}

	private static instance: MerchantSettings;

	public static Get(): MerchantSettings {
		if (MerchantSettings.instance)
			return MerchantSettings.instance;

		MerchantSettings.instance = new MerchantSettings();
		return MerchantSettings.instance;
	}

	private SettingsInit = false;
	public RegisterSettings(): void {
		if (this.SettingsInit)
			return;

		Assert(game instanceof Game);
		const g = game as Game;
		this.SettingsList.forEach((item) => {
			g.settings.register(Globals.ModuleName, item[0], item[1]);
		});

		this.SettingsInit = true;
	}

	readonly SettingsList: ReadonlyArray<Pair<ClientSettings.PartialSetting>>;
}

export default MerchantSettings;