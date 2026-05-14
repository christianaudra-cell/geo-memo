# Geo Mémo

Geo Mémo est une application éducative React pour apprendre les pays du monde par continent. Elle combine fiches de révision, astuces mémoire, progression locale, quiz et carte interactive.

## Fonctionnalités

- Fiches pays classées par continent.
- Recherche par pays ou capitale.
- Astuces mémoire en français pour retenir l’emplacement des pays.
- Progression locale avec `localStorage` : `Je connais` et `À réviser`.
- Tableau de bord global avec barre de progression.
- Révision intelligente : pays à revoir, pays jamais étudiés, puis pays connus.
- Quiz classiques : continent, capitale, pays à partir d’une astuce.
- Quiz carte : cliquer près du pays demandé sur une carte.
- Carte interactive du monde avec Leaflet.

## Installation

```bash
npm install
```

## Lancement en local

```bash
npm run dev
```

L’application est ensuite disponible à l’adresse indiquée par Vite, généralement :

```text
http://localhost:5173/
```

## Vérification des données

Le projet contient un script qui vérifie :

- les champs obligatoires des pays ;
- les doublons ;
- les continents valides ;
- la présence d’une position de carte pour chaque pays.

```bash
npm run check:data
```

## Build de production

```bash
npm run build
```

Les fichiers de production sont générés dans le dossier `dist`.

## Technologies

- React
- Vite
- Leaflet
- React Leaflet

## Notes

L’application fonctionne sans backend. La progression est stockée uniquement dans le navigateur de l’utilisateur avec `localStorage`.
