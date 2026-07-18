import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        home: resolve(__dirname, 'home.html'),
        notFound: resolve(__dirname, '404.html'),
        login: resolve(__dirname, 'frontend/Login Page/index.html'),
        customStickers: resolve(__dirname, 'frontend/CUSTOM STICKERS/index.html'),
        customStickersDetail: resolve(__dirname, 'frontend/CUSTOM STICKERS/product-detail.html'),
        card: resolve(__dirname, 'frontend/CARD/index.html'),
        accessories: resolve(__dirname, 'frontend/ACCESSORIES/index.html'),
        frame: resolve(__dirname, 'frontend/FRAME/FRAME/index.html'),
        a3Size: resolve(__dirname, 'frontend/A3 SIZE/index.html'),
        aesthetic: resolve(__dirname, 'frontend/AESTHETIC/index.html'),
        anime: resolve(__dirname, 'frontend/ANIME/index.html'),
        animeMini: resolve(__dirname, 'frontend/ANIME MINI/index.html'),
        newAnime: resolve(__dirname, 'frontend/NEW ANIME/index.html'),
        artistPrints: resolve(__dirname, 'frontend/ARTIST PRINTS/index.html'),
        cars: resolve(__dirname, 'frontend/CARS/index.html'),
        devotional: resolve(__dirname, 'frontend/DEVOTIONAL/index.html'),
        marvels: resolve(__dirname, 'frontend/MARVELS/index.html'),
        movies: resolve(__dirname, 'frontend/MOVIES/index.html'),
        pinkLavender: resolve(__dirname, 'frontend/PINK LAVENDER/index.html'),
        quotes: resolve(__dirname, 'frontend/QUOTES/index.html'),
        shinchan: resolve(__dirname, 'frontend/SHINCHAN/index.html'),
        songCover8x8: resolve(__dirname, 'frontend/SONG COVER 8X8/index.html'),
        songs: resolve(__dirname, 'frontend/SONGS/index.html'),
        splitArt: resolve(__dirname, 'frontend/SPLIT ART/index.html'),
        splitPosters: resolve(__dirname, 'frontend/SPLIT POSTERS/index.html'),
        sports: resolve(__dirname, 'frontend/SPORTS/index.html'),
        vanGogh: resolve(__dirname, 'frontend/VAN GOGH/index.html'),
        visionBoard: resolve(__dirname, 'frontend/VISION BOARD/index.html'),
        checkout: resolve(__dirname, 'order-system/frontend/checkout/index.html'),
        admin: resolve(__dirname, 'order-system/frontend/admin/index.html'),
        showcaseArea: resolve(__dirname, 'order-system/frontend/product-showcase-area/index.html'),
      },
    },
  },
});
