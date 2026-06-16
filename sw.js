const CACHE_NAME = 'travel-log-v2'; // 버전을 v2로 올려줍니다!
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'Smart_Travel.png' // 아이콘 파일도 명시적으로 추가합니다.
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 반환, 없으면 네트워크 요청
        return response || fetch(event.request);
      })
  );
});
