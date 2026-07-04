# Guide Anims — Made in Japan (PWA hors ligne)

Application web progressive **installable** (Android / iPhone) et **100 % fonctionnelle hors connexion**
après une première ouverture avec Internet.

Elle a été obtenue à partir du fichier autonome `Guide Anims - Made in Japan.html`, en le
« dé-bundlant » vers une vraie arborescence PWA (voir plus bas). **Le contenu et l'interface
sont strictement identiques** à l'original.

---

## 1. Arborescence

```
guide-anims-pwa/
├── index.html                  ← page principale (coquille de l'app)
├── manifest.webmanifest        ← manifeste PWA (nom, icônes, couleurs, orientation)
├── service-worker.js           ← cache hors ligne + mises à jour
├── assets/
│   ├── dc-runtime.js           ← moteur de rendu du composant (extrait du bundle)
│   ├── react.production.min.js       ← React 18.3.1 (servi en LOCAL, plus de CDN)
│   ├── react-dom.production.min.js   ← ReactDOM 18.3.1 (LOCAL)
│   ├── font-manifest.json      ← liste des polices (réchauffage du cache par le SW)
│   └── image-manifest.json     ← liste des photos Wikimedia (réchauffage du cache)
├── fonts/
│   └── <uuid>.woff2            ← 366 sous-ensembles de la police « Zen Maru Gothic »
├── icons/
│   ├── favicon.svg / favicon-32.png
│   ├── icon-192.png / icon-512.png            ← icônes standard
│   ├── icon-192-maskable.png / icon-512-maskable.png  ← icônes « maskable » Android
│   └── apple-touch-icon.png                   ← icône iOS (180×180)
└── splash/
    └── apple-splash-*.png     ← 14 écrans de démarrage iOS (par taille d'appareil)
```

---

## 2. Tester le fonctionnement HORS LIGNE (sur ordinateur)

Un service worker exige un serveur **http(s)** (il ne fonctionne pas en `file://`).

1. Ouvrir un terminal dans le dossier `guide-anims-pwa/` puis lancer un petit serveur :
   ```
   python -m http.server 8123
   ```
   (ou toute autre solution : `npx serve`, extension VS Code « Live Server », etc.)
2. Ouvrir **http://localhost:8123** dans Chrome/Edge. Laisser la page se charger
   entièrement (le service worker télécharge en tâche de fond les 366 polices et les
   photos : quelques secondes).
3. Vérifier dans les DevTools (F12) → onglet **Application** → **Service Workers** :
   le worker doit être « activated ». Onglet **Cache Storage** : 3 caches
   (`mij-core`, `mij-fonts`, `mij-img`) remplis.
4. **Passer hors ligne** : DevTools → onglet **Network** → cocher **Offline**
   (ou couper le Wi-Fi / arrêter le serveur). Recharger la page (F5).
   → L'application se relance **entièrement**, avec les polices ET les photos.

---

## 3. Installer sur ANDROID (Chrome / Edge / Samsung Internet)

> Prérequis : l'app doit être servie en **HTTPS** (voir §5 « Mise en ligne »),
> ou en `http://localhost` pour un test.

1. Ouvrir l'URL de l'application dans **Chrome**.
2. Une bannière « **Installer l'application** » apparaît en bas ; sinon :
   menu **⋮** (3 points) → **Installer l'application** / **Ajouter à l'écran d'accueil**.
3. Confirmer. L'icône « Guide Anims » (torii doré) apparaît sur l'écran d'accueil.
4. L'app s'ouvre en **plein écran, sans barre d'adresse**, verrouillée en **portrait**.

---

## 4. Installer sur IPHONE / IPAD (Safari)

> iOS n'installe les PWA **que via Safari** (pas Chrome iOS).

1. Ouvrir l'URL dans **Safari**.
2. Toucher le bouton **Partager** (carré avec une flèche vers le haut).
3. Faire défiler et choisir **« Sur l'écran d'accueil »**.
4. Valider **Ajouter**. L'icône apparaît sur l'écran d'accueil.
5. L'app s'ouvre en **plein écran** avec un **écran de démarrage** adapté à l'appareil.

---

## 5. Mise en ligne (pour une vraie installation sur téléphone)

L'installation PWA exige **HTTPS**. Options gratuites, sans build :

- **GitHub Pages** : déposer le contenu de `guide-anims-pwa/` dans un dépôt, activer Pages.
- **Netlify Drop** : glisser-déposer le dossier sur https://app.netlify.com/drop.
- **Cloudflare Pages / Vercel** : importer le dossier tel quel.

Aucune compilation n'est nécessaire : ce sont des fichiers statiques.
> Astuce : après chaque nouvelle mise en ligne, incrémenter `VERSION` dans
> `service-worker.js` (ex. `v1.0.1`) pour forcer la mise à jour sur les appareils.

---

## 6. Ce qui marche hors ligne / ce qui nécessite Internet

| Fonctionnalité                                             | Hors ligne |
|-----------------------------------------------------------|:----------:|
| Programme jour par jour, textes, kanji, horaires          | ✅ |
| Polices japonaises (Zen Maru Gothic)                      | ✅ |
| Missions (passeport samouraï, check-valise)               | ✅ |
| Régie / compteur, taux de change, phrases utiles          | ✅ |
| Sauvegarde locale (cases cochées, n° de tel, etc.)        | ✅ (localStorage) |
| Photos des journées (Wikimedia Commons)                   | ✅ *après 1re visite en ligne* |
| Liens « Ouvrir dans Google Maps »                         | ❌ *(ouvre Maps → nécessite Internet)* |

**Mode dégradé** : hors ligne, si une photo n'a jamais été mise en cache, l'app la
**masque automatiquement** (comportement natif de l'app) — aucun plantage. Les liens
Maps restent cliquables mais nécessitent une connexion pour s'ouvrir.

---

## 7. Limites connues

- **Google Maps** : les liens ouvrent l'app/site Maps → nécessitent Internet (inévitable).
- **iOS** : espace de stockage hors ligne plafonné (~50 Mo par site) — ici ~7 Mo, large marge.
- **Premier lancement** : doit se faire **en ligne** pour permettre au service worker de
  télécharger et mettre en cache les ressources.
- Les 2 photos internes référencées en `uploads/…` étaient déjà absentes du fichier
  d'origine ; l'app les masque proprement (aucune régression introduite).
