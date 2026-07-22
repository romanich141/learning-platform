# Build-гайд: streaming-галерея на `renderToPipeableStream`

Покрокова інструкція, як зібрати проєкт **самому**. Для кожного кроку: що створити,
ключові API, що логувати, як перевірити, очікуваний результат і часті граблі.
Код пиши сам — тут лише сигнатури, підказки й контрольні точки.

---

## Готово заздалегідь (не чіпай)
- `package.json` — scripts: `npm start` (tsx server), `npm run build:client` (esbuild), `npm run dev`.
- `tsconfig.json` — `jsx: react-jsx` → `tsx` розуміє JSX без `import React`.
- `node_modules/` — react, react-dom, tsx, esbuild уже стоять.

## Ментальна модель (тримай перед очима)
```
HTTP-запит
   └─> renderToPipeableStream(<App/>, { колбеки })
          ├─ onShellError(err)   ← помилка ДО шелла → 500
          ├─ onShellReady()      ← шелл готовий (HTML поза Suspense) → pipe(res)  [СТАРТ СТРІМУ]
          ├─ onError(err)        ← будь-яка помилка рендеру (лог/статус)
          └─ onAllReady()        ← усі Suspense готові (як renderToString)
   pipe(res): пише у Node Writable (res). З'єднання тримається відкритим,
   React доливає chunks у міру резолву боундарі.
```
Ключ: **шелл = усе, що ПОЗА `<Suspense>`**. Усе всередині `<Suspense>` доливається пізніше.

---

## КРОК 1 (M1) — статичний стрім, БЕЗ Suspense
Мета: побачити базовий конвеєр `renderToPipeableStream → pipe(res)` одним флашем.
Клієнтський JS тут **не потрібен** взагалі.

**1.1 `app/App.tsx`** — цілий HTML-документ.
- Експортуй `export function App({ query }) { ... }`.
- Повертає `<html lang="uk"><head>…</head><body>…</body></html>`.
- У `<head>`: `<meta charSet="utf-8"/>`, `<title>`, і `<style>{CSS}</style>` (інлайн-CSS рядком —
  щоб не морочитись зі статикою).
- У `<body>`: шапка + `<Gallery query={query} />`.
- ⚠️ React НЕ додає `<!DOCTYPE html>` — його допише сервер.

**1.2 `app/components/Gallery.tsx`** (поки статичний).
- Масив альбомів прямо в коді (id, title, seeds[]).
- Рендер: для кожного альбому `<section>` з `<h2>` і сіткою `<img src={picsum}/>`.
- picsum URL: `https://picsum.photos/seed/${seed}/300/200`.

**1.3 `server/server.tsx`** — серце.
- `import http from 'node:http'` + `import { renderToPipeableStream } from 'react-dom/server'`.
- `http.createServer((req, res) => { ... }).listen(3000)`.
- Розпарси `const url = new URL(req.url, 'http://'+req.headers.host)` і
  `const query = Object.fromEntries(url.searchParams)`.
- Виклич `const { pipe } = renderToPipeableStream(<App query={query}/>, { onShellReady, onShellError, onError })`.
- У `onShellReady`: `res.setHeader('Content-Type','text/html; charset=utf-8')`,
  `res.write('<!DOCTYPE html>')`, потім `pipe(res)`.
- Додай логи з timestamp у КОЖЕН колбек (напр. `console.log('+'+(Date.now()-start)+'ms onShellReady')`).

**Перевірка:**
```
npm start
curl -N http://localhost:3000/        # весь HTML приходить одним куском
open  http://localhost:3000/          # галерея у браузері
```
**Очікувано:** у логах `onShellReady` майже одразу, `onAllReady` теж одразу (немає Suspense).
**Граблі:** забув doctype → браузер у quirks mode; забув Content-Type → браузер покаже текст.

---

## КРОК 2 (M2) — Suspense + «throw a promise» (головна концепція)
Мета: шелл+скелетон миттєво, контент доливається окремим chunk-ом.

