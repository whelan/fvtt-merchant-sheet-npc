class MerchantGenerator {
	constructor(
    readonly table: string,
    readonly shopItemsRoll: string,
    readonly itemQuantityRoll: string,
    readonly itemQuantityMax: number,
    readonly itemPriceRoll: string,
	readonly clearShop: boolean,
	readonly importAllItems: boolean) {
	}
}
export default MerchantGenerator;
