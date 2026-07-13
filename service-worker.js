/* =============================================================================
 * Service Worker — Japan'App 2026 · Guide Anims (PWA hors ligne)
 * -----------------------------------------------------------------------------
 * Toutes les ressources de l'app (coquille, polices, photos) sont désormais
 * SAME-ORIGIN (les photos ne viennent plus de Wikimedia mais sont embarquées
 * dans le dossier img/). On peut donc tout pré-mettre en cache dès l'installation
 * : l'app est 100% utilisable hors ligne dès la toute première ouverture, sans
 * attendre un « réchauffage » en arrière-plan.
 *
 * Stratégie :
 *   • Installation : lit precache-manifest.json (généré au build) et met en
 *     cache CHAQUE fichier listé, un par un et de façon résiliente (un fichier
 *     manquant ne casse pas l'installation des autres).
 *   • Navigations et ressources same-origin : cache d'abord, réseau en secours,
 *     avec rafraîchissement silencieux du cache en arrière-plan.
 *
 * Mise à jour : incrémenter VERSION ci-dessous force le renouvellement complet
 * du cache ; à l'activation, les anciens caches (préfixe différent de la
 * version courante) sont supprimés automatiquement.
 * ========================================================================== */

'use strict';

const APP_PREFIX = 'jpapp-anims-';   // namespace propre à ce guide (Anims)
const VERSION = 'v6.1.1';
const CACHE_NAME = APP_PREFIX + VERSION;

/* GIF 1×1 transparent : réponse de repli pour les liaisons de template non
   résolues (ex : « {{ dayImg }} ») que le préchargeur du navigateur tente de
   charger avant l'hydratation de l'app -> évite des 404 inutiles. */
const TRANSPARENT_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (c) => c.charCodeAt(0)
);

/* ------------------------------------------------------------------ INSTALL */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    let files = ['./', './index.html', './manifest.webmanifest'];
    try {
      const res = await fetch('./precache-manifest.json', { cache: 'reload' });
      if (res.ok) files = files.concat(await res.json());
    } catch (e) { /* manifeste absent : on garde au moins la coquille minimale */ }
    // Ajout résilient : un fichier manquant ne fait PAS échouer les autres.
    await Promise.allSettled(
      files.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();   // la nouvelle version prend la main sans attendre
  })());
});

/* Anciens préfixes de cache d'une version antérieure de CE site (v1, basée sur
   des photos Wikimedia) : nettoyage ponctuel pour libérer l'espace sur les
   appareils qui avaient déjà installé cette version. */
const LEGACY_PREFIXES = ['mij-'];

/* ----------------------------------------------------------------- ACTIVATE */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => (n.startsWith(APP_PREFIX) && n !== CACHE_NAME) ||
                           LEGACY_PREFIXES.some((p) => n.startsWith(p)))
           .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* -------------------------------------------------------------------- FETCH */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigations (ouverture de la page) → cache d'abord, réseau en secours.
  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }

  if (url.origin !== self.location.origin) return;   // liens externes (Maps…) : réseau direct

  // Liaison de template non résolue (« {{ … }} ») → image transparente.
  if (url.pathname.indexOf('%7B%7B') !== -1) {
    event.respondWith(new Response(TRANSPARENT_GIF, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' }
    }));
    return;
  }

  event.respondWith(cacheFirst(req));
});

/** Navigation : sert index.html depuis le cache, sinon réseau (et met à jour). */
async function handleNavigation(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./'));
  if (cached) {
    fetchAndPut(req, cache).catch(() => {});   // rafraîchissement silencieux
    return cached;
  }
  try {
    const net = await fetch(req);
    cache.put('./index.html', net.clone()).catch(() => {});
    return net;
  } catch (e) {
    return (await cache.match('./index.html')) || Response.error();
  }
}

/** Cache d'abord : renvoie la version en cache, sinon réseau (et met en cache). */
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return Response.error();
  }
}

async function fetchAndPut(req, cache) {
  const res = await fetch(req);
  if (res && res.ok) await cache.put('./index.html', res.clone());
  return res;
}

/* ------------------------------------------------------------------ MESSAGE */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
