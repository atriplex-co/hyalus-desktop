const path = require("path");
const colors = require("tailwindcss/colors");
const swapper = require("tailwindcss-theme-swapper");

module.exports = {
  purge: [`${path.join(__dirname, "src")}/**/*.vue`],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        gray: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          550: "#62626B",
          600: "#52525B",
          650: "#494951",
          700: "#3F3F46",
          750: "#333338",
          800: "#27272A",
          850: "#202023",
          900: "#18181B",
        },
      },
      minWidth: {
        "1/2": "50%",
      },
    },
    fontFamily: {
      sans: "Inter, sans-serif",
      mono: "Inconsolata, monospace",
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    // require("@tailwindcss/aspect-ratio"),
    // require("@tailwindcss/typography"),
    // require("@tailwindcss/forms"),
    // require("@tailwindcss/line-clamp"),
    swapper({
      themes: [
        {
          name: "base",
          selectors: [".accent-green"],
          theme: {
            colors: {
              primary: colors.emerald,
            },
          },
        },
        {
          selectors: [".accent-red"],
          theme: {
            colors: {
              primary: colors.red,
            },
          },
        },
        {
          selectors: [".accent-yellow"],
          theme: {
            colors: {
              primary: colors.yellow,
            },
          },
        },
        {
          selectors: [".accent-blue"],
          theme: {
            colors: {
              primary: colors.blue,
            },
          },
        },
        {
          selectors: [".accent-indigo"],
          theme: {
            colors: {
              primary: colors.indigo,
            },
          },
        },
        {
          selectors: [".accent-purple"],
          theme: {
            colors: {
              primary: colors.violet,
            },
          },
        },
        {
          selectors: [".accent-pink"],
          theme: {
            colors: {
              primary: colors.pink,
            },
          },
        },
      ],
    }),
  ],
};
