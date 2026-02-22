(function () {

    'use strict';

    // Performance Monitor
    const performanceMonitor = {
        startTime: performance.now(),
        marks: new Map(),

        mark(name) {
            this.marks.set(name, performance.now());
            // console.log(`⏱️ ${name}: ${performance.now() - this.startTime}ms`);
        },

        measure(from, to) {
            const start = this.marks.get(from);
            const end = this.marks.get(to);
            if (start && end) {
                // console.log(`📊 ${from} -> ${to}: ${end - start}ms`);
            }
        }
    };

    performanceMonitor.mark('script_start');

    // Configuration
    const CONFIG = {
        loading: {
            minDisplayTime: 800,
            maxDisplayTime: 4000,
            progressStep: 20
        },
        animations: {
            scrollThrottle: 16,
            intersectionThreshold: 0.08,
            staggerDelay: 80
        },
        particles: {
            count: {
                desktop: 40,
                mobile: 20
            },
            stars: {
                desktop: 40,
                mobile: 20
            }
        }
    };

    // State management
    const AppState = {
        isInitialized: false,
        isMobile: window.innerWidth <= 768,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        currentTheme: localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
        activeSection: '',
        scrollListeners: new Set()
    };

    // Utility functions
    const Utils = {
        // Throttle function for performance
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Debounce function
        debounce(func, wait, immediate) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func.apply(this, args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(this, args);
            };
        },

        // Smooth scroll with easing
        smoothScrollTo(target, duration = 800) {
            if (!target) return;

            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            let startTime = null;

            function animation(currentTime) {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const progress = Math.min(timeElapsed / duration, 1);

                // Easing function (easeInOutCubic)
                const ease = progress < 0.5 ?
                    4 * progress * progress * progress :
                    1 - Math.pow(-2 * progress + 2, 3) / 2;

                window.scrollTo(0, startPosition + distance * ease);

                if (timeElapsed < duration) {
                    requestAnimationFrame(animation);
                }
            }
            requestAnimationFrame(animation);
        },

        // Check if element is in viewport
        isInViewport(element, threshold = 0) {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            return (
                rect.top <= windowHeight * (1 - threshold) &&
                rect.bottom >= windowHeight * threshold
            );
        },

        // Generate random number in range
        random(min, max) {
            return Math.random() * (max - min) + min;
        },

        // Escape HTML for security
        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    };

    // Loading Manager
    class LoadingManager {
        constructor() {
            this.loadingScreen = document.getElementById('loadingScreen');
            this.progressBar = document.getElementById('progressBar');
            this.loadingPercentage = document.getElementById('loadingPercentage');
            this.progress = 0;
            this.startTime = performance.now();
            this.minDisplayTime = 10000; // Strictly 10 seconds
            this.maxDisplayTime = 12000; // Max fallback
            this.loadingMessages = [
                "✨ If You Want To Know Me — Hold On, It's Coming. ✨",
                "🎨 Crafting something special for you...",
                "⚡ Almost there, preparing the magic...",
                "🌟 Good things take time, including this..."
            ];
            this.currentMessageIndex = 0;
            this.isHidden = false;
            this.forceHideTimeout = null;
        }

        async init() {
            if (!this.loadingScreen) {
                console.error('Loading screen element not found');
                return;
            }

            // Set up force hide as last resort
            this.setupForceHide();

            try {
                // Start loading simulation immediately
                await this.simulateLoadingProgress();

                // Wait for window load OR timeout
                await Promise.race([
                    this.waitForCriticalAssets(),
                    this.timeoutPromise(3000) // Max 3 seconds wait
                ]);

                // Ensure minimum display time
                const elapsed = performance.now() - this.startTime;
                const remaining = Math.max(0, this.minDisplayTime - elapsed);

                if (remaining > 0) {
                    await this.delay(remaining);
                }

                // Hide loading screen
                await this.hideLoadingScreen();

            } catch (error) {
                console.warn('Loading screen error:', error);
                this.forceHide();
            }
        }

        setupForceHide() {
            // Force hide after 12 seconds max
            this.forceHideTimeout = setTimeout(() => {
                if (!this.isHidden) {
                    console.warn('Force hiding loading screen after timeout');
                    this.forceHide();
                }
            }, 12000);

            // Add global escape hatch for debugging
            // window.forceHideLoading = () => this.forceHide();
        }

        timeoutPromise(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        waitForCriticalAssets() {
            return new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                    return;
                }

                const onLoad = () => {
                    window.removeEventListener('load', onLoad);
                    resolve();
                };

                window.addEventListener('load', onLoad);

                // Also check if DOM is ready
                if (document.readyState === 'interactive' || document.readyState === 'complete') {
                    resolve();
                }
            });
        }

        simulateLoadingProgress() {
            return new Promise((resolve) => {
                let lastProgress = 0;

                const updateProgress = () => {
                    if (this.progress >= 100) {
                        resolve();
                        return;
                    }

                    // Optimized progress simulation for 10s duration
                    let increment;
                    if (this.progress < 30) {
                        increment = 0.5; // Slow initial progress (60 steps @ 50ms = 3s)
                    } else if (this.progress < 70) {
                        increment = 0.4; // Steady speed (100 steps @ 50ms = 5s)
                    } else if (this.progress < 90) {
                        increment = 0.5; // (40 steps @ 50ms = 2s)
                    } else {
                        increment = 0.2; // Finishing touches
                    }

                    this.progress = Math.min(this.progress + increment, 100);
                    this.updateProgressElements();

                    // Change message at intervals
                    if (this.progress - lastProgress >= 25) {
                        lastProgress = this.progress;
                        this.currentMessageIndex = Math.min(
                            this.currentMessageIndex + 1,
                            this.loadingMessages.length - 1
                        );
                        this.updateMessage();
                    }

                    // Consistent delay for smoother 10s animation
                    const delay = 50;
                    setTimeout(updateProgress, delay);
                };

                // Start with initial message
                this.updateMessage();
                setTimeout(updateProgress, 100);
            });
        }

        updateProgressElements() {
            if (this.progressBar) {
                this.progressBar.style.width = `${this.progress}%`;
            }
            if (this.loadingPercentage) {
                this.loadingPercentage.innerHTML = `
                <span style="font-size: 1.2em; margin-bottom: 10px; display: block;">
                    ${Math.floor(this.progress)}%
                </span>
                <div style="font-size: 0.9em; opacity: 0.8;">
                    ${this.loadingMessages[this.currentMessageIndex]}
                </div>`;
            }
        }

        updateMessage() {
            if (this.loadingPercentage) {
                const percentageEl = this.loadingPercentage.querySelector('span');
                const messageEl = this.loadingPercentage.querySelector('div');

                if (percentageEl && messageEl) {
                    // Keep percentage animation smooth
                    percentageEl.style.transition = 'opacity 0.3s';
                    messageEl.style.transition = 'opacity 0.3s';

                    // Fade out
                    percentageEl.style.opacity = '0.5';
                    messageEl.style.opacity = '0.5';

                    setTimeout(() => {
                        percentageEl.textContent = `${Math.floor(this.progress)}%`;
                        messageEl.textContent = this.loadingMessages[this.currentMessageIndex];

                        // Fade in
                        percentageEl.style.opacity = '1';
                        messageEl.style.opacity = '1';
                    }, 150);
                }
            }
        }

        async hideLoadingScreen() {
            if (this.isHidden) return;

            // Clear force hide timeout
            if (this.forceHideTimeout) {
                clearTimeout(this.forceHideTimeout);
                this.forceHideTimeout = null;
            }

            // Final message
            if (this.loadingPercentage) {
                this.loadingPercentage.innerHTML = `
                <span style="font-size: 1.2em; display: block; animation: bounce 0.5s;">
                    100%
                </span>
                <div style="font-size: 0.9em; opacity: 0.8; margin-top: 10px;">
                    🎉 Ready! Here we go... 🎉
                </div>`;
            }

            // Wait a moment to show completion
            await this.delay(500);

            // Fade out animation
            if (this.loadingScreen) {
                this.loadingScreen.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
                this.loadingScreen.style.opacity = '0';
                this.loadingScreen.style.visibility = 'hidden';

                // Mark as hidden
                this.isHidden = true;

                // Remove from DOM after transition
                setTimeout(() => {
                    if (this.loadingScreen && this.loadingScreen.parentNode) {
                        try {
                            this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                        } catch (e) {
                            // Fallback: just hide it
                            this.loadingScreen.style.display = 'none';
                        }
                    }
                }, 600);

                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('loadingComplete'));
            }
        }

        forceHide() {
            if (this.isHidden) return;

            // console.log('Force hiding loading screen');

            if (this.forceHideTimeout) {
                clearTimeout(this.forceHideTimeout);
                this.forceHideTimeout = null;
            }

            if (this.loadingScreen) {
                this.loadingScreen.style.transition = 'none';
                this.loadingScreen.style.opacity = '0';
                this.loadingScreen.style.visibility = 'hidden';
                this.loadingScreen.style.display = 'none';

                // Try to remove from DOM
                setTimeout(() => {
                    if (this.loadingScreen && this.loadingScreen.parentNode) {
                        try {
                            this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }, 100);
            }

            this.isHidden = true;

            // Dispatch event
            window.dispatchEvent(new CustomEvent('loadingForced'));
        }
    }

    // Main initialization with better error handling
    const initLoadingManager = () => {
        try {
            // Check if we should skip loading (for development/debugging)
            const skipLoading = localStorage.getItem('skipLoading') === 'true' ||
                window.location.search.includes('skipLoading');

            if (skipLoading) {
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    // console.log('Skipped loading screen');
                }
                return;
            }

            const loadingManager = new LoadingManager();
            window.loadingManager = loadingManager; // Expose for debugging

            // Start loading manager with timeout protection
            const initPromise = loadingManager.init();

            // Add timeout for initialization itself
            setTimeout(() => {
                if (!loadingManager.isHidden) {
                    console.warn('Loading manager initialization timeout - forcing hide');
                    loadingManager.forceHide();
                }
            }, 12000); // 12 second max for everything

        } catch (error) {
            console.error('Failed to initialize loading manager:', error);

            // Emergency hide
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoadingManager);
    } else {
        initLoadingManager();
    }

    // Background Effects Manager
    class BackgroundEffects {
        constructor() {
            this.particlesContainer = document.getElementById('particles');
            this.fallingStarsContainer = document.getElementById('fallingStars');
            this.animatedBackground = document.querySelector('.animated-background');

            this.init();

            if (!AppState.isMobile) {
                this.initCursorInteractions();
            }
        }

        init() {
            if (AppState.prefersReducedMotion) return;

            this.createParticles();
            this.createFallingStars();
            this.optimizeForDevices();
        }

        initCursorInteractions() {
            let lastX = 0;
            let lastY = 0;
            let lastTime = 0;

            window.addEventListener('mousemove', (e) => {
                const x = e.clientX;
                const y = e.clientY;
                const now = Date.now();

                // Update dynamic background gradient
                if (this.animatedBackground) {
                    const xPct = (x / window.innerWidth) * 100;
                    const yPct = (y / window.innerHeight) * 100;
                    this.animatedBackground.style.setProperty('--mouse-x', `${xPct}%`);
                    this.animatedBackground.style.setProperty('--mouse-y', `${yPct}%`);
                }

                // Create star trail (throttle creation)
                if (now - lastTime > 100) { // Limit to every 100ms
                    this.createCursorTrail(x, y);
                    lastTime = now;
                }
            });
        }

        createCursorTrail(x, y) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.left = `${x}px`;
            trail.style.top = `${y}px`;

            // Randomize size slightly
            const size = Math.random() * 3 + 2;
            trail.style.width = `${size}px`;
            trail.style.height = `${size}px`;

            document.body.appendChild(trail);

            // Remove after animation
            setTimeout(() => {
                trail.remove();
            }, 1000);
        }

        createParticles() {
            if (!this.particlesContainer) return;

            const particleCount = AppState.isMobile ?
                CONFIG.particles.count.mobile :
                CONFIG.particles.count.desktop;

            for (let i = 0; i < particleCount; i++) {
                this.createParticle();
            }
        }

        createParticle() {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random positioning and animation properties
            const size = Utils.random(2, 5);
            const startLeft = Utils.random(0, 100);
            const duration = Utils.random(15, 25);
            const delay = Utils.random(0, 10);

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${startLeft}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `-${delay}s`; // Negative delay to start mid-animation

            this.particlesContainer.appendChild(particle);
        }

        createFallingStars() {
            if (!this.fallingStarsContainer) return;

            // Create falling stars periodically
            const createStar = () => {
                this.createFallingStar();

                // Random interval for next star
                const nextStarDelay = Utils.random(500, 1500);
                setTimeout(createStar, nextStarDelay);
            };

            createStar();
        }

        createFallingStar() {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.willChange = 'transform, opacity';

            // Random start position
            const startX = Utils.random(0, window.innerWidth);
            const duration = Utils.random(0.5, 1.5);

            star.style.left = `${startX}px`;
            star.style.animationDuration = `${duration}s`;

            // Random vibrant color
            const colors = [
                'var(--primary)', 'var(--accent-1)', 'var(--accent-2)',
                'var(--accent-3)', '#ff00ff', '#00ffff', '#ffff00'
            ];
            star.style.background = colors[Math.floor(Math.random() * colors.length)];

            // Random size
            const size = Utils.random(2, 5);
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;

            this.fallingStarsContainer.appendChild(star);

            // Remove after animation
            setTimeout(() => {
                if (star.parentNode) {
                    star.parentNode.removeChild(star);
                }
            }, duration * 1000);
        }

        optimizeForDevices() {
            // Reduce effects on low power mode or mobile
            if (AppState.isMobile) {
                // Logic to reduce load
            }
        }
    }




    // Navigation Manager - Enhanced with Sliding Pill & Magnetic Physics
    class NavigationManager {
        constructor() {
            this.sectionNav = document.getElementById('sectionNav');
            this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
            this.mainNav = document.getElementById('mainNav');
            this.themeToggle = document.getElementById('themeToggle');
            this.backToTop = document.getElementById('backToTop');
            this.navIndicator = document.querySelector('.nav-indicator');
            this.navLinks = document.querySelectorAll('.nav-link');

            // Close mobile menu when clicking links & Magnetic Effect
            this.navLinks.forEach(link => {
                link.addEventListener('click', this.closeMobileMenu.bind(this));

                // Sliding Pill
                link.addEventListener('mouseenter', (e) => this.moveIndicator(e.target));

                // Magnetic Effect
                if (!AppState.isMobile) {
                    link.addEventListener('mousemove', (e) => this.magneticEffect(e, link));
                    link.addEventListener('mouseleave', (e) => this.resetMagnetic(e, link));
                }
            });

            // Reset indicator when leaving nav
            this.mainNav.addEventListener('mouseleave', () => {
                this.resetIndicator();
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.mainNav.classList.contains('active') &&
                    !this.mainNav.contains(e.target) &&
                    !this.mobileMenuToggle.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
        }

        init() {
            this.initMobileMenu();
            this.initThemeToggle();
            this.initBackToTop();
            this.initHeaderScrollEffect();
            this.initActiveSectionObserver();

            // Initial indicator position
            setTimeout(() => this.resetIndicator(), 100);
        }

        magneticEffect(e, link) {
            const rect = link.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            // Magnetic pull strength (lower = stranger)
            link.style.transform = `translate(${x * 0.3}px, ${y * 0.5}px)`;
        }

        resetMagnetic(e, link) {
            link.style.transform = 'translate(0px, 0px)';
        }

        moveIndicator(targetElement) {
            if (!this.navIndicator || !targetElement) return;

            const rect = targetElement.getBoundingClientRect();
            const navRect = this.mainNav.getBoundingClientRect();

            this.navIndicator.style.width = `${rect.width}px`;
            this.navIndicator.style.left = `${rect.left - navRect.left}px`;
            this.navIndicator.style.opacity = '1';
        }

        resetIndicator() {
            const activeLink = document.querySelector('.nav-link.active');
            if (activeLink) {
                this.moveIndicator(activeLink);
            } else {
                // If no active link, hide indicator
                if (this.navIndicator) this.navIndicator.style.opacity = '0';
            }
        }

        initMobileMenu() {
            if (this.mobileMenuToggle) {
                this.mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
            }
        }

        initActiveSectionObserver() {
            const observerOptions = {
                root: null,
                threshold: 0.3,
                rootMargin: "-10% 0px -10% 0px"
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.setActiveSection(entry.target.id);
                    }
                });
            }, observerOptions);

            document.querySelectorAll('section[id]').forEach(section => {
                observer.observe(section);
            });
        }

        setActiveSection(sectionId) {
            this.navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href === `#${sectionId}`) {
                    link.classList.add('active');
                    // Move indicator to new active link
                    this.moveIndicator(link);
                } else {
                    link.classList.remove('active');
                }
            });

            document.querySelectorAll('.section-dot').forEach(dot => {
                if (dot.getAttribute('data-section') === sectionId) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        toggleMobileMenu() {
            this.mainNav.classList.toggle('active');
            this.mobileMenuToggle.classList.toggle('active');

            const icon = this.mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !this.mainNav.classList.contains('active'));
                icon.classList.toggle('fa-times', this.mainNav.classList.contains('active'));
            }
        }

        closeMobileMenu() {
            this.mainNav.classList.remove('active');
            this.mobileMenuToggle.classList.remove('active');

            const icon = this.mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }

        initThemeToggle() {
            if (!this.themeToggle) return;

            // Apply initial theme based on AppState
            if (AppState.currentTheme === 'dark') {
                document.body.classList.add('dark-theme');
                this.updateThemeIcon('sun');
            } else {
                document.body.classList.remove('dark-theme');
                this.updateThemeIcon('moon');
            }

            this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }

        toggleTheme() {
            document.body.classList.toggle('dark-theme');

            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
                this.updateThemeIcon('sun');
            } else {
                localStorage.setItem('theme', 'light');
                this.updateThemeIcon('moon');
            }
        }

        updateThemeIcon(iconName) {
            const themeIcon = this.themeToggle?.querySelector('i');
            if (!themeIcon) return;

            themeIcon.classList.remove('fa-moon', 'fa-sun');
            themeIcon.classList.add(`fa-${iconName}`);
        }

        initBackToTop() {
            if (!this.backToTop) return;

            const updateBackToTop = Utils.throttle(() => {
                this.backToTop.classList.toggle('visible', window.pageYOffset > 300);
            }, CONFIG.animations.scrollThrottle);

            window.addEventListener('scroll', updateBackToTop);
            AppState.scrollListeners.add(updateBackToTop);

            // Scroll to top when clicked
            this.backToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        initHeaderScrollEffect() {
            const header = document.querySelector('header');
            if (!header) return;

            const updateHeader = Utils.throttle(() => {
                header.classList.toggle('scrolled', window.scrollY > 50);
            }, CONFIG.animations.scrollThrottle);

            window.addEventListener('scroll', updateHeader);
            AppState.scrollListeners.add(updateHeader);
        }
    }

    // Animation Manager
    class AnimationManager {
        constructor() {
            this.observer = null;
        }

        init() {
            this.initScrollIndicator();
            this.initIntersectionObserver();
        }

        initScrollIndicator() {
            const scrollIndicator = document.getElementById('scrollIndicator');
            if (!scrollIndicator) return;

            const updateScrollIndicator = Utils.throttle(() => {
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;

                scrollIndicator.style.width = `${scrollPercent}%`;
            }, CONFIG.animations.scrollThrottle);

            window.addEventListener('scroll', updateScrollIndicator, { passive: true });
            AppState.scrollListeners.add(updateScrollIndicator);
        }

        initIntersectionObserver() {
            if (AppState.prefersReducedMotion) return;

            const observerOptions = {
                threshold: CONFIG.animations.intersectionThreshold,
                rootMargin: '0px 0px -40px 0px'
            };

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElement(entry.target);
                    }
                });
            }, observerOptions);

            this.setupAnimationElements();
        }

        setupAnimationElements() {
            // Fade-in elements
            const fadeElements = document.querySelectorAll('.fade-in');
            fadeElements.forEach(el => {
                this.setInitialAnimationState(el);
                this.observer?.observe(el);
            });

            // Stagger children elements
            const staggerParents = document.querySelectorAll('.stagger-animation');
            staggerParents.forEach(parent => {
                Array.from(parent.children).forEach(child => {
                    this.setInitialAnimationState(child);
                });
                this.observer?.observe(parent);
            });

            // Skill Bars
            const skillBars = document.querySelectorAll('.skill-progress');
            skillBars.forEach(bar => {
                this.observer?.observe(bar);
            });
        }

        setInitialAnimationState(element) {
            Object.assign(element.style, {
                opacity: '0',
                transform: 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease'
            });
        }

        animateElement(element) {
            if (element.classList.contains('skill-progress')) {
                const width = element.getAttribute('data-width');
                element.style.width = width;
                element.style.transition = 'width 1.5s ease-out';
                return;
            }

            if (element.classList.contains('fade-in')) {
                Object.assign(element.style, {
                    opacity: '1',
                    transform: 'translateY(0)'
                });
            }

            if (element.classList.contains('stagger-animation')) {
                Array.from(element.children).forEach((child, index) => {
                    setTimeout(() => {
                        Object.assign(child.style, {
                            opacity: '1',
                            transform: 'translateY(0)'
                        });
                    }, index * CONFIG.animations.staggerDelay);
                });
            }
        }
    }

    // Interactive Elements Manager
    class InteractiveElementsManager {
        constructor() {
            this.chatWidget = document.getElementById('chatWidget');
            this.chatBox = document.getElementById('chatBox');
            this.caseStudyModal = document.getElementById('caseStudyModal');
        }

        init() {
            this.initChatWidget();
            this.initProjectFilters();
            this.initCaseStudies();
            this.initInteractiveCards();
            this.initContactForm();
        }

        initContactForm() {
            const form = document.getElementById('contactForm');
            if (!form) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const originalContent = btn.innerHTML;

                // Loading state
                btn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Sending...</span>';
                btn.disabled = true;
                btn.style.opacity = '0.8';

                // Simulate request
                setTimeout(() => {
                    btn.innerHTML = '<span><i class="fas fa-check"></i> Sent!</span>';
                    btn.style.backgroundColor = '#00C851';
                    btn.style.borderColor = '#00C851';

                    // Reset form
                    form.reset();

                    // Visual feedback for form
                    const container = form.closest('.contact-form-container');
                    if (container) {
                        container.style.boxShadow = '0 0 20px rgba(0, 200, 81, 0.3)';
                        setTimeout(() => {
                            container.style.boxShadow = '';
                        }, 2000);
                    }

                    // Reset button after delay
                    setTimeout(() => {
                        btn.innerHTML = originalContent;
                        btn.disabled = false;
                        btn.style.backgroundColor = '';
                        btn.style.borderColor = '';
                        btn.style.opacity = '1';
                    }, 3000);
                }, 1500);
            });
        }

        initInteractiveCards() {
            document.querySelectorAll('.interactive-card').forEach(card => {
                if (AppState.isMobile) return;

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -10;
                    const rotateY = ((x - centerX) / centerX) * 10;

                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                    card.style.transition = 'transform 0.1s ease';
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
                    card.style.transition = 'transform 0.5s ease';
                });
            });
        }

        initChatWidget() {
            if (!this.chatWidget || !this.chatBox) return;

            const chatMessages = document.getElementById('chatMessages');
            const closeChat = document.getElementById('closeChat');
            const chatInput = document.getElementById('chatInput');

            // Add initial greeting message
            let hasGreeted = false;

            this.chatWidget.addEventListener('click', () => {
                this.chatBox.classList.toggle('active');
                if (this.chatBox.classList.contains('active')) {
                    setTimeout(() => chatInput?.focus(), 300);

                    // Show welcome message on first open
                    if (!hasGreeted && chatMessages.children.length === 0) {
                        hasGreeted = true;
                        this.addBotMessage(chatMessages, "Hi! 👋 I'm Sarthak's AI assistant. Feel free to ask me anything about Sarthak's skills, projects, or experience!");
                    }
                }
            });

            closeChat?.addEventListener('click', () => {
                this.chatBox.classList.remove('active');
            });

            chatInput?.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const message = chatInput.value.trim();

                    // Input validation
                    if (!message) return;
                    if (message.length > 1000) {
                        console.warn('Message too long. Please keep it under 1000 characters.');
                        return;
                    }

                    // Add user message
                    this.addUserMessage(chatMessages, message);
                    chatInput.value = '';

                    // Visual loading state
                    const loadingId = 'loading-' + Date.now();
                    this.addBotMessage(chatMessages, 'Thinking...', loadingId);

                    try {
                        const response = await this.callGeminiAPI(message);
                        const loadingEl = document.getElementById(loadingId);
                        if (loadingEl) loadingEl.remove();
                        this.addBotMessage(chatMessages, response);
                    } catch (error) {
                        console.error('Chat Error:', error);
                        const loadingEl = document.getElementById(loadingId);
                        if (loadingEl) loadingEl.remove();
                        // Display the actual error message
                        const errorMsg = error.message || "Sorry, I'm having trouble connecting to the AI right now. Please try again later.";
                        this.addBotMessage(chatMessages, errorMsg);
                    }
                }
            });
        }

        async callGeminiAPI(prompt) {
            // TODO: Replace with your actual Gemini API key. WARNING: Exposing API keys in frontend code is insecure. Use a backend proxy for production.
            const API_KEY = 'YOUR_API_KEY_HERE';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

            // Personalized system context for Sarthak's portfolio
            const systemContext = `You are Sarthak Mathapati's AI portfolio assistant. Be friendly, professional, and enthusiastic about Sarthak's work. Always provide accurate contact information when asked.

**About Sarthak:**
- Full Name: Sarthak Mathapati
- Role: AI Software Engineer & Full Stack Web Developer
- Location: India
- Motto: "Disciplina - Execucao - Foco" (Discipline - Execution - Focus)
- Availability: Available for freelance projects and collaborations (24×7)

**Contact Information:**
- 📧 Email: sarthakmathapati4@gmail.com
- 📱 Phone: +91 93567 07688
- 💼 GitHub: skens-git-code
- 🌐 Portfolio: This website (touch.html)

**Skills & Expertise:**
- **Frontend:** React.js, JavaScript, HTML/CSS, Responsive Design
- **Backend:** Node.js, Python, Express.js
- **Database:** MongoDB, MySQL
- **Cloud & DevOps:** AWS, Docker
- **AI/ML:** Working with AI technologies and integrations

**Key Projects:**
1. **E-commerce Platform** 
   - Full-featured online store with product catalog, shopping cart, and secure payment processing
   - Tech: React, Node.js, MySQL
   - Features: Real-time inventory, user authentication, admin dashboard

2. **Task Management App**
   - Productivity application for managing tasks, projects, and team collaboration
   - Tech: JavaScript, MySQL, ReactJS
   - Features: Real-time updates, intuitive interface, team sync

3. **Social Media Dashboard**
   - Analytics dashboard with interactive data visualization
   - Features: Data insights, performance tracking, user engagement metrics

**Certifications:**
- Full Stack Development (Udemy, 2024)
- React Specialist (Coursera, 2023)
- AWS Cloud (AWS, 2023)
- MongoDB Atlas (MongoDB, 2023)

**Hobbies & Interests:** 
Badminton, traveling to new places, reading books that broaden perspectives, taking on challenging programming tasks, continuous learning and exploration

**Services Offered:**
- Web Development (full stack)
- Responsive Design (mobile-first approach)
- UI/UX Design (user-centered solutions)
- Performance Optimization (faster, better websites)

**How to Contact:**
When someone asks how to contact Sarthak:
1. Provide the email: sarthakmathapati4@gmail.com
2. Provide the phone: +91 93567 07688
3. Mention he's available 24×7 (Monday to Sunday) to help with anything
4. Encourage them to use the contact form on this portfolio page
5. You can also mention checking out his GitHub profile: skens-git-code

Always be helpful, provide specific information from this context, and encourage visitors to explore the portfolio or reach out for collaborations. When asked about projects, mention the tech stack and key features. When asked about contact, always provide the email and phone number clearly.`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemContext }]
                        },
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (!response.ok) {
                    // Handle specific error codes
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please wait a few moments and try again.');
                    } else if (response.status === 403) {
                        throw new Error('API key error. Please check your API key configuration.');
                    } else if (response.status === 400) {
                        throw new Error('Invalid request. Please try rephrasing your message.');
                    }
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();

                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error('Invalid API response format');
                }
            } catch (error) {
                console.error('Gemini API Error:', error);
                throw error;
            }
        }

        addUserMessage(container, message) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message user-message';
            messageElement.innerHTML = `<p>${Utils.escapeHtml(message)}</p>`;
            container.appendChild(messageElement);
            container.scrollTop = container.scrollHeight;
        }

        addBotMessage(container, message, id = null) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message bot-message';
            if (id) messageElement.id = id;

            // Simple markdown parsing for bold/italic/code
            let formattedMessage = Utils.escapeHtml(message);

            // Restore markdown (basic) - BE CAREFUL with XSS here, but Utils.escapeHtml should handle base tags
            // We can re-enable some tags or use a proper parser. For now, just simplistic formatting.
            formattedMessage = formattedMessage
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            messageElement.innerHTML = `<p>${formattedMessage}</p>`;
            container.appendChild(messageElement);
            container.scrollTop = container.scrollHeight;
        }

        initProjectFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');
            const projectCards = document.querySelectorAll('.project-card');

            filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    const filter = button.getAttribute('data-filter');
                    this.filterProjects(projectCards, filter);
                });
            });
        }

        filterProjects(cards, filter) {
            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                const shouldShow = filter === 'all' || category.includes(filter);

                if (shouldShow) {
                    card.style.display = 'block';
                    requestAnimationFrame(() => {
                        Object.assign(card.style, {
                            opacity: '1',
                            transform: 'translateY(0)'
                        });
                    });
                } else {
                    Object.assign(card.style, {
                        opacity: '0',
                        transform: 'translateY(20px)'
                    });

                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 200);
                }
            });
        }

        initCaseStudies() {
            const caseStudyButtons = document.querySelectorAll('.case-study-btn');
            const closeModal = document.getElementById('closeModal');
            const caseStudyContent = document.getElementById('caseStudyContent');

            const caseStudies = {
                ecommerce: {
                    title: "E-commerce Platform",
                    content: `
                                <h2>E-commerce Platform Case Study</h2>
                                <p><strong>Challenge:</strong> Create a scalable e-commerce solution with modern UX and secure payment processing.</p>
                                <p><strong>Solution:</strong> Developed a full-stack application using React, Node.js, and MongoDB with Stripe integration.</p>
                                <p><strong>Results:</strong> 40% faster load times and 25% increase in conversion rates.</p>
                                <div class="tech-stack">
                                    <h3>Technologies Used:</h3>
                                    <div class="skills-tags">
                                        <span class="skill-tag">React</span>
                                        <span class="skill-tag">Node.js</span>
                                        <span class="skill-tag">MongoDB</span>
                                        <span class="skill-tag">Stripe API</span>
                                    </div>
                                </div>`
                },
                taskapp: {
                    title: "Task Management App",
                    content: `
                                <h2>Task Management App Case Study</h2>
                                <p><strong>Challenge:</strong> Build an intuitive task management solution for remote teams.</p>
                                <p><strong>Solution:</strong> Created a real-time collaborative platform with drag-and-drop functionality.</p>
                                <p><strong>Results:</strong> Improved team productivity by 35% and reduced project completion time.</p>
                                <div class="tech-stack">
                                    <h3>Technologies Used:</h3>
                                    <div class="skills-tags">
                                        <span class="skill-tag">React</span>
                                        <span class="skill-tag">Socket.io</span>
                                        <span class="skill-tag">MySQL</span>
                                        <span class="skill-tag">Express.js</span>
                                    </div>
                                </div>`
                },
                dashboard: {
                    title: "Social Media Dashboard",
                    content: `
                                <h2>Social Media Dashboard Case Study</h2>
                                <p><strong>Challenge:</strong> Develop a comprehensive analytics dashboard for social media management.</p>
                                <p><strong>Solution:</strong> Built an AI-powered dashboard with real-time analytics and predictive insights.</p>
                                <p><strong>Results:</strong> 50% reduction in reporting time and improved decision-making accuracy.</p>
                                <div class="tech-stack">
                                    <h3>Technologies Used:</h3>
                                    <div class="skills-tags">
                                        <span class="skill-tag">Next.js</span>
                                        <span class="skill-tag">Python</span>
                                        <span class="skill-tag">TensorFlow</span>
                                        <span class="skill-tag">D3.js</span>
                                    </div>
                                </div>`
                }
            };

            caseStudyButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const project = button.getAttribute('data-project');
                    if (caseStudies[project]) {
                        caseStudyContent.innerHTML = caseStudies[project].content;
                        this.caseStudyModal.classList.add('active');
                        setTimeout(() => closeModal?.focus(), 100);
                    }
                });
            });

            closeModal?.addEventListener('click', () => {
                this.caseStudyModal.classList.remove('active');
            });

            this.caseStudyModal?.addEventListener('click', (e) => {
                if (e.target === this.caseStudyModal) {
                    this.caseStudyModal.classList.remove('active');
                }
            });

            // Keyboard trap for modal
            this.caseStudyModal?.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.caseStudyModal.classList.remove('active');
                }

                // Focus trap logic
                if (e.key === 'Tab') {
                    const focusableElements = this.caseStudyModal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        }
    }

    // Swiper Manager
    class SwiperManager {
        init() {
            try {
                if (typeof Swiper === 'undefined') {
                    console.warn('Swiper not available');
                    return;
                }

                // Project Carousel (Fade Effect)
                if (document.querySelector('.swiper:not(.certificates-swiper)')) {
                    new Swiper('.swiper:not(.certificates-swiper)', {
                        loop: true,
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true,
                        },
                        navigation: {
                            nextEl: '.swiper-button-next',
                            prevEl: '.swiper-button-prev',
                        },
                        autoplay: {
                            delay: 4500,
                            disableOnInteraction: false
                        },
                        effect: 'fade',
                        fadeEffect: {
                            crossFade: true
                        },
                        speed: 600,
                    });
                }

                // Certificates Carousel (Slide Effect)
                if (document.querySelector('.certificates-swiper')) {
                    new Swiper('.certificates-swiper', {
                        loop: true,
                        slidesPerView: 1, // Default to 1 (Mobile)
                        spaceBetween: 20,
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true,
                        },
                        breakpoints: {
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 20,
                            },
                            1024: {
                                slidesPerView: 3,
                                spaceBetween: 30,
                            },
                        },
                        autoplay: {
                            delay: 3000,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true
                        },
                        speed: 600,
                        grabCursor: true,
                        observer: true,           // Important for dynamic content
                        observeParents: true      // Important for dynamic content
                    });
                }
            } catch (error) {
                console.error('Swiper initialization failed:', error);
            }
        }
    }

    // Phase 2 Manager
    class Phase2Manager {
        init() {
            this.initCookieBanner();
            this.initSkeletonLoading();
            this.initHighContrast();
        }

        initCookieBanner() {
            const banner = document.getElementById('cookieBanner');
            const acceptBtn = document.getElementById('acceptCookies');
            const declineBtn = document.getElementById('declineCookies');

            if (!banner) return;

            if (!localStorage.getItem('cookieConsent')) {
                setTimeout(() => {
                    banner.classList.add('show');
                }, 2000);
            }

            acceptBtn?.addEventListener('click', () => {
                localStorage.setItem('cookieConsent', 'true');
                banner.classList.remove('show');
            });

            declineBtn?.addEventListener('click', () => {
                banner.classList.remove('show');
            });
        }

        initSkeletonLoading() {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => {
                if (!img.complete) {
                    img.classList.add('skeleton-loading');
                    img.onload = () => img.classList.remove('skeleton-loading');
                    img.onerror = () => img.classList.remove('skeleton-loading');
                }
            });
        }

        initHighContrast() {
            const toggle = document.getElementById('highContrastToggle');
            if (!toggle) return;

            if (localStorage.getItem('highContrast') === 'true') {
                document.body.classList.add('high-contrast');
            }

            toggle.addEventListener('click', () => {
                document.body.classList.toggle('high-contrast');
                const isHighContrast = document.body.classList.contains('high-contrast');
                localStorage.setItem('highContrast', isHighContrast);
            });
        }
    }

    // Typewriter
    class Typewriter {
        constructor(elementId, words, wait = 3000) {
            this.txtElement = document.getElementById(elementId);
            this.words = words;
            this.txt = '';
            this.wordIndex = 0;
            this.wait = parseInt(wait, 10);
            this.type();
            this.isDeleting = false;
        }

        type() {
            if (!this.txtElement) return;

            const current = this.wordIndex % this.words.length;
            const fullTxt = this.words[current];

            if (this.isDeleting) {
                this.txt = fullTxt.substring(0, this.txt.length - 1);
            } else {
                this.txt = fullTxt.substring(0, this.txt.length + 1);
            }

            this.txtElement.innerHTML = `<span class="txt">${this.txt}</span>`;

            let typeSpeed = 100;

            if (this.isDeleting) {
                typeSpeed /= 2;
            }

            if (!this.isDeleting && this.txt === fullTxt) {
                typeSpeed = this.wait;
                this.isDeleting = true;
            } else if (this.isDeleting && this.txt === '') {
                this.isDeleting = false;
                this.wordIndex++;
                typeSpeed = 500;
            }

            setTimeout(() => this.type(), typeSpeed);
        }
    }

    // Command Palette Manager
    class CommandPaletteManager {
        constructor() {
            this.overlay = document.getElementById('commandPalette');
            this.input = this.overlay?.querySelector('.cmd-input');
            this.resultsContainer = this.overlay?.querySelector('.cmd-results');
            this.isOpen = false;
            this.commands = this.buildCommands();
        }

        buildCommands() {
            return [
                // Navigation commands
                { name: 'Go to Home', action: () => this.navigateTo('#home'), icon: 'fa-home', category: 'Navigation' },
                { name: 'Go to About', action: () => this.navigateTo('#about'), icon: 'fa-user', category: 'Navigation' },
                { name: 'Go to Projects', action: () => this.navigateTo('#projects'), icon: 'fa-briefcase', category: 'Navigation' },
                { name: 'Go to Services', action: () => this.navigateTo('#services'), icon: 'fa-cogs', category: 'Navigation' },
                { name: 'Go to Experience', action: () => this.navigateTo('#experience'), icon: 'fa-chart-line', category: 'Navigation' },
                { name: 'Go to Contact', action: () => this.navigateTo('#contact'), icon: 'fa-envelope', category: 'Navigation' },

                // Theme commands
                { name: 'Toggle Dark Mode', action: () => this.toggleTheme(), icon: 'fa-moon', category: 'Theme' },
                { name: 'Toggle High Contrast', action: () => this.toggleHighContrast(), icon: 'fa-adjust', category: 'Theme' },

                // Actions
                { name: 'Open Chat', action: () => this.openChat(), icon: 'fa-comments', category: 'Actions' },
                { name: 'Scroll to Top', action: () => this.scrollToTop(), icon: 'fa-arrow-up', category: 'Actions' },
                { name: 'Download Resume', action: () => this.downloadResume(), icon: 'fa-download', category: 'Actions' }
            ];
        }

        init() {
            if (!this.overlay) return;

            // Keyboard shortcut: Cmd/Ctrl + K
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    this.toggle();
                }
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Close on overlay click
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });

            // Input event
            this.input?.addEventListener('input', (e) => {
                this.search(e.target.value);
            });

            // Keyboard navigation in results
            this.input?.addEventListener('keydown', (e) => {
                this.handleKeyNavigation(e);
            });
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            if (!this.overlay) return;
            this.overlay.classList.add('active');
            this.input.value = '';
            this.input.focus();
            this.renderResults(this.commands);
            this.isOpen = true;
        }

        close() {
            if (!this.overlay) return;
            this.overlay.classList.remove('active');
            this.isOpen = false;
            this.input.value = '';
        }

        search(query) {
            if (!query.trim()) {
                this.renderResults(this.commands);
                return;
            }

            const filtered = this.commands.filter(cmd =>
                cmd.name.toLowerCase().includes(query.toLowerCase()) ||
                cmd.category.toLowerCase().includes(query.toLowerCase())
            );
            this.renderResults(filtered);
        }

        renderResults(commands) {
            if (!this.resultsContainer) return;

            if (commands.length === 0) {
                this.resultsContainer.innerHTML = '<div class="cmd-no-results">No results found</div>';
                return;
            }

            // Group by category
            const grouped = commands.reduce((acc, cmd) => {
                if (!acc[cmd.category]) acc[cmd.category] = [];
                acc[cmd.category].push(cmd);
                return acc;
            }, {});

            let html = '';
            for (const [category, cmds] of Object.entries(grouped)) {
                html += `<div class="cmd-category">${category}</div>`;
                cmds.forEach((cmd, index) => {
                    html += `
                                <div class="cmd-item" data-index="${index}" tabindex="0">
                                    <i class="fas ${cmd.icon}"></i>
                                    <span>${cmd.name}</span>
                                </div>`;
                });
            }

            this.resultsContainer.innerHTML = html;

            // Add click handlers
            this.resultsContainer.querySelectorAll('.cmd-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    commands[index].action();
                    this.close();
                });
            });
        }

        handleKeyNavigation(e) {
            const items = Array.from(this.resultsContainer?.querySelectorAll('.cmd-item') || []);
            if (items.length === 0) return;

            const currentIndex = items.findIndex(item => item === document.activeElement);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                items[prevIndex].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0) {
                    items[currentIndex].click();
                }
            }
        }

        // Command actions
        navigateTo(section) {
            const target = document.querySelector(section);
            if (target) {
                Utils.smoothScrollTo(target);
            }
        }

        toggleTheme() {
            document.getElementById('themeToggle')?.click();
        }

        toggleHighContrast() {
            document.getElementById('highContrastToggle')?.click();
        }

        openChat() {
            document.getElementById('chatWidget')?.click();
        }

        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        downloadResume() {
            console.log('Resume download would start here!');
        }
    }

    // Image Carousel
    class ImageCarousel {
        constructor(container) {
            this.container = container;
            this.tracks = Array.from(container.querySelectorAll('.carousel-track'));
            this.dotsContainer = container.querySelector('.carousel-dots');
            this.currentIndex = 0;
            this.interval = null;
            this.autoScrollDelay = 4000;

            this.init();
        }

        init() {
            if (!this.tracks.length) return;

            this.createDots();
            this.showSlide(0);
            this.startAutoScroll();
            this.addEventListeners();

            // Pause on hover
            this.container.addEventListener('mouseenter', () => this.stopAutoScroll());
            this.container.addEventListener('mouseleave', () => this.startAutoScroll());
        }

        createDots() {
            this.dotsContainer.innerHTML = '';

            this.tracks.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
                dot.dataset.index = index;
                dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
                this.dotsContainer.appendChild(dot);
            });
        }

        showSlide(index) {
            if (index < 0) index = this.tracks.length - 1;
            if (index >= this.tracks.length) index = 0;

            this.tracks.forEach(track => {
                track.classList.remove('active', 'prev', 'next');
                track.style.opacity = '0';
                track.style.zIndex = '0';
                track.style.transform = 'scale(0.95)';
            });

            const currentTrack = this.tracks[index];
            currentTrack.classList.add('active');
            currentTrack.style.opacity = '1';
            currentTrack.style.zIndex = '2';
            currentTrack.style.transform = 'scale(1)';

            // Update dots
            const dots = this.dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[index]) dots[index].classList.add('active');

            this.currentIndex = index;
        }

        nextSlide() {
            this.showSlide(this.currentIndex + 1);
        }

        prevSlide() {
            this.showSlide(this.currentIndex - 1);
        }

        startAutoScroll() {
            this.stopAutoScroll();
            this.interval = setInterval(() => this.nextSlide(), this.autoScrollDelay);
        }

        stopAutoScroll() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
        addEventListeners() {
            this.dotsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('carousel-dot')) {
                    const index = parseInt(e.target.dataset.index);
                    this.showSlide(index);
                }
            });

            // Keyboard nav
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            });
        }
    }
    // Pro Features Manager (Custom Cursor & Scroll Progress)
    class ProFeaturesManager {
        constructor() {
            this.cursorDot = document.querySelector('[data-cursor-dot]');
            this.cursorOutline = document.querySelector('[data-cursor-outline]');
            this.scrollProgress = document.getElementById('scrollProgress');

            // Custom cursor disabled by user request
            // if (window.innerWidth > 1024) {
            //     this.initCustomCursor();
            // }
            this.initScrollProgress();
        }

        initCustomCursor() {
            if (!this.cursorDot || !this.cursorOutline) return;

            // Initial state
            this.cursorDot.style.opacity = '0';
            this.cursorOutline.style.opacity = '0';

            let mouseX = 0, mouseY = 0;
            let outlineX = 0, outlineY = 0;
            let cursorVisible = false;
            let isClicking = false;

            // Touch detection safety - kill cursor if user touches screen
            window.addEventListener('touchstart', () => {
                this.cursorDot.style.display = 'none';
                this.cursorOutline.style.display = 'none';
                document.body.style.cursor = 'auto';
            }, { once: true });

            // Track mouse
            window.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;

                if (!cursorVisible) {
                    this.cursorDot.style.opacity = '1';
                    this.cursorOutline.style.opacity = '1';
                    cursorVisible = true;
                }

                this.cursorDot.style.left = `${mouseX}px`;
                this.cursorDot.style.top = `${mouseY}px`;
            });

            // Click specific animations
            document.addEventListener('mousedown', () => {
                isClicking = true;
                this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
            });

            document.addEventListener('mouseup', () => {
                isClicking = false;
                this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
                // Check if still hovering
                if (document.body.classList.contains('hovering')) {
                    this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
                }
            });

            // Hide when leaving window
            document.addEventListener('mouseout', (e) => {
                if (!e.relatedTarget) {
                    this.cursorDot.style.opacity = '0';
                    this.cursorOutline.style.opacity = '0';
                    cursorVisible = false;
                }
            });

            // Smooth outline animation loop
            const animateOutline = () => {
                outlineX += (mouseX - outlineX) * 0.15;
                outlineY += (mouseY - outlineY) * 0.15;

                this.cursorOutline.style.left = `${outlineX}px`;
                this.cursorOutline.style.top = `${outlineY}px`;
                requestAnimationFrame(animateOutline);
            };
            requestAnimationFrame(animateOutline);

            // Enhanced Hover Logic
            const hoverSelectors = 'a, button, .card, .nav-link, .hero-btn, .image-carousel, .project-card, .service-card';
            const textSelectors = 'p, h1, h2, h3, h4, h5, h6, span, li, blockquote';
            const inputSelectors = 'input, textarea, select';

            // Hover State
            document.querySelectorAll(hoverSelectors).forEach(el => {
                el.addEventListener('mouseover', () => document.body.classList.add('hovering'));
                el.addEventListener('mouseout', () => document.body.classList.remove('hovering'));
            });

            // Text Select State
            document.querySelectorAll(textSelectors).forEach(el => {
                el.addEventListener('mouseover', () => {
                    document.body.classList.add('text-mode');
                    this.cursorDot.style.opacity = '0';
                });
                el.addEventListener('mouseout', () => {
                    document.body.classList.remove('text-mode');
                    this.cursorDot.style.opacity = '1';
                });
            });

            // Input Focus State
            document.querySelectorAll(inputSelectors).forEach(el => {
                el.addEventListener('mouseover', () => document.body.classList.add('input-mode'));
                el.addEventListener('mouseout', () => document.body.classList.remove('input-mode'));
            });
        }

        initScrollProgress() {
            if (!this.scrollProgress) return;

            window.addEventListener('scroll', () => {
                if (this.ticking) return;

                window.requestAnimationFrame(() => {
                    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                    const scrolled = (scrollTop / scrollHeight) * 100;

                    this.scrollProgress.style.width = `${scrolled}%`;
                    this.ticking = false;
                });

                this.ticking = true;
            });
        }
    }

    // 3D Tilt Effect for Profile Image
    class TiltEffect {
        constructor() {
            this.container = document.querySelector('.profile-container');
            this.element = document.querySelector('.image-carousel');

            if (this.container && this.element) {
                this.init();
            }
        }

        init() {
            this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.container.addEventListener('mouseleave', () => this.handleMouseLeave());
        }

        handleMouseMove(e) {
            if (this.ticking) return;

            this.ticking = true;
            window.requestAnimationFrame(() => {
                const rect = this.container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Calculate rotation (max 15 degrees)
                const xPct = x / rect.width;
                const yPct = y / rect.height;

                const xRot = (0.5 - yPct) * 30; // -15 to +15 deg
                const yRot = (xPct - 0.5) * 30; // -15 to +15 deg

                // Apply rotation
                this.element.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg)`;

                // Update glare position
                this.element.style.setProperty('--mouse-x', `${xPct * 100}%`);
                this.element.style.setProperty('--mouse-y', `${yPct * 100}%`);

                this.ticking = false;
            });
        }


        handleMouseLeave() {
            this.element.style.transform = 'rotateX(0) rotateY(0)';
        }
    }

    // Enhanced Chat Widget Manager
    class ChatWidget {
        constructor() {
            this.widget = document.getElementById('chatWidget');
            this.chatBox = document.getElementById('chatBox');
            this.closeBtn = document.getElementById('closeChat');
            this.input = document.getElementById('chatInput');
            this.messagesContainer = document.getElementById('chatMessages');
            this.isOpen = false;
            this.API_KEY = 'AIzaSyAvQdl7Q3cIrxgUipK9RhmPsIMBJQadpFM'; // Free tier key
            this.context = "";
            this.suggestions = [
                "Tell me about your projects",
                "What is your tech stack?",
                "How can I contact you?",
                "Do you have experience with AI?"
            ];
        }

        init() {
            if (!this.widget || !this.chatBox) return;

            // Build context from page content
            this.buildContext();

            // Render suggestion chips
            this.renderSuggestions();

            // Event Listeners
            this.widget.addEventListener('click', () => this.toggleChat());
            this.closeBtn?.addEventListener('click', () => this.toggleChat());

            this.input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Auto-resize input
            this.input?.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        buildContext() {
            // scrape text from important sections
            const about = document.querySelector('#about')?.innerText || "";
            const projects = document.querySelector('#projects')?.innerText || "";
            const experience = document.querySelector('#experience')?.innerText || "";
            const skills = document.querySelector('#tech-stack')?.innerText || "";

            this.context = `
                        Portfolio Context:
                        ABOUT: ${about.substring(0, 1000)}...
                        SKILLS: ${skills.substring(0, 1000)}...
                        PROJECTS: ${projects.substring(0, 1500)}...
                        EXPERIENCE: ${experience.substring(0, 1000)}...
                    `.replace(/\s+/g, ' ').trim();
        }

        renderSuggestions() {
            const existingChips = this.chatBox.querySelector('.suggestion-chips');
            if (existingChips) existingChips.remove();

            const chipsContainer = document.createElement('div');
            chipsContainer.className = 'suggestion-chips';

            this.suggestions.forEach(text => {
                const chip = document.createElement('button');
                chip.className = 'chat-chip';
                chip.textContent = text;
                chip.onclick = () => {
                    this.input.value = text;
                    this.handleSendMessage();
                };
                chipsContainer.appendChild(chip);
            });

            // Insert before messages or append to specific area
            // For this design, we'll append it to messages container initially
            // or strictly, let's put it at the bottom of messages container
            this.messagesContainer.appendChild(chipsContainer);
        }

        toggleChat() {
            this.isOpen = !this.isOpen;
            this.chatBox.classList.toggle('active', this.isOpen);
            if (this.isOpen) {
                this.input?.focus();
                // Scroll to bottom
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        }

        async handleSendMessage() {
            const message = this.input.value.trim();
            if (!message) return;

            // Remove suggestions if they exist
            const suggestions = this.chatBox.querySelector('.suggestion-chips');
            if (suggestions) suggestions.style.display = 'none';

            this.addMessage(message, 'user-message');
            this.input.value = '';
            this.input.style.height = 'auto';

            const typingId = this.showTypingIndicator();

            try {
                const response = await this.callGeminiAPI(message);
                this.removeTypingIndicator(typingId);
                this.addMessage(response, 'bot-message');
            } catch (error) {
                console.error('Chat Error:', error);
                this.removeTypingIndicator(typingId);
                this.addMessage('Hi there! My AI is currently resting. Please feel free to reach out to Sarthak directly using the contact methods below! ✨', 'bot-message error');
            }
        }

        showTypingIndicator() {
            const id = `typing-${Date.now()}`;
            const div = document.createElement('div');
            div.className = 'message bot-message typing-indicator-container';
            div.id = id;
            div.innerHTML = `
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    `;
            this.messagesContainer.appendChild(div);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            return id;
        }

        removeTypingIndicator(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        addMessage(text, className) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${className}`;

            if (className.includes('bot-message') && !className.includes('error')) {
                msgDiv.innerHTML = this.parseMarkdown(text);
            } else {
                msgDiv.textContent = text;
            }

            this.messagesContainer.appendChild(msgDiv);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }

        parseMarkdown(text) {
            // robust markdown parsing
            let html = Utils.escapeHtml(text);

            // Bold
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Italic
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Code blocks
            html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Lists
            html = html.replace(/^\s*-\s+(.*)/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); // basic wrapper attempt

            // Paragraphs / Newlines
            html = html.replace(/\n/g, '<br>');

            return html;
        }

        async callGeminiAPI(prompt) {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.API_KEY}`;

            const systemPrompt = `
                        You are Sarthak Mathapati's Portfolio AI Assistant.
                        Your goal is to answer visitor questions specifically about Sarthak using the context below.
                        
                        CONTEXT:
                        ${this.context}
                        
                        RULES:
                        1. Be friendly, professional, and enthusiastic.
                        2. Keep answers concise (under 3 sentences) unless asked for details.
                        3. If you don't know something based on the context, say "I don't see that on the portfolio, but you can contact Sarthak directly!"
                        4. Use emoji occasionally ✨.
                        5. Format key skills or lists with markdown bullets.
                    `;

            const payload = {
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\nUser Question: ${prompt}`
                    }]
                }]
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(response.statusText);

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                throw error;
            }
        }
    }



    // 3D Interactive Hero Feature
    class ThreeDHero {
        constructor() {
            this.container = document.getElementById('hero-3d-scene');
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.particles = null;
            this.mouseX = 0;
            this.mouseY = 0;
            this.animate = this.animate.bind(this);
        }

        init() {
            if (!this.container || !window.THREE) return;

            // Scene setup
            this.scene = new THREE.Scene();

            // Camera setup
            this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
            this.camera.position.z = 30;

            // Renderer setup
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.container.appendChild(this.renderer.domElement);

            // Create Geometric Sphere (Particles)
            const geometry = new THREE.IcosahedronGeometry(15, 2);
            const material = new THREE.PointsMaterial({
                color: 0x007AFF,
                size: 0.2,
                transparent: true,
                opacity: 0.8
            });

            this.particles = new THREE.Points(geometry, material);
            this.scene.add(this.particles);

            // Add Ambient Light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);

            // Event Listeners
            document.addEventListener('mousemove', (e) => this.onMouseMove(e));
            window.addEventListener('resize', () => this.onWindowResize());

            // Start Loop
            this.animate();
        }

        onMouseMove(event) {
            this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        }

        onWindowResize() {
            if (!this.container || !this.camera || !this.renderer) return;
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }

        animate() {
            requestAnimationFrame(this.animate);

            if (this.particles) {
                // Rotation
                this.particles.rotation.y += 0.003;
                this.particles.rotation.x += 0.001;

                // Mouse interaction (gentle tilt)
                this.particles.rotation.x += this.mouseY * 0.05;
                this.particles.rotation.y += this.mouseX * 0.05;
            }

            this.renderer.render(this.scene, this.camera);
        }
    }

    // Immersive Project Manager
    class ProjectManager {
        constructor() {
            this.modal = document.getElementById('projectModal');
            this.closeBtn = document.getElementById('closeProjectModal');
            this.modalTitle = document.getElementById('modalProjectTitle');
            this.modalImage = document.getElementById('modalProjectImage');
            this.modalDesc = document.getElementById('modalProjectDesc');
        }

        init() {
            if (!this.modal) return;

            // Attach click events to project buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.cta-button') || e.target.closest('.slide-content')) {
                    // Check if inside projects section
                    if (e.target.closest('#projects')) {
                        e.preventDefault();
                        const card = e.target.closest('.swiper-slide');
                        if (card) this.openProject(card);
                    }
                }
            });

            this.closeBtn.addEventListener('click', () => this.closeModal());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeModal();
            });
        }

        openProject(card) {
            const title = card.querySelector('.slide-title').innerText;
            const desc = card.querySelector('.slide-desc').innerText;
            const img = card.querySelector('img').src;

            this.modalTitle.innerText = title;
            this.modalDesc.innerText = desc + " - This project represents a deep dive into modern web technologies, focusing on user experience and performance efficiency. Built with clean code and scalability in mind.";
            this.modalImage.src = img;

            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }

        closeModal() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Voice Control Feature
    class VoiceControl {
        constructor() {
            this.btn = document.getElementById('voiceWidget');
            this.overlay = document.getElementById('voiceOverlay');
            this.status = document.getElementById('voiceStatus');
            this.isListening = false;
            this.recognition = null;
        }

        init() {
            if (!this.btn) return;

            // Check browser support
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                this.btn.style.display = 'none'; // Hide if not supported
                console.warn('Speech Recognition not supported in this browser.');
                return;
            }

            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI(true);
                this.status.textContent = "Listening...";
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateUI(false);
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log('Voice Command:', transcript);
                this.handleCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.status.textContent = "Error. Try again.";
                setTimeout(() => this.updateUI(false), 2000);
            };

            this.btn.addEventListener('click', () => this.toggleListening());
            // Close overlay on click
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.stopListening();
            });
        }

        toggleListening() {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        }

        startListening() {
            try {
                this.recognition.start();
            } catch (e) {
                console.error(e);
            }
        }

        stopListening() {
            try {
                this.recognition.stop();
            } catch (e) {
                console.error(e);
            }
        }

        updateUI(active) {
            if (active) {
                this.overlay.classList.add('active');
                this.btn.classList.add('recording');
            } else {
                this.overlay.classList.remove('active');
                this.btn.classList.remove('recording');
            }
        }

        handleCommand(cmd) {
            this.status.textContent = `Recognized: "${cmd}"`;

            // Delay slightly to let user read
            setTimeout(() => {
                this.stopListening(); // Close UI
                this.executeAction(cmd);
            }, 800);
        }

        executeAction(cmd) {
            const nav = window.portfolioApp.navigationManager;
            const chat = window.portfolioApp.chatWidget;

            // Navigation Commands
            if (cmd.includes('home')) nav.navigateTo('home');
            else if (cmd.includes('about')) nav.navigateTo('about');
            else if (cmd.includes('skills') || cmd.includes('tech')) nav.navigateTo('tech-stack');
            else if (cmd.includes('project') || cmd.includes('work')) nav.navigateTo('projects');
            else if (cmd.includes('contact') || cmd.includes('touch')) nav.navigateTo('contact');
            else if (cmd.includes('service')) nav.navigateTo('services'); // Fixed bug: 'service' -> 'services'

            // Interaction Commands
            else if (cmd.includes('chat') || cmd.includes('message')) {
                if (!chat.isOpen) chat.toggleChat();
            }
            else if (cmd.includes('close')) {
                if (chat.isOpen) chat.toggleChat();
            }

            // Theme/Scroll
            else if (cmd.includes('dark') || cmd.includes('light') || cmd.includes('theme')) {
                document.body.classList.toggle('dark-theme');
            }
            else if (cmd.includes('top') || cmd.includes('up')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            else if (cmd.includes('bottom') || cmd.includes('down')) {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }

            else {
                // Fallback
                this.showFeedback(`Unknown command: ${cmd}`);
            }
        }

        showFeedback(msg) {
            // Simple toast or alert replacement
            const toast = document.createElement('div');
            toast.className = 'voice-toast';
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    // Main Portfolio App
    class PortfolioApp {
        constructor() {
            // Reuse existing loading manager to avoid conflicts
            this.loadingManager = window.loadingManager || new LoadingManager();
            this.backgroundEffects = new BackgroundEffects();
            this.navigationManager = new NavigationManager();
            this.animationManager = new AnimationManager();
            this.interactiveManager = new InteractiveElementsManager();
            this.swiperManager = new SwiperManager();
            this.phase2Manager = new Phase2Manager();
            this.commandPaletteManager = new CommandPaletteManager();
            this.tiltEffect = new TiltEffect();
            this.proFeaturesManager = new ProFeaturesManager();
            this.chatWidget = new ChatWidget();
            this.voiceControl = new VoiceControl();
            this.threeDHero = new ThreeDHero();
            this.projectManager = new ProjectManager();
        }

        async init() {
            if (AppState.isInitialized) return;

            try {
                // Initialize loading screen first (if not already running)
                if (!window.loadingManager) {
                    await this.loadingManager.init();
                } else {
                    // If reusing, just ensure we wait for it to be ready/hidden if needed, 
                    // or simply proceed as the global one handles the screen.
                    // But usually, we want to wait here? 
                    // The global one does the simulation and hiding.
                    // So we might not need to do anything here except wait for it to finish?
                    // Actually, let's just let the global one handle it. 
                    // Current logical flow: PortfolioApp.init waits for loadingManager.init.
                    // If global is running, we can await its completion if we had a promise exposure.
                    // But we don't.
                    // However, strictly speaking, PortfolioApp.init runs logic that SHOULD happen after loading?
                    // No, PortfolioApp.init INITIALIZES components. The loading screen hides when everything is ready.

                    // Providing we don't call init() again, we are safe.
                }

                // Initialize all components
                this.backgroundEffects.init();
                this.navigationManager.init();
                this.animationManager.init();
                this.interactiveManager.init();
                this.swiperManager.init();
                this.phase2Manager.init();
                this.commandPaletteManager.init();
                this.chatWidget.init();
                this.voiceControl.init();
                this.threeDHero.init();
                this.projectManager.init();

                // Initialize Typewriter
                new Typewriter('typewriter', [
                    'a Software Engineer',
                    'a Web Developer',
                    'a UI/UX Designer',
                    'a Problem Solver'
                ]);

                // Initialize image carousel
                const carouselContainer = document.querySelector('.image-carousel');
                if (carouselContainer) {
                    window.imageCarousel = new ImageCarousel(carouselContainer);
                }

                // Mark as initialized
                AppState.isInitialized = true;
                console.log('🚀 Portfolio app initialized successfully');

            } catch (error) {
                console.error('Failed to initialize app:', error);
                this.handleInitializationError(error);
            }
        }

        handleInitializationError(error) {
            this.loadingManager.forceHide();
            const errorElement = document.createElement('div');
            errorElement.style.cssText = `
                        position: fixed; top: 20px; right: 20px; 
                        background: #ff4444; color: white; padding: 10px 15px; 
                        border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;
                    `;
            errorElement.textContent = 'App initialization failed. Please refresh.';
            document.body.appendChild(errorElement);
            setTimeout(() => document.body.removeChild(errorElement), 5000);
        }
    }
    // Initialize application when DOM is ready
    const initApp = () => {
        // Prevent multiple capitalizations
        if (window.portfolioApp) return;
        window.portfolioApp = new PortfolioApp();
        window.portfolioApp.init();
        // Initialize the carousel if not handled by app (fallback)
        const carouselContainer = document.querySelector('.image-carousel');
        if (carouselContainer && !window.imageCarousel) {
            window.imageCarousel = new ImageCarousel(carouselContainer);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
    // Export for debugging
    window.AppState = AppState;
    window.Utils = Utils;
    performanceMonitor.mark('script_end');
    performanceMonitor.measure('script_start', 'script_end');
})();




