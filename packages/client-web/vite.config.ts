import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { getManifest } from "workbox-build";
import fs from "fs";
import winston from "winston";

const log = winston.createLogger({
  level: process.env.node_ENV !== "production" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf((i) => `${i.timestamp} ${i.level}: ${i.message}`)
  ),
  transports: [new winston.transports.Console()],
});

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
    {
      name: "serviceWorker",
      async writeBundle() {
        const assets = `${__dirname}/dist/assets`;
        const file = `${assets}/${fs
          .readdirSync(assets)
          .find((f) => f.startsWith("serviceWorker"))}`;
        const { manifestEntries } = await getManifest({
          globDirectory: "dist/assets",
          globPatterns: ["*"],
          modifyURLPrefix: {
            "": "/assets/",
          },
        });

        fs.writeFileSync(
          file,
          fs
            .readFileSync(file)
            .toString()
            .replace("self.__WB_MANIFEST", JSON.stringify(manifestEntries))
        );
      },
    },
  ],
  server: {
    port: 3001,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
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
  resolve: {
    alias: {
      protobufjs: "protobufjs/dist/light/protobuf.min.js", // https://github.com/protobufjs/protobuf.js/issues/1662
    },
  },
  customLogger: {
    info: (s) =>
      s
        .trim()
        .split("\n")
        .map((s2) => log.info(s2)),
    warn: (s) =>
      s
        .trim()
        .split("\n")
        .map((s2) => log.warn(s2)),
    warnOnce: (s) =>
      s
        .trim()
        .split("\n")
        .map((s2) => log.warn(s2)),
    error(s) {
      if (s.includes("proxy")) {
        return;
      }

      s.trim()
        .split("\n")
        .map((s2) => log.error(s2));
    },
    hasWarned: false,
    hasErrorLogged: () => false,
    clearScreen: () => {
      //
    },
  },
});
