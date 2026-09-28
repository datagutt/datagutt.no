import next from "@datagutt/kai-eslint-config/next";
import { phaser } from "@datagutt/kai-eslint-config/phaser";

const config = [
	...next,
	{ ignores: ["public/**"] },
	// The game runs outside React, so it has no router to navigate with.
	{ files: ["game/**/*.ts"], rules: { "@next/next/no-location-assign-relative-destination": "off" } },
	...phaser({
		files: ["game/**/*.ts"],
		patterns: [
			{
				group: ["@/app", "@/app/*", "@/components", "@/components/*", "@/hooks", "@/hooks/*", "@/lib", "@/lib/*"],
				message: "game/ may not import Next.js app code. Pass data in through the WorldState payload (docs/PLAN.md M2.2).",
			},
		],
	}),
];

export default config;
