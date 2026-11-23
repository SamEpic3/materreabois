# Ma terre à bois

Jeu de navigateur coopératif en 3D (vue isométrique) : une terre à bois québécoise à exploiter à deux. On bûche, on tronçonne, on transporte et on vend le bois. Plus tard viendront l'érablière et les champs, avec une ferme partagée qui avance même quand on n'est pas connectés.

> Prototype en développement. Pour l'instant, on joue seul. La partie se sauvegarde automatiquement dans le navigateur (ou l'app), et ce qui pousse ou chauffe continue pendant l'absence.

## Jouer

Ouvrir `index.html` dans un navigateur récent, sur ordinateur ou sur téléphone. Le moteur 3D (Three.js r128) est chargé depuis cdnjs, donc il faut une connexion Internet.

**Comme une app (PWA) :** sur GitHub Pages, ouvrir le jeu dans le navigateur du téléphone, puis « Ajouter à l'écran d'accueil » (Chrome : menu ⋮ › Installer l'application ; Safari : Partager › Sur l'écran d'accueil). L'app s'ouvre en plein écran, à l'horizontale (sur iPhone, si le téléphone est tenu à la verticale, le jeu se tourne de lui-même : il suffit de tourner le téléphone), et fonctionne hors ligne après la première ouverture.

Le jeu commence avec 35 000 $ pour pouvoir tout tester.

## Ce qu'on peut faire

- **Bûcher** à la hachette, la hache, la sciotte ou la scie à chaîne : le bouton d'action donne un coup, avec un délai entre chaque coup.
- **Tronçonner** la tige au ruban : un billot de 8 pi (entre 7 pi 10 po et 8 pi 2 po) se vend comme bois de sciage ; plus court, c'est du bois de chauffage.
- **Transporter**
  - À l'épaule : jusqu'à 8 pi. Plus le billot est long, plus on marche lentement.
  - En VTT ou en pick-up avec une remorque, ou dans la boîte du pick-up.
  - Avec la remorque chargeuse et sa grue : billots jusqu'à 12 pi.
  - Avec la débusqueuse, qui traîne les longues tiges.
- **Vendre** à la cour à bois du camp. Le prix dépend de l'essence (érable, bouleau, épinette, sapin) et de la longueur.
- **Suivre les prix** sur l'affiche de la cour à bois : ils changent toutes les 5 minutes.
- **Améliorer le camp** au tableau « Projets du camp » : feu de camp avec bûches pour s'asseoir, abri à bois, galerie avec chaises berçantes, poêle à bois, nouvelle pièce.
- **Planter** des plants achetés au magasin, n'importe où de libre : ils poussent en 3 à 5 heures réelles.
- **Essoucher** à la pelle (achetée au magasin) : la souche est arrachée et le terrain dégagé.
- **Faire les sucres** : entailler les érables, vider les chaudières dans un seau, faire bouillir au coin des sucres (au feu de bois), vendre le sirop au magasin. Les seaux se rangent dans la petite remorque ou la boîte du pick-up (un seul type de chargement à la fois : bois ou seaux).
- **Vendre un véhicule ou une remorque** dans le cercle vert près du magasin (de 25 à 50 % du prix neuf).
- **Acheter** des outils et de l'équipement au magasin général du village, autant de véhicules et de remorques qu'on veut.
- **Inventaire** : les outils achetés vont dans la barre d'outils ; on peut aussi garder les mains vides.
- **Trois vues** : isométrique, 3e personne et 1re personne (bouton 🎥 ou touche V).

## Contrôles

| Action | Ordinateur | Téléphone |
|---|---|---|
| Marcher / conduire | W A S D ou flèches | Joystick (moitié gauche) ; en véhicule : joystick pour tourner, boutons Gaz et Frein |
| Marcher jusqu'à un point | Clic | Toucher le terrain à droite |
| Choisir un outil ou les mains vides | 1 à 9, ou clic sur la barre d'outils | Bouton sous le panneau en haut à gauche (fait défiler) |
| Courir | Maj | Joystick poussé jusqu'au bout (le bouton devient orange) |
| Action (coup, prendre, déposer) | Espace | Bouton orange |
| Couper ici (sur un billot qu'on peut prendre) | F | 2e bouton orange |
| Embarquer / débarquer / opérer la grue | E | Bouton vert |
| Atteler / dételer | R | Bouton bleu |
| Grue : portée / pivot | W S / A D | Joystick |
| Grue : tourner le billot | Q / R | Boutons ⟲ ⟳ |
| Caméra | Z C (tourner), molette (zoom), V (vue) | ⟲ ⟳ + − 🎥, pincer |

## Structure

```
index.html            Page du jeu (interface, aide, magasin) et ordre de chargement des scripts
css/style.css         Styles de l'interface
js/outils.js          Three.js, raccourcis, maths, hasard
js/monde.js           Relief, chemins, rendu, terrain, collisions, camp, village, billots, forêt
js/personnage.js      Silhouettes, outils tenus en main, modèle du bonhomme
js/vehicules.js       Modèles et caractéristiques des véhicules et remorques
js/etat.js            État de la partie, catalogue du magasin, véhicules de départ
js/controles.js       Clavier, joystick, toucher, boutons, caméras
js/magasin.js         Magasin général, vignettes, messages
js/inventaire.js      Inventaire des outils (barre d'outils, mains vides)
js/actions.js         Bûcher, tronçonner, porter, charger, vendre, atteler
js/debusqueuse.js     Agripper, traîner, relâcher une tige
js/grue.js            Grue de la remorque chargeuse
js/interactions.js    Embarquer, débarquer, opérer la grue, boutons d'action
js/marche.js          Prix du bois et du sirop qui varient, affiche des prix
js/erabliere.js       Entailles, chaudières, seaux, feu et bouilloire
js/vente.js           Vente de véhicules et de remorques
js/camp.js            Projets du camp, sièges, feu de camp, poêle, abri à bois
js/plantation.js      Plants, plantation et pousse en temps réel
js/joueur.js          Déplacement et animations du joueur à pied
js/physique.js        Physique des véhicules et des remorques
js/hud.js             Flèche d'objectif et affichage
js/sauvegarde.js      Sauvegarde locale, reprise et temps écoulé pendant l'absence
js/boucle.js          Boucle de jeu et placement des caméras
js/pwa.js             App installable : service worker, vue horizontale forcée
sw.js                 Service worker (mise en cache pour jouer hors ligne)
manifest.webmanifest  Description de l'app (nom, icônes, plein écran, horizontal)
icones/               Icônes de l'app
```

Quand on ajoute un fichier au jeu, il faut aussi l'ajouter à la liste `FICHIERS` de `sw.js` (et changer `VERSION`) pour qu'il soit disponible hors ligne.

Les scripts sont des fichiers JavaScript classiques chargés dans l'ordre de `index.html` : ils partagent leurs variables globales. Le jeu s'ouvre donc aussi en double-cliquant sur `index.html`, sans serveur. Les fonctions peuvent appeler celles des fichiers suivants, mais le code exécuté au chargement ne doit utiliser que ce qui est déclaré dans les fichiers précédents.

## Prochaines étapes

- Serveur pour jouer à deux sur la même terre, avec un journal de la ferme.
- Essence et usure des outils, aiguisage.
- Saisons (le temps des sucres au printemps), champs.
