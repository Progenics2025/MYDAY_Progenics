import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    // don't kill the whole server on Vite internal errors - log instead
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // log the Vite error but keep the node process running so tunnel/origin stays up
        console.error('[vite error]', msg, options || '');
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Possible build output locations. Historically this project has used
  // `client/dist` or `client/public`, but the Vite build in this repo
  // currently emits to `dist/public` at the project root. Check all
  // likely locations and use the first one that exists.
  // Prefer the project root `dist/public` (what `vite build` creates here),
  // but fall back to legacy locations under `client/`.
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "client", "dist"),
    path.resolve(process.cwd(), "client", "public"),
  ];

  // Choose a directory that actually contains an index.html file. This
  // prevents serving an empty folder (which previously caused ENOENT
  // errors when the dir existed but index.html did not).
  const distPath = candidates.find((p) => fs.existsSync(p) && fs.existsSync(path.join(p, "index.html")));

  if (!distPath) {
    // If we found directories but none had index.html, include that detail
    const existing = candidates.filter((p) => fs.existsSync(p));
    if (existing.length > 0) {
      throw new Error(
        `Found build directories (${existing.join(",")}) but none contain an index.html. Try running the client build again. Checked: ${candidates.join(", ")}`,
      );
    }

    throw new Error(
      `Could not find the build directory. Checked: ${candidates.join(", ")}. Make sure to run the client build first`,
    );
  }

  log(`Serving static assets from: ${distPath}`, 'serveStatic');
  app.use(express.static(distPath));

  // fall through to index.html for single page app routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
