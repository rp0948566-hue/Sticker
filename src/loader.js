
// Global Loader Logic
(function() {
    const loaderHTML = `
        <div id="global-loader" class="loader-container">
            <div class="loader-wrapper">
                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <circle id="test" cx="40" cy="40" r="32"></circle>
                    </svg>
                </div>
                <div class="loader triangle">
                    <svg viewBox="0 0 86 80">
                        <polygon points="43 8 79 72 7 72"></polygon>
                    </svg>
                </div>
                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <rect x="8" y="8" width="64" height="64"></rect>
                    </svg>
                </div>
            </div>
        </div>
    `;

    function initLoader() {
        // Inject HTML if not already present
        if (!document.getElementById('global-loader')) {
            document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        }
        document.body.classList.add('loader-active');

        // Function to hide loader
        function hideLoader() {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.add('loaded');
                document.body.classList.remove('loader-active');
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 1000); // Wait for transition to finish
            }
        }

        // Hide loader immediately on load
        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', () => {
                hideLoader();
            });
            // Fallback if window load takes too long (max 800ms)
            setTimeout(hideLoader, 800);
        }
    }

    // Wait for the DOM to be ready before running to avoid duplicate injection
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoader);
    } else {
        initLoader();
    }
})();

