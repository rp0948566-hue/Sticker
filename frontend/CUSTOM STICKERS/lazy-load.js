import { getLoadingHTML } from './Loading animion/Loading.js';

const INITIAL_BATCH = 30;
const CHUNK_SIZE = 30;
let currentIndex = 0;
let isLoading = false;

export function initLazyLoad() {
  const grid = document.querySelector('.products-grid');
  if (!grid) return; // Only runs on the New Arrivals page

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

  // Show the first 39 cards immediately, then load 30 more at a time.
  showNextChunk(allCards, animationNode, INITIAL_BATCH);

  // Sentinel div at bottom triggers next load
  const sentinel = document.createElement('div');
  sentinel.id = 'lazy-sentinel';
  sentinel.style.height = '10px';
  // Place sentinel AFTER the loading animation
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
    const delay = (i - currentIndex) * 50; // stagger 50ms per card
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

  // Show loading animation
  animationNode.style.display = 'flex';

  // Exactly 3 seconds (3000ms) delay to show the gorgeous animation as requested
  const loadTime = 3000;

  setTimeout(() => {
    showNextChunk(allCards, animationNode, CHUNK_SIZE);
    isLoading = false;
  }, loadTime);
}
