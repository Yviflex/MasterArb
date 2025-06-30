# gridmap

Ce projet contient une implémentation d'une simulation de force dans l'optique de création d'une grid map.

Les données de départ se trouvent dans le dossier `public/data`. Le code pour la grid map ainsi que la simulation et les forces se trouvent dans `src/gridmap`.

La définition de la couche GeoJSON à utiliser pour la grid map se trouve dans `src/main.js`, tout comme le nom de l'attribut qui contient le nombre de cellules à occuper par le polygone. Il est préférable que la couche SIG utilisée possède un système de coordonnées projeté.

Pour faire tourner le projet:

```bash
cd dossier/du/projet
npm install
npm run dev
```

et ensuite la carte devient accessible à l'URL indiquée dans le Terminal.

La commande `npm install` n'est nécessaire que la seule fois ou après modification des dépendances.
