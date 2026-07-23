import React from 'react';
import { Product } from '@/types/models';
import { useCartStore } from '@/store/cartStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product, 1);
    document.getElementById('cart-drawer')?.classList.add('open');
  };

  return (
    <div className="product-card" data-category={product.category}>
      <div className="product-image-container">
        <img src={product.image} alt={product.title} className="product-image primary-image lazy" />
        {product.hoverImage && (
          <img src={product.hoverImage} alt={`${product.title} hover`} className="product-image hover-image lazy" />
        )}
        <div className="product-badges">
          {product.isNew && <span className="badge new">New</span>}
          {product.isBestSeller && <span className="badge bestseller">Best Seller</span>}
        </div>
        <button className="quick-view-btn" onClick={(e) => e.preventDefault()}>
          <i className="fa-solid fa-eye"></i>
        </button>
      </div>
      <div className="product-info">
        <h3 className="product-title">{product.title}</h3>
        <div className="product-price-row">
          <span className="price">Rs. {product.price.toFixed(2)}</span>
          {product.compareAtPrice && <span className="compare-price">Rs. {product.compareAtPrice.toFixed(2)}</span>}
        </div>
        <button className="add-to-cart-btn" onClick={handleAddToCart}>
          Add to Cart <i className="fa-solid fa-cart-shopping"></i>
        </button>
      </div>
    </div>
  );
};
