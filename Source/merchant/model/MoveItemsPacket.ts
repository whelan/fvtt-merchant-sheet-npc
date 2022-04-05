import Packet from "./Packet";
import PacketType from "./PacketType";

class MoveItemsPacket extends Packet {
    updates: any[] = [];
    deletes: string[] = [];
    additions: any[] = [];
	actorId: string = "";
	sceneId: string = "";
	actorLink: boolean = true;
	tokenId: string | null = null;
	type: PacketType = PacketType.MOVE_ITEMS;

}
export default MoveItemsPacket;
