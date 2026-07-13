/* =============================================================================
 * Compteur d'installations — anonyme, sans cookie, sans compte
 * -----------------------------------------------------------------------------
 * Incrémente UNE seule fois par appareil, uniquement quand l'app est ouverte
 * en mode « installé » (écran d'accueil / standalone). Ce premier lancement
 * incrémente à la fois :
 *   • le compteur TOTAL (depuis la création)  → clé « <app>-installs »
 *   • le compteur DU JOUR                      → clé « <app>-d-AAAA-MM-JJ » (heure de Paris)
 * Aucune donnée personnelle : juste des nombres, hébergés par un compteur public
 * (abacus.jasoncameron.dev). Consultation : voir stats.html.
 * ========================================================================== */
(function () {
  'use strict';

  var NS  = 'jpapp2026-vh-k7m2q9';                 // espace de noms (obscur)
  var KEY = (window.__jpStatsKey || 'installs');   // ex : « jeunes-installs »
  var APP = KEY.split('-')[0];                      // « jeunes » / « anims »
  // Drapeau propre à la clé : anims et jeunes partagent la même origine GitHub
  // Pages (localStorage commun) -> on distingue par la clé.
  var FLAG = 'jpapp_install_counted_' + KEY;

  function standalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  function parisDate() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }   // repli : date UTC
  }

  try {
    if (!standalone()) return;              // en navigateur (non installée) : on ne compte pas
    if (localStorage.getItem(FLAG)) return; // déjà compté sur cet appareil
  } catch (e) { return; }

  var base = 'https://abacus.jasoncameron.dev/hit/' + NS + '/';

  // 1) Total (référence) — le drapeau n'est posé qu'en cas de succès réseau
  //    (sinon on réessaiera au prochain lancement, utile si 1er lancement hors ligne).
  fetch(base + KEY, { cache: 'no-store' })
    .then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) { try { localStorage.setItem(FLAG, '1'); } catch (e) {} }
    })
    .catch(function () {});

  // 2) Compteur du jour (best-effort)
  fetch(base + APP + '-d-' + parisDate(), { cache: 'no-store' }).catch(function () {});
})();