**2.1 `app/gallery-data.tsx`** — імітація async-даних.
- `export const sleep = (ms) => new Promise(r => setTimeout(r, ms));`
- `const ALBUMS = { nature: {...}, city: {...}, ... }` (перенеси дані з Gallery сюди).
- Кеш ресурсів у межах запиту + `export function resetCache()` (обнуляє Map).
- `export function fetchAlbum(id, { delay=1000, fail=false } = {})`:
  - патерн ресурсу: локальні `status='pending'`, `result`.
  - `const suspender = sleep(delay).then(() => { if(fail) throw…; result=ALBUMS[id]; status='success'; }).catch(e => { status='error'; result=e; });`
  - повертай `{ read() { if(status==='pending') throw suspender; if(status==='error') throw result; return result; } }`.
  - кешуй за ключем `id:delay:fail`.
- ⚠️ Саме `.catch` перетворює reject на resolve — інакше React зациклиться на rejected-промісі.

**2.2 `app/components/Album.tsx`**
- `const album = fetchAlbum(id, { delay, fail }).read();` ← тут кидається проміс (suspend).
- Рендерить `<section>` з фото. Додай `console.log` до і після `.read()` — побачиш подвійний
  виклик рендеру (перший suspend, другий після резолву).

**2.3 `app/components/Skeleton.tsx`** — fallback (сірі плитки-плейсхолдери).

**2.4 Онови `Gallery.tsx`**: кожен альбом обгорни окремо:
```jsx
<Suspense fallback={<Skeleton label={id}/>}>
  <Album id={id} delay={delay}/>
</Suspense>
```
Затримку бери з query: `Number(query.delay ?? defaultDelay)`.

**2.5 Онови `server.tsx`**: `resetCache()` на ПОЧАТКУ кожного запиту (щоб реролад знову suspend-ив).

**Перевірка:**
```
curl -N "http://localhost:3000/?delay=2500"   # скелетон одразу, через 2.5с — контент
```
Щоб побачити тайминг chunk-ів, використай маленький reader (python читає resp.read() у циклі
і друкує timestamp). Або дивись у браузері DevTools → Network.
**Очікувано:** `onShellReady` ~одразу, `onAllReady` через ~2.5с. У сирому HTML з'являться
маркери `<!--$?-->` (pending-боундарі) і наприкінці `<script>` з `$RC(...)` — swap скелетон→контент.
**Граблі:** забув `resetCache()` → після першого разу все миттєво (кеш); `.read()` не викликаний
у компоненті → Suspense не спрацює.

---

## КРОК 3 (M4) — кілька альбомів з різними затримками (out-of-order)
Мета: побачити, що боундарі флашаться незалежно, у порядку готовності даних.

- У `Gallery.tsx` дай кожному альбому свій query-ключ: `?a=1000&b=3000&c=500&d=2000`.
  `const delay = Number(query[delayKey] ?? query.delay ?? defaultDelay)`.
- 3–4 альбоми, кожен у власному `<Suspense>`.

**Перевірка:** `curl -N "http://localhost:3000/?a=1000&b=3000&c=500&d=2000"` через reader —
альбом c(500) прилетить ПЕРШИМ, b(3000) — ОСТАННІМ, попри порядок у дереві.
**Очікувано:** у логах кілька доливань між `onShellReady` і `onAllReady`.

---

## КРОК 4 (M3) — `onShellReady` vs `onAllReady`
Мета: відчути різницю «стрім рано» vs «усе разом».

- Додай у `server.tsx` `const mode = query.mode === 'all' ? 'all' : 'shell'`.
- `pipe(res)` виклич у `onShellReady` якщо `mode==='shell'`, або в `onAllReady` якщо `mode==='all'`.
  (В обох гілках: setHeader + `res.write('<!DOCTYPE html>')` + `pipe(res)`.)

**Перевірка:**
```
curl -N "http://localhost:3000/?delay=2000&mode=shell"  # шелл одразу, контент через 2с
curl -N "http://localhost:3000/?delay=2000&mode=all"    # тиша 2с, потім усе разом
```
**Очікувано:** у `mode=all` TTFB = час найповільнішого альбому (як `renderToString`).

---

