import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/shared/SessionProvider";

export const metadata: Metadata = {
  title: "健康饮食助理",
  description: "AI个性化饮食管理助手 - 每日三餐科学推荐",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "健康饮食助理",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2D9C7D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionProvider>
          <div className="mobile-container min-h-dvh">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
