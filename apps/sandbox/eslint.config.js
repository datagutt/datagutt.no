import base from "@datagutt/kai-eslint-config/base";
import { phaser } from "@datagutt/kai-eslint-config/phaser";

export default [...base, ...phaser({ files: ["src/**/*.ts"] }), { ignores: ["public/**"] }];
