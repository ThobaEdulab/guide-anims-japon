/* =============================================================================
 * Service Worker — Guide Anims « Made in Japan » (PWA hors ligne)
 * -----------------------------------------------------------------------------
 * Stratégie :
 *   • CORE (coquille de l'app)  → pré-mise en cache à l'installation (bloquant).
 *   • Polices woff2 + images    → « réchauffage » en arrière-plan à l'activation
 *                                 (best-effort) + mise en cache à la volée.
 *   • Navigations               → cache d'abord (démarrage instantané + hors ligne),
 *                                 réseau en secours (et rafraîchit le cache).
 *   • Ressources same-origin    → cache d'abord, réseau en secours.
 *   • Images Wikimedia          → cache d'abord ; si absent + hors ligne, on laisse
 *                                 échouer → l'app masque proprement l'image.
 *
 * Mises à jour : il suffit d'incrémenter VERSION ci-dessous. À l'activation, tous
 * les anciens caches (préfixe « mij- » d'une autre version) sont supprimés.
 * ========================================================================== */

'use strict';

/* Incrémenter à chaque nouvelle version des fichiers pour forcer la mise à jour */
const VERSION = 'v1.0.0';

const CORE_CACHE = 'mij-core-' + VERSION;
const FONT_CACHE = 'mij-fonts-' + VERSION;
const IMG_CACHE  = 'mij-img-'  + VERSION;
const CURRENT_CACHES = [CORE_CACHE, FONT_CACHE, IMG_CACHE];

/* Coquille minimale indispensable au fonctionnement hors ligne.
   Chemins RELATIFS au SW (placé à la racine du dossier de l'app). */
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/dc-runtime.js',
  './assets/react.production.min.js',
  './assets/react-dom.production.min.js',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

/* Domaines d'images distantes gérés en « cache d'abord » (mode dégradé hors ligne) */
const IMAGE_HOSTS = ['commons.wikimedia.org', 'upload.wikimedia.org'];
/* Domaine CDN de secours (normalement jamais sollicité : React est servi en local) */
const CDN_HOSTS = ['unpkg.com'];

/* GIF 1×1 transparent, renvoyé pour les liaisons de template non résolues
   (ex : « {{ dayImg }} ») que le préchargeur du navigateur tente de charger
   avant l'hydratation → évite des 404 inutiles. */
const TRANSPARENT_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (c) => c.charCodeAt(0)
);

/* ------------------------------------------------------------------ INSTALL */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Ajout résilient : un fichier manquant ne doit PAS faire échouer l'install.
    await Promise.allSettled(
      CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    // La nouvelle version prend la main sans attendre la fermeture des onglets.
    await self.skipWaiting();
  })());
});

/* ----------------------------------------------------------------- ACTIVATE */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Supprimer les anciens caches (autre version).
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n.startsWith('mij-') && !CURRENT_CACHES.includes(n))
           .map((n) => caches.delete(n))
    );
    // 2) Prendre le contrôle des pages déjà ouvertes.
    await self.clients.claim();
    // 3) Réchauffer polices + images en arrière-plan (best-effort, non bloquant
    //    pour l'utilisateur : les erreurs sont ignorées).
    warmCache('./assets/font-manifest.json', FONT_CACHE, 'same-origin');
    warmCache('./assets/image-manifest.json', IMG_CACHE, 'no-cors');
  })());
});

/**
 * Télécharge en arrière-plan la liste d'URLs d'un manifeste JSON et la range
 * dans le cache indiqué. Chaque échec est ignoré (« ne pas casser si absent »).
 */
async function warmCache(manifestUrl, cacheName, mode) {
  try {
    const res = await fetch(manifestUrl, { cache: 'reload' });
    if (!res.ok) return;
    const urls = await res.json();
    const cache = await caches.open(cacheName);
    // Par petits lots pour ne pas saturer le réseau mobile.
    const BATCH = 6;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.allSettled(urls.slice(i, i + BATCH).map(async (u) => {
        if (await cache.match(u)) return;               // déjà en cache
        const r = await fetch(u, { mode, cache: 'reload' });
        // En mode no-cors la réponse est « opaque » (status 0) mais cachable.
        if (r && (r.ok || r.type === 'opaque')) await cache.put(u, r);
      }));
    }
  } catch (e) { /* hors ligne au 1er lancement : on réessaiera plus tard */ }
}

/* -------------------------------------------------------------------- FETCH */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                     // on ne touche qu'aux GET

  const url = new URL(req.url);

  // 1) Navigations (ouverture de la page) → cache d'abord, réseau en secours.
  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }

  // 2) Images distantes (Wikimedia) → cache d'abord, échec silencieux hors ligne.
  if (IMAGE_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, IMG_CACHE, 'no-cors'));
    return;
  }

  // 3) CDN de secours éventuel → cache d'abord.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, CORE_CACHE, 'cors'));
    return;
  }

  // 4) Ressources same-origin (polices, JS, icônes, splash…) → cache d'abord.
  if (url.origin === self.location.origin) {
    // Liaison de template non résolue (« {{ … }} ») → image transparente.
    if (url.pathname.indexOf('%7B%7B') !== -1) {
      event.respondWith(new Response(TRANSPARENT_GIF, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' }
      }));
      return;
    }
    const cacheName = url.pathname.includes('/fonts/') ? FONT_CACHE : CORE_CACHE;
    event.respondWith(cacheFirst(req, cacheName, 'same-origin'));
    return;
  }

  // 5) Tout le reste (ex : liens Google Maps ouverts ailleurs) → réseau direct.
});

/** Navigation : sert index.html depuis le cache, sinon réseau (et met à jour). */
async function handleNavigation(req) {
  const core = await caches.open(CORE_CACHE);
  const cached = (await core.match(req)) || (await core.match('./index.html')) || (await core.match('./'));
  if (cached) {
    // Rafraîchissement silencieux en arrière-plan (« stale-while-revalidate »).
    fetchAndPut(req, core).catch(() => {});
    return cached;
  }
  try {
    const net = await fetch(req);
    core.put('./index.html', net.clone()).catch(() => {});
    return net;
  } catch (e) {
    // Dernier recours : la coquille.
    return (await core.match('./index.html')) || Response.error();
  }
}

/** Cache d'abord : renvoie la version en cache, sinon réseau (et met en cache). */
async function cacheFirst(req, cacheName, mode) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(mode === 'no-cors' ? new Request(req.url, { mode: 'no-cors' }) : req);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    // Hors ligne et non mis en cache : on échoue proprement.
    // (Pour les images, l'app affiche déjà un repli en cas d'erreur de chargement.)
    return Response.error();
  }
}

/** Récupère une requête et la range dans le cache donné (silencieux). */
async function fetchAndPut(req, cache) {
  const res = await fetch(req);
  if (res && res.ok) await cache.put('./index.html', res.clone());
  return res;
}

/* ------------------------------------------------------------------ MESSAGE */
/* Permet à la page de forcer l'activation immédiate d'une mise à jour. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
