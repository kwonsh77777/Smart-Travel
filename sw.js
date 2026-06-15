const CACHE_NAME = 'travel-history-v1';
const ASSETS = [
  'index.html',
  'manifest.json'
];

// 설치 단계: 초기 필수 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 단계
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// 데이터 네비게이션 요청 관리
self.addEventListener('fetch', event => {
  // 구글 시트 API 데이터 통신은 캐시하지 않고 항상 실시간 처리합니다.
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
  );
});