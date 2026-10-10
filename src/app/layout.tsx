import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "치이톡 — 내 문장에 작은 성격 하나",
  description: "한국어 문장을 치이카와 친구들의 말투로 바꿔보세요. 여덟 캐릭터의 개성을 담은 문장 변환기, 치이톡.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
