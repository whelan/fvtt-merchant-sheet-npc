import {ActorData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import PermissionPlayer from "./PermissionPlayer";

class MerchantSheetNPCHelper {
	static getMerchantPermissionForPlayer(actorData: ActorData, player: PermissionPlayer): number {
		let defaultPermission = actorData.permission.default;
		if (player.data._id === null) {
			return 0;
		}
		if (player.data._id in actorData.permission) {
			// @ts-ignore
			return actorData.permission[player.data._id];
		}
		else if (typeof defaultPermission !== "undefined") {
			return defaultPermission;
		}

		return 0;
	}


}
export default MerchantSheetNPCHelper;