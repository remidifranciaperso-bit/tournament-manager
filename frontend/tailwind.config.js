/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        template: {
          blue: "#00B0F0",
        },
        arena: {
          950: "#040a12",
          900: "#071422",
          800: "#0c1f35",
          700: "#122a45",
          600: "#1a3a5c",
        },
        neon: {
          DEFAULT: "#00e5c3",
          dim: "#00b89a",
          glow: "#5dffe8",
        },
        lime: {
          DEFAULT: "#d4ff4a",
          dim: "#b8e032",
        },
        court: {
          50: "#effcfa",
          100: "#c9f5ee",
          500: "#14a196",
          600: "#0d8079",
        },
        deep: {
          800: "#0a2b3d",
          900: "#071e2c",
        },
        ball: {
          400: "#d7f24e",
          500: "#c2e12f",
        },
      },
      fontFamily: {
        display: ["Bebas Neue", "system-ui", "sans-serif"],
        brush: ["Grindy Brush", "cursive"],
        sans: ["Sora", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 40px -8px rgba(0, 229, 195, 0.55)",
        lime: "0 0 32px -6px rgba(212, 255, 74, 0.45)",
        panel: "0 24px 80px -20px rgba(0, 0, 0, 0.65)",
        insetGlow: "inset 0 1px 0 0 rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        mesh: "radial-gradient(ellipse 80% 60% at 70% -10%, rgba(0,229,195,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 80%, rgba(212,255,74,0.08), transparent 50%)",
        courtTexture:
          "linear-gradient(135deg, #0a3d4a 0%, #0d5c5a 40%, #0a4a52 100%)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(3deg)" },
        },
        spinBall: { to: { transform: "rotate(360deg)" } },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.85" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        spinBall: "spinBall 0.9s linear infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
