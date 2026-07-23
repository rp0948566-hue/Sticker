import React from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { SearchModal } from '@/components/shared/SearchModal';

export const Home: React.FC = () => {
  return (
    <>
      <Navbar />
      <SearchModal />
      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>Premium Vinyl Stickers</h1>
            <p>Express yourself with our collection.</p>
          </div>
        </section>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
};
