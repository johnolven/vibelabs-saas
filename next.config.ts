import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Esto deshabilita la comprobación de tipos durante el build
    // Esto solo debe usarse temporalmente
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
