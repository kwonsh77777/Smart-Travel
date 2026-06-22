const CACHE_NAME = 'travel-log-v5'; // 버전을 올려 스마트폰에 강제 업데이트 명령
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'Smart_Travel.png'
];

// 설치 시 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 데이터 요청(fetch) 가로채기
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return; 
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
