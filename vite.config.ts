import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Déployé sur GitHub Pages (projet) : https://pauldoazan.github.io/interactive-paris-map/
// - `base` doit correspondre au nom du dépôt pour que les assets se résolvent.
// - le build est écrit dans `docs/` (source du déploiement Pages « main / docs »).
export default defineConfig({
  base: '/interactive-paris-map/',
  plugins: [vue()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
