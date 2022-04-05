import CurrencyAction from './CurrencyAction';
import PacketType from "./PacketType";

class MerchantCurrencyPacket {
    action: CurrencyAction = CurrencyAction.Add;
    currency: any;
	price: number;
	actorId: string = "";
	sceneId: string = "";
	actorLink: boolean = true;
	tokenId: string | null = null;
	type: PacketType = PacketType.MERCHANT_CURRENCY;
}
export default MerchantCurrencyPacket;
