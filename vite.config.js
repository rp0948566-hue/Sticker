import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        home: resolve(__dirname, 'home.html'),
        notFound: resolve(__dirname, '404.html'),
        accessories: resolve(__dirname, 'frontend/ACCESSORIES/index.html'),
        cardSkins: resolve(__dirname, 'frontend/CARD SKINS/index.html'),
        customStickers: resolve(__dirname, 'frontend/CUSTOM STICKERS/index.html'),
        frame: resolve(__dirname, 'frontend/FRAME/FRAME/index.html'),
        login: resolve(__dirname, 'frontend/Glassmorphism Login Page/index.html'),
        macbookSkins: resolve(__dirname, 'frontend/MACBOOK SKINS/index.html'),
        checkout: resolve(__dirname, 'order-system/frontend/checkout/index.html'),
        admin: resolve(__dirname, 'order-system/frontend/admin/index.html'),
        showcaseArea: resolve(__dirname, 'order-system/frontend/product-showcase-area/index.html'),
      },
    },
  },
});
