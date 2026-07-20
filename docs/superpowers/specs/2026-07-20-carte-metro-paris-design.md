# Carte interactive du métro parisien — Design

**Date :** 2026-07-20
**Statut :** Validé

## Objectif

Une carte web interactive du réseau métro parisien, avec les **tracés géographiques réels** (et non schématiques), permettant à terme d'apprendre par cœur le réseau. La V1 se concentre sur l'**étude visuelle** :

- cliquer sur une ligne pour la mettre en surbrillance (les autres estompées) ;
- afficher/masquer les noms des stations (globalement ou pour la seule ligne sélectionnée).

## Stack & périmètre

- **Vue 3 + Vite + TypeScript**.
- **MapLibre GL JS** pour le rendu (vraie projection géo, zoom/pan WebGL, style 100 % custom).
- **Périmètre V1 : métro complet** — lignes 1 à 14 + 3bis + 7bis (16 lignes).
- **Données open data IDFM** (tracés + stations en GeoJSON), **téléchargées et bundlées** dans le projet → l'appli tourne 100 % offline, sans serveur de tuiles externe.
- Dossier projet : `/Users/pauldoazan/Projets/Perso/paris-metro-interactive` (dépôt git dédié).

## Données

### Script de préparation (`scripts/prepare-data.ts`)

Exécuté manuellement (au setup / lors d'une mise à jour des données). Il :

1. Télécharge les tracés ferrés IDFM, **filtre le mode = Métro**, conserve l'indice de ligne.
2. Télécharge les emplacements de gares IDFM, filtre métro, récupère nom + coordonnées.
3. Récupère un fond minimaliste léger : contour de Paris + la Seine (open data Ville de Paris).
4. Produit dans `public/data/` :
   - `metro-lines.geojson` — tracés, une feature par segment avec propriété `lineId`.
   - `metro-stations.geojson` — points stations avec `name` et `lineIds`.
   - `paris-outline.geojson` — contour de Paris (fond).
   - `seine.geojson` — la Seine (fond).
   - `lines.json` — métadonnées : `{ id, name, color, terminus[] }`.

### Couleurs

Les **couleurs officielles RATP** des 16 lignes sont figées dans un mapping en dur (`src/data/lineColors.ts`), utilisé comme source de vérité / fallback si la couleur est absente des données IDFM. Couleur manquante → gris de repli.

## Architecture front

### Composables (logique isolée et testable)

- `useMetroData.ts` — charge les GeoJSON + `lines.json`, expose données + états `loading`/`error`.
- `useMapController.ts` — encapsule l'instance MapLibre : setup des sources/layers, application de la surbrillance, toggles des labels.
- `useMapState.ts` — état réactif partagé : `selectedLineId`, `showAllLabels`, `showSelectedLineLabels`.

### Composants

- `App.vue` — layout : carte plein écran + panneau latéral.
- `MetroMap.vue` — conteneur MapLibre, orchestration (branche l'état sur le controller).
- `LineLegend.vue` — liste cliquable des 16 lignes (pastille couleur + numéro) ; reflète la sélection.
- `MapControls.vue` — boutons : afficher/masquer **tous** les noms ; afficher **seulement** les noms de la ligne sélectionnée ; réinitialiser la vue.

## Rendu & interactions (couches MapLibre)

- **Fond** : couleur neutre + Seine + contour de Paris (discrets, non interactifs).
- **Tracés** : une couche `line`, colorée par la propriété `color`/`lineId` de chaque feature.
- **Surbrillance** : au clic (sur la légende **ou** sur un tracé) → `selectedLineId` est défini. Les autres lignes sont **estompées** (opacité ~0.15) via une expression MapLibre pilotée par la sélection ; la ligne active passe au premier plan, trait épaissi. Sans sélection, toutes les lignes sont à pleine opacité.
- **Stations** : couche de points (dots).
- **Labels stations** : couches `symbol` (`text-field` = nom) :
  - toggle global → visibilité de la couche « tous les noms » ;
  - toggle « ligne sélectionnée » → couche filtrée n'affichant que les stations de la ligne active.

## Gestion d'erreurs

- Échec de chargement des données → état d'erreur affiché à l'utilisateur.
- Couleur de ligne manquante → gris de repli.
- WebGL indisponible → message clair.

## Tests

- **Vitest** sur les fonctions pures :
  - chargement / transformation des données (parsing `lines.json`, mapping couleurs, filtrage) ;
  - construction des expressions de surbrillance MapLibre à partir de `selectedLineId` ;
  - logique d'état de sélection et de visibilité des labels.
- Le rendu MapLibre lui-même n'est **pas** testé unitairement ; toute la logique décisionnelle est extraite dans des fonctions pures testables.

## Hors périmètre V1 (YAGNI)

- Modes quiz / mémorisation active (V2 — l'architecture est prévue pour les accueillir).
- RER / tram / correspondances détaillées.
- Fiche détail listant les stations d'une ligne dans le panneau (ajout V2 aisé).
