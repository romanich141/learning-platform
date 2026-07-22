import { Gallery } from "./components/Gallery.tsx";

// Спільний тип для query-параметрів (?a=1000&mode=all&…). Сервер теж його імпортує.
export type Query = Record<string, string>;

type AppProps = { query: Query };

// З renderToPipeableStream ми рендеримо ВЕСЬ HTML-документ (html/head/body).
// React стрімить його шматками. <!DOCTYPE html> React НЕ додає — це робить сервер.
export function App({ query }: AppProps) {
  return (
    <html lang="uk">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Streaming Gallery · renderToPipeableStream</title>
        <style>{CSS}</style>
      </head>
      <body>
        <header className="topbar">
          <h1>📸 Streaming Gallery</h1>
          <p>
            Крок 1: статична галерея, один флаш. <code>&lt;Suspense&gt;</code> додамо на кроці 2.
          </p>
        </header>
        <Gallery query={query} />
        <footer className="foot">
          <code>curl -N http://localhost:3000/</code> — увесь HTML прилетить одним куском.
        </footer>
      </body>
    </html>
  );
}

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #0f1115; color: #e6e6e6; }
  .topbar { padding: 24px 32px; background: #161a22; border-bottom: 1px solid #262b36; }
  .topbar h1 { margin: 0 0 6px; font-size: 22px; }
  .topbar p { margin: 0; color: #9aa4b2; font-size: 14px; }
  code { background: #222834; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .gallery { padding: 24px 32px; display: flex; flex-direction: column; gap: 28px; }
  .album h2 { margin: 0 0 12px; font-size: 18px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media (max-width: 800px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  .photo { margin: 0; }
  .photo img { width: 100%; height: auto; border-radius: 8px; display: block; background: #222834; }
  .foot { padding: 20px 32px; color: #6b7482; font-size: 13px; border-top: 1px solid #262b36; }
`;
