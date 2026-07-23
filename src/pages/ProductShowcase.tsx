import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Product } from '@/types/models';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';

export const ProductShowcase: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <>
      <Navbar />
      <main className="showcase-area">
        <h1>Product Showcase</h1>
        {loading ? (
           <div>Loading...</div>
        ) : (
           <div className="showcase-grid">
              <p>Showcase products will appear here.</p>
           </div>
        )}
      </main>
      <Footer />
    </>
  );
};
