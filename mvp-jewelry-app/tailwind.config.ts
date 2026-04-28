import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandA: "#A28547",
        brandB: "#89500F",
        brandC: "#4D300F",
        brandD: "#000000"
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.35)" }
    }
  },
  plugins: []
} satisfies Config;
