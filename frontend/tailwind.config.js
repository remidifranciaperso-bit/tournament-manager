/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette "court de padel" : turquoise du court, bleu profond,
        // et jaune/vert de la balle en accent.
        court: {
          50: "#effcfa",
          100: "#c9f5ee",
          200: "#96e9de",
          300: "#5ed6c9",
          400: "#2fbcb0",
          500: "#14a196",
          600: "#0d8079",
          700: "#106661",
          800: "#12514e",
          900: "#134442",
        },
        deep: {
          700: "#0f3b52",
          800: "#0a2b3d",
          900: "#071e2c",
        },
        ball: {
          300: "#e7fa6b",
          400: "#d7f24e",
          500: "#c2e12f",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 10px 40px -12px rgba(10, 43, 61, 0.25)",
        glow: "0 0 0 4px rgba(20, 161, 150, 0.15)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        spinBall: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        spinBall: "spinBall 1s linear infinite",
      },
    },
  },
  plugins: [],
};
