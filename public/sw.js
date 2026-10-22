// Service worker do Montinho.
//  • Notificações: recebe o push do servidor e, ao tocar, abre (ou foca) a
//    tela certa do app. Notificações do Chalalá trazem um `id` técnico para
//    registrar a abertura.
//  • Treino sem internet: guarda no aparelho as telas do aluno (/aluno…) que
//    ele abriu ou que o app salvou de antemão (src/components/offline/), e os
//    arquivos fixos do app (/_next/static, marca). Com internet, a tela vem
//    sempre do servidor (e a cópia é atualizada); sem internet, abre a cópia.
//    As séries marcadas offline já ficam na fila local do treino
//    (src/lib/sync/fila.ts) e vão sozinhas quando a conexão volta.
//    Nunca guarda /api nem telas do personal. “Sair” apaga as cópias.

const PAGINAS = "montinho-paginas-v1";
const ESTATICOS = "montinho-estaticos-v1";
const ESPERA_REDE_MS = 6000; // sinal fraco: depois disso, abre a cópia e continua atualizando por trás

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const ehEstatico = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/brand/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/icon.svg" ||
  url.pathname === "/apple-icon.png" ||
  url.pathname === "/manifest.webmanifest";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (ehEstatico(url)) {
    event.respondWith(primeiroCache(req));
    return;
  }
  if (req.mode === "navigate" && (url.pathname === "/aluno" || url.pathname.startsWith("/aluno/"))) {
    event.respondWith(primeiroRede(event, req));
  }
});

async function primeiroCache(req) {
  const cache = await caches.open(ESTATICOS);
  const salvo = await cache.match(req, { ignoreVary: true });
  if (salvo) return salvo;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
  return res;
}

async function primeiroRede(event, req) {
  const cache = await caches.open(PAGINAS);
  const rede = fetch(req).then(async (res) => {
    // Só guarda a tela de verdade (login vencido redireciona e não entra no cache).
    const final = new URL(res.url || req.url);
    if (res.ok && !res.redirected && final.pathname.startsWith("/aluno")) await cache.put(req, res.clone()).catch(() => undefined);
    return res;
  });
  event.waitUntil(rede.catch(() => undefined));
  const espera = new Promise((resolve) => setTimeout(() => resolve(null), ESPERA_REDE_MS));
  try {
    const res = await Promise.race([rede, espera]);
    if (res) return res;
  } catch {
    // sem rede: segue para a cópia
  }
  const copia = (await cache.match(req, { ignoreVary: true })) || (await cache.match(req, { ignoreVary: true, ignoreSearch: true }));
  if (copia) return copia;
  try {
    return await rede;
  } catch {
    return semInternet();
  }
}

function semInternet() {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet · Montinho</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box}main{max-width:360px;text-align:center}h1{font-size:20px;margin:16px 0 8px}p{color:#c2c2c2;line-height:1.5;font-size:15px}a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#ba9e50;color:#0a0a0a;font-weight:700;text-decoration:none}</style></head>
<body><main><img src="/brand/logo.svg" alt="Montinho Personal Trainer" height="56"><h1>Sem internet no momento</h1>
<p>Esta tela ainda não foi guardada no seu celular. Os treinos que você já abriu com internet funcionam sem conexão: volte e abra o seu treino.</p>
<p>As séries que você marcou continuam guardadas no aparelho e são enviadas sozinhas quando a internet voltar.</p>
<a href="/aluno/treinar">Ir para os treinos</a></main></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("message", (event) => {
  // “Sair”: apaga as telas guardadas (têm dados do aluno).
  if (event.data && event.data.tipo === "limpar-paginas") event.waitUntil(caches.delete(PAGINAS));
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "Montinho", corpo: event.data ? event.data.text() : "" };
  }
  const titulo = dados.titulo || "Montinho";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: dados.tag || "montinho",
      renotify: false,
      data: { url: dados.url || "/aluno", id: dados.id || null },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, id } = event.notification.data || {};
  const destino = new URL(url || "/aluno", self.location.origin).href;
  event.waitUntil(
    (async () => {
      if (id) {
        // Mesmo domínio: vai com o login do aparelho. Falha não impede abrir o app.
        await fetch("/api/notificacoes/abertura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), credentials: "same-origin" }).catch(() => undefined);
      }
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of abertas) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ("navigate" in c) await c.navigate(destino);
          return;
        }
      }
      await self.clients.openWindow(destino);
    })()
  );
});
