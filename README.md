# Ma terre à bois

Jeu de navigateur coopératif en 3D (vue isométrique) : une terre à bois québécoise à exploiter à deux. On bûche, on tronçonne, on transporte et on vend le bois. Plus tard viendront l'érablière et les champs, avec une ferme partagée qui avance même quand on n'est pas connectés.

> Prototype en développement. Pour l'instant, on joue seul et rien n'est sauvegardé.

## Jouer

Ouvrir `index.html` dans un navigateur récent, sur ordinateur ou sur téléphone. Le moteur 3D (Three.js r128) est chargé depuis cdnjs, donc il faut une connexion Internet.

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
- **Acheter** des outils et de l'équipement au magasin général du village.
- **Trois vues** : isométrique, 3e personne et 1re personne (bouton 🎥 ou touche V).

## Contrôles

| Action | Ordinateur | Téléphone |
|---|---|---|
| Marcher / conduire | W A S D ou flèches | Joystick (moitié gauche) ; en véhicule : joystick pour tourner, boutons Gaz et Frein |
| Marcher jusqu'à un point | Clic | Toucher le terrain à droite |
| Action (coup, prendre, déposer) | Espace | Bouton orange |
| Couper ici (sur un billot qu'on peut prendre) | F | 2e bouton orange |
| Embarquer / débarquer / opérer la grue | E | Bouton vert |
| Atteler / dételer | R | Bouton bleu |
| Grue : portée / pivot | W S / A D | Joystick |
| Grue : tourner le billot | Q / R | Boutons ⟲ ⟳ |
| Caméra | Z C (tourner), molette (zoom), V (vue) | ⟲ ⟳ + − 🎥, pincer |

## Structure

```
index.html      Page du jeu (interface, aide, magasin)
css/style.css   Styles de l'interface
js/jeu.js       Tout le code du jeu (monde, forêt, joueur, véhicules, grue, magasin, caméras)
```

## Prochaines étapes

- Séparer `js/jeu.js` en modules (monde, joueur, véhicules, magasin, interface).
- Sauvegarde et serveur pour jouer à deux sur la même terre, avec un journal de la ferme.
- Essence et usure des outils, aiguisage.
- Saisons, érablière, champs.
