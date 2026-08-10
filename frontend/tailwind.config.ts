import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // M2.4 Design Tokens (Apple-style SaaS foundation)
      colors: {
        canvas: "#F5F5F7",
        surface: "#FFFFFF",
        ink: "#1D1D1F",
        secondary: "#6E6E73",
        border: "#E8E8ED",
        accent: "#0071E3",
        success: "#34C759",
        warning: "#FF9500",
        danger: "#FF3B30",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans SC",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["40px", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["28px", { lineHeight: "1.25", fontWeight: "700" }],
        h2: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["17px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.7", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      spacing: {
        page: "6rem",
        section: "4rem",
        card: "1.5rem",
        gutter: "1.25rem",
      },
      borderRadius: {
        control: "0.625rem",
        card: "1rem",
        "card-lg": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;