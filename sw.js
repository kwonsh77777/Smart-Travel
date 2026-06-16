const CACHE_NAME = 'travel-log-v3';
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
  // 💡 [수정] 구글 서버 통신(API)이나 POST 요청은 캐시를 무시하고 바로 인터넷으로 연결합니다.
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return; 
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 반환, 없으면 네트워크 요청
        return response || fetch(event.request);
      })
  );
});
