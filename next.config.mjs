/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for multimodal requests (images, videos, documents)
  // Per Gemini docs: Supports up to 14 reference images for image generation
  // @see https://ai.google.dev/gemini-api/docs/image-generation
  // @see https://ai.google.dev/gemini-api/docs/image-understanding
  experimental: {
    // For Route Handlers (API routes) - handles large image/video uploads
    proxyClientMaxBodySize: '50mb',
    // For Server Actions
    serverActions: {
      bodySizeLimit: '50mb'
    },
    // Optimize package imports - tree-shake unused exports
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'react-syntax-highlighter'
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**' // Google user content often follows this pattern
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/vi/**' // YouTube video thumbnails
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/vi/**' // YouTube video thumbnails (alternate domain)
      },
      {
        protocol: 'https',
        hostname: 'lchbtfojmflxdetcqdmf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**'
      }
    ]
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  }
}

export default nextConfig
