import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "headers",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader("service-worker-allowed", "/");
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        ws: true,
      },
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    brotliSize: false,
    assetsInlineLimit: 0,
  },
});
