/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep unrelated parent-directory lockfiles out of project root detection.
  turbopack: { root: __dirname },
}

module.exports = nextConfig
