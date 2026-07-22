import { hydrateRoot } from "react-dom/client";
import { App } from "../app/App.tsx";

declare global {
  interface Window {
    __QUERY__: Record<string, string>;
  }
}

console.log("[client] стартую гідрацію…");
hydrateRoot(document, <App query={window.__QUERY__} />);
console.log("[client] гідрація завершена");
