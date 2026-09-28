import next from "@datagutt/kai-eslint-config/next";
import { hostPackage } from "@datagutt/kai-eslint-config/boundaries";

const config = [...next, ...hostPackage(["src/**/*.{ts,tsx}"])];
export default config;
