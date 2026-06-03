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
        experienceMagic: resolve(__dirname, 'frontend/EXPERIENCE MAGIC/CUTE/index.html'),
        login: resolve(__dirname, 'frontend/Glassmorphism Login Page/index.html'),
        macbookSkins: resolve(__dirname, 'frontend/MACBOOK SKINS/index.html'),
        mysteryBox: resolve(__dirname, 'frontend/MYSTERY BOX/index.html'),
        productDetails: resolve(__dirname, 'product-details.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
