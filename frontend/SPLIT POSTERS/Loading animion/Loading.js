import './style.css';

export function getLoadingHTML() {
  return `
    <div class="tetrominos-wrapper" id="loading-animation" style="display: none;">
      <div class='tetrominos'>
        <div class='tetromino box1'></div>
        <div class='tetromino box2'></div>
        <div class='tetromino box3'></div>
        <div class='tetromino box4'></div>
      </div>
    </div>
  `;
}
