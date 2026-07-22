# Métro de Paris — carte interactive

Carte web des tracés géographiques réels des 16 lignes du métro parisien
(1–14, 3bis, 7bis), pour apprendre le réseau : surbrillance d'une ligne au
clic, affichage/masquage des noms de stations.

## Stack

Vue 3 + Vite + TypeScript, MapLibre GL JS. Données open data IDFM / Ville de
Paris, bundlées dans `public/data/` (aucun appel réseau au runtime).

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm test         # tests unitaires (Vitest)
npm run build    # build de production (sortie dans docs/)
```

## Déploiement (GitHub Pages)

`npm run build` écrit le site dans `docs/` (avec `base: /interactive-paris-map/`
et un `.nojekyll`). Le déploiement se fait depuis ce dossier :

1. Régénérer le build : `npm run build`, puis commiter le contenu de `docs/`.
2. Dans les réglages du dépôt GitHub → **Pages** → *Build and deployment* →
   *Source: Deploy from a branch* → **Branch: `main` / `docs`**.

Le site est alors servi sur `https://pauldoazan.github.io/interactive-paris-map/`.
Après chaque changement de code ou de données, rebuilder et recommiter `docs/`.

## Mise à jour des données

Les fichiers de `public/data/` sont générés (et commités). Pour les régénérer
depuis les sources open data :

```bash
npm run data:prep
```

Sources :
- Tracés & stations : Open Data Île-de-France Mobilités
- Fond de plan : Open Data Ville de Paris (arrondissements)
