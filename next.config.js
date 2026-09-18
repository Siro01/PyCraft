/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow sql.js WASM to be served with correct MIME type and cross-origin headers
  async headers() {
    return [
      {
        source: '/sql-wasm.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },

  webpack(config) {
    // Suppress the "Critical dependency: require function" warning from sql.js
    config.module = config.module ?? {}
    config.module.exprContextCritical = false
    return config
  },
}

module.exports = nextConfig
