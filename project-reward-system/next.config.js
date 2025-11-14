/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages 배포를 위한 정적 export 설정
  output: 'export',

  // GitHub Pages basePath (리포지토리 이름)
  basePath: '/thinkthank',

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
