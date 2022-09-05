class PermissionPlayer extends User {
	actor = '';
	actorId = '';
	playerId: string | null = '';
	merchantPermission = 0;
	icon = '<i class="far fa-circle"></i>';
	merchantPermissionDescription = game.i18n.localize("MERCHANTNPC.permission-none-help");
}
export default PermissionPlayer;
