// ============================================================================
// SERVICE WORKER - ROBERTO LOTERIAS PWA
// Versão corrigida para PRODUÇÃO (Vercel/Netlify/GitHub Pages)
// ============================================================================

const CACHE_NAME = "roberto-loterias-v1.0.0";

// ============================================================================
// ARQUIVOS PARA CACHEAR
// ============================================================================

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/favicon.svg",
  "/favicon.ico",
  "/assets/images/favicon-96x96.png",
  "/assets/images/web-app-manifest-192x192.png",
  "/assets/images/web-app-manifest-512x512.png",
];

// ============================================================================
// INSTALAÇÃO DO SERVICE WORKER
// ============================================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Fazendo cache dos arquivos essenciais");

        // Cachear arquivos um por um (mais robusto)
        return Promise.allSettled(
          FILES_TO_CACHE.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`[SW] Falha ao cachear: ${url}`, err);
            });
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker instalado com sucesso!");
        return self.skipWaiting(); // Ativa imediatamente
      })
      .catch((error) => {
        console.error("[SW] Erro durante instalação:", error);
      })
  );
});

// ============================================================================
// ATIVAÇÃO DO SERVICE WORKER
// ============================================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando Service Worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove caches antigos
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Removendo cache antigo:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker ativado!");
        return self.clients.claim(); // Toma controle imediatamente
      })
  );
});

// ============================================================================
// INTERCEPTAÇÃO DE REQUISIÇÕES (FETCH)
// ============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outros domínios (CDN, APIs externas)
  if (url.origin !== location.origin) {
    return;
  }

  // Estratégia: Cache First (com fallback para Network)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("[SW] Servindo do cache:", request.url);
        return cachedResponse;
      }

      // Se não está no cache, busca na rede
      console.log("[SW] Buscando na rede:", request.url);
      return fetch(request)
        .then((networkResponse) => {
          // Cachear a resposta para uso futuro
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.error("[SW] Falha na requisição:", request.url, error);

          // Fallback para página offline (se existir)
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// ============================================================================
// MENSAGENS DO CLIENTE
// ============================================================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Forçando atualização...");
    self.skipWaiting();
  }
});

// ============================================================================
// INFORMAÇÕES DO SERVICE WORKER
// ============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🎰 ROBERTO LOTERIAS SERVICE WORKER 🎰            ║
║                                                           ║
║        Versão: ${CACHE_NAME}                            ║
║        Status: Iniciando...                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
