import base from "@datagutt/kai-eslint-config/base";
import { runtimePackage } from "@datagutt/kai-eslint-config/boundaries";

export default [
  ...base,
  ...runtimePackage(["src/**/*.ts"], ["src/**/*.test.ts"]),
];
