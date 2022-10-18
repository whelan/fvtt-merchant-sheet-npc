import Packet from "./Packet";
import PacketType from "./PacketType";
import AddItemHolder from "./AddItemHolder";

class MoveItemsPacket extends Packet {
    updates: any[] = [];
    deletes: string[] = [];
    additions: AddItemHolder[] = [];
	actorId: string = "";
	sceneId: string = "";
	actorLink: boolean = true;
	tokenId: string | null = null;
	type: PacketType = PacketType.MOVE_ITEMS;

}
export default MoveItemsPacket;
