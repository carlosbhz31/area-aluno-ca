// Service worker da Área do Aluno CA: recebe os avisos (push) e abre a tela certa ao tocar.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dados = { titulo: "Área do Aluno CA", corpo: "", url: "/" };
  try {
    dados = { ...dados, ...evento.data.json() };
  } catch {
    // aviso sem conteúdo: mostra o padrão
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      data: { url: dados.url },
      lang: "pt-BR",
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.location.origin));
      if (aberta) return aberta.navigate(url).then((j) => j && j.focus());
      return self.clients.openWindow(url);
    }),
  );
});
