// The start menu's way out to the Journal, the site's plain-text twin of the game.
import { t } from "../strings";
import type { KaiPlugin } from "./api";

export function journalPlugin(): KaiPlugin {
	return {
		name: "journal",
		menuItems: (world) => [
			{
				id: "journal",
				label: t("menu.journal"),
				run() {
					world.save();
					window.location.href = "/journal";
				},
			},
		],
	};
}
