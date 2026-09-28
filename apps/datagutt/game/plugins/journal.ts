// The start menu's way out to the Journal, the site's plain-text twin of the game.
import type { KaiPlugin } from "@datagutt/kai";

export function journalPlugin(): KaiPlugin {
	return {
		name: "journal",
		menuItems: (world) => [
			{
				id: "journal",
				label: world.services.data.t("menu.journal"),
				run() {
					world.save();
					window.location.href = "/journal";
				},
			},
		],
	};
}
