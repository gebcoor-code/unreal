// Web Unreal Speccy: offline copy (service worker). Registered by the page as sw.js?v=<build>.
// The emulator itself (page, scripts, wasm, ini…) is kept per build; files of the site (ROMs, disks, HDD / SD images, lists)
// are kept once fetched (and by Options / System / Offline: Make offline). Always the network first, the copy when it fails.
'use strict';
const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';
const SCOPE = new URL(self.registration.scope).pathname; // copies in other folders of the site keep their own caches
const CORE = 'ue-core:' + SCOPE + ':' + BUILD, FILES = 'ue-files:' + SCOPE;
const SHELL = ['./', 'index.html', 'changes.txt', 'icon.png', 'apple-touch-icon.png',
  'js/wasi_fs.js', 'js/scancodes.js', 'js/unzip.js', 'js/vkbd.js', 'js/asyncify.js', 'js/gfx.js', 'js/usel.js', 'js/fcmd.js', 'js/app.js',
  'unreal/unreal.wasm', 'unreal/unreal.ini', 'unreal/boot6.$b', 'unreal/CMOS', 'unreal/sos.l'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    // one by one: a missing optional file (icon, sos.l) must not stop the rest
    await Promise.all(SHELL.map(async (u) => { try { const r = await fetch(new Request(u.replace(/\$/g, '%24'), { cache: 'reload' })); if (r.ok) await c.put(u.replace(/\$/g, '%24'), r); } catch (err) {} }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ue-core:' + SCOPE + ':') && k !== CORE) await caches.delete(k); // older builds
    await self.clients.claim();
  })());
});

const inScope = (u) => u.origin === self.location.origin && u.pathname.startsWith(SCOPE);
const isFile = (p) => /^(rom|trd|hdd|sd)\//i.test(p) || /\.json$/i.test(p);
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || !inScope(u) || req.headers.has('range')) return;
  const rel = decodeURIComponent(u.pathname.slice(SCOPE.length));
  e.respondWith((async () => {
    const store = isFile(rel) ? FILES : CORE;
    try {
      const r = await fetch(req);
      // the page's own files and the site's files: refreshed copy (a 404 or an HTML error page is not kept)
      if (r.ok && !(isFile(rel) && /text\/html/i.test(r.headers.get('content-type') || '') && !/\.html?$/i.test(rel))) {
        const c = await caches.open(store); c.put(u.origin + u.pathname, r.clone()).catch(() => {});
      }
      return r;
    } catch (err) { // offline: the copy (the build's ?v= does not matter; the page itself for any navigation)
      const hit = (await caches.match(u.origin + u.pathname, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? (await caches.match(new URL('index.html', self.registration.scope).href, { ignoreSearch: true })) || (await caches.match(self.registration.scope, { ignoreSearch: true })) : null);
      return hit || Response.error();
    }
  })());
});
// the page asks: how much is kept, or to drop the files
self.addEventListener('message', (e) => {
  const d = e.data || {}, port = e.ports && e.ports[0];
  (async () => {
    if (d.cmd === 'list') {
      const out = [];
      for (const name of [CORE, FILES]) { const c = await caches.open(name); for (const r of await c.keys()) out.push(r.url); }
      port && port.postMessage({ build: BUILD, urls: out });
    } else if (d.cmd === 'clear') { await caches.delete(FILES); port && port.postMessage({ ok: true }); }
  })();
});
