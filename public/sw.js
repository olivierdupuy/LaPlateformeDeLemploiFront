// ═══════════════════════════════════════════════════════════
//  Service worker — coquille hors ligne, sans figer le site.
//
//  La version precedente etait « cache d'abord » sur tout, navigations
//  comprises, et « index.html » etait pre-mis en cache a l'installation :
//
//      caches.match(req).then((cached) => cached || fetch(req)…)
//
//  Le nom du cache ne changeant jamais, « activate » ne purgeait rien.
//  Consequence : un visiteur deja venu ne recevait plus aucun
//  deploiement. Jamais. Son « index.html » restait celui de sa premiere
//  visite et reclamait des fichiers haches que le serveur avait
//  remplaces depuis — d'ou les « Failed to fetch dynamically imported
//  module: chunk-XXXX.js » remontes par le filet d'erreurs, et
//  l'impression tenace que les mises en ligne « ne prenaient pas ».
//
//  La strategie se choisit desormais selon ce qui est demande :
//
//    Une navigation   → le reseau d'abord. Le cache ne repond que hors
//                       ligne. C'est le point de tout ce fichier :
//                       « index.html » designe les fichiers haches du
//                       deploiement courant, le servir depuis le cache
//                       revient a rester sur le precedent.
//    Un fichier hache → le cache d'abord. Son nom porte son empreinte :
//                       un contenu different porte un autre nom, il ne
//                       peut pas perimer.
//    Le reste         → le reseau d'abord, cache en secours.
// ═══════════════════════════════════════════════════════════

// Le numero change avec la strategie : « activate » supprime tout cache
// dont le nom differe, ce qui purge la coquille figee chez les visiteurs
// qui la portent encore.
const CACHE = 'lpde-v2';

// De quoi afficher quelque chose sans reseau. « index.html » y figure
// comme secours, jamais comme reponse preferee.
const SHELL = ['/index.html', '/manifest.webmanifest', '/favicon.ico', '/icon-192.png'];

/**
 * Un fichier dont le nom porte son empreinte.
 *
 * Angular hache tout ce qu'il produit — « main-A1B2C3D4.js »,
 * « chunk-9F8E7D6C.js ». Ceux-la sont immuables par construction : les
 * garder indefiniment est sans risque, et c'est tout l'interet.
 */
const HACHE = /-[A-Za-z0-9_]{8,}\.(?:js|css|woff2?|png|jpe?g|svg|webp|avif)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // « addAll » echoue en bloc des qu'une entree manque : la coquille
      // ne doit pas empecher l'installation.
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Range une reponse valable, sans jamais faire echouer la requete. */
function ranger(cle, reponse) {
  if (!reponse || !reponse.ok || reponse.type === 'opaque') return;
  const copie = reponse.clone();
  caches
    .open(CACHE)
    .then((c) => c.put(cle, copie))
    .catch(() => {
      /* quota plein, navigation privee : la visite continue */
    });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // ── Une navigation : le reseau d'abord ──
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          ranger('/index.html', res);
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // ── Un fichier hache : le cache d'abord ──
  if (HACHE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cache) =>
          cache ||
          fetch(req).then((res) => {
            ranger(req, res);
            return res;
          }),
      ),
    );
    return;
  }

  // ── Le reste : le reseau d'abord, le cache en secours ──
  event.respondWith(
    fetch(req)
      .then((res) => {
        ranger(req, res);
        return res;
      })
      .catch(() => caches.match(req).then((r) => r ?? Response.error())),
  );
});
