import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite build configuration with chunk splitting optimization
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid-community')) {
            return 'ag-grid-community';
          }
          if (id.includes('ag-grid-react')) {
            return 'ag-grid-react';
          }
          if (id.includes('@paypal/react-paypal-js')) {
            return 'paypal-react';
          }
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
        }
      }
    }
  }
});
