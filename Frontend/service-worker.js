// ============================================================================
// SERVICE WORKER - ROBERTO LOTERIAS PWA
// Ajustado para estrutura: /Frontend/
// ============================================================================

const CACHE_NAME = "roberto-loterias-v1";
const CACHE_VERSION = "1.0.0";

// ============================================================================
// ✅ ARQUIVOS PARA CACHE - AJUSTADO PARA SUA ESTRUTURA
// ============================================================================

const FILES_TO_CACHE = [
  "/Frontend/",
  "/Frontend/index.html",
  "/Frontend/style.css",
  "/Frontend/script.js",
  "/Frontend/manifest.json",
  "/Frontend/offline.html",
];

// Ícones (opcional - só adiciona se existirem)
const ICON_FILES = [
  "/assets/images/icon-48x48.png",
  "/assets/images/icon-72x72.png",
  "/assets/images/icon-96x96.png",
  "/assets/images/icon-144x144.png",
  "/assets/images/icon-192x192.png",
  "/assets/images/icon-512x512.png",
];

// ============================================================================
// INSTALAÇÃO
// ============================================================================

self.addEventListener("install", (event) => {
  console.log("🚀 [SW] Instalando Service Worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 [SW] Fazendo cache dos arquivos essenciais");

        // Adiciona arquivos essenciais
        return cache.addAll(FILES_TO_CACHE).then(() => {
          console.log("✅ [SW] Arquivos essenciais cacheados");

          // Tenta adicionar ícones (não falha se não existirem)
          return Promise.allSettled(
            ICON_FILES.map((url) =>
              cache.add(url).catch((err) => {
                console.warn(`⚠️ [SW] Ícone não encontrado: ${url}`);
              })
            )
          );
        });
      })
      .then(() => {
        console.log("✅ [SW] Service Worker instalado!");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ [SW] Erro na instalação:", error);
        // Tenta instalar mesmo com erro em alguns arquivos
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// ATIVAÇÃO
// ============================================================================

self.addEventListener("activate", (event) => {
  console.log("🔄 [SW] Ativando Service Worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("🗑️ [SW] Removendo cache antigo:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("✅ [SW] Service Worker ativado!");
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH (Intercepta requisições)
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outros domínios
  if (url.origin !== location.origin) {
    return;
  }

  // Ignora requisições do DevTools
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("📦 [SW] Servindo do cache:", request.url);
        return cachedResponse;
      }

      // Busca da rede
      return fetch(request)
        .then((networkResponse) => {
          // Verifica se é resposta válida
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cacheia a resposta
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.error("❌ [SW] Erro ao buscar:", request.url);

          // Se for HTML, retorna página offline
          if (request.destination === "document") {
            return caches
              .match("/Frontend/offline.html")
              .then((offlineResponse) => {
                return (
                  offlineResponse ||
                  new Response("Offline", {
                    status: 503,
                    statusText: "Service Unavailable",
                  })
                );
              });
          }

          return new Response("Recurso não disponível", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    })
  );
});

// ============================================================================
// MENSAGENS
// ============================================================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          console.log("✅ [SW] Cache limpo!");
        })
    );
  }
});

// ============================================================================
// LOG
// ============================================================================

console.log(`
╔══════════════════════════════════════════════════════════╗
║         🎰 ROBERTO LOTERIAS PWA 🎰                      ║
║         Service Worker: v${CACHE_VERSION}                      ║
║         Cache: ${CACHE_NAME}                      ║
║         Estrutura: /Frontend/                            ║
╚══════════════════════════════════════════════════════════╝
`);
