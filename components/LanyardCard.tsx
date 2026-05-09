"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { useLanyard, type LanyardData } from "react-use-lanyard";
import {
	STATUS_DOT_CLASS,
	STATUS_LABEL,
	discordAvatarUrl,
	getDiscordId,
} from "../lib/lanyard";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type Props = {
	className?: string;
};

export default function LanyardCard({ className = "" }: Props) {
	const reducedMotion = usePrefersReducedMotion();
	const userId = getDiscordId();
	const { loading, status } = useLanyard({ userId, socket: true });

	if (loading || !status) return null;

	const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (reducedMotion) return;
		gsap.to(e.currentTarget, { y: -2, duration: 0.2, ease: "power2.out" });
	};
	const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
		gsap.to(e.currentTarget, { y: 0, duration: 0.2, ease: "power2.out" });
	};

	const username =
		status.discord_user.global_name ?? status.discord_user.username;
	const avatar = status.discord_user.avatar
		? discordAvatarUrl(status.discord_user.id, status.discord_user.avatar, 64)
		: null;

	const customStatus = status.activities.find((a) => a.type === 4);
	const primaryActivity = status.activities.find(
		(a) => a.type !== 4 && a.id !== "spotify:1",
	);

	return (
		<div
			data-no-reactions
			className={`rounded-xl border border-primary-700/50 bg-gradient-to-br from-black to-primary-950/30 p-3 transition-colors duration-200 hover:border-primary-600/60 ${className}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="flex items-center gap-3">
				{avatar && (
					<div className="relative shrink-0">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={avatar}
							alt={username}
							width={32}
							height={32}
							className="rounded-full"
						/>
						<span
							aria-hidden="true"
							className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black ${STATUS_DOT_CLASS[status.discord_status] ?? "bg-gray-600"}`}
						/>
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="font-pixel text-primary-400 text-xs uppercase tracking-wider truncate">
						{username}
					</div>
					<div className="text-gray-400 text-xs truncate">
						{customStatus?.state ??
							STATUS_LABEL[status.discord_status] ??
							"Unknown"}
						<span className="sr-only">
							{` Discord status: ${STATUS_LABEL[status.discord_status] ?? "unknown"}`}
						</span>
					</div>
				</div>
			</div>

			{status.listening_to_spotify && status.spotify && (
				<SpotifyBlock spotify={status.spotify} reducedMotion={reducedMotion} />
			)}

			{!status.listening_to_spotify && primaryActivity && (
				<ActivityBlock activity={primaryActivity} />
			)}
		</div>
	);
}

type SpotifyTrack = NonNullable<LanyardData["spotify"]>;

function SpotifyBlock({
	spotify,
	reducedMotion,
}: {
	spotify: SpotifyTrack;
	reducedMotion: boolean;
}) {
	const [pct, setPct] = useState(0);

	useEffect(() => {
		const compute = () => {
			const now = Date.now();
			const total = spotify.timestamps.end - spotify.timestamps.start;
			const elapsed = now - spotify.timestamps.start;
			const ratio = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
			setPct(ratio * 100);
		};
		compute();
		const id = window.setInterval(compute, 1000);
		return () => window.clearInterval(id);
	}, [spotify]);

	return (
		<div className="mt-3 flex items-center gap-3 border-t border-primary-900/40 pt-3">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={spotify.album_art_url}
				alt={`${spotify.album} cover`}
				width={48}
				height={48}
				className="rounded shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 mb-0.5">
					<SpotifyIcon />
					<span className="font-pixel text-[10px] uppercase tracking-wider text-primary-500">
						Listening
					</span>
				</div>
				<div className="text-gray-200 text-xs font-medium truncate">
					{spotify.song}
				</div>
				<div className="text-gray-500 text-[11px] truncate">
					{spotify.artist}
				</div>
				<div
					role="progressbar"
					aria-valuenow={Math.round(pct)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Spotify track progress"
					className="mt-1.5 h-0.5 w-full rounded-full bg-primary-900/50 overflow-hidden"
				>
					<div
						className="h-full bg-primary-500"
						style={{
							width: `${pct}%`,
							transition: reducedMotion ? "none" : "width 1s linear",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

type ActivityData = {
	type: number;
	name: string;
	state?: string;
	details?: string;
};

function ActivityBlock({ activity }: { activity: ActivityData }) {
	const verb = activity.type === 0 ? "Playing" : "Doing";
	return (
		<div className="mt-3 border-t border-primary-900/40 pt-3">
			<div className="font-pixel text-[10px] uppercase tracking-wider text-primary-500 mb-0.5">
				{verb}
			</div>
			<div className="text-gray-200 text-xs font-medium truncate">
				{activity.name}
			</div>
			{(activity.details || activity.state) && (
				<div className="text-gray-500 text-[11px] truncate">
					{activity.details ?? activity.state}
				</div>
			)}
		</div>
	);
}

function SpotifyIcon() {
	return (
		<svg
			width={10}
			height={10}
			viewBox="0 0 24 24"
			fill="currentColor"
			className="text-primary-500"
			aria-hidden="true"
		>
			<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.561.3z" />
		</svg>
	);
}
