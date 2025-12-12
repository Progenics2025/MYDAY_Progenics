// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// import { fileURLToPath } from "url";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// export default defineConfig({
//   plugins: [
//     react(),
//     runtimeErrorOverlay(),
//     ...(process.env.NODE_ENV !== "production" &&
//     process.env.REPL_ID !== undefined
//       ? [
//           await import("@replit/vite-plugin-cartographer").then((m) =>
//             m.cartographer(),
//           ),
//         ]
//       : []),
//   ],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "client", "src"),
//       "@shared": path.resolve(__dirname, "shared"),
//       "@assets": path.resolve(__dirname, "attached_assets"),
//     },
//   },
//   root: path.resolve(__dirname, "client"),
//   build: {
//     outDir: path.resolve(__dirname, "dist/public"),
//     emptyOutDir: true,
//   },
//   // server: {
//   //   fs: {
//   //     strict: true,
//   //     deny: ["**/.*"],
//   //   },
//   // },
//   server: {
//   host: "0.0.0.0",
//   port: 5000,
//   fs: {
//     strict: true,
//     allow: [path.resolve(__dirname, "node_modules")],
//     deny: ["**/.*"],
//   },
// },

// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    hmr: {
      // Ensure Vite uses a valid websocket address when served behind proxies
      protocol: 'ws',
      host: 'localhost',
      port: 5000,
      clientPort: 5000,
    },
    fs: (() => {
      // Provide a safe default allow list that covers common cases for this
      // repo layout, but also let the developer tweak behavior using
      // environment variables when running behind proxies/tunnels.
      //
      // - VITE_FS_STRICT=false will disable strict checking (not recommended
      //   for untrusted networks but useful for tunnels).
      // - VITE_EXTRA_FS_ALLOW="/abs/path,/other/path" will append extra
      //   directories to the allow list.
      const envStrict = process.env.VITE_FS_STRICT;
      const strict = envStrict === undefined ? true : envStrict !== "false";

      const extra = (process.env.VITE_EXTRA_FS_ALLOW || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const allow = [
        __dirname,
        process.cwd(),
        path.resolve(__dirname, "client"),
        path.resolve(process.cwd(), "node_modules"),
        path.resolve(__dirname, "node_modules"),
        path.resolve(process.cwd(), ".."),
      ];

      // Append extra allow paths from env var (useful if your tunnel maps to
      // a different project path like `myDay 4.3 ...`).
      extra.forEach((p) => allow.push(p));

      return {
        allow,
        deny: ["**/.*", "**/.*.tmp", "**/*.log"],
        strict,
      };
    })(),
    // Reduce the number of file watchers Vite sets by ignoring large or
    // frequently-changing directories that don't need HMR.
    // This helps avoid ENOSPC (system limit for number of watchers reached)
    // on developer machines with many files.
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        'dist/**',
        'uploads/**',
        'attached_assets/**',
      ],
    },
  },
});
