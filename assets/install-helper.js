/* =============================================================================
 * Aide à l'installation « Ajouter à l'écran d'accueil »
 * -----------------------------------------------------------------------------
 * Le web NE permet PAS d'installer une app sans aucune action de l'utilisateur
 * (sécurité des navigateurs). On propose donc le geste le plus court possible :
 *   • Android / Chrome / Edge : bandeau + bouton « Installer » -> prompt natif (1 tap).
 *   • iPhone / iPad (Safari)  : bandeau + feuille d'instructions illustrée
 *                               (Partager -> « Sur l'écran d'accueil »).
 * Ne s'affiche jamais si l'app est déjà installée (mode standalone).
 * Un « × » masque le bandeau pour 7 jours (localStorage).
 * ========================================================================== */
(function () {
  'use strict';

  var ACCENT = '#f0b23e';            // couleur du bouton (doré, thème de l'app)
  var LS_KEY = 'jpapp_install_hint'; // mémorise le rejet du bandeau
  var COOLDOWN = 7 * 24 * 3600 * 1000;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  if (isStandalone()) return;        // déjà installée : rien à faire

  var UA = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(UA) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosSafari = isIOS && /Safari/.test(UA) && !/(CriOS|FxiOS|EdgiOS|OPiOS|GSA)/.test(UA);

  function snoozed() {
    try { var t = +localStorage.getItem(LS_KEY) || 0; return t && (Date.now() - t) < COOLDOWN; }
    catch (e) { return false; }
  }
  function snooze() { try { localStorage.setItem(LS_KEY, '' + Date.now()); } catch (e) {} }

  // --- feuille de styles (portée au seul widget) ------------------------------
  var css = document.createElement('style');
  css.textContent =
    '#jp-install{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));' +
      'z-index:2147483000;max-width:520px;margin:0 auto;background:#141a2e;color:#f6ece0;' +
      'border:1px solid #2b3357;border-radius:16px;box-shadow:0 14px 44px rgba(0,0,0,.55);' +
      'padding:12px;display:flex;align-items:center;gap:12px;' +
      'font:14px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'transform:translateY(160%);transition:transform .35s cubic-bezier(.2,.8,.2,1)}' +
    '#jp-install.show{transform:translateY(0)}' +
    '#jp-install img.ic{width:40px;height:40px;border-radius:10px;flex:0 0 auto}' +
    '#jp-install .tx{flex:1;min-width:0}' +
    '#jp-install .tx b{display:block;font-weight:800}' +
    '#jp-install .tx span{opacity:.7;font-size:12px}' +
    '#jp-install button{border:0;cursor:pointer;font:inherit;font-weight:800}' +
    '#jp-install .go{background:' + ACCENT + ';color:#1a1205;border-radius:10px;padding:10px 14px;flex:0 0 auto}' +
    '#jp-install .cl{background:transparent;color:#8a93ad;font-size:22px;line-height:1;padding:2px 6px;flex:0 0 auto}' +
    '#jp-sheet{position:fixed;inset:0;z-index:2147483001;background:rgba(4,6,14,.72);' +
      'display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .3s}' +
    '#jp-sheet.show{opacity:1;pointer-events:auto}' +
    '#jp-sheet .card{background:#141a2e;color:#f6ece0;width:100%;max-width:520px;margin:0 auto;' +
      'border-radius:20px 20px 0 0;padding:22px 20px calc(24px + env(safe-area-inset-bottom));' +
      'font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'transform:translateY(100%);transition:transform .35s cubic-bezier(.2,.8,.2,1)}' +
    '#jp-sheet.show .card{transform:translateY(0)}' +
    '#jp-sheet h3{font-size:18px;font-weight:800;margin:0 0 14px}' +
    '#jp-sheet ol{margin:0;padding-left:22px}#jp-sheet li{margin:11px 0}' +
    '#jp-sheet .warn{background:#3a2a12;border:1px solid #5c451e;border-radius:12px;padding:10px 12px;margin:0 0 14px;font-size:13px}' +
    '#jp-sheet .sh{display:inline-flex;vertical-align:-6px;width:22px;height:22px;margin:0 2px}' +
    '#jp-sheet .done{margin-top:18px;width:100%;background:' + ACCENT + ';color:#1a1205;border:0;' +
      'border-radius:12px;padding:13px;font-weight:800;cursor:pointer}';
  document.head.appendChild(css);

  function node(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function removeBanner() {
    var b = document.getElementById('jp-install');
    if (b) { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 350); }
  }

  var deferredPrompt = null;

  // --- bandeau ----------------------------------------------------------------
  function showBanner(mode) {
    if (document.getElementById('jp-install') || isStandalone()) return;
    var b = node(
      '<div id="jp-install" role="dialog" aria-label="Installer l’application">' +
        '<img class="ic" src="icons/icon-192.png" alt="">' +
        '<div class="tx"><b>Installer l’application</b><span>' +
          (mode === 'ios' ? 'Plein écran, hors ligne, accès rapide' : 'En un tap sur ton écran d’accueil') +
        '</span></div>' +
        '<button class="go">' + (mode === 'ios' ? 'Voir comment' : 'Installer') + '</button>' +
        '<button class="cl" aria-label="Fermer">×</button>' +
      '</div>');
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('show'); });
    b.querySelector('.cl').onclick = function () { snooze(); removeBanner(); };
    b.querySelector('.go').onclick = function () {
      if (mode === 'ios') { openSheet(); return; }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; removeBanner(); });
      }
    };
  }

  // --- feuille d'instructions iOS ---------------------------------------------
  function openSheet() {
    var share = '<svg class="sh" viewBox="0 0 24 24" fill="none" stroke="' + ACCENT +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/>' +
      '<path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/></svg>';
    var warn = iosSafari ? '' :
      '<div class="warn">⚠️ Sur iPhone, l’installation n’est possible que depuis <b>Safari</b>. ' +
      'Ouvre d’abord cette page dans Safari, puis&nbsp;:</div>';
    var s = node(
      '<div id="jp-sheet"><div class="card">' +
        '<h3>Installer sur ton iPhone</h3>' + warn +
        '<ol>' +
          '<li>Appuie sur le bouton <b>Partager</b> ' + share + ' (icône carré + flèche, en bas de Safari).</li>' +
          '<li>Fais défiler puis choisis <b>« Sur l’écran d’accueil »</b>.</li>' +
          '<li>Appuie sur <b>Ajouter</b> — c’est fini ! 🎉</li>' +
        '</ol>' +
        '<button class="done">J’ai compris</button>' +
      '</div></div>');
    document.body.appendChild(s);
    requestAnimationFrame(function () { s.classList.add('show'); });
    function close() { s.classList.remove('show'); setTimeout(function () { s.remove(); }, 350); }
    s.querySelector('.done').onclick = close;
    s.onclick = function (e) { if (e.target === s) close(); };
  }

  // --- Android : l'évènement d'installabilité fournit le prompt natif ----------
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!snoozed()) showBanner('android');
  });
  window.addEventListener('appinstalled', function () { snooze(); removeBanner(); });

  // --- iOS : pas d'évènement -> on propose le mode d'emploi après le chargement -
  window.addEventListener('load', function () {
    if (isIOS && !snoozed()) setTimeout(function () { showBanner('ios'); }, 1200);
  });

  // Hook interne (tests / futur bouton « Installer » dans l'app) :
  window.__jpInstall = { banner: showBanner, sheet: openSheet, canPrompt: function () { return !!deferredPrompt; } };
})();
