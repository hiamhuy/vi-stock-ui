/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env:{
    NEXT_PUBLIC_API_URL: 'https://api.vi-stocks.com',
    NEXT_PUBLIC_SOCKET_URL: 'https://api.vi-stocks.com',
  }
}

export default nextConfig
