// 1. Motor de notificações do OneSignal
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.worker.js');

// 2. Motor básico do seu App (PWA)
self.addEventListener('install', (event) => {
  console.log('App da Escola ABC do Park instalado com sucesso.');
  // Força a ativação imediata para substituir versões antigas com erro
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Permite que o app funcione normalmente puxando os dados da internet
  event.respondWith(fetch(event.request));
});