import type { VercelConfig } from "@vercel/config/v1";

// The Vercel project's Root Directory is apps/datagutt. Turborepo builds from the
// repository root, so the asset build (which `build` depends on in turbo.json) runs first.
export const config: VercelConfig = {
	framework: "nextjs",
	// The build image's own Bun (1.3) cannot read bun.lock version 2, which Bun 1.4 writes.
	installCommand: "npx -y bun@1.4.2 install --frozen-lockfile",
	buildCommand: "cd ../.. && bunx turbo run build --filter=datagutt",
};
