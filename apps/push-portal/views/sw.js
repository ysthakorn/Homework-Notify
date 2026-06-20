// Service Worker for HW Notifier Push Portal
const CACHE_NAME = "hwnotify-push-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "การแจ้งเตือนการบ้าน", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "การแจ้งเตือนการบ้าน";
  const options = {
    body: data.body || "",
    icon: "/assets/icon-192.png",
    badge: "/assets/badge-72.png",
    tag: "hwnotify-" + (data.teamId || "general"),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "/",
      timestamp: data.timestamp,
    },
    actions: [
      { action: "open", title: "ดูรายละเอียด" },
      { action: "dismiss", title: "ปิด" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a window is already open, focus it
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
