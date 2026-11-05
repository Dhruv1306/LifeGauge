/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        // Olive Garden Fiesta — Light Mode Palette
        olive: {
          50:  "#FEFAE0", // warm ivory canvas
          100: "#F4F0D0", // card surface
          200: "#E5DFB8", // border
          300: "#D8D1A3", // stronger border
          400: "#DDA15E", // warm golden tan (badges)
          500: "#BC6C25", // warm brown accent
          600: "#606C38", // olive (secondary text, buttons)
          700: "#4E582E", // darker olive hover
          800: "#283618", // dark forest green (primary text)
          900: "#1A2410", // deepest forest green
        },
      },
    },
  },
  plugins: [],
};
