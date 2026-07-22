import http from "node:http";
import { renderToPipeableStream } from "react-dom/server";
import { App } from "../app/App";
import { resetCache } from "../app/components/Album";
import fs from "node:fs";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const query = Object.fromEntries(url.searchParams);
  const mode = query.mode === "all" ? "all" : "shell";
  resetCache();
  let didError = false;
  if (url.pathname === "/client.js") {
    res.setHeader("Content-Type", "text/javascript");
    fs.createReadStream("public/client.js").pipe(res);
    return;
  }

  const { pipe } = renderToPipeableStream(<App query={query} />, {
    onShellReady() {
      if (mode === "shell") {
        res.statusCode = didError ? 500 : 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.write("<!DOCTYPE html>"); // React сам doctype не додає
        pipe(res); // ← СТАРТ: шелл летить у браузер, з'єднання лишається відкритим
      }
    },

    bootstrapScriptContent: `window.__QUERY__ = ${JSON.stringify(query)};`,
    bootstrapScripts: ["/client.js"],

    onAllReady() {
      if (mode === "all") {
        res.statusCode = didError ? 500 : 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.write("<!DOCTYPE html>");
        pipe(res);
      }
    },

    onShellError(error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!DOCTYPE html><h1>Щось пішло не так 😬 ${error}</h1>`); // запасний HTML
    },
    onError(error, errorInfo) {
      didError = true; // запам'ятали, щоб виставити статус 500 у onShellReady
      console.error("render error:", error, errorInfo?.componentStack);
    },
  });
});
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, closing server...`);

  server.close((err) => {
    if (err) {
      console.error("Error while closing server:", err);
      process.exit(1);
    }
    console.log("Server closed, port released.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // kill / docker stop
process.on("SIGTSTP", () => gracefulShutdown("SIGTSTP")); // Ctrl+Z
