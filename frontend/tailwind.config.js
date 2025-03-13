/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        fontFamily: {
          sourGummy: ["Sour Gummy", "sans-serif"], // Register the font
        },
      },
    },
    plugins: [],
  };
  