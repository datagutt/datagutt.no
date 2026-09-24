import base from "@datagutt/kai-eslint-config/base";
import { runtimePackage } from "@datagutt/kai-eslint-config/boundaries";

// presence/config.ts is the content build's schema (Zod); the rest runs in the game or on
// the server.
export default [
  ...base,
  ...runtimePackage(
    ["src/**/*.ts"],
    ["src/presence/config.ts", "src/**/*.test.ts"],
  ),
];
