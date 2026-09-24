// Import boundaries between the workspaces. Packages never reach into apps. Runtime code
// (what a game ships to the browser) never imports the build-time packages, and imports
// schema modules for their types only, so Zod stays out of the bundle. The runtime also
// stays free of Next and React, so any host page can run it.
import tseslint from "typescript-eslint";

const apps = {
  group: ["**/apps/**", "datagutt", "datagutt/*", "sandbox", "sandbox/*"],
  message: "Packages are shared by every game: they never import an app.",
};

const buildTime = {
  group: [
    "@datagutt/kai-worldgen",
    "@datagutt/kai-worldgen/*",
    "@datagutt/kai-limezu",
    "@datagutt/kai-limezu/*",
    "@datagutt/kai-assets",
    "@datagutt/kai-assets/*",
  ],
  message:
    "Runtime code never imports the build-time packages (world generation, the art adapter, the asset build).",
  allowTypeImports: true,
};

const schemas = {
  group: ["@datagutt/kai/schema", "@datagutt/kai/schema/*", "**/schema/*"],
  message:
    "Schemas are for the build: runtime code imports only their types (`import type`), so Zod stays out of the bundle.",
  allowTypeImports: true,
};

const framework = {
  group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
  message:
    "The runtime stays free of Next and React so any host page can run it.",
};

const rule = (patterns) => ({
  plugins: { "@typescript-eslint": tseslint.plugin },
  rules: {
    "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
  },
});

const artAdapter = {
  group: ["@datagutt/kai-limezu", "@datagutt/kai-limezu/*"],
  message:
    "The map toolkit and the asset build hold no art family: art arrives through a SheetSource or the adapter kai.json names.",
};

/** Build-time package code: it may import anything but an app. */
export const buildTimePackage = (files) => [{ files, ...rule([apps]) }];

/** Build-time code that must work with any art family. */
export const artAgnosticPackage = (files) => [
  { files, ...rule([apps, artAdapter]) },
];

/** Runtime package code, shipped to the browser. */
export const runtimePackage = (files, ignores = []) => [
  { files, ignores, ...rule([apps, buildTime, schemas, framework]) },
];

/** Host glue for Next: runtime rules, but React and Next are its job. */
export const hostPackage = (files) => [
  { files, ...rule([apps, buildTime, schemas]) },
];
