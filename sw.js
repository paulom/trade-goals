// Nome do cache
const CACHE_NAME = 'trade-goals-cache-v2';

// Arquivos a serem armazenados em cache
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/favicon.ico',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  
  // Força a ativação imediata do novo Service Worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Erro ao abrir cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  
  // Toma controle imediatamente de todas as páginas
  event.waitUntil(self.clients.claim());
  
  // Limpa caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Removendo cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Interceptando requisições
self.addEventListener('fetch', event => {
  // Ignora requisições de extensões do Chrome
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Para arquivos CSS e JavaScript, sempre busque a nova versão da rede
  if (event.request.url.endsWith('.css') || event.request.url.endsWith('.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Coloca a resposta no cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se falhar, tenta pegar do cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para outras requisições, tenta primeiro o cache e depois a rede
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna a resposta
        if (response) {
          return response;
        }
        
        // Clone da requisição original
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone da resposta
            const responseToCache = response.clone();
            
            // Armazena a resposta no cache
            caches.open(CACHE_NAME)
              .then(cache => {
                // Não armazena em cache URLs de extensão do Chrome
                if (!event.request.url.startsWith('chrome-extension://')) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(error => {
            console.error('Erro ao buscar recurso:', error);
            
            // Para navegação, retorna uma página de fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Para outros recursos, retorna um erro
            return new Response('Erro de conexão. Verifique sua internet.');
          });
      })
  );
});