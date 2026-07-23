import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { Checkout } from '@/pages/Checkout';
import { Category } from '@/pages/Category';
import { Admin } from '@/pages/Admin';
import { ProductDetail } from '@/pages/ProductDetail';
import { ProductShowcase } from '@/pages/ProductShowcase';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home.html" element={<Home />} />

        <Route path="/order-system/frontend/checkout/index.html" element={<Checkout />} />
        <Route path="/order-system/frontend/admin/index.html" element={<Admin />} />
        <Route path="/order-system/frontend/product-showcase-area/index.html" element={<ProductShowcase />} />

        <Route path="/frontend/CUSTOM STICKERS/product-detail.html" element={<ProductDetail />} />

        <Route path="/frontend/:categoryName/index.html" element={<Category />} />
        <Route path="/frontend/:categoryName/" element={<Category />} />

        <Route path="/frontend/Login Page/index.html" element={<Home />} />
        <Route path="/frontend/Login Page/" element={<Home />} />

        <Route path="/404.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
