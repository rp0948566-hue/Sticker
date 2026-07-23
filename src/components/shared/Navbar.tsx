import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartCount = useCartStore(state => state.getCartCount());

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      document.documentElement.classList.add('menu-open');
      document.body.classList.add('menu-open');
    } else {
      document.documentElement.classList.remove('menu-open');
      document.body.classList.remove('menu-open');
    }
  };

  return (
    <>
      <nav id="navbar">
        <div className="nav-wrapper">
          <div className="nav-left">
            <button className="mobile-menu-btn" aria-label="Menu" onClick={toggleMobileMenu}>
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="nav-links">
              <Link to="/home">Home</Link>
              <div className="dropdown">
                <span>Collections <i className="fa-solid fa-chevron-down"></i></span>
                <div className="dropdown-content">
                  <Link to="/frontend/MOVIES/index.html">Movies</Link>
                  <Link to="/frontend/ANIME/index.html">Anime</Link>
                  <Link to="/frontend/SPORTS/index.html">Sports</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="nav-center">
            <Link to="/home" className="logo-link">
              <img src="/classic-cult-logo-cropped.png" alt="Classic Cult" className="logo-img" />
            </Link>
          </div>

          <div className="nav-right">
            <button id="search-btn" className="icon-btn" aria-label="Search">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <button id="cart-btn" className="icon-btn" aria-label="Cart" onClick={() => {
                document.getElementById('cart-drawer')?.classList.add('open');
            }}>
              <i className="fa-solid fa-bag-shopping"></i>
              <span id="cart-badge" style={{ display: cartCount > 0 ? 'flex' : 'none' }}>{cartCount}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
