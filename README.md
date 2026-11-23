# Menu TV

Menu de chaînes façon console, pour PC et Fire Stick, avec import Xtream et guide TV.

## Appli PC installable (.exe)

`Installer Menu TV.exe` installe Menu TV (raccourcis Bureau + menu Démarrer), proxy intégré.
- **Mettre à jour** après une modification du dossier : dans l'appli, ⚙ Réglages → **⬇️ Mettre à jour l'appli**
  (l'appli prévient au démarrage quand une mise à jour est disponible). Le menu, les favoris et les réglages sont gardés.
- Le dossier source des mises à jour se change dans ⚙ Réglages → 📁.
- `construire-exe.bat` refabrique l'installateur : seulement utile si on modifie `electron/main.js`.
- Raccourcis dans l'appli : F11 plein écran, F5 recharger.

## Lancer comme une appli PC sans installation

Double-clique sur **Menu TV** (raccourci du Bureau) ou sur `Menu TV.vbs` : le proxy démarre en
arrière-plan et l'appli s'ouvre dans sa propre fenêtre. Fermer la fenêtre arrête le proxy.
Pour recréer le raccourci et l'icône : `powershell -ExecutionPolicy Bypass -File creer-raccourci.ps1`.

## Appli Fire TV (sans PC)

`MenuTV.apk` est une vraie appli Fire TV : la page est dedans, et le proxy aussi (réécrit en Java dans
`android/app/src/main/java/fr/menutv/MainActivity.java`), donc le PC n'a pas besoin d'être allumé.

- **Fabriquer / mettre à jour** après une modification : `construire-appli.bat`
- **Installer** (une fois : Fire Stick > Paramètres > Ma Fire TV > Options pour les développeurs) :
  - par le Wi-Fi : activer *Débogage ADB*, puis `installer-firestick.bat IP-DU-FIRE-STICK`
  - ou avec l'appli gratuite *Downloader* : activer *Applis de sources inconnues*, lancer `node proxy.js`
    sur le PC et taper `http://IP-DU-PC:8787/MenuTV.apk`
- Télécommande : croix + OK, **Retour** (2 fois à l'accueil pour quitter), **Menu ≡** favori,
  **⏯** pause, **⏩ / ⏪** chaîne suivante / précédente.

Outils de fabrication (gratuits) : SDK Android dans `%LOCALAPPDATA%\Android\Sdk`, Gradle via `android/gradlew.bat`.

## Lancer à la main

```
node proxy.js
```

Ouvre ensuite http://localhost:8787 sur le PC, ou l'adresse `http://192.168.x.x:8787` affichée au démarrage depuis le Fire Stick.
Sans le proxy, `index.html` s'ouvre aussi directement, mais le navigateur bloque alors en général l'Xtream (CORS).

## Fichiers

| Fichier | Contenu |
|---|---|
| `index.html` | structure de la page |
| `css/style.css` | mise en forme (thème classique) |
| `css/theme-vice.css` | thème Néon Vice (Réglages > Thème) |
| `js/france.js` | rangement auto des chaînes françaises : **règles à modifier ici** |
| `js/donnees.js` | outils communs, démo, favoris, sauvegarde (localStorage) |
| `js/guide.js` | détection du proxy, guide TV (EPG) |
| `js/menu.js` | affichage de la grille, navigation |
| `js/fenetres.js` | fenêtres, mode organisation, recherche, guide, réglages |
| `js/xtream.js` | connexion et import Xtream |
| `js/lecteur.js` | lecteur vidéo (hls.js), mire de démo |
| `js/vod.js` | 🎬 Films et 🍿 Séries de l'Xtream (chargés à la demande), recherche, reprise de lecture |
| `js/appli.js` | touches de la télécommande dans l'appli Fire TV |
| `js/ambiance.js` | thème + musique de fond (synthwave générée, ou `musique/fond.mp3`) |
| `js/clavier.js` | clavier / télécommande, démarrage |
| `musique/` | mets-y `fond.mp3` pour ta propre musique de fond |
| `proxy.js` | serveur local : sert la page et relaie l'Xtream et les flux |

Les scripts sont chargés dans cet ordre par `index.html` et partagent leurs variables : garde cet ordre si tu en ajoutes un.
