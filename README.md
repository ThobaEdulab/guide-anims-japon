# Japan'App 2026 — Guide Anims (PWA hors ligne)

Application web progressive **installable** (Android / iPhone) et **100 % fonctionnelle hors
connexion dès la première ouverture avec Internet** (aucune attente : tout est mis en cache
immédiatement, y compris les photos).

Obtenue à partir du fichier autonome `JapanApp 2026 - Guide Anims.html`, « dé-bundlé » vers une
vraie arborescence PWA. **Le contenu et l'interface sont strictement identiques** à l'original.

---

## 1. Arborescence

```
guide-anims-pwa/
├── index.html                  ← page principale (coquille de l'app)
├── manifest.webmanifest        ← manifeste PWA (nom, icônes, couleurs, orientation)
├── service-worker.js           ← cache hors ligne + mises à jour
├── precache-manifest.json      ← liste des fichiers à mettre en cache à l'installation
├── assets/
│   ├── dc-runtime.js                 ← moteur de rendu du composant (extrait du bundle)
│   ├── react.production.min.js       ← React 18.3.1 (servi en LOCAL, plus de CDN)
│   └── react-dom.production.min.js   ← ReactDOM 18.3.1 (LOCAL)
├── fonts/
│   └── <uuid>.woff2            ← 3 sous-ensembles de la police « Zen Maru Gothic »
├── img/
│   └── day01.jpg … day16.jpg, tenue-kimono.jpg   ← 17 photos EMBARQUÉES (plus de Wikimedia)
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
2. Ouvrir **http://localhost:8123** dans Chrome/Edge. Laisser la page se charger
   (le service worker met tout en cache — coquille, polices, photos — en 1 à 2 secondes).
3. Vérifier dans les DevTools (F12) → onglet **Application** → **Service Workers** :
   le worker doit être « activated ». Onglet **Cache Storage** : un cache
   `jpapp-anims-v2.0.0` avec ~47 fichiers.
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
3. Confirmer. L'icône (torii doré) apparaît sur l'écran d'accueil.
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

## 5. Mise en ligne

Déjà déployé via **GitHub Pages**. Pour republier une mise à jour :
```
git add -A
git commit -m "Mise à jour du contenu"
git push
```
> Astuce : après un changement de contenu important, incrémenter `VERSION` dans
> `service-worker.js` (ex. `v2.0.1`) pour forcer la mise à jour sur les appareils déjà installés.

---

## 6. Ce qui marche hors ligne / ce qui nécessite Internet

| Fonctionnalité                                             | Hors ligne |
|-----------------------------------------------------------|:----------:|
| Programme jour par jour, textes, kanji, horaires          | ✅ |
| Photos des journées (embarquées, plus de Wikimedia)       | ✅ *dès la 1re ouverture* |
| Polices japonaises (Zen Maru Gothic)                      | ✅ |
| Missions (passeport samouraï, check-valise)               | ✅ |
| Régie / compteur, taux de change, phrases utiles          | ✅ |
| Sauvegarde locale (cases cochées, n° de tel, etc.)        | ✅ (localStorage) |
| Liens « Ouvrir dans Google Maps »                         | ❌ *(ouvre Maps → nécessite Internet)* |

**Mode dégradé** : si une image venait à manquer, l'app la **masque automatiquement**
(comportement natif) — aucun plantage. Les liens Maps restent cliquables mais nécessitent
une connexion pour s'ouvrir.

---

## 7. Limites connues

- **Google Maps** : les liens ouvrent l'app/site Maps → nécessitent Internet (inévitable).
- **iOS** : espace de stockage hors ligne plafonné (~50 Mo par site) — ici ~2,5 Mo, large marge.
- **Premier lancement** : doit se faire **en ligne** une fois pour que le service worker
  mette les fichiers en cache (quelques secondes seulement désormais).
