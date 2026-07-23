import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-area">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Classic Cult</h3>
          <p>Premium vinyl stickers, laptop skins, and accessories.</p>
        </div>
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/home">Home</Link></li>
            <li><Link to="/frontend/ANIME/index.html">Anime</Link></li>
            <li><Link to="/frontend/MOVIES/index.html">Movies</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Classic Cult. All rights reserved.</p>
      </div>
    </footer>
  );
};
