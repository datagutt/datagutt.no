import { profile } from "../content/profile";

export const DEFAULT_DISCORD_ID = profile.discordId;

/** The Discord user the live datagutt NPC follows on Lanyard (game/net/lanyard.ts). */
export const getDiscordId = (): string => process.env.NEXT_PUBLIC_DISCORD_ID ?? DEFAULT_DISCORD_ID;
