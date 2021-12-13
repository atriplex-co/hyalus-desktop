const colors = require("tailwindcss/colors");
const swapper = require("tailwindcss-theme-swapper");

module.exports = {
  content: ["./src/**/*.vue"],
  theme: {
    extend: {
      colors: {
        gray: {
          100: "hsl(0, 0%, 93%)",
          200: "hsl(0, 0%, 88%)",
          300: "hsl(0, 0%, 73%)",
          400: "hsl(0, 0%, 40%)",
          500: "hsl(0, 0%, 27%)",
          600: "hsl(0, 0%, 16%)",
          700: "hsl(0, 0%, 12%)",
          800: "hsl(0, 0%, 9%)",
          900: "hsl(0, 0%, 6%)",
        },
        // gray: {
        //   100: "hsl(220, 14%, 93%)",
        //   200: "hsl(220, 13%, 88%)",
        //   300: "hsl(216, 12%, 73%)",
        //   400: "hsl(218, 11%, 40%)",
        //   500: "hsl(220, 9%, 27%)",
        //   600: "hsl(215, 14%, 16%)",
        //   700: "hsl(217, 19%, 12%)",
        //   800: "hsl(215, 28%, 9%)",
        //   900: "hsl(221, 39%, 6%)",
        // },
        red: colors.red,
        orange: colors.orange,
        amber: colors.amber,
        yellow: colors.yellow,
        lime: colors.lime,
        green: colors.green,
        emerald: colors.emerald,
        teal: colors.teal,
        cyan: colors.cyan,
        sky: colors.sky,
        blue: colors.blue,
        indigo: colors.indigo,
        violet: colors.violet,
        purple: colors.purple,
        fuchsia: colors.fuchsia,
        pink: colors.pink,
        rose: colors.rose,
      },
      cursor: {
        none: "none",
      },
    },
    fontFamily: {
      sans: "Inter, sans-serif",
      mono: "Inconsolata, monospace",
    },
  },
  plugins: [
    swapper({
      themes: [
        {
          name: "base",
          selectors: [":root"],
          theme: {
            colors: {
              primary: colors.green,
            },
          },
        },
        ...[
          "red",
          "orange",
          "amber",
          "yellow",
          "lime",
          "green",
          "emerald",
          "teal",
          "cyan",
          "sky",
          "blue",
          "indigo",
          "violet",
          "purple",
          "fuchsia",
          "pink",
          "rose",
        ].map((accent) => ({
          name: `accent-${accent}`,
          selectors: [`.accent-${accent}`],
          theme: {
            colors: {
              primary: colors[accent],
            },
          },
        })),
      ],
    }),
  ],
};
