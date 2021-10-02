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

	static getPermissionIcon(merchantPermission: number): string {
		const icons = {
			0: '<i class="far fa-circle"></i>',
			2: '<i class="fas fa-eye"></i>',
			999: '<i class="fas fa-users"></i>'
		};
		// @ts-ignore
		return icons[merchantPermission];
	}

	static getPermissionDescription(merchantPermission: number): string {
		const description  = {
			0: (<Game>game).i18n.localize("MERCHANTNPC.permission-none-help"),
			2: (<Game>game).i18n.localize("MERCHANTNPC.permission-observer-help"),
			999: (<Game>game).i18n.localize("MERCHANTNPC.permission-all-help")
		};
		// @ts-ignore
		return description[merchantPermission];
	}

}
export default MerchantSheetNPCHelper;