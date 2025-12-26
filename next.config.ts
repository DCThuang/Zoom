import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许开发环境的跨域请求
  allowedDevOrigins: ['*'],
  
  // 禁用严格模式避免重复渲染
  reactStrictMode: false,
};

export default nextConfig;
