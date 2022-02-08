class MerchantGenerator {
	constructor(
    readonly selected: string,
    readonly table: string,
    readonly compendium: string,
    readonly shopItemsRoll: string,
    readonly itemQuantityRoll: string,
    readonly itemQuantityMax: number,
    readonly itemPriceRoll: string,
	readonly clearShop: boolean,
	readonly importAllItems: boolean) {
	}
}
export default MerchantGenerator;
