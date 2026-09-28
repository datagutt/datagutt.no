import base from "@datagutt/kai-eslint-config/base";
import { buildTimePackage } from "@datagutt/kai-eslint-config/boundaries";

export default [...base, ...buildTimePackage(["src/**/*.{ts,mjs}"])];
