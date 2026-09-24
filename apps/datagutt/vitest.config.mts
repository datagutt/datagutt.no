import path from "node:path";
import { kaiVitest } from "@datagutt/kai-vitest-config";

export default kaiVitest({
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname) },
	},
});
