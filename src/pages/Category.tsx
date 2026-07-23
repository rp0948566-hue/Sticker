import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ProductCard } from '@/components/product/ProductCard';
import { Product } from '@/types/models';

export const Category: React.FC = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [categoryName]);

  return (
    <>
      <Navbar />
      <main className="category-page">
        <header className="category-header">
          <h1>{categoryName?.replace('-', ' ').toUpperCase()}</h1>
        </header>
        <section className="product-grid" id="product-grid">
          {loading ? (
             <div className="loading-spinner">Loading...</div>
          ) : (
            products.map((p: any) => <ProductCard key={p.id} product={p} />)
          )}
        </section>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
};
