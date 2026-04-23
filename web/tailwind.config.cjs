/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bungee", "cursive"],
        body: ["Sora", "sans-serif"],
        fun: ["Baloo 2", "cursive"]
      },
      keyframes: {
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0.2" }
        },
        bob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        pulseRing: {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.02)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0.7" }
        }
      },
      animation: {
        blink: "blink 0.6s steps(2, start) infinite",
        bob: "bob 2.8s ease-in-out infinite",
        pulseRing: "pulseRing 1.8s ease-in-out infinite"
      },
      colors: {
        ink: "#17324D",
        candy: "#FF5A36",
        mango: "#F8A015",
        lime: "#6AD154",
        cyanpop: "#2EC9D6",
        cream: "#FFF8DF"
      },
      boxShadow: {
        candy: "0 14px 28px -12px rgba(255, 90, 54, 0.4)",
        joyful: "0 24px 45px -25px rgba(46, 201, 214, 0.4)"
      }
    }
  },
  plugins: []
};

