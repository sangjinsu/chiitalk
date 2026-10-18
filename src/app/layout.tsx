import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "치이톡 — 먼작귀 친구들의 말로 전하는 한마디",
  description: "먼작귀 친구들의 말로 바꿔서 친구들과 재밌게 소통해 보세요. 친구에게 전할 말을 적고, 여덟 캐릭터의 말투로 바꿔 복사해 보세요.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
