/** @type {import('next').NextConfig} */
const nextConfig = {
  // 로컬 개발용 설정 (배포 시 주석 해제)
  // output: 'export',
  // basePath: '/thinkthank',

  // 배포 최적화
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // 이미지 최적화 비활성화 (정적 export에서 필요)
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
