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
3. Récupère un fond minimaliste léger : les arrondissements de Paris (open data Ville de Paris) — donnent le contour de Paris + un repère de quartiers discret.
4. Produit dans `public/data/` :
   - `metro-lines.geojson` — tracés, une feature par segment avec propriétés `lineId` et `color`.
   - `metro-stations.geojson` — points stations dédupliqués, avec `name` et `lineIds` (tableau).
   - `paris-arrondissements.geojson` — fond de plan.
   - `lines.json` — métadonnées : `{ id, name, color, order }`.

**Sources IDFM/Paris (API Opendatasoft Explore v2.1, export GeoJSON) :**
- Tracés : `traces-du-reseau-ferre-idf` (champs `mode`, `indice_lig`, `colourweb_hexa`, filtre `mode="METRO"`).
- Stations : `emplacement-des-gares-idf` (champs `mode`, `indice_lig`, `nom_gares`, `id_ref_zdc`, `geo_point_2d`, filtre `mode="METRO"`).
- Fond : `arrondissements` sur `opendata.paris.fr`.

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

- **Fond** : couleur neutre + arrondissements de Paris (remplissage très clair + bordures discrètes, non interactif).
- **Tracés** : couche `line` de base (colorée par `color`) + couche `line` de surbrillance filtrée sur la ligne sélectionnée, dessinée au-dessus (trait épaissi, premier plan).
- **Surbrillance** : au clic (sur la légende **ou** sur un tracé) → `selectedLineId` est défini. La couche de base est **estompée** (opacité ~0.15) quand une ligne est sélectionnée ; la couche de surbrillance affiche la ligne active à pleine opacité au-dessus. Sans sélection, la base est à pleine opacité et la surbrillance vide. Re-cliquer la ligne active la désélectionne.
- **Stations** : couche `circle` de base + couche `circle` de surbrillance (stations de la ligne active), même logique d'estompage.
- **Labels stations** : rendus en **overlay HTML** (composant Vue) positionné via `map.project()` sur les évènements de déplacement/zoom — pas de couche `symbol`, donc **aucun serveur de glyphs** requis (100 % offline) et contrôle CSS total. Deux toggles :
  - « tous les noms » → affiche les labels de toutes les stations ;
  - « noms de la ligne sélectionnée » → affiche uniquement les labels des stations de la ligne active.

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
