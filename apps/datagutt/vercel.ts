import type { VercelConfig } from "@vercel/config/v1";

// The Vercel project's Root Directory is apps/datagutt. Turborepo builds from the
// repository root, so the asset build (which `build` depends on in turbo.json) runs first.
export const config: VercelConfig = {
	framework: "nextjs",
	installCommand: "bun install --frozen-lockfile",
	buildCommand: "cd ../.. && bunx turbo run build --filter=datagutt",
};
