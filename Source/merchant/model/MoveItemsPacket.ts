class MoveItemsPacket {
    updates: any[] = [];
    deletes: string[] = [];
    additions: any[] = [];
	actorId: string = "";
	sceneId: string = "";
	actorLink: boolean = true;
	tokenId: string | null = null;
}
export default MoveItemsPacket;
