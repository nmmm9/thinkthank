import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: "CO.UP - 에이전시 맞춤형 성과 측정 서비스",
  description: "프로젝트별 성과분석 및 리워드 계산 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AuthGuard>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthGuard>
      </body>
    </html>
  );
}
