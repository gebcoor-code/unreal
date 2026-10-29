// Web Unreal Speccy: offline copy (service worker). Registered by the page as sw.js?v=<build>.
// The emulator itself (page, scripts, wasm, ini…) is kept per build; files of the site (ROMs, disks, HDD / SD images, lists)
// are kept once fetched (and by Options / System / Offline: Make offline). Always the network first, the copy when it fails.
'use strict';
const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';
const NET_WAIT = 4000; // ms the site has to answer before the kept copy is used
const SCOPE = new URL(self.registration.scope).pathname; // copies in other folders of the site keep their own caches
const CORE = 'ue-core:' + SCOPE + ':' + BUILD, FILES = 'ue-files:' + SCOPE;
const SHELL = ['./', 'index.html', 'changes.txt', 'icon.png', 'apple-touch-icon.png',
  'js/wasi_fs.js', 'js/scancodes.js', 'js/unzip.js', 'js/vkbd.js', 'js/asyncify.js', 'js/gfx.js', 'js/usel.js', 'js/fcmd.js', 'js/dbga.js', 'js/rzx.js', 'js/app.js',
  'unreal/unreal.zip', 'unreal/unreal.wasm', 'unreal/sjasm.zip', 'unreal/unreal.ini', 'unreal/boot6.$b', 'unreal/CMOS', 'unreal/sos.l'];

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
    const copy = async () => (await caches.match(u.origin + u.pathname, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? (await caches.match(new URL('index.html', self.registration.scope).href, { ignoreSearch: true })) || (await caches.match(self.registration.scope, { ignoreSearch: true })) : null);
    const net = fetch(req).then((r) => {
      // the page's own files and the site's files: refreshed copy (a 404 or an HTML error page is not kept)
      // the copy is cloned at once: later (after caches.open) the page may be reading the body already, and clone() throws
      if (r.ok && !(isFile(rel) && /text\/html/i.test(r.headers.get('content-type') || '') && !/\.html?$/i.test(rel))) {
        const keep = r.clone();
        caches.open(store).then((c) => c.put(u.origin + u.pathname, keep)).catch(() => {});
      }
      return r;
    });
    // a site that does not answer (a network that drops the packets silently: fetch would wait for the browser's own
    // timeout, a black screen on the phone): with a copy at hand, the copy after NET_WAIT ms; the network keeps going
    // and refreshes the copy if it answers later. No copy: the network as long as it takes
    const have = await copy();
    if (!have) { try { return await net; } catch (err) { return Response.error(); } }
    const late = new Promise((res) => setTimeout(() => res('late'), NET_WAIT));
    try {
      const r = await Promise.race([net, late]);
      if (r !== 'late') return r;
      net.catch(() => {});
      return have;
    } catch (err) { return have; } // offline: the copy (the build's ?v= does not matter; the page itself for any navigation)
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
