/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202124",
        panel: "#ffffff",
        canvas: "#f6f7f9",
        line: "#d9dee7",
        teal: "#0f8b8d",
        amber: "#f2a541",
        rose: "#d1495b",
        mint: "#2f9e44",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 24, 31, 0.08)",
      },
    },
  },
  plugins: [],
};
