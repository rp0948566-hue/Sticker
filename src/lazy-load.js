// Loading animation CSS is injected inline to avoid path issues with spaces in folder name
const ANIM_CSS = `
.tetrominos-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 0;
  width: 100%;
  transform: translateX(-15px);
}
.tetrominos {
  position: relative;
  width: 96px;
  height: 112px;
}
.tetromino {
  width: 96px;
  height: 112px;
  position: absolute;
  transition: all ease .3s;
  background: url('data:image/svg+xml;utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 684"%3E%3Cpath fill="%23010101" d="M305.7 0L0 170.9v342.3L305.7 684 612 513.2V170.9L305.7 0z"/%3E%3Cpath fill="%23fff" d="M305.7 80.1l-233.6 131 233.6 131 234.2-131-234.2-131"/%3E%3C/svg%3E') no-repeat top center;
}
.box1 { animation: tetromino1 1.5s ease-out infinite; }
.box2 { animation: tetromino2 1.5s ease-out infinite; }
.box3 { animation: tetromino3 1.5s ease-out infinite; z-index: 2; }
.box4 { animation: tetromino4 1.5s ease-out infinite; }
@keyframes tetromino1 {
  0%, 40% { transform: translate(0,0); }
  50% { transform: translate(48px, -27px); }
  60%, 100% { transform: translate(96px, 0); }
}
@keyframes tetromino2 {
  0%, 20% { transform: translate(96px, 0px); }
  40%, 100% { transform: translate(144px, 27px); }
}
@keyframes tetromino3 {
  0% { transform: translate(144px, 27px); }
  20%, 60% { transform: translate(96px, 54px); }
  90%, 100% { transform: translate(48px, 27px); }
}
@keyframes tetromino4 {
  0%, 60% { transform: translate(48px, 27px); }
  90%, 100% { transform: translate(0, 0); }
}
`;

// Inject CSS once
(function injectAnimCSS() {
  if (document.getElementById('lazy-anim-css')) return;
  const style = document.createElement('style');
  style.id = 'lazy-anim-css';
  style.textContent = ANIM_CSS;
  document.head.appendChild(style);
})();

const CHUNK_SIZE = 30;
let currentIndex = 0;
let isLoading = false;

function getLoadingHTML() {
  return `
    <div class="tetrominos-wrapper" id="lazy-loading-animation" style="display:none;">
      <div class='tetrominos'>
        <div class='tetromino box1'></div>
        <div class='tetromino box2'></div>
        <div class='tetromino box3'></div>
        <div class='tetromino box4'></div>
      </div>
    </div>
  `;
}

export function initLazyLoad() {
  const grid = document.getElementById('all-products-grid');
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

  // Show first 30 cards immediately (no loading delay for initial batch)
  showNextChunk(allCards, animationNode);

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

function showNextChunk(allCards, animationNode) {
  const total = allCards.length;
  const end = Math.min(currentIndex + CHUNK_SIZE, total);

  for (let i = currentIndex; i < end; i++) {
    allCards[i].style.display = '';
    const delay = (i - currentIndex) * 50; // stagger 50ms per card
    setTimeout(() => {
      allCards[i].style.opacity = '1';
      allCards[i].style.transform = 'translateY(0)';
    }, delay);
  }

  currentIndex = end;

  // Hide loading spinner when done loading
  if (animationNode) {
    animationNode.style.display = 'none';
  }
}

function triggerLoad(allCards, animationNode) {
  if (isLoading) return;
  isLoading = true;

  // Show loading animation
  animationNode.style.display = 'flex';

  // Random delay 0.5s–3s (max 3s as requested)
  const loadTime = Math.random() * 2500 + 500;

  setTimeout(() => {
    showNextChunk(allCards, animationNode);
    isLoading = false;
  }, loadTime);
}
