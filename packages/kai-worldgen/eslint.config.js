import base from "@datagutt/kai-eslint-config/base";
import { artAgnosticPackage } from "@datagutt/kai-eslint-config/boundaries";

export default [...base, ...artAgnosticPackage(["src/**/*.{ts,mjs}"])];
