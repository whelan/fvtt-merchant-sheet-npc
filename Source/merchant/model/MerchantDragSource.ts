class MerchantDragSource {
	quantity: number;
	actorId: any;
	itemPrice: number;
	name: string;
	itemId: string;
	payload: any;
	id: string;
	img: any;

	constructor(quantity: number,
				actorId: any,
				itemPrice: number,
				name: string,
				itemId: string,
				payload: any,
				img: any
	) {
		this.quantity = quantity;
		this.actorId = actorId;
		this.itemPrice = itemPrice;
		this.name = name;
		this.itemId = itemId;
		this.payload = payload;
		this.id = itemId;
		this.img = img

	}
}

export default MerchantDragSource;

