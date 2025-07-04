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
  // For Netlify: Do not use rewrites for API proxying. Use NEXT_PUBLIC_API_URL in your code for all backend API calls.
}

module.exports = nextConfig