// Service worker do Montinho: só notificações (sem cache offline de páginas).
// Recebe o push do servidor e, ao tocar, abre (ou foca) a tela certa do app.
// Notificações do Chalalá trazem um `id` técnico para registrar a abertura.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
