import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        pixel: ["var(--font-geist-pixel-square)"],
        "pixel-grid": ["var(--font-geist-pixel-grid)"],
        "pixel-circle": ["var(--font-geist-pixel-circle)"],
        "pixel-triangle": ["var(--font-geist-pixel-triangle)"],
        "pixel-line": ["var(--font-geist-pixel-line)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          "50": "#f0fdf6",
          "100": "#dbfdec",
          "200": "#b9f9d9",
          "300": "#83f2ba",
          "400": "#46e294",
          "500": "#1dc672",
          "600": "#12a75d",
          "700": "#12834b",
          "800": "#14673e",
          "900": "#125536",
          "950": "#042f1c",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("child", "& > *");
      addVariant("child-hover", "& > *:hover");
    }),
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};
export default config;