## КРОК 5 (M5) — гідрація + selective hydration
Мета: оживити HTML на клієнті; побачити, що кліки до завершення гідрації не губляться.

**5.1 `app/components/LikeButton.tsx`** — `useState` лічильник лайків, `onClick`.
  (Ніяких `"use client"` не треба — ми самі бандлимо клієнт окремо.)
- Встав `<LikeButton/>` у `Photo.tsx`.

**5.2 `client/client.tsx`**
- `import { hydrateRoot } from 'react-dom/client'` + `import { App } from '../app/App.tsx'`.
- ⚠️ Гідрувати треба той САМИЙ `<App/>`. Оскільки `<App/>` рендерить `<html>`, гідруй у `document`:
  `hydrateRoot(document, <App query={…}/>)`.
- Проблема: клієнту потрібен `query`. Найпростіше — прокинути його з сервера через
  `window.__QUERY__` (сервер додає `<script>window.__QUERY__=…</script>` або через
  `bootstrapScriptContent`). Прочитай і передай у `<App>`.
- Додай `console.log` про старт/кінець гідрації.

**5.3 `server.tsx`**: додай у renderToPipeableStream опцію
  `bootstrapScripts: ['/client.js']` (і, за потреби, `bootstrapScriptContent` з query).
- Додай роут, що віддає `public/client.js` (`fs.createReadStream`, Content-Type `text/javascript`).

**5.4 Збірка клієнта:** `npm run build:client` (esbuild → `public/client.js`), потім `npm start`.
  Або `npm run dev` (build + watch server).

**Перевірка:** відкрий у браузері, у Console — логи гідрації; клацай ❤️ ОДРАЗУ на повільному
альбомі, поки він ще не гідрувався — клік застосується після гідрації (React його не губить).
**Граблі:** hydration mismatch (різний HTML на сервері й клієнті) → попередження в консолі;
переконайся, що `query` однаковий; picsum-URL детермінований (той самий seed).

---

## КРОК 6 (M6) — помилки боундарі та `abort()`
Мета: різниця між фатальною помилкою шелла і помилкою окремого боундарі.

- **Помилка боундарі:** `?failAlbum=nature` → `fetchAlbum(..., { fail:true })` для цього id.
  Обгорни `<Album>` у власний Error Boundary (класовий компонент з `componentDidCatch` +
  `getDerivedStateFromError`) або поклади поруч у `<Suspense>`. React стрімить fallback,
  решта галереї жива. `onError` на сервері залогує помилку.
- **Помилка шелла:** `?failShell=1` → кинь помилку в компоненті ПОЗА Suspense →
  спрацює `onShellError` → віддай 500 + запасний HTML.
- **abort:** `const { pipe, abort } = renderToPipeableStream(...)`; при `?abortAfter=1500`
  через `setTimeout` виклич `abort(new Error('timeout'))`. Незавершені боундарі впадуть у
  fallback (і догідруються/повторяться на клієнті).

**Перевірка:**
```
curl -N "http://localhost:3000/?failAlbum=nature"   # nature → fallback, решта ок
curl -N "http://localhost:3000/?abortAfter=1000&delay=5000"
```
**Очікувано:** `onError` у логах; сторінка не падає цілком.

---

## КРОК 7 (опц.) — деталі
- Порівняй `renderToString(<App/>)` (повний буфер, синхронно, без Suspense-стріму) з `renderToPipeableStream`.
- `bootstrapScriptContent` замість зовнішнього скрипта.
- Backpressure: `pipe` поважає готовність `res` (Node сам керує).

---

## Порядок і контрольні точки
1. Крок 1 → бачиш галерею одним флашем. ✅ before далі.
2. Крок 2 → бачиш скелетон→контент з затримкою. ✅
3. Крок 3 → бачиш out-of-order доливання. ✅
4. Крок 4 → відчув shell vs all. ✅
5. Крок 5 → ❤️ клікається, selective hydration. ✅
6. Крок 6 → помилки ізольовані. ✅

Не переходь далі, поки поточний крок не «клацнув» у голові. Питай на будь-якому кроці —
підкажу концепцію або гляну твій код.
