/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 배포 최적화
  eslint: {
    ignoreDuringBuilds: true, // 빌드 시 ESLint 경고 무시
  },
  typescript: {
    ignoreBuildErrors: false, // TypeScript 에러는 체크
  },
}

module.exports = nextConfig
