/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/photos/**',
      },
      {
        protocol: 'https',
        hostname: 'canto-wp-media.s3.amazonaws.com',
        port: '',
        pathname: '/app/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/imgres/**',
      },
      {
        protocol: 'https',
        hostname: 'media-cdn.tripadvisor.com',
        port: '',
        pathname: '/**',
      },
    ],
    domains: [
      'images.pexels.com',
      'canto-wp-media.s3.amazonaws.com',
      'www.google.com',
      'media-cdn.tripadvisor.com',
      'cookingwithparita.com',
      'www.cubesnjuliennes.com',
      'images.unsplash.com',
      'media.istockphoto.com',
      'foodship.co.in',
      'agencyanalytics.com',
      'www.shutterstock.com',
      'upload.wikimedia.org',
      'png.pngtree.com',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: 'http://127.0.0.1:8000/api/:path*/', // Proxy to Backend with trailing slash
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*/', // Ensure trailing slash for Django
      },
    ]
  },
}

module.exports = nextConfig