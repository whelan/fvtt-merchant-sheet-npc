import {
	ConfiguredDocumentClass,
	ToObjectFalseType
} from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import {ActorData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

class MerchantSheetData implements ActorSheet.Data<ActorSheet.Options> {
	isBuyStack: boolean = true
	isService: boolean = false
	isGM: boolean = false
	isPermissionShown: boolean = false;
	owner: boolean = false
    merchant: any
    stackModifier: number = 20
    priceModifier: number = 1.0;
    totalItems: any
	// @ts-ignore
	actor: this["document"];
	// @ts-ignore
	cssClass: string | undefined;
	// @ts-ignore
	data: ToObjectFalseType<InstanceType<ConfiguredDocumentClass<typeof Actor>>>;
	// @ts-ignore
	document: InstanceType<ConfiguredDocumentClass<typeof Actor>>;
	// @ts-ignore
	editable: boolean;
	// @ts-ignore
	effects: ToObjectFalseType<ActorData>["effects"];
	// @ts-ignore
	readonly entity: this["data"];
	// @ts-ignore
	items: ToObjectFalseType<ActorData>["items"];
	// @ts-ignore
	limited: boolean;
	// @ts-ignore
	options: ActorSheet.Options;
	// @ts-ignore
	title: string;
	// @ts-ignore
	sections: {};
	infinity: boolean = false;

}
export default MerchantSheetData