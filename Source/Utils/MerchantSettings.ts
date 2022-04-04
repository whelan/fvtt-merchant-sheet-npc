import Globals, {Assert, Pair} from "../Globals";
import Logger from "./Logger";



class MerchantSettings {
	private constructor() {
		Logger.Ok("Loading configuration settings.")
		const g = game as Game;
		this.SettingsList = [
			["buyChat", {
				name: g.i18n.format("MERCHANTNPC.global-settings.buy-name"),
				hint: g.i18n.format("MERCHANTNPC.global-settings.buy-hint"),
				scope: "world",
				config: true,
				default: true,
				type: Boolean
			}],
			["showStackWeight", {
				name: g.i18n.format("MERCHANTNPC.global-settings.show-stack-name"),
				hint: g.i18n.format("MERCHANTNPC.global-settings.show-stack-hint"),
				scope: "world",
				config: true,
				default: false,
				type: Boolean
			}],
			["reduceUpdateVerbosity", {
				name: g.i18n.format("MERCHANTNPC.global-settings.reduce-update-name"),
				hint: g.i18n.format("MERCHANTNPC.global-settings.reduce-update-hint"),
				scope: "world",
				config: true,
				default: true,
				type: Boolean
			}],
			["allowNoGM", {
				name: g.i18n.format("MERCHANTNPC.global-settings.no-gm-name"),
				hint: g.i18n.format("MERCHANTNPC.global-settings.no-gm-hint"),
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
				default: "none"

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

	readonly SettingsList: any[];
}

export default MerchantSettings;