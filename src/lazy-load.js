import { getLoadingHTML } from './Loading animion/Loading.js';
import { isDynamicPage } from './catalogue.js';

const INITIAL_BATCH = 30;
const CHUNK_SIZE = 30;
let currentIndex = 0;
let isLoading = false;

export function initLazyLoad() {
  if (isDynamicPage()) return;

  const grid = document.querySelector('.products-grid');
  // Skip if no grid or if it's a carousel (carousels handle their own display)
  if (!grid || grid.classList.contains('products-carousel')) {
    // If it's a carousel, just make sure cards are visible
    if (grid) {
      grid.querySelectorAll('.product-card').forEach(card => {
        card.style.display = '';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    }
    return;
  }

  // Get all product cards
  const allCards = Array.from(grid.querySelectorAll('.product-card'));
  const total = allCards.length;
  if (total === 0) return;

  // Reset state (in case of hot reload)
  currentIndex = 0;
  isLoading = false;

  // Hide all cards initially
  allCards.forEach(card => {
    card.style.display = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  });

  // Insert loading animation after the grid
  const loadingEl = document.createElement('div');
  loadingEl.innerHTML = getLoadingHTML();
  const animationNode = loadingEl.firstElementChild;
  grid.parentNode.insertBefore(animationNode, grid.nextSibling);

  // Show the first batch immediately
  showNextChunk(allCards, animationNode, INITIAL_BATCH);

  // Sentinel div at bottom triggers next load
  const sentinel = document.createElement('div');
  sentinel.id = 'lazy-sentinel';
  sentinel.style.height = '10px';
  animationNode.parentNode.insertBefore(sentinel, animationNode.nextSibling);

  // IntersectionObserver watches the sentinel
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isLoading && currentIndex < total) {
        triggerLoad(allCards, animationNode);
      }
    });
  }, {
    rootMargin: '0px 0px 200px 0px',
    threshold: 0
  });

  observer.observe(sentinel);
}

function showNextChunk(allCards, animationNode, batchSize = CHUNK_SIZE) {
  const total = allCards.length;
  const end = Math.min(currentIndex + batchSize, total);

  for (let i = currentIndex; i < end; i++) {
    allCards[i].style.display = '';
    const delay = (i - currentIndex) * 30; // Reduced stagger from 50ms to 30ms
    setTimeout(() => {
      allCards[i].style.opacity = '1';
      allCards[i].style.transform = 'translateY(0)';
    }, delay);
  }

  currentIndex = end;

  if (animationNode) {
    animationNode.style.display = currentIndex < total ? 'flex' : 'none';
  }
}

function triggerLoad(allCards, animationNode) {
  if (isLoading) return;
  isLoading = true;

  // Show loading animation briefly
  animationNode.style.display = 'flex';

  // Reduced delay from 3000ms to 400ms for a snappier feel
  const loadTime = 400;

  setTimeout(() => {
    showNextChunk(allCards, animationNode, CHUNK_SIZE);
    isLoading = false;
  }, loadTime);
}
