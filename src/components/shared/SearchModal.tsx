import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/models';

export const SearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const searchBtn = document.getElementById('search-btn');
    searchBtn?.addEventListener('click', handleOpen);
    return () => searchBtn?.removeEventListener('click', handleOpen);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const searchTimeout = setTimeout(() => {
      // Mock search mapping real product structures.
      // E.g. setResults([{ id: '1', title: 'Example', price: 99, image: '/IMAGE/1.png', category: 'MOVIES' }]);
    }, 300);
    return () => clearTimeout(searchTimeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div id="search-panel" className="search-panel active">
      <div className="search-panel-content">
        <div className="search-header">
          <input
            type="text"
            id="search-panel-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button id="search-panel-close" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="search-panel-results" className="search-results">
          {results.length > 0 ? (
            results.map((prod: any) => (
              <div key={prod.id} className="search-result-item" onClick={() => setIsOpen(false)}>
                <img src={prod.image} alt={prod.title} />
                <div className="search-result-info">
                  <div className="search-result-title">{prod.title}</div>
                  <div className="search-result-meta">{prod.category}</div>
                </div>
              </div>
            ))
          ) : query ? (
            <div className="no-results">No results found</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
