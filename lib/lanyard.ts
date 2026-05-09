export const DEFAULT_DISCORD_ID = "132474831424716800";

export const getDiscordId = (): string =>
	process.env.NEXT_PUBLIC_DISCORD_ID ?? DEFAULT_DISCORD_ID;

export const discordAvatarUrl = (
	userId: string,
	avatarHash: string,
	size = 64,
): string =>
	`https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=${size}`;

export const STATUS_LABEL: Record<string, string> = {
	online: "Online",
	idle: "Idle",
	dnd: "Do Not Disturb",
	offline: "Offline",
};

export const STATUS_DOT_CLASS: Record<string, string> = {
	online: "bg-primary-500",
	idle: "bg-amber-400",
	dnd: "bg-red-500",
	offline: "bg-gray-600",
};
