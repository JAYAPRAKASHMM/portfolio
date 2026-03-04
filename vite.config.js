import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples/jsm/postprocessing')) return 'three-post';
          if (id.includes('node_modules/three')) return 'three-core';
          if (id.includes('node_modules/gsap')) return 'gsap-core';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        }
      }
    }
  }
});
