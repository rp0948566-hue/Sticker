import React, { useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useCartStore } from '@/store/cartStore';

export const ProductDetail: React.FC = () => {
  const addToCart = useCartStore(state => state.addToCart);

  return (
    <>
      <Navbar />
      <main className="product-detail-page">
         <h1>Custom Vinyl Sticker</h1>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
};
