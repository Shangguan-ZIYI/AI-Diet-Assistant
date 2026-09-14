import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary: Teal-Green
        primary: {
          "50": "#F0FBF7",
          "100": "#DCFAEF",
          "200": "#B8F2DC",
          "300": "#85E4C3",
          "400": "#4DCBA3",
          "500": "#2D9C7D",
          "600": "#1E7D63",
          "700": "#186250",
          "800": "#134E40",
          "900": "#0F3D32",
          DEFAULT: "#2D9C7D",
          foreground: "#FFFFFF",
        },
        // Warm neutrals
        warm: {
          "50": "#FAFAF8",
          "100": "#F5F4F0",
          "200": "#ECEAE4",
          "300": "#D8D5CC",
          "400": "#B8B4A8",
          "500": "#8C8880",
          "600": "#6B6760",
          "700": "#504D47",
          "800": "#38352F",
          "900": "#1C1B18",
        },
        background: "#FAFAF8",
        foreground: "#1C1B18",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1B18",
        },
        border: "#ECEAE4",
        input: "#ECEAE4",
        ring: "#2D9C7D",
        muted: {
          DEFAULT: "#F5F4F0",
          foreground: "#8C8880",
        },
        accent: {
          DEFAULT: "#F0FBF7",
          foreground: "#186250",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: "#22C55E",
        warning: "#F59E0B",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
        xl: "20px",
        "2xl": "24px",
      },
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        title: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        micro: ["11px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      maxWidth: {
        mobile: "430px",
      },
      height: {
        "bottom-nav": "64px",
        topbar: "56px",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.5" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
