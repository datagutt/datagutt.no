import nextVitals from "eslint-config-next/core-web-vitals";
import { ignores } from "./base.js";

export default [...nextVitals, ignores];
