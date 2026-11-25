// 오프라인에서도 앱이 열리도록 파일을 저장해두는 서비스워커
// 앱을 수정해서 다시 올릴 때는 VERSION 숫자를 올려주세요.
const VERSION = 'v1';
const CACHE = 'baby-app-' + VERSION;
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('baby-app-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 페이지: 인터넷이 되면 최신 버전, 안 되면 저장된 버전
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 같은 사이트 파일 + 글꼴(Pretendard): 저장된 게 있으면 바로 쓰고, 뒤에서 새로 받아둬요
  const isFont = url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('pretendard');
  if (url.origin === self.location.origin || isFont) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
