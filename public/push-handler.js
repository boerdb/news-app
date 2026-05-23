self.addEventListener("push", (event) => {
  let data = { title: "Nieuwe headlines", body: "Er is nieuw nieuws", url: "/" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: data.tag || "news-update",
      data: { url: data.url || "/" },
      renotify: true,
    }),
  );
});

function resolveAppUrl(path) {
  const p = path || "/";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return new URL(p, self.location.origin).href;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveAppUrl(event.notification.data?.url);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin)) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then((c) => c?.focus());
            }
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
