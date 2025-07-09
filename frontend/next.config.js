/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para Netlify
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  images: {
    domains: ['localhost'],
    unoptimized: true // Necesario para export estático
  },
  
  // Configuración para mejor desarrollo
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración específica para evitar problemas de hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Deshabilitar el overlay problemático en desarrollo
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  
  // Configuración de desarrollo mejorada
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
}

module.exports = nextConfig 