class MerchantDragSource {
	quantity: number;
	actorId: any;
	itemPrice: number;
	name: string;
	itemId: string;
	payload: any

	constructor(quantity: number,
				actorId: any,
				itemPrice: number,
				name: string,
				itemId: string,
				payload: any
	) {
		this.quantity = quantity;
		this.actorId = actorId;
		this.itemPrice = itemPrice;
		this.name = name;
		this.itemId = itemId;
		this.payload = payload;
	}
}

export default MerchantDragSource;

