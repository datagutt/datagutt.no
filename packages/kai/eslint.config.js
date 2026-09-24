import base from "@datagutt/kai-eslint-config/base";
import { runtimePackage } from "@datagutt/kai-eslint-config/boundaries";

// src/schema/ is the build's (Zod); everything else ships to the browser.
export default [
  ...base,
  ...runtimePackage(["src/**/*.ts"], ["src/schema/**", "src/**/*.test.ts"]),
];
