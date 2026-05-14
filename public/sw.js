// Este é o motor básico que permite a instalação do App no celular
self.addEventListener('install', (event) => {
  console.log('App da Escola ABC do Park instalado com sucesso.');
});

self.addEventListener('fetch', (event) => {
  // Permite que o app funcione normalmente puxando os dados da internet
  event.respondWith(fetch(event.request));
});