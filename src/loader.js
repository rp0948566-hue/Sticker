
// Global Loader & Telemetry Logic
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

    // Inject HTML if not already statically defined
    if (!document.getElementById('global-loader')) {
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    }
    document.body.classList.add('loader-active');

    const startTime = performance.now();
    const telemetry = {
        startTime,
        endTime: null,
        loaderDuration: null,
        assets: {},
        api: {},
        renderTime: null
    };

    const registeredPromises = [];
    let isFinished = false;

    function hideLoader() {
        if (isFinished) return;
        isFinished = true;
        
        telemetry.endTime = performance.now();
        telemetry.loaderDuration = telemetry.endTime - telemetry.startTime;
        console.log('[Telemetry] Loader completed in', telemetry.loaderDuration.toFixed(2), 'ms', telemetry);
        
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.add('loaded');
            document.body.classList.remove('loader-active');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 1000); // Wait for transition to finish
        }
    }

    // Expose GlobalPreloader API
    window.GlobalPreloader = {
        telemetry,
        register: function(promise, name = 'unnamed-task') {
            const taskStart = performance.now();
            const wrappedPromise = Promise.resolve(promise)
                .then(val => {
                    const duration = performance.now() - taskStart;
                    telemetry.assets[name] = duration;
                    return val;
                })
                .catch(err => {
                    const duration = performance.now() - taskStart;
                    telemetry.assets[name] = { error: err.message, duration };
                    return null;
                });
            registeredPromises.push(wrappedPromise);
            return wrappedPromise;
        },
        registerApi: function(promise, name = 'unnamed-api') {
            const taskStart = performance.now();
            const wrappedPromise = Promise.resolve(promise)
                .then(val => {
                    const duration = performance.now() - taskStart;
                    telemetry.api[name] = duration;
                    return val;
                })
                .catch(err => {
                    const duration = performance.now() - taskStart;
                    telemetry.api[name] = { error: err.message, duration };
                    return null;
                });
            registeredPromises.push(wrappedPromise);
            return wrappedPromise;
        },
        complete: async function() {
            const checkAndHide = async () => {
                const currentCount = registeredPromises.length;
                await Promise.all(registeredPromises);
                if (registeredPromises.length > currentCount) {
                    await checkAndHide();
                }
            };
            
            try {
                await checkAndHide();
            } catch (err) {
                console.error('[Preloader] Error waiting for assets:', err);
            } finally {
                hideLoader();
            }
        },
        getMetrics: function() {
            return telemetry;
        }
    };

    // Safety Fallback Timeout: 8 seconds (to prevent loader deadlock)
    setTimeout(() => {
        if (!isFinished) {
            console.warn('[Preloader] Safety timeout triggered after 8s');
            hideLoader();
        }
    }, 8000);
})();

