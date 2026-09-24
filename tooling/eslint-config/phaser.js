import base from "./base.js";

const frameworkImports = {
  group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
  message:
    "The game runtime stays free of Next and React so any host page can run it.",
};

/**
 * The runtime boundary for Phaser code. `patterns` adds a caller's own restrictions:
 * no-restricted-imports keeps only the last block that sets it for a file, so every
 * restriction on these files has to come through here.
 */
export function phaser({ files = ["**/*.ts"], patterns = [] } = {}) {
  return [
    {
      files,
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [frameworkImports, ...patterns] },
        ],
      },
    },
  ];
}

export default [...base, ...phaser()];
