(function () {

  'use strict';

  // Performance Monitor
  const performanceMonitor = {
    startTime: performance.now(),
    marks: new Map(),

    mark(name) {
      this.marks.set(name, performance.now());
    },

    measure(from, to) {
      const start = this.marks.get(from);
      const end = this.marks.get(to);
      if (start && end) {
        return end - start;
      }
      return 0;
    }
  };

  performanceMonitor.mark('script_start');

  // Configuration
  const CONFIG = {
    loading: {
      minDisplayTime: 800,
      maxDisplayTime: 4500
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
      },
      starInterval: {
        min: 900,
        max: 1800
      }
    }
  };

  // Storage can be unavailable in private mode or locked-down browsers.
  const Storage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, String(value)); } catch (_) { /* no-op */ }
    }
  };

  // State management
  const AppState = {
    isInitialized: false,
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
    prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia ?
      window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
    prefersDarkMode: typeof window !== 'undefined' && window.matchMedia ?
      window.matchMedia('(prefers-color-scheme: dark)').matches : false,
    currentTheme: Storage.get('theme') ||
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    activeSection: '',
    scrollListeners: new Set()
  };

  // Listen dynamically to OS preference changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', (e) => {
        AppState.prefersReducedMotion = e.matches;
      });

      const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
      colorQuery.addEventListener('change', (e) => {
        AppState.prefersDarkMode = e.matches;
        if (!Storage.get('theme') && window.portfolioApp?.navigationManager) {
          window.portfolioApp.navigationManager.applyTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    } catch (_) {
      /* Graceful fallback for legacy environments */
    }
  }

  // Active smooth scroll animation frame tracker
  let activeScrollAnimationId = null;

  // Utility functions
  const Utils = {
    // Robust throttle with leading & trailing edge execution
    throttle(func, limit) {
      let inThrottle = false;
      let lastArgs = null;
      let lastContext = null;

      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => {
            inThrottle = false;
            if (lastArgs) {
              func.apply(lastContext, lastArgs);
              lastArgs = null;
              lastContext = null;
            }
          }, limit);
        } else {
          lastArgs = args;
          lastContext = this;
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

    // Smooth scroll with easing (respects reduced motion & cancellable)
    smoothScrollTo(target, duration = 800) {
      if (!target) return;

      this.cancelSmoothScroll();

      const currentScroll = window.scrollY || window.pageYOffset || 0;
      const targetPosition = target.getBoundingClientRect().top + currentScroll;

      if (AppState.prefersReducedMotion) {
        window.scrollTo({ top: targetPosition, behavior: 'auto' });
        return;
      }

      const distance = targetPosition - currentScroll;
      let startTime = null;

      function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);

        // Easing function (easeInOutCubic)
        const ease = progress < 0.5 ?
          4 * progress * progress * progress :
          1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, currentScroll + distance * ease);

        if (timeElapsed < duration) {
          activeScrollAnimationId = requestAnimationFrame(animation);
        } else {
          activeScrollAnimationId = null;
        }
      }
      activeScrollAnimationId = requestAnimationFrame(animation);
    },

    cancelSmoothScroll() {
      if (activeScrollAnimationId) {
        cancelAnimationFrame(activeScrollAnimationId);
        activeScrollAnimationId = null;
      }
    },

    // Check if element is in viewport
    isInViewport(element, threshold = 0) {
      if (!element || typeof element.getBoundingClientRect !== 'function') return false;
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
      if (unsafe == null) return '';
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  // Analytics & Microsoft Clarity Telemetry Helper
  const AnalyticsTracker = {
    init() {
      this.setTag('theme', AppState.currentTheme || 'dark');
      this.setTag('device_type', AppState.isMobile ? 'mobile' : 'desktop');
      this.setTag('reduced_motion', AppState.prefersReducedMotion ? 'true' : 'false');
      this.setTag('viewport', `${window.innerWidth}x${window.innerHeight}`);
    },

    setTag(key, value) {
      try {
        if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
          window.clarity('set', key, String(value));
        }
      } catch (err) {
        // Fail silently without disrupting UI
      }
    },

    sendEvent(eventName, params = {}) {
      try {
        if (typeof window !== 'undefined') {
          if (typeof window.clarity === 'function') {
            window.clarity('event', eventName);
          }
          if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
          }
        }
      } catch (err) {
        // Fail silently
      }
    },

    upgradeSession(reason) {
      try {
        if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
          window.clarity('upgrade', reason);
        }
      } catch (err) {
        // Fail silently
      }
    }
  };

  // Loading Manager
  class LoadingManager {
    constructor() {
      this.loadingScreen = document.getElementById('loadingScreen');
      this.progressBar = document.getElementById('progressBar');
      this.loadingPercentage = document.getElementById('loadingPercentage');
      this.progressRing = document.getElementById('progressRing');
      this.progressNumber = document.getElementById('progressNumber');
      this.progress = 0;
      this.startTime = performance.now();
      this.minDisplayTime = CONFIG.loading.minDisplayTime;
      this.maxDisplayTime = CONFIG.loading.maxDisplayTime;
      this.loadingMessages = [
        'Warming up the experience…',
        'Loading the visual system…',
        'Connecting the details…',
        'Almost ready to explore.'
      ];
      this.currentMessageIndex = 0;
      this.isHidden = false;
      this.forceHideTimeout = null;
      this.progressTimeout = null;

      // Set SVG ring dasharray if available
      if (this.progressRing) {
        const circumference = 2 * Math.PI * 43;
        this.progressRing.style.strokeDasharray = `${circumference}`;
      }
    }

    async init() {
      if (!this.loadingScreen) {
        return;
      }

      this.setupForceHide();

      try {
        // Start loading simulation immediately
        await this.simulateLoadingProgress();

        // Wait for window load OR timeout
        await Promise.race([
          this.waitForCriticalAssets(),
          this.timeoutPromise(1400)
        ]);

        // Ensure minimum display time (skip if fast/testing parameter provided)
        const isFastMode = new URLSearchParams(window.location.search).has('fast') || new URLSearchParams(window.location.search).has('skipLoader');
        if (!isFastMode) {
          const elapsed = performance.now() - this.startTime;
          const remaining = Math.max(0, this.minDisplayTime - elapsed);
          if (remaining > 0) {
            await this.timeoutPromise(remaining);
          }
        }

        // Hide loading screen
        await this.hideLoadingScreen();

      } catch (error) {
        console.warn('Loading screen error:', error);
        this.forceHide();
      }
    }

    setupForceHide() {
      this.forceHideTimeout = setTimeout(() => {
        if (!this.isHidden) {
          console.warn('Force hiding loading screen after timeout');
          this.forceHide();
        }
      }, this.maxDisplayTime);

      window.forceHideLoading = () => this.forceHide();
    }

    timeoutPromise(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    waitForCriticalAssets() {
      return new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
          return;
        }

        const onLoad = () => {
          resolve();
        };

        window.addEventListener('load', onLoad, { once: true });
      });
    }

    simulateLoadingProgress() {
      return new Promise((resolve) => {
        let lastProgress = 0;
        const duration = AppState.prefersReducedMotion ? 0 : 1350;
        const startedAt = performance.now();

        const updateProgress = () => {
          if (this.isHidden) {
            resolve();
            return;
          }

          const elapsed = performance.now() - startedAt;
          this.progress = duration === 0 ? 100 : Math.min(100, (elapsed / duration) * 100);
          this.updateProgressElements();

          if (this.progress - lastProgress >= 25 || this.progress >= 100) {
            lastProgress = this.progress;
            this.currentMessageIndex = Math.min(
              Math.floor(this.progress / 25),
              this.loadingMessages.length - 1
            );
            this.updateMessage();
          }

          if (this.progress >= 100) {
            resolve();
            return;
          }

          this.progressTimeout = setTimeout(updateProgress, 32);
        };

        this.updateProgressElements();
        updateProgress();
      });
    }

    updateProgressElements() {
      if (this.progressBar) {
        this.progressBar.style.width = `${this.progress}%`;
      }
      if (this.progressRing) {
        const circumference = 2 * Math.PI * 43;
        this.progressRing.style.strokeDashoffset = `${circumference * (1 - this.progress / 100)}`;
      }
      if (this.progressNumber) {
        this.progressNumber.textContent = `${Math.floor(this.progress)}%`;
      }
      if (this.loadingPercentage) {
        this.loadingPercentage.innerHTML = `
                <span>${Math.floor(this.progress)}%</span>
                <div>
                    ${this.loadingMessages[this.currentMessageIndex]}
                </div>`;
      }
    }

    updateMessage() {
      if (this.loadingPercentage) {
        const percentageEl = this.loadingPercentage.querySelector('span');
        const messageEl = this.loadingPercentage.querySelector('div');

        if (percentageEl && messageEl) {
          percentageEl.style.transition = 'opacity 0.3s';
          messageEl.style.transition = 'opacity 0.3s';

          percentageEl.style.opacity = '0.5';
          messageEl.style.opacity = '0.5';

          setTimeout(() => {
            if (this.isHidden) return;
            percentageEl.textContent = `${Math.floor(this.progress)}%`;
            messageEl.textContent = this.loadingMessages[this.currentMessageIndex];

            percentageEl.style.opacity = '1';
            messageEl.style.opacity = '1';
          }, 150);
        }
      }
    }

    async hideLoadingScreen() {
      if (this.isHidden) return;

      this.destroy();

      this.progress = 100;
      this.updateProgressElements();

      if (this.loadingPercentage) {
        this.loadingPercentage.innerHTML = `
                <span>100%</span>
                <div>Ready to explore.</div>`;
      }

      await this.timeoutPromise(AppState.prefersReducedMotion ? 0 : 220);

      if (this.loadingScreen) {
        this.loadingScreen.style.transition = 'opacity 0.45s ease, visibility 0.45s ease';
        this.loadingScreen.style.opacity = '0';
        this.loadingScreen.style.visibility = 'hidden';

        this.isHidden = true;

        setTimeout(() => {
          if (this.loadingScreen && this.loadingScreen.parentNode) {
            try {
              this.loadingScreen.parentNode.removeChild(this.loadingScreen);
            } catch (e) {
              this.loadingScreen.style.display = 'none';
            }
          }
        }, 480);

        window.dispatchEvent(new CustomEvent('loadingComplete'));

        // Handle initial hash or section query param scrolling after loader is dismissed
        const rawTargetId = (window.location.hash ? window.location.hash.split('?')[0] : '') ||
                            (new URLSearchParams(window.location.search).get('section') ? '#' + new URLSearchParams(window.location.search).get('section') : '');
        if (rawTargetId) {
          try {
            const hashTarget = document.querySelector(rawTargetId);
            if (hashTarget) {
              const prefersInstant = new URLSearchParams(window.location.search).has('instant') || AppState.prefersReducedMotion;
              if (prefersInstant) {
                document.documentElement.style.scrollBehavior = 'auto';
                document.body.style.scrollBehavior = 'auto';
                window.scrollTo(0, Math.max(0, hashTarget.offsetTop - 30));
              } else {
                setTimeout(() => {
                  hashTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }
            }
          } catch (e) {}
        }
      }
    }

    forceHide() {
      if (this.isHidden) return;

      this.destroy();

      if (this.loadingScreen) {
        this.loadingScreen.style.transition = 'none';
        this.loadingScreen.style.opacity = '0';
        this.loadingScreen.style.visibility = 'hidden';
        this.loadingScreen.style.display = 'none';

        setTimeout(() => {
          if (this.loadingScreen && this.loadingScreen.parentNode) {
            try {
              this.loadingScreen.parentNode.removeChild(this.loadingScreen);
            } catch (e) {
              // Ignore
            }
          }
        }, 100);
      }

      this.isHidden = true;
      window.dispatchEvent(new CustomEvent('loadingForced'));
    }

    destroy() {
      if (this.forceHideTimeout) {
        clearTimeout(this.forceHideTimeout);
        this.forceHideTimeout = null;
      }
      if (this.progressTimeout) {
        clearTimeout(this.progressTimeout);
        this.progressTimeout = null;
      }
      try {
        delete window.forceHideLoading;
      } catch (_) {
        window.forceHideLoading = undefined;
      }
    }
  }

  // Main initialization with better error handling
  const initLoadingManager = () => {
    try {
      if (window.loadingManager) return;

      const skipLoading = Storage.get('skipLoading') === 'true' ||
        (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('skipLoading')));

      if (skipLoading) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
          loadingScreen.style.display = 'none';
        }
        return;
      }

      const loadingManager = new LoadingManager();
      window.loadingManager = loadingManager;
      loadingManager.init();

    } catch (error) {
      console.error('Failed to initialize loading manager:', error);

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
      this.animatedBackground = document.querySelector('.animated-background, .animated-bg');
      this.starTimer = null;
      this.mouseMoveHandler = null;
      this.isDestroyed = false;
      this.activeStars = new Set();
      this.particleElements = [];
    }

    init() {
      if (AppState.prefersReducedMotion) return;

      if (!AppState.isMobile) {
        this.initCursorInteractions();
      }

      this.createParticles();
      this.createFallingStars();
      this.optimizeForDevices();
    }

    initCursorInteractions() {
      let lastTime = 0;

      this.mouseMoveHandler = (e) => {
        if (this.isDestroyed) return;
        const x = e.clientX;
        const y = e.clientY;
        const now = Date.now();

        if (this.animatedBackground) {
          const xPct = (x / window.innerWidth) * 100;
          const yPct = (y / window.innerHeight) * 100;
          this.animatedBackground.style.setProperty('--mouse-x', `${xPct}%`);
          this.animatedBackground.style.setProperty('--mouse-y', `${yPct}%`);
        }

        if (now - lastTime > 100) {
          this.createCursorTrail(x, y);
          lastTime = now;
        }
      };

      window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    }

    createCursorTrail(x, y) {
      if (this.isDestroyed || AppState.prefersReducedMotion) return;

      const trail = document.createElement('div');
      trail.className = 'cursor-trail';
      trail.style.left = `${x}px`;
      trail.style.top = `${y}px`;

      const size = Math.random() * 3 + 2;
      trail.style.width = `${size}px`;
      trail.style.height = `${size}px`;

      document.body.appendChild(trail);

      setTimeout(() => {
        if (trail.parentNode) {
          trail.parentNode.removeChild(trail);
        }
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
      if (!this.particlesContainer) return;

      const particle = document.createElement('div');
      particle.className = 'particle';

      const size = Utils.random(2, 5);
      const startLeft = Utils.random(0, 100);
      const duration = Utils.random(15, 25);
      const delay = Utils.random(0, 10);

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${startLeft}%`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `-${delay}s`;

      const onEnd = () => {
        particle.removeEventListener('animationend', onEnd);
        if (this.particlesContainer && particle.parentNode === this.particlesContainer) {
          this.particlesContainer.removeChild(particle);
        }
      };
      particle.addEventListener('animationend', onEnd);
      particle._cleanup = () => particle.removeEventListener('animationend', onEnd);

      this.particlesContainer.appendChild(particle);
      this.particleElements.push(particle);
    }

    createFallingStars() {
      if (!this.fallingStarsContainer) return;

      const scheduleNextStar = () => {
        if (this.isDestroyed) return;

        if (!document.hidden && this.activeStars.size < 8) {
          this.createFallingStar();
        }

        const minDelay = CONFIG.particles.starInterval?.min || 500;
        const maxDelay = CONFIG.particles.starInterval?.max || 1500;
        const nextStarDelay = Utils.random(minDelay, maxDelay);
        this.starTimer = setTimeout(scheduleNextStar, nextStarDelay);
      };

      scheduleNextStar();
    }

    createFallingStar() {
      if (!this.fallingStarsContainer || this.isDestroyed) return;

      const star = document.createElement('div');
      star.className = 'star';
      star.style.willChange = 'transform, opacity';

      const startX = Utils.random(0, window.innerWidth);
      const duration = Utils.random(0.5, 1.5);

      star.style.left = `${startX}px`;
      star.style.animationDuration = `${duration}s`;

      const colors = [
        'var(--primary)', 'var(--accent-1)', 'var(--accent-2)',
        'var(--accent-3)', '#ff00ff', '#00ffff', '#ffff00'
      ];
      star.style.background = colors[Math.floor(Math.random() * colors.length)];

      const size = Utils.random(2, 5);
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;

      this.fallingStarsContainer.appendChild(star);
      this.activeStars.add(star);

      setTimeout(() => {
        this.activeStars.delete(star);
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, duration * 1000);
    }

    optimizeForDevices() {
      // Logic for device adaptation
    }

    destroy() {
      this.isDestroyed = true;
      if (this.starTimer) {
        clearTimeout(this.starTimer);
        this.starTimer = null;
      }
      if (this.mouseMoveHandler) {
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        this.mouseMoveHandler = null;
      }
      this.activeStars.forEach(star => {
        if (star.parentNode) star.parentNode.removeChild(star);
      });
      this.activeStars.clear();

      this.particleElements.forEach(p => {
        if (p._cleanup) p._cleanup();
        if (p.parentNode) p.parentNode.removeChild(p);
      });
      this.particleElements = [];

      document.querySelectorAll('.cursor-trail').forEach(t => t.remove());
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
      /* ============================================================
         [OLD NAV LINKS SELECTOR - COMMENTED OUT]
         ============================================================
      this.navLinks = document.querySelectorAll('.nav-link');
      ============================================================ */
      this.navLinks = document.querySelectorAll('#mainNav .nav-link, .nav-container .nav-link');
      this.sectionDots = document.querySelectorAll('.section-dot');
      this.boundHandlers = {
        updateBackToTop: null,
        updateHeader: null,
        resetMobileMenu: null,
        documentClick: null,
        documentKeydown: null,
        navMouseLeave: null
      };
      this.navLinkCleanups = [];
      this.sectionObserver = null;

      // Close mobile menu when clicking links & Magnetic Effect
      this.navLinks.forEach(link => {
        const onLinkClick = this.closeMobileMenu.bind(this);
        const onMouseEnter = (e) => this.moveIndicator(e.currentTarget || e.target);
        const onMouseMove = !AppState.isMobile ? (e) => this.magneticEffect(e, link) : null;
        const onMouseLeave = !AppState.isMobile ? (e) => this.resetMagnetic(e, link) : null;

        link.addEventListener('click', onLinkClick);
        link.addEventListener('mouseenter', onMouseEnter);
        if (onMouseMove) link.addEventListener('mousemove', onMouseMove);
        if (onMouseLeave) link.addEventListener('mouseleave', onMouseLeave);

        this.navLinkCleanups.push(() => {
          link.removeEventListener('click', onLinkClick);
          link.removeEventListener('mouseenter', onMouseEnter);
          if (onMouseMove) link.removeEventListener('mousemove', onMouseMove);
          if (onMouseLeave) link.removeEventListener('mouseleave', onMouseLeave);
        });
      });

      this.sectionDots.forEach(dot => {
        const navigate = () => {
          const target = document.getElementById(dot.dataset.section);
          if (target) {
            target.scrollIntoView({
              behavior: AppState.prefersReducedMotion ? 'auto' : 'smooth',
              block: 'start'
            });
          }
        };
        dot.addEventListener('click', navigate);
        dot.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigate();
          }
        });
      });

      // Reset indicator when leaving nav
      if (this.mainNav) {
        this.boundHandlers.navMouseLeave = () => this.resetIndicator();
        this.mainNav.addEventListener('mouseleave', this.boundHandlers.navMouseLeave);
      }

      // Close menu when clicking outside
      this.boundHandlers.documentClick = (e) => {
        if (this.mainNav && this.mainNav.classList.contains('active')) {
          const clickedInsideNav = this.mainNav.contains(e.target);
          const clickedToggle = this.mobileMenuToggle && this.mobileMenuToggle.contains(e.target);
          if (!clickedInsideNav && !clickedToggle) {
            this.closeMobileMenu();
          }
        }
      };
      document.addEventListener('click', this.boundHandlers.documentClick);

      this.boundHandlers.documentKeydown = (e) => {
        if (e.key === 'Escape' && this.mainNav && this.mainNav.classList.contains('active')) {
          this.closeMobileMenu();
          this.mobileMenuToggle?.focus();
        }
      };
      document.addEventListener('keydown', this.boundHandlers.documentKeydown);

      this.boundHandlers.resetMobileMenu = () => {
        AppState.isMobile = window.innerWidth <= 768;
        if (!AppState.isMobile && this.mainNav && this.mainNav.classList.contains('active')) {
          this.closeMobileMenu();
        }
      };
      window.addEventListener('resize', this.boundHandlers.resetMobileMenu, { passive: true });
    }

    init() {
      this.initMobileMenu();
      this.initBottomNav();
      this.initThemeToggle();
      this.initBackToTop();
      this.initHeaderScrollEffect();
      this.initActiveSectionObserver();

      setTimeout(() => this.resetIndicator(), 100);
    }

    magneticEffect(e, link) {
      if (AppState.prefersReducedMotion || !link) return;
      const rect = link.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      link.style.transform = `translate(${x * 0.3}px, ${y * 0.5}px)`;
    }

    resetMagnetic(e, link) {
      if (!link) return;
      link.style.transform = 'translate(0px, 0px)';
    }

    moveIndicator(targetElement) {
      if (!this.navIndicator || !targetElement || !this.mainNav || AppState.isMobile) return;

      const containerRect = this.mainNav.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const scrollOffset = this.mainNav.scrollLeft || 0;
      const left = targetRect.left - containerRect.left + scrollOffset;
      const width = targetRect.width;

      if (width > 0 && width < 400) {
        this.navIndicator.style.left = `${Math.round(left)}px`;
        this.navIndicator.style.width = `${Math.round(width)}px`;
        this.navIndicator.style.opacity = '1';
      }
    }

    resetIndicator() {
      if (AppState.isMobile) return;
      /* ============================================================
         [OLD ACTIVE LINK SELECTOR - COMMENTED OUT]
         ============================================================
      const activeLink = document.querySelector('.nav-link.active');
      ============================================================ */
      const activeLink = document.querySelector('#mainNav .nav-link.active, .nav-container .nav-link.active');
      if (activeLink) {
        this.moveIndicator(activeLink);
      } else {
        if (this.navIndicator) this.navIndicator.style.opacity = '0';
      }
    }

    initMobileMenu() {
      if (this.mobileMenuToggle) {
        this.mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
      }
      const drawerClose = document.getElementById('drawerCloseBtn');
      if (drawerClose) {
        drawerClose.addEventListener('click', this.closeMobileMenu.bind(this));
      }
    }

    initActiveSectionObserver() {
      if (typeof IntersectionObserver === 'undefined') return;

      const observerOptions = {
        root: null,
        threshold: 0.3,
        rootMargin: "-10% 0px -10% 0px"
      };

      this.sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.id) {
            this.setActiveSection(entry.target.id);
          }
        });
      }, observerOptions);

      document.querySelectorAll('section[id]').forEach(section => {
        this.sectionObserver.observe(section);
      });
    }

    setActiveSection(sectionId) {
      if (!sectionId) return;

      if (AppState.activeSection !== sectionId) {
        AppState.activeSection = sectionId;
        AnalyticsTracker.setTag('active_section', sectionId);
        AnalyticsTracker.sendEvent('section_view', { section: sectionId });
      }

      let matchedLink = null;
      this.navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${sectionId}`) {
          link.classList.add('active');
          matchedLink = link;
        } else {
          link.classList.remove('active');
        }
      });

      if (matchedLink) {
        this.moveIndicator(matchedLink);
      }

      this.setActiveBottomNav(sectionId);

      this.sectionDots.forEach(dot => {
        const isCurrent = dot.getAttribute('data-section') === sectionId;
        dot.classList.toggle('active', isCurrent);
        dot.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      });
    }

    toggleMobileMenu() {
      if (!this.mainNav || !this.mobileMenuToggle) return;
      this.mainNav.classList.toggle('active');
      this.mobileMenuToggle.classList.toggle('active');
      const isOpen = this.mainNav.classList.contains('active');
      document.body.classList.toggle('nav-open', isOpen);
      this.mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));

      const icon = this.mobileMenuToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars', !isOpen);
        icon.classList.toggle('fa-times', isOpen);
      }
    }

    closeMobileMenu() {
      if (!this.mainNav) return;
      this.mainNav.classList.remove('active');
      if (this.mobileMenuToggle) {
        this.mobileMenuToggle.classList.remove('active');
        this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
        const icon = this.mobileMenuToggle.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
      document.body.classList.remove('nav-open');
    }

    initBottomNav() {
      this.bottomNavLinks = document.querySelectorAll('.bottom-nav-link');
      this.bottomNavDropdownLinks = document.querySelectorAll('.bottom-nav-dropdown-link:not(#bottomThemeToggle):not(#bottomContrastToggle)');
      this.bottomNavMore = document.getElementById('bottomNavMore');
      this.bottomNavDropdown = document.getElementById('bottomNavDropdown');
      this.bottomThemeToggle = document.getElementById('bottomThemeToggle');
      this.bottomContrastToggle = document.getElementById('bottomContrastToggle');
      this.lastScrollY = window.scrollY || 0;

      const scrollToSection = (targetId) => {
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (target) {
          if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            Utils.smoothScrollTo(target);
          }
        }
      };

      // Bottom Nav Tabs Click Handlers
      this.bottomNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-section') || (link.getAttribute('href') || '').replace('#', '');
          scrollToSection(targetId);
          this.closeBottomDropdown();
          this.setActiveBottomNav(targetId);
        });
      });

      // Dropdown Links Click Handlers
      this.bottomNavDropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-section') || (link.getAttribute('href') || '').replace('#', '');
          scrollToSection(targetId);
          this.closeBottomDropdown();
          this.setActiveBottomNav(targetId);
        });
      });

      // More Button Toggle
      if (this.bottomNavMore && this.bottomNavDropdown) {
        this.bottomNavMore.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = this.bottomNavDropdown.classList.toggle('open');
          this.bottomNavMore.classList.toggle('active', isOpen);
          this.bottomNavMore.setAttribute('aria-expanded', String(isOpen));
        });
      }

      // Close dropdown when clicking outside
      this.boundHandlers.bottomDropdownClick = (e) => {
        if (this.bottomNavDropdown && this.bottomNavDropdown.classList.contains('open')) {
          const isInside = this.bottomNavDropdown.contains(e.target) ||
            (this.bottomNavMore && this.bottomNavMore.contains(e.target));
          if (!isInside) {
            this.closeBottomDropdown();
          }
        }
      };
      document.addEventListener('click', this.boundHandlers.bottomDropdownClick);

      // Theme Toggle in Bottom Nav (closes dropdown upon toggle)
      this.bottomThemeToggle?.addEventListener('click', () => {
        this.closeBottomDropdown();
      });

      // Contrast Toggle in Bottom Nav (closes dropdown upon toggle)
      this.bottomContrastToggle?.addEventListener('click', () => {
        this.closeBottomDropdown();
      });

      // Auto-hide on scroll
      this.initBottomNavScrollHide();
    }

    setActiveBottomNav(sectionId) {
      if (!sectionId || !this.bottomNavLinks) return;
      let matchedInTabs = false;
      this.bottomNavLinks.forEach(link => {
        const isActive = link.getAttribute('data-section') === sectionId;
        link.classList.toggle('active', isActive);
        link.setAttribute('aria-current', isActive ? 'true' : 'false');
        if (isActive) matchedInTabs = true;
      });

      // If active section is inside the "More" dropdown, highlight More button
      if (this.bottomNavMore) {
        const isDropdownSection = ['tech-stack', 'routine', 'open-source', 'experience'].includes(sectionId);
        if (isDropdownSection && !matchedInTabs) {
          this.bottomNavMore.classList.add('active');
        } else if (!this.bottomNavDropdown?.classList.contains('open')) {
          this.bottomNavMore.classList.remove('active');
        }
      }
    }

    closeBottomDropdown() {
      if (this.bottomNavDropdown) {
        this.bottomNavDropdown.classList.remove('open');
      }
      if (this.bottomNavMore) {
        this.bottomNavMore.classList.remove('active');
        this.bottomNavMore.setAttribute('aria-expanded', 'false');
      }
    }

    initBottomNavScrollHide() {
      const bottomNav = document.getElementById('bottomNav');
      if (!bottomNav) return;

      let ticking = false;
      this.boundHandlers.bottomNavScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || window.pageYOffset || 0;
          const scrollDelta = currentScrollY - this.lastScrollY;

          if (scrollDelta > 25 && currentScrollY > 100) {
            // Scrolling down – hide nav and close dropdown
            bottomNav.classList.add('hidden');
            this.closeBottomDropdown();
          } else if (scrollDelta < -15) {
            // Scrolling up – show nav
            bottomNav.classList.remove('hidden');
          }

          // If at top of page, always show
          if (currentScrollY < 60) {
            bottomNav.classList.remove('hidden');
          }

          this.lastScrollY = currentScrollY;
          ticking = false;
        });
      };

      window.addEventListener('scroll', this.boundHandlers.bottomNavScroll, { passive: true });
    }

    initThemeToggle() {
      this.applyTheme(AppState.currentTheme, false);

      const themeButtons = document.querySelectorAll('.theme-toggle:not([aria-label*="Contrast"]), #themeToggle, .mobile-theme-btn');
      themeButtons.forEach(btn => {
        btn.addEventListener('click', this.toggleTheme.bind(this));
      });
    }

    toggleTheme() {
      const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
      this.applyTheme(nextTheme);
    }

    applyTheme(theme, persist = true) {
      const isDark = theme === 'dark';
      const themeStr = isDark ? 'dark' : 'light';
      AppState.currentTheme = themeStr;
      document.documentElement.dataset.theme = themeStr;
      document.body.classList.toggle('dark-theme', isDark);
      document.body.classList.toggle('light-theme', !isDark);

      const themeButtons = document.querySelectorAll('.theme-toggle:not([aria-label*="Contrast"]), #themeToggle, .mobile-theme-btn');
      themeButtons.forEach(btn => {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      });
      this.updateThemeIcon(isDark ? 'sun' : 'moon');

      if (window.portfolioApp?.cinematic3D?.onThemeChange) {
        window.portfolioApp.cinematic3D.onThemeChange(isDark);
      }

      if (persist) {
        Storage.set('theme', themeStr);
        AnalyticsTracker.setTag('theme', themeStr);
        AnalyticsTracker.sendEvent('theme_toggle', { theme: themeStr });
      }
    }

    updateThemeIcon(iconName) {
      const icons = document.querySelectorAll('.theme-toggle:not([aria-label*="Contrast"]) i, #themeToggle i, .mobile-theme-btn i');
      icons.forEach(icon => {
        icon.classList.remove('fa-moon', 'fa-sun');
        icon.classList.add(`fa-${iconName}`);
      });
    }

    initBackToTop() {
      if (!this.backToTop) return;

      this.boundHandlers.updateBackToTop = Utils.throttle(() => {
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        this.backToTop.classList.toggle('visible', currentScroll > 300);
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.boundHandlers.updateBackToTop, { passive: true });
      this.boundHandlers.updateBackToTop();

      this.backToTop.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: AppState.prefersReducedMotion ? 'auto' : 'smooth'
        });
      });
    }

    initHeaderScrollEffect() {
      const header = document.querySelector('header');
      if (!header) return;

      this.boundHandlers.updateHeader = Utils.throttle(() => {
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        header.classList.toggle('scrolled', currentScroll > 50);
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.boundHandlers.updateHeader, { passive: true });
      this.boundHandlers.updateHeader();
    }

    destroy() {
      if (this.navLinkCleanups) {
        this.navLinkCleanups.forEach(fn => fn());
        this.navLinkCleanups = [];
      }
      if (this.boundHandlers.updateBackToTop) {
        window.removeEventListener('scroll', this.boundHandlers.updateBackToTop);
      }
      if (this.boundHandlers.updateHeader) {
        window.removeEventListener('scroll', this.boundHandlers.updateHeader);
      }
      if (this.boundHandlers.resetMobileMenu) {
        window.removeEventListener('resize', this.boundHandlers.resetMobileMenu);
      }
      if (this.boundHandlers.documentClick) {
        document.removeEventListener('click', this.boundHandlers.documentClick);
      }
      if (this.boundHandlers.documentKeydown) {
        document.removeEventListener('keydown', this.boundHandlers.documentKeydown);
      }
      if (this.boundHandlers.navMouseLeave && this.mainNav) {
        this.mainNav.removeEventListener('mouseleave', this.boundHandlers.navMouseLeave);
      }
      if (this.boundHandlers.bottomDropdownClick) {
        document.removeEventListener('click', this.boundHandlers.bottomDropdownClick);
      }
      if (this.boundHandlers.bottomNavScroll) {
        window.removeEventListener('scroll', this.boundHandlers.bottomNavScroll);
      }
      if (this.sectionObserver) {
        this.sectionObserver.disconnect();
      }
    }
  }

  // Animation Manager
  class AnimationManager {
    constructor() {
      this.observer = null;
      this.scrollIndicatorHandler = null;
    }

    init() {
      this.initScrollIndicator();
      this.initIntersectionObserver();
    }

    initScrollIndicator() {
      const scrollIndicator = document.getElementById('scrollIndicator');
      if (!scrollIndicator) return;

      this.scrollIndicatorHandler = Utils.throttle(() => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const maxScroll = Math.max(1, documentHeight - windowHeight);
        const scrollPercent = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
        scrollIndicator.style.width = `${scrollPercent}%`;
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.scrollIndicatorHandler, { passive: true });
      this.scrollIndicatorHandler();
    }

    initIntersectionObserver() {
      if (AppState.prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;

      const observerOptions = {
        threshold: CONFIG.animations.intersectionThreshold,
        rootMargin: '0px 0px -40px 0px'
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateElement(entry.target);
            this.observer?.unobserve(entry.target);
          }
        });
      }, observerOptions);

      this.setupAnimationElements();
    }

    destroy() {
      if (this.scrollIndicatorHandler) {
        window.removeEventListener('scroll', this.scrollIndicatorHandler);
      }
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    setupAnimationElements() {
      const fadeElements = document.querySelectorAll('.fade-in');
      fadeElements.forEach(el => {
        this.setInitialAnimationState(el);
        this.observer?.observe(el);
      });

      const staggerParents = document.querySelectorAll('.stagger-animation');
      staggerParents.forEach(parent => {
        Array.from(parent.children).forEach(child => {
          this.setInitialAnimationState(child);
        });
        this.observer?.observe(parent);
      });

      const skillBars = document.querySelectorAll('.skill-progress');
      skillBars.forEach(bar => {
        this.observer?.observe(bar);
      });
    }

    setInitialAnimationState(element) {
      if (!element) return;
      Object.assign(element.style, {
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
      });
    }

    animateElement(element) {
      if (!element) return;

      if (element.classList.contains('skill-progress')) {
        const width = element.getAttribute('data-width') || '100%';
        element.style.width = width;
        element.style.transition = 'width 1.5s ease-out';
        return;
      }

      if (element.classList.contains('fade-in')) {
        Object.assign(element.style, {
          opacity: '1',
          transform: 'translateY(0)'
        });
        setTimeout(() => {
          element.style.transform = '';
          element.style.transition = '';
        }, 550);
      }

      if (element.classList.contains('stagger-animation')) {
        Array.from(element.children).forEach((child, index) => {
          setTimeout(() => {
            Object.assign(child.style, {
              opacity: '1',
              transform: 'translateY(0)'
            });
            setTimeout(() => {
              child.style.transform = '';
              child.style.transition = '';
            }, 550);
          }, index * CONFIG.animations.staggerDelay);
        });
      }
    }
  }

  // Interactive Elements Manager
  class InteractiveElementsManager {
    constructor() {
      this.caseStudyModal = document.getElementById('caseStudyModal');
      this.noticeTimer = null;
      this.lastFocusedElement = null;
      this.cardCleanups = [];
    }

    init() {
      this.initProjectFilters();
      this.initCaseStudies();
      this.initInteractiveCards();
      this.initContactForm();
      this.initPlaceholderLinks();
    }

    initPlaceholderLinks() {
      document.querySelectorAll('a[href="#"]').forEach(link => {
        if (link.classList.contains('cta-button') && link.closest('#projects')) return;

        link.addEventListener('click', (event) => {
          event.preventDefault();
          this.showNotice('This link is being prepared. Use the contact form for project details.');
        });
      });
    }

    showNotice(message) {
      let notice = document.getElementById('siteNotice');
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'siteNotice';
        notice.className = 'site-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        document.body.appendChild(notice);
      }

      notice.textContent = message;
      notice.classList.add('show');
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => notice.classList.remove('show'), 4200);
    }

    initContactForm() {
      const form = document.getElementById('contactForm');
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const status = document.getElementById('contactStatus');
        if (!btn) return;
        const originalContent = btn.innerHTML;

        const name = (form.querySelector('#name')?.value || '').trim();
        const email = (form.querySelector('#email')?.value || '').trim();
        const message = (form.querySelector('#message')?.value || '').trim();

        // Basic validation
        if (!name || !email || !message) {
          if (status) {
            status.textContent = 'Please fill in all fields.';
            status.style.color = 'var(--error)';
          }
          return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          if (status) {
            status.textContent = 'Please enter a valid email address.';
            status.style.color = 'var(--error)';
          }
          return;
        }

        AnalyticsTracker.sendEvent('contact_form_submit', { timestamp: Date.now() });
        AnalyticsTracker.upgradeSession('contact_form_submission');

        btn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Sending...</span>';
        btn.disabled = true;
        btn.style.opacity = '0.8';
        if (status) { status.textContent = 'Opening your mail client…'; status.style.color = ''; }

        const subject = encodeURIComponent(`Portfolio Contact from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
        const mailtoLink = `mailto:sarthakmathapati4@gmail.com?subject=${subject}&body=${body}`;

        setTimeout(() => {
          window.location.href = mailtoLink;

          btn.innerHTML = '<span><i class="fas fa-check"></i> Mail Client Opened!</span>';
          btn.style.backgroundColor = '#00C851';
          btn.style.borderColor = '#00C851';
          if (status) {
            status.textContent = '✅ Your mail client opened with the message pre-filled. Just hit Send!';
            status.style.color = 'var(--success)';
          }

          form.reset();

          const container = form.closest('.contact-form-container');
          if (container) {
            container.style.boxShadow = '0 0 20px rgba(0, 200, 81, 0.3)';
            setTimeout(() => { container.style.boxShadow = ''; }, 2000);
          }

          setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            btn.style.opacity = '1';
            if (status) { status.textContent = ''; status.style.color = ''; }
          }, 4000);
        }, 600);
      });
    }

    /* ============================================================
       [OLD 3D TILT INTERACTION - COMMENTED OUT]
       ============================================================
    initInteractiveCards() {
      this.cardCleanups = [];
      document.querySelectorAll('.interactive-card').forEach(card => {
        if (AppState.isMobile || AppState.prefersReducedMotion) return;

        let ticking = false;

        const onMouseMove = (e) => {
          if (ticking) return;
          const clientX = e.clientX;
          const clientY = e.clientY;
          ticking = true;

          requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.transition = 'transform 0.1s ease';
            ticking = false;
          });
        };

        const onMouseLeave = () => {
          card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
          card.style.transition = 'transform 0.5s ease';
        };

        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);

        this.cardCleanups.push(() => {
          card.removeEventListener('mousemove', onMouseMove);
          card.removeEventListener('mouseleave', onMouseLeave);
        });
      });
    }
    ============================================================ */

    /* NEW REFINED, JITTER-FREE 3D TILT INTERACTION */
    initInteractiveCards() {
      this.cardCleanups = [];
      document.querySelectorAll('.interactive-card').forEach(card => {
        if (AppState.isMobile || AppState.prefersReducedMotion) return;
        // Skip large container wrappers or sections to avoid jitter
        if (card.classList.contains('container') || card.classList.contains('hero-content')) return;

        let ticking = false;

        const onMouseMove = (e) => {
          if (ticking) return;
          const clientX = e.clientX;
          const clientY = e.clientY;
          ticking = true;

          requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Gentle, subtle tilt (-3deg to 3deg) for a natural, premium feel
            const rotateX = ((y - centerY) / centerY) * -3.5;
            const rotateY = ((x - centerX) / centerX) * 3.5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
            card.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
            ticking = false;
          });
        };

        const onMouseLeave = () => {
          card.style.transform = '';
          card.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
          setTimeout(() => {
            if (!card.matches(':hover')) {
              card.style.transition = '';
            }
          }, 360);
        };

        card.addEventListener('mousemove', onMouseMove, { passive: true });
        card.addEventListener('mouseleave', onMouseLeave, { passive: true });

        this.cardCleanups.push(() => {
          card.removeEventListener('mousemove', onMouseMove);
          card.removeEventListener('mouseleave', onMouseLeave);
        });
      });
    }

    initProjectFilters() {
      const filterButtons = document.querySelectorAll('.filter-btn');
      const projectCards = document.querySelectorAll('.project-card');

      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          filterButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          });
          button.classList.add('active');
          button.setAttribute('aria-pressed', 'true');

          const filter = button.getAttribute('data-filter') || 'all';
          AnalyticsTracker.sendEvent('project_filter_click', { filter });
          this.filterProjects(projectCards, filter);
        });
      });
    }

    filterProjects(cards, filter) {
      cards.forEach(card => {
        const category = card.getAttribute('data-category') || '';
        const shouldShow = filter === 'all' || category.includes(filter);

        if (card._filterTimer) {
          clearTimeout(card._filterTimer);
          card._filterTimer = null;
        }

        if (shouldShow) {
          card.style.display = ''; // Restore flex layout
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

          card._filterTimer = setTimeout(() => {
            card.style.display = 'none';
            card._filterTimer = null;
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
          if (caseStudies[project] && this.caseStudyModal && caseStudyContent) {
            this.lastFocusedElement = document.activeElement;
            caseStudyContent.innerHTML = caseStudies[project].content;
            this.caseStudyModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => closeModal?.focus(), 100);
          }
        });
      });

      const closeAction = () => {
        if (!this.caseStudyModal) return;
        this.caseStudyModal.classList.remove('active');
        document.body.style.overflow = '';
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
          this.lastFocusedElement.focus();
        }
      };

      closeModal?.addEventListener('click', closeAction);

      this.caseStudyModal?.addEventListener('click', (e) => {
        if (e.target === this.caseStudyModal) {
          closeAction();
        }
      });

      const FOCUSABLE_SELECTORS = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');

      this.caseStudyModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeAction();
          return;
        }

        if (e.key === 'Tab') {
          const focusable = Array.from(
            this.caseStudyModal.querySelectorAll(FOCUSABLE_SELECTORS)
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (focusable.length === 1) {
            e.preventDefault();
            return;
          }

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    destroy() {
      if (this.cardCleanups) {
        this.cardCleanups.forEach(fn => fn());
        this.cardCleanups = [];
      }
      if (this.noticeTimer) {
        clearTimeout(this.noticeTimer);
        this.noticeTimer = null;
      }
      document.body.style.overflow = '';
    }
  }

  // Swiper Manager
  class SwiperManager {
    constructor() {
      this.projectSwiper = null;
      this.certSwiper = null;
    }

    init() {
      try {
        if (typeof Swiper === 'undefined') {
          console.warn('Swiper not available');
          return;
        }

        // Project Carousel (Fade Effect)
        const projectSwiperEl = document.querySelector('.swiper:not(.certificates-swiper)');
        if (projectSwiperEl) {
          const paginationEl = projectSwiperEl.querySelector('.swiper-pagination');
          const nextEl = projectSwiperEl.querySelector('.swiper-button-next');
          const prevEl = projectSwiperEl.querySelector('.swiper-button-prev');

          this.projectSwiper = new Swiper(projectSwiperEl, {
            loop: true,
            pagination: paginationEl ? {
              el: paginationEl,
              clickable: true,
            } : false,
            navigation: (nextEl && prevEl) ? {
              nextEl,
              prevEl,
            } : false,
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
        const certSwiperEl = document.querySelector('.certificates-swiper');
        if (certSwiperEl) {
          const certPagination = certSwiperEl.querySelector('.swiper-pagination');

          this.certSwiper = new Swiper(certSwiperEl, {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 20,
            pagination: certPagination ? {
              el: certPagination,
              clickable: true,
            } : false,
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
            observer: true,
            observeParents: true
          });
        }
      } catch (error) {
        console.error('Swiper initialization failed:', error);
      }
    }

    destroy() {
      if (this.projectSwiper && typeof this.projectSwiper.destroy === 'function') {
        try { this.projectSwiper.destroy(true, true); } catch (_) { }
        this.projectSwiper = null;
      }
      if (this.certSwiper && typeof this.certSwiper.destroy === 'function') {
        try { this.certSwiper.destroy(true, true); } catch (_) { }
        this.certSwiper = null;
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

      if (!Storage.get('cookieConsent')) {
        setTimeout(() => {
          banner.classList.add('show');
        }, 2000);
      }

      acceptBtn?.addEventListener('click', () => {
        Storage.set('cookieConsent', 'true');
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
          const removeSkeleton = () => img.classList.remove('skeleton-loading');
          img.addEventListener('load', removeSkeleton, { once: true });
          img.addEventListener('error', removeSkeleton, { once: true });
        }
      });
    }

    initHighContrast() {
      const isHighContrast = Storage.get('highContrast') === 'true';
      if (isHighContrast) {
        document.body.classList.add('high-contrast');
      }

      const contrastButtons = document.querySelectorAll('#highContrastToggle, #bottomContrastToggle, #mobileHighContrastBtn, .mobile-contrast-btn, [aria-label*="High Contrast"]');
      contrastButtons.forEach(toggle => {
        toggle.setAttribute('aria-pressed', String(isHighContrast));
        toggle.addEventListener('click', () => {
          document.body.classList.toggle('high-contrast');
          const active = document.body.classList.contains('high-contrast');
          Storage.set('highContrast', active);
          contrastButtons.forEach(btn => btn.setAttribute('aria-pressed', String(active)));
        });
      });
    }
  }

  // Typewriter
  class Typewriter {
    constructor(elementId, words, wait = 3000) {
      this.txtElement = document.getElementById(elementId);
      this.words = Array.isArray(words) ? words : [];
      this.txt = '';
      this.wordIndex = 0;
      this.wait = parseInt(wait, 10) || 3000;
      this.isDeleting = false;
      this.timeoutId = null;

      if (this.txtElement && this.words.length > 0) {
        this.type();
      }
    }

    type() {
      if (!this.txtElement || this.words.length === 0) return;

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

      this.timeoutId = setTimeout(() => this.type(), typeSpeed);
    }

    destroy() {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
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
      this.activeRenderedCommands = [];
      this.keyHandler = null;
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

      this.keyHandler = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggle();
        }
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.keyHandler);

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });

      this.input?.addEventListener('input', (e) => {
        this.search(e.target.value);
      });

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
      if (this.input) {
        this.input.value = '';
        this.input.focus();
      }
      this.renderResults(this.commands);
      this.isOpen = true;
    }

    close() {
      if (!this.overlay) return;
      this.overlay.classList.remove('active');
      this.isOpen = false;
      if (this.input) {
        this.input.value = '';
      }
    }

    search(query) {
      if (!query.trim()) {
        this.renderResults(this.commands);
        return;
      }

      const q = query.toLowerCase();
      const filtered = this.commands.filter(cmd =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
      this.renderResults(filtered);
    }

    renderResults(commands) {
      if (!this.resultsContainer) return;

      if (commands.length === 0) {
        this.resultsContainer.innerHTML = '<div class="cmd-no-results">No results found</div>';
        this.activeRenderedCommands = [];
        return;
      }

      const grouped = commands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
      }, {});

      this.activeRenderedCommands = [];
      let html = '';

      for (const [category, cmds] of Object.entries(grouped)) {
        html += `<div class="cmd-category">${Utils.escapeHtml(category)}</div>`;
        cmds.forEach((cmd) => {
          const globalIndex = this.activeRenderedCommands.length;
          this.activeRenderedCommands.push(cmd);
          html += `
            <div class="cmd-item" data-index="${globalIndex}" tabindex="0">
              <i class="fas ${cmd.icon}"></i>
              <span>${Utils.escapeHtml(cmd.name)}</span>
            </div>`;
        });
      }

      this.resultsContainer.innerHTML = html;

      this.resultsContainer.querySelectorAll('.cmd-item').forEach((item) => {
        item.addEventListener('click', () => {
          const index = parseInt(item.getAttribute('data-index'), 10);
          const cmd = this.activeRenderedCommands[index];
          if (cmd) {
            AnalyticsTracker.sendEvent('command_palette_action', { command: cmd.name });
            try {
              cmd.action();
            } catch (err) {
              console.warn('Command action error:', err);
            }
          }
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
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0 && items[currentIndex]) {
          items[currentIndex].click();
        }
      }
    }

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
      const btn = document.getElementById('highContrastToggle') || document.querySelector('.mobile-contrast-btn');
      btn?.click();
    }

    openChat() {
      const chatWidget = document.getElementById('chatWidget');
      if (chatWidget) {
        chatWidget.click();
      } else {
        this.navigateTo('#contact');
      }
    }

    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: AppState.prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    downloadResume() {
      console.log('Resume download requested');
      const noticeManager = window.portfolioApp?.interactiveManager;
      if (noticeManager?.showNotice) {
        noticeManager.showNotice('Resume is being finalized. Please use the contact form to request an advance copy.');
      }
    }

    destroy() {
      if (this.keyHandler) {
        document.removeEventListener('keydown', this.keyHandler);
      }
      this.close();
    }
  }

  // Image Carousel
  class ImageCarousel {
    constructor(container) {
      this.container = container;
      this.tracks = Array.from(container.querySelectorAll('.carousel-track'));
      this.dotsContainer = container.querySelector('.carousel-dots') || container.parentElement?.querySelector('.carousel-dots');
      this.currentIndex = 0;
      this.interval = null;
      this.autoScrollDelay = 4000;
      this.boundKeyHandler = null;
      this.boundVisibilityHandler = null;

      this.init();
    }

    init() {
      if (!this.tracks.length) return;

      this.createDots();
      this.showSlide(0);
      this.startAutoScroll();
      this.addEventListeners();

      this.container.addEventListener('mouseenter', () => this.stopAutoScroll());
      this.container.addEventListener('mouseleave', () => this.startAutoScroll());
    }

    createDots() {
      if (!this.dotsContainer) return;
      this.dotsContainer.innerHTML = '';

      this.tracks.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.index = index;
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
        this.dotsContainer.appendChild(dot);
      });
    }

    showSlide(index) {
      if (!this.tracks.length) return;
      if (index < 0) index = this.tracks.length - 1;
      if (index >= this.tracks.length) index = 0;

      this.tracks.forEach(track => {
        track.classList.remove('active', 'prev', 'next');
        track.style.opacity = '0';
        track.style.zIndex = '0';
        track.style.transform = 'scale(0.95)';
      });

      const currentTrack = this.tracks[index];
      if (currentTrack) {
        currentTrack.classList.add('active');
        currentTrack.style.opacity = '1';
        currentTrack.style.zIndex = '2';
        currentTrack.style.transform = 'scale(1)';
      }

      if (this.dotsContainer) {
        const dots = this.dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        dots.forEach(dot => dot.setAttribute('aria-current', 'false'));
        if (dots[index]) {
          dots[index].classList.add('active');
          dots[index].setAttribute('aria-current', 'true');
        }
      }

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
      if (AppState.prefersReducedMotion || document.hidden) return;
      this.interval = setInterval(() => this.nextSlide(), this.autoScrollDelay);
    }

    stopAutoScroll() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }

    addEventListeners() {
      if (this.dotsContainer) {
        this.dotsContainer.addEventListener('click', (e) => {
          const dot = e.target.closest('.carousel-dot');
          if (dot) {
            const index = parseInt(dot.dataset.index, 10);
            this.showSlide(index);
          }
        });
      }

      this.boundKeyHandler = (e) => {
        if (!this.container.contains(document.activeElement)) return;
        if (e.key === 'ArrowLeft') this.prevSlide();
        if (e.key === 'ArrowRight') this.nextSlide();
      };
      document.addEventListener('keydown', this.boundKeyHandler);

      this.boundVisibilityHandler = () => {
        if (document.hidden) this.stopAutoScroll();
        else this.startAutoScroll();
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    destroy() {
      this.stopAutoScroll();
      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler);
      }
      if (this.boundVisibilityHandler) {
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      }
    }
  }

  // Pro Features Manager (Custom Cursor & Scroll Progress)
  class ProFeaturesManager {
    constructor() {
      this.cursorDot = document.querySelector('[data-cursor-dot]');
      this.cursorOutline = document.querySelector('[data-cursor-outline]');
      this.scrollProgress = document.getElementById('scrollProgress');
      this.ticking = false;
      this.scrollProgressHandler = null;

      this.initScrollProgress();
    }

    initCustomCursor() {
      if (!this.cursorDot || !this.cursorOutline) return;

      this.cursorDot.style.opacity = '0';
      this.cursorOutline.style.opacity = '0';

      let mouseX = 0, mouseY = 0;
      let outlineX = 0, outlineY = 0;
      let cursorVisible = false;

      window.addEventListener('touchstart', () => {
        if (this.cursorDot) this.cursorDot.style.display = 'none';
        if (this.cursorOutline) this.cursorOutline.style.display = 'none';
        document.body.style.cursor = 'auto';
      }, { once: true });

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

      document.addEventListener('mousedown', () => {
        if (this.cursorOutline) {
          this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }
      });

      document.addEventListener('mouseup', () => {
        if (this.cursorOutline) {
          this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
          if (document.body.classList.contains('hovering')) {
            this.cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
          }
        }
      });

      document.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget) {
          if (this.cursorDot) this.cursorDot.style.opacity = '0';
          if (this.cursorOutline) this.cursorOutline.style.opacity = '0';
          cursorVisible = false;
        }
      });

      const animateOutline = () => {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        if (this.cursorOutline) {
          this.cursorOutline.style.left = `${outlineX}px`;
          this.cursorOutline.style.top = `${outlineY}px`;
        }
        requestAnimationFrame(animateOutline);
      };
      requestAnimationFrame(animateOutline);

      const hoverSelectors = 'a, button, .card, .nav-link, .hero-btn, .image-carousel, .project-card, .service-card';
      const textSelectors = 'p, h1, h2, h3, h4, h5, h6, span, li, blockquote';
      const inputSelectors = 'input, textarea, select';

      document.querySelectorAll(hoverSelectors).forEach(el => {
        el.addEventListener('mouseover', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseout', () => document.body.classList.remove('hovering'));
      });

      document.querySelectorAll(textSelectors).forEach(el => {
        el.addEventListener('mouseover', () => {
          document.body.classList.add('text-mode');
          if (this.cursorDot) this.cursorDot.style.opacity = '0';
        });
        el.addEventListener('mouseout', () => {
          document.body.classList.remove('text-mode');
          if (this.cursorDot) this.cursorDot.style.opacity = '1';
        });
      });

      document.querySelectorAll(inputSelectors).forEach(el => {
        el.addEventListener('mouseover', () => document.body.classList.add('input-mode'));
        el.addEventListener('mouseout', () => document.body.classList.remove('input-mode'));
      });
    }

    initScrollProgress() {
      if (!this.scrollProgress) return;

      this.scrollProgressHandler = () => {
        if (this.ticking) return;
        this.ticking = true;
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
          const scrollHeight = Math.max(
            document.documentElement.scrollHeight - document.documentElement.clientHeight,
            1
          );
          const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
          if (this.scrollProgress) {
            this.scrollProgress.style.width = `${progress}%`;
          }
          this.ticking = false;
        });
      };

      window.addEventListener('scroll', this.scrollProgressHandler, { passive: true });
      this.scrollProgressHandler();
    }

    destroy() {
      if (this.scrollProgressHandler) {
        window.removeEventListener('scroll', this.scrollProgressHandler);
      }
    }
  }

  // 3D Tilt Effect for Profile Image
  class TiltEffect {
    constructor() {
      this.container = document.querySelector('.profile-container');
      this.element = document.querySelector('.image-carousel');
      this.ticking = false;
      this.boundMouseMove = null;
      this.boundMouseLeave = null;
      this.boundResize = null;

      if (this.container && this.element) {
        this.init();
      }
    }

    init() {
      this.boundMouseMove = (e) => this.handleMouseMove(e);
      this.boundMouseLeave = () => this.handleMouseLeave();
      this.boundResize = () => {
        AppState.isMobile = window.innerWidth <= 768;
      };

      this.container.addEventListener('mousemove', this.boundMouseMove);
      this.container.addEventListener('mouseleave', this.boundMouseLeave);
      window.addEventListener('resize', this.boundResize, { passive: true });
    }

    handleMouseMove(e) {
      if (this.ticking || AppState.prefersReducedMotion || AppState.isMobile) return;

      const clientX = e.clientX;
      const clientY = e.clientY;
      this.ticking = true;

      window.requestAnimationFrame(() => {
        if (!this.container || !this.element) {
          this.ticking = false;
          return;
        }

        const rect = this.container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const xPct = rect.width ? x / rect.width : 0.5;
        const yPct = rect.height ? y / rect.height : 0.5;

        const xRot = (0.5 - yPct) * 30;
        const yRot = (xPct - 0.5) * 30;

        this.element.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg)`;
        this.element.style.setProperty('--mouse-x', `${xPct * 100}%`);
        this.element.style.setProperty('--mouse-y', `${yPct * 100}%`);

        this.ticking = false;
      });
    }

    handleMouseLeave() {
      if (this.element) {
        this.element.style.transform = 'rotateX(0) rotateY(0)';
      }
    }

    destroy() {
      if (this.container) {
        if (this.boundMouseMove) this.container.removeEventListener('mousemove', this.boundMouseMove);
        if (this.boundMouseLeave) this.container.removeEventListener('mouseleave', this.boundMouseLeave);
      }
      if (this.boundResize) {
        window.removeEventListener('resize', this.boundResize);
      }
    }
  }

  // 3D Interactive Hero Feature
  // ═══════════════════════════════════════════════════════════════════
  // ═══  NEXUS CINEMATIC 3D EXPERIENCE — World-Class WebGL Engine  ═══
  // ═══════════════════════════════════════════════════════════════════
  class Cinematic3DExperience {
    constructor() {
      this.canvas = document.getElementById('webgl-3d-canvas');
      this.container = document.getElementById('hero-3d-scene');
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.animationId = null;
      this.isDisposed = false;
      this.isPageVisible = !document.hidden;
      this.lastFrameTime = 0;
      this.frameInterval = 1000 / 45;
      this.onVisibilityChange = this.onVisibilityChange.bind(this);

      // Interaction & Physics state
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, vx: 0, vy: 0 };
      this.scrollProgress = 0;
      this.targetScrollProgress = 0;
      this.scrollVelocity = 0;
      this.targetScrollVelocity = 0;
      this.scrollDirection = 1;
      this.scrollEnergy = 0;
      this.lastScrollY = window.scrollY || 0;
      this.lastScrollTime = performance.now();
      this.clock = null;

      // Reused vectors keep the render loop allocation-free while the
      // motion state acts as the single source of truth for every layer.
      this.motion = {
        currentStage: 'home',
        lastStage: 'home',
        stageChangedAt: 0,
        lastPublishedProgress: -1,
        lastWaveUpdate: 0
      };
      this.mouseOffset = null;
      this.lookOffset = null;
      this.cameraWaypointResult = {
        pos: null,
        look: null
      };

      // Motion dynamics & damping
      this.momentum = 0;
      this.velocityDamping = 0.92;

      // Scene components
      this.coreGroup = null;
      this.coreShaderMat = null;
      this.coreWireMesh = null;
      this.nucleusMesh = null;
      this.gimbalRings = [];
      this.synapticGroup = null;
      this.synapticNodes = [];
      this.synapticLines = null;
      this.matrixGroup = null;
      this.matrixObjects = [];
      this.chronometerGroup = null;
      this.chronometerRings = [];
      this.gridGroup = null;
      this.gridHelper = null;
      this.shards = [];
      this.waveField = null;
      this.waveGeo = null;
      this.warpLines = null;
      this.warpPoints = null;
      this.ambientParticles = null;

      this.sharedShardGeometry = null;

      // Lights
      this.ambientLight = null;
      this.dirLight = null;
      this.pointLightCyan = null;
      this.pointLightViolet = null;

      // Dynamic camera system
      this.camPos = null;
      this.camLook = null;
      this.currentCamPos = null;
      this.currentCamLook = null;
      this.targetRoll = 0;
      this.currentRoll = 0;

      this.cameraWaypoints = [
        { p: 0.00, pos: [1.8, 0.4, 13.5], look: [0.8, 0, 0] },     // #home
        { p: 0.15, pos: [-1.8, 0.6, 11.0], look: [-0.6, 0, 0] },   // #about
        { p: 0.32, pos: [0.0, 2.2, 12.0], look: [0, 0, -4.0] },    // #tech-stack / #services
        { p: 0.48, pos: [2.2, 1.2, 10.5], look: [1.2, 0, -2.5] },   // #routine / #goals
        { p: 0.64, pos: [0.0, 0.8, 13.0], look: [0, -1.8, -5.0] }, // #projects / #stats
        { p: 0.78, pos: [0.0, 2.6, 10.8], look: [0, -1.6, -3.5] }, // #open-source / #blog
        { p: 0.90, pos: [0.0, 0.2, 8.5], look: [0, 0, -18.0] },    // #experience / #tools
        { p: 1.00, pos: [0.0, 0.3, 8.0], look: [0, 0, 0] }         // #contact (convergence)
      ];

      this.animate = this.animate.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
    }

    init() {
      if (!window.THREE || AppState.prefersReducedMotion) return;

      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
      this.tier = isMobile ? 0 : isTablet ? 1 : 2;
      this.motionScale = isMobile ? 0.58 : isTablet ? 0.78 : 1;
      const particleCount = [72, 220, 520][this.tier];
      const maxPixelRatio = [1.0, 1.1, 1.25][this.tier];
      this.frameInterval = 1000 / (isMobile ? 30 : isTablet ? 40 : 45);

      try {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x04060f, 0.028);
        this.clock = new THREE.Clock();

        // 2. Camera Setup
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        const baseFov = isMobile ? 55 : isTablet ? 48 : 42;
        this.camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 800);
        this.camPos = new THREE.Vector3(1.8, 0.4, 13.5);
        this.camLook = new THREE.Vector3(0.8, 0, 0);
        this.currentCamPos = this.camPos.clone();
        this.currentCamLook = this.camLook.clone();
        this.mouseOffset = new THREE.Vector3();
        this.lookOffset = new THREE.Vector3();
        this.cameraWaypointResult.pos = new THREE.Vector3();
        this.cameraWaypointResult.look = new THREE.Vector3();
        this.camera.position.copy(this.currentCamPos);
        this.camera.lookAt(this.currentCamLook);

        // 3. Renderer & Canvas Placement inside #hero-3d-scene
        const parent = this.container || document.getElementById('hero-3d-scene') || document.body;

        const renderOptions = {
          alpha: true,
          antialias: this.tier >= 1,
          powerPreference: 'high-performance'
        };

        if (this.canvas) {
          if (parent && this.canvas.parentNode !== parent) {
            parent.prepend(this.canvas);
          }
          renderOptions.canvas = this.canvas;
          this.renderer = new THREE.WebGLRenderer(renderOptions);
        } else {
          this.renderer = new THREE.WebGLRenderer(renderOptions);
          this.renderer.domElement.id = 'webgl-3d-canvas';
          this.renderer.domElement.className = 'webgl-3d-canvas';
          parent.prepend(this.renderer.domElement);
          this.canvas = this.renderer.domElement;
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
        this.renderer.setClearColor(0x04060f, 0);

        if (this.canvas) {
          this.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (this.animationId) cancelAnimationFrame(this.animationId);
          }, false);
          this.canvas.addEventListener('webglcontextrestored', () => {
            this.init();
          }, false);
        }

        // 4. Build Harmonized Visual Systems
        this.buildLighting();
        this.buildQuantumCore();
        this.buildSynapticLattice();
        this.buildCyberMatrix();
        this.buildCircadianChronometer();
        this.buildPerspectiveGridAndShards();
        this.buildSignalWaveField();
        this.buildTemporalWarp();
        this.buildAmbientDust(particleCount);

        // 5. Register Listeners
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize, { passive: true });
        document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true });
        window.addEventListener('beforeunload', () => this.dispose(), { once: true });

        this.onScroll();

        // 6. Start RAF Loop
        this.isDisposed = false;
        this.animate();
        console.log('🌌 Nexus Cinematic 3D Engine initialized with fluid motion physics [Tier: ' + this.tier + ']');
      } catch (err) {
        console.warn('WebGL 3D Experience initialization skipped:', err);
      }
    }

    buildLighting() {
      const isLight = document.body.classList.contains('light-theme') || document.documentElement.dataset.theme === 'light';
      this.ambientLight = new THREE.AmbientLight(isLight ? 0xdce8f6 : 0x0b162e, isLight ? 0.9 : 0.55);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xbbeeff, 1.0);
      this.dirLight.position.set(6, 14, 10);
      this.scene.add(this.dirLight);

      this.pointLightCyan = new THREE.PointLight(0x00f0ff, 3.4, 38, 1.4);
      this.pointLightCyan.position.set(3, 2, 8);
      this.scene.add(this.pointLightCyan);

      this.pointLightViolet = new THREE.PointLight(0x8855ff, 2.8, 32, 1.4);
      this.pointLightViolet.position.set(-3, -2, 6);
      this.scene.add(this.pointLightViolet);
    }

    buildQuantumCore() {
      this.coreGroup = new THREE.Group();
      // Positioned to the right of the centered hero card
      this.coreGroup.position.set(2.4, 0.4, 0);
      this.scene.add(this.coreGroup);

      const vertexShader = `
        uniform float uTime;
        uniform float uVelocity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

        float snoise(vec3 v){
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
            i = mod(i, 289.0 );
            vec4 p = permute( permute( permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            float freq = 0.45 + uVelocity * 0.5;
            float noise = snoise(position * freq + vec3(uTime * 0.4));
            vDisplacement = noise;
            vec3 newPosition = position + normal * (noise * (0.35 + uVelocity * 0.4));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `;

      const fragmentShader = `
        uniform vec3 uColorCyan;
        uniform vec3 uColorViolet;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uIsLight;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        void main() {
            vec3 viewDir = normalize(-vPosition);
            float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.4);
            float pulse = 0.5 + 0.5 * sin(uTime * 1.8 + vDisplacement * 4.0);
            vec3 glowColor = mix(uColorCyan, uColorViolet, pulse);
            vec3 darkBase = vec3(0.02, 0.05, 0.12);
            vec3 lightBase = vec3(0.90, 0.95, 0.99);
            vec3 baseColor = mix(darkBase, lightBase, uIsLight);
            vec3 finalColor = mix(baseColor, glowColor, fresnel * (1.35 - 0.5 * uIsLight));
            finalColor += glowColor * (vDisplacement * 0.3);
            float alpha = mix(0.85, 0.22, uIsLight) * uOpacity;
            gl_FragColor = vec4(finalColor, alpha);
        }
      `;

      const isLight = document.body.classList.contains('light-theme') || document.documentElement.dataset.theme === 'light';
      this.coreShaderMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uVelocity: { value: 0 },
          uOpacity: { value: 1.0 },
          uIsLight: { value: isLight ? 1.0 : 0.0 },
          uColorCyan: { value: new THREE.Color(0x00f0ff) },
          uColorViolet: { value: new THREE.Color(0x8855ff) }
        },
        transparent: true
      });

      const coreGeo = new THREE.IcosahedronGeometry(2.1, this.tier >= 1 ? 4 : 2);
      const coreMesh = new THREE.Mesh(coreGeo, this.coreShaderMat);
      this.coreGroup.add(coreMesh);

      const wireGeo = new THREE.IcosahedronGeometry(2.35, 2);
      const wireMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x0088cc : 0x49e8fa,
        wireframe: true,
        transparent: true,
        opacity: isLight ? 0.15 : 0.35
      });
      this.coreWireMesh = new THREE.Mesh(wireGeo, wireMat);
      this.coreGroup.add(this.coreWireMesh);

      const nucleusGeo = new THREE.OctahedronGeometry(1.05, 0);
      const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.95
      });
      this.nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
      this.coreGroup.add(this.nucleusMesh);

      const ringConfigs = [
        { r: 3.2, tube: 0.026, color: 0x00f0ff, rot: [0.75, 0.2, 0], speed: 0.40 },
        { r: 4.0, tube: 0.022, color: 0x8855ff, rot: [-0.6, 0.85, 0.3], speed: -0.28 },
        { r: 4.8, tube: 0.018, color: 0x00e5ff, rot: [0.35, -0.65, 0.75], speed: 0.22 }
      ];

      this.gimbalRings = [];
      ringConfigs.forEach(cfg => {
        const ringGeo = new THREE.TorusGeometry(cfg.r, cfg.tube, 12, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          emissive: cfg.color,
          emissiveIntensity: 0.65,
          metalness: 0.85,
          roughness: 0.2,
          transparent: true,
          opacity: isLight ? 0.45 : 0.75
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.set(...cfg.rot);
        ringMesh.userData = { speed: cfg.speed, baseRot: [...cfg.rot] };
        this.coreGroup.add(ringMesh);
        this.gimbalRings.push(ringMesh);

        const beadGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.x = cfg.r;
        ringMesh.add(bead);
      });
    }

    buildSynapticLattice() {
      this.synapticGroup = new THREE.Group();
      this.synapticGroup.position.set(-1.8, 0.2, -3.5);
      this.synapticGroup.scale.setScalar(0.001);
      this.scene.add(this.synapticGroup);

      const nodeCount = this.tier >= 1 ? 32 : 16;
      this.synapticNodes = [];
      const nodeGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00b4ff,
        emissiveIntensity: 1.3,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });

      const phi = Math.PI * (3 - Math.sqrt(5));
      const points = [];

      for (let i = 0; i < nodeCount; i++) {
        const y = 1 - (i / (nodeCount - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;

        const x = Math.cos(theta) * radius * 4.8;
        const yPos = y * 3.4;
        const z = Math.sin(theta) * radius * 4.8;

        const mesh = new THREE.Mesh(nodeGeo, nodeMat);
        mesh.position.set(x, yPos, z);
        mesh.userData = {
          basePos: mesh.position.clone(),
          phase: i * 0.35,
          speed: 0.8 + (i % 3) * 0.4
        };
        this.synapticGroup.add(mesh);
        this.synapticNodes.push(mesh);
        points.push(mesh.position);
      }

      const linePoints = [];
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          if (points[i].distanceTo(points[j]) < 3.8) {
            linePoints.push(points[i].clone(), points[j].clone());
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x49e8fa,
        transparent: true,
        opacity: 0.38
      });
      this.synapticLines = new THREE.LineSegments(lineGeo, lineMat);
      this.synapticGroup.add(this.synapticLines);
    }

    buildCyberMatrix() {
      this.matrixGroup = new THREE.Group();
      this.matrixGroup.position.set(0, 0, -8);
      this.matrixGroup.scale.setScalar(0.001);
      this.scene.add(this.matrixGroup);

      const geometries = [
        new THREE.TetrahedronGeometry(0.46, 0),
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.DodecahedronGeometry(0.38, 0),
        new THREE.IcosahedronGeometry(0.40, 0)
      ];

      const ringCount = this.tier >= 1 ? 12 : 8;
      this.matrixObjects = [];

      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        const radius = 5.2 + (i % 2) * 1.8;
        const geo = geometries[i % geometries.length];
        const isViolet = i % 2 === 0;

        const mat = new THREE.MeshPhysicalMaterial({
          color: isViolet ? 0x8855ff : 0x00f0ff,
          emissive: isViolet ? 0x331166 : 0x003355,
          metalness: 0.88,
          roughness: 0.12,
          transmission: 0.6,
          transparent: true,
          opacity: 0.85
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          Math.cos(angle) * radius,
          (Math.sin(angle * 2) * 0.8),
          Math.sin(angle) * radius
        );
        mesh.userData = {
          angle,
          radius,
          orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.08),
          spinSpeedX: 0.015 + (i % 4) * 0.005,
          spinSpeedY: 0.012 + (i % 3) * 0.006,
          elevationPhase: i * 0.5
        };
        this.matrixGroup.add(mesh);
        this.matrixObjects.push(mesh);
      }
    }

    buildCircadianChronometer() {
      this.chronometerGroup = new THREE.Group();
      this.chronometerGroup.position.set(2.2, 0.2, -5.5);
      this.chronometerGroup.rotation.x = 0.52;
      this.chronometerGroup.scale.setScalar(0.001);
      this.scene.add(this.chronometerGroup);

      const ringRadii = [2.2, 3.4, 4.6];
      this.chronometerRings = [];

      ringRadii.forEach((rad, idx) => {
        const ringGroup = new THREE.Group();
        const geo = new THREE.RingGeometry(rad, rad + 0.035, 64);
        const mat = new THREE.MeshBasicMaterial({
          color: idx === 1 ? 0x8855ff : idx === 2 ? 0x00e5ff : 0x00f0ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55
        });
        const ring = new THREE.Mesh(geo, mat);
        ringGroup.add(ring);

        const ticks = idx === 0 ? 4 : idx === 1 ? 8 : 12;
        for (let k = 0; k < ticks; k++) {
          const angle = (k / ticks) * Math.PI * 2;
          const markerGeo = new THREE.BoxGeometry(0.14, 0.035, 0.035);
          const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.position.set(Math.cos(angle) * rad, Math.sin(angle) * rad, 0);
          marker.rotation.z = angle;
          ringGroup.add(marker);
        }

        const nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const nodeMat = new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xffcc00 : idx === 1 ? 0x00f0ff : 0x8855ff,
          emissive: idx === 0 ? 0xff8800 : idx === 1 ? 0x00b4ff : 0x441188,
          emissiveIntensity: 1.5,
          roughness: 0.2
        });
        const celestialNode = new THREE.Mesh(nodeGeo, nodeMat);
        celestialNode.position.set(rad, 0, 0);
        ringGroup.add(celestialNode);

        ringGroup.userData = {
          speed: (idx % 2 === 0 ? 1 : -1) * (0.2 + idx * 0.12)
        };

        this.chronometerGroup.add(ringGroup);
        this.chronometerRings.push(ringGroup);
      });
    }

    buildPerspectiveGridAndShards() {
      this.gridGroup = new THREE.Group();
      this.gridGroup.position.set(0, -4.6, -7);
      this.gridGroup.scale.setScalar(0.001);
      this.scene.add(this.gridGroup);

      this.gridHelper = new THREE.GridHelper(56, 44, 0x00f0ff, 0x162444);
      this.gridHelper.position.y = 0;
      this.gridGroup.add(this.gridHelper);

      this.shards = [];
      const shardCount = this.tier >= 1 ? 12 : 6;
      this.sharedShardGeometry = new THREE.ConeGeometry(0.65, 1.7, 3);

      for (let i = 0; i < shardCount; i++) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0x49e8fa,
          emissive: 0x002238,
          metalness: 0.92,
          roughness: 0.08,
          transmission: 0.78,
          ior: 1.48,
          transparent: true,
          opacity: 0.85
        });
        const shard = new THREE.Mesh(this.sharedShardGeometry, mat);
        const angle = (i / shardCount) * Math.PI * 2;
        const rad = 7.5;
        shard.position.set(
          Math.cos(angle) * rad,
          2.0 + Math.sin(angle * 3) * 1.2,
          Math.sin(angle) * 4.0
        );
        shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        shard.userData = {
          angle,
          rad,
          rotSpeed: 0.006 + (i % 3) * 0.003,
          floatSpeed: 0.9 + (i % 2) * 0.4,
          baseY: shard.position.y
        };
        this.gridGroup.add(shard);
        this.shards.push(shard);
      }
    }

    buildSignalWaveField() {
      const cols = this.tier >= 1 ? 36 : 22;
      const rows = this.tier >= 1 ? 36 : 22;
      const count = cols * rows;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const cyan = new THREE.Color(0x00f0ff);
      const violet = new THREE.Color(0x8855ff);

      let idx = 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - cols / 2) * 0.62;
          const z = (j - rows / 2) * 0.62;
          positions[idx * 3] = x;
          positions[idx * 3 + 1] = 0;
          positions[idx * 3 + 2] = z;

          const color = cyan.clone().lerp(violet, (i + j) / (cols + rows));
          colors[idx * 3] = color.r;
          colors[idx * 3 + 1] = color.g;
          colors[idx * 3 + 2] = color.b;
          idx++;
        }
      }

      this.waveGeo = new THREE.BufferGeometry();
      this.waveGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.waveGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const waveMat = new THREE.PointsMaterial({
        size: 0.085,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });

      this.waveField = new THREE.Points(this.waveGeo, waveMat);
      this.waveField.position.set(0, -3.0, -5.5);
      this.waveField.scale.setScalar(0.001);
      this.scene.add(this.waveField);
    }

    buildTemporalWarp() {
      const count = this.tier >= 1 ? 180 : 80;
      const positions = new Float32Array(count * 6);
      this.warpPoints = [];

      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 14;
        const z = -28 + Math.random() * 32;
        const len = 1.4 + Math.random() * 2.8;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;

        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y;
        positions[i * 6 + 5] = z - len;

        this.warpPoints.push({ x, y, z, len, speed: 20 + Math.random() * 28 });
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.55
      });

      this.warpLines = new THREE.LineSegments(geo, mat);
      this.warpLines.scale.setScalar(0.001);
      this.scene.add(this.warpLines);
    }

    buildAmbientDust(count) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 38;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 38;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 48;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.048,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      });
      this.ambientParticles = new THREE.Points(geo, mat);
      this.scene.add(this.ambientParticles);
    }

    onMouseMove(e) {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    onScroll() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      this.targetScrollProgress = Math.max(0, Math.min(1, currentScrollY / maxScroll));

      const now = performance.now();
      const dt = Math.max(16, now - this.lastScrollTime);
      const delta = currentScrollY - this.lastScrollY;
      const rawVelocity = Math.max(-3.5, Math.min(3.5, delta / dt));
      if (Math.abs(delta) > 0.25) this.scrollDirection = rawVelocity < 0 ? -1 : 1;
      this.targetScrollVelocity = this.targetScrollVelocity * 0.42 + rawVelocity * 0.58;

      this.lastScrollY = currentScrollY;
      this.lastScrollTime = now;
    }

    onResize() {
      if (!this.renderer || !this.camera) return;
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.fov = w <= 768 ? 55 : w <= 1024 ? 48 : 42;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);

      // Keep the same composition on smaller screens without re-building the
      // scene. The camera and responsive motion scale do the adaptation.
      this.motionScale = w <= 768 ? 0.58 : w <= 1024 ? 0.78 : 1;
    }

    interpolateCameraWaypoints(p) {
      const waypoints = this.cameraWaypoints;
      const result = this.cameraWaypointResult;
      if (p <= waypoints[0].p) {
        result.pos.set(...waypoints[0].pos);
        result.look.set(...waypoints[0].look);
        return result;
      }
      if (p >= waypoints[waypoints.length - 1].p) {
        const last = waypoints[waypoints.length - 1];
        result.pos.set(...last.pos);
        result.look.set(...last.look);
        return result;
      }

      for (let i = 0; i < waypoints.length - 1; i++) {
        const w0 = waypoints[i];
        const w1 = waypoints[i + 1];
        if (p >= w0.p && p <= w1.p) {
          const t = (p - w0.p) / (w1.p - w0.p);
          const easeT = t * t * (3 - 2 * t);

          result.pos.set(
            w0.pos[0] + (w1.pos[0] - w0.pos[0]) * easeT,
            w0.pos[1] + (w1.pos[1] - w0.pos[1]) * easeT,
            w0.pos[2] + (w1.pos[2] - w0.pos[2]) * easeT
          );
          result.look.set(
            w0.look[0] + (w1.look[0] - w0.look[0]) * easeT,
            w0.look[1] + (w1.look[1] - w0.look[1]) * easeT,
            w0.look[2] + (w1.look[2] - w0.look[2]) * easeT
          );
          return result;
        }
      }
      result.pos.set(0, 0, 14);
      result.look.set(0, 0, 0);
      return result;
    }

    getZoneInfluence(p, center, spread) {
      const dist = Math.abs(p - center);
      if (dist >= spread) return 0;
      const t = dist / spread;
      return 1 - t * t * (3 - 2 * t);
    }

    getLocalProgress(p, start, end) {
      const range = Math.max(0.0001, end - start);
      const value = Math.max(0, Math.min(1, (p - start) / range));
      return value * value * (3 - 2 * value);
    }

    getStage(p) {
      if (p < 0.08) return 'home';
      if (p < 0.24) return 'about';
      if (p < 0.40) return 'tech-stack';
      if (p < 0.56) return 'routine';
      if (p < 0.71) return 'projects';
      if (p < 0.85) return 'open-source';
      if (p < 0.95) return 'experience';
      return 'contact';
    }

    publishMotionState(p) {
      const root = document.documentElement;
      const stage = this.getStage(p);
      if (stage !== this.motion.currentStage) {
        this.motion.lastStage = this.motion.currentStage;
        this.motion.currentStage = stage;
        this.motion.stageChangedAt = performance.now();
        document.body.dataset.sceneStage = stage;
      }

      // Publish at a small threshold so UI synchronization never forces a
      // style recalculation on every render frame.
      if (Math.abs(p - this.motion.lastPublishedProgress) > 0.003) {
        root.style.setProperty('--scene-progress', p.toFixed(3));
        root.style.setProperty('--scene-energy', this.scrollEnergy.toFixed(3));
        this.motion.lastPublishedProgress = p;
      }
    }

    animate(timestamp = performance.now()) {
      if (this.isDisposed || !this.scene || !this.renderer || !this.camera || !this.clock) return;
      if (!this.isPageVisible) {
        this.animationId = null;
        return;
      }

      this.animationId = requestAnimationFrame(this.animate);

      if (timestamp - this.lastFrameTime < this.frameInterval) return;
      this.lastFrameTime = timestamp;

      const dt = Math.min(0.05, this.clock.getDelta()) || 0.016;
      const time = this.clock.getElapsedTime();

      // 1. Physics-driven interpolation & inertia. Scroll input is treated as
      // signed momentum, then allowed to settle instead of snapping to zero.
      this.targetScrollVelocity *= Math.exp(-dt * 7.5);
      this.scrollVelocity += (this.targetScrollVelocity - this.scrollVelocity) * (1 - Math.exp(-dt * 9));
      const targetEnergy = Math.min(1, Math.abs(this.scrollVelocity) / 2.4);
      this.scrollEnergy += (targetEnergy - this.scrollEnergy) * (1 - Math.exp(-dt * 5.5));

      this.mouse.vx = (this.mouse.targetX - this.mouse.x) * (0.065 + this.scrollEnergy * 0.02);
      this.mouse.vy = (this.mouse.targetY - this.mouse.y) * (0.065 + this.scrollEnergy * 0.02);
      this.mouse.x += this.mouse.vx;
      this.mouse.y += this.mouse.vy;

      const scrollStep = (this.targetScrollProgress - this.scrollProgress) * (1 - Math.exp(-dt * 5.2));
      this.scrollProgress += scrollStep;
      const p = this.scrollProgress;
      this.publishMotionState(p);

      // 2. Cinematic Camera Spline Choreography
      const { pos: basePos, look: baseLook } = this.interpolateCameraWaypoints(p);

      const mouseParallaxX = this.mouse.x * (0.7 + this.scrollEnergy * 0.28) * this.motionScale;
      const mouseParallaxY = -this.mouse.y * (0.45 + this.scrollEnergy * 0.18) * this.motionScale;

      this.mouseOffset.set(mouseParallaxX, mouseParallaxY, 0);
      this.lookOffset.set(mouseParallaxX * 0.3, mouseParallaxY * 0.3, 0);
      this.camPos.copy(basePos).add(this.mouseOffset);
      this.camLook.copy(baseLook).add(this.lookOffset);

      const cameraEase = 1 - Math.exp(-dt * (4.5 + this.scrollEnergy * 2.0));
      this.currentCamPos.lerp(this.camPos, cameraEase);
      this.currentCamLook.lerp(this.camLook, cameraEase);
      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLook);

      this.targetRoll = Math.max(-0.035, Math.min(0.035,
        -this.mouse.vx * 0.24 - this.scrollVelocity * 0.012));
      this.currentRoll += (this.targetRoll - this.currentRoll) * (1 - Math.exp(-dt * 5.5));
      // lookAt rewrites the Euler rotation; assign the roll after it so the
      // tilt stays stable instead of accumulating every frame.
      this.camera.rotation.z = this.currentRoll;

      // 3. Continuous Multi-Stage Zone Influences
      const coreInf = Math.max(
        this.getZoneInfluence(p, 0.00, 0.16),
        this.getZoneInfluence(p, 1.00, 0.12)
      );
      const synapInf = this.getZoneInfluence(p, 0.15, 0.14);
      const matrixInf = this.getZoneInfluence(p, 0.32, 0.15);
      const chronoInf = this.getZoneInfluence(p, 0.48, 0.15);
      const gridInf = this.getZoneInfluence(p, 0.64, 0.15);
      const waveInf = this.getZoneInfluence(p, 0.78, 0.14);
      const warpInf = this.getZoneInfluence(p, 0.90, 0.12);
      const coreExit = this.getLocalProgress(p, 0.02, 0.18);
      const synapticEnter = this.getLocalProgress(p, 0.06, 0.16);
      const synapticExit = this.getLocalProgress(p, 0.16, 0.30);
      const matrixEnter = this.getLocalProgress(p, 0.22, 0.38);
      const matrixExit = this.getLocalProgress(p, 0.39, 0.52);
      const chronoEnter = this.getLocalProgress(p, 0.38, 0.54);
      const gridEnter = this.getLocalProgress(p, 0.54, 0.70);
      const waveEnter = this.getLocalProgress(p, 0.68, 0.84);
      const warpEnter = this.getLocalProgress(p, 0.82, 0.96);
      const motionEase = 1 - Math.exp(-dt * 4.8);

      // 4. Harmonized Component Animations
      if (this.coreGroup) {
        const isContact = p > 0.85;
        const targetScale = isContact ? 0.75 * coreInf : 1.0 * coreInf;
        const currentScale = this.coreGroup.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * 0.08;
        this.coreGroup.scale.setScalar(Math.max(0.0001, newScale));
        this.coreGroup.visible = newScale > 0.01;

        if (this.coreGroup.visible) {
          const isMobile = window.innerWidth <= 768;
          const baseX = isMobile ? 0 : 2.4;
          const baseY = isMobile ? 1.8 : 0.4;
          const baseZ = isMobile ? -4.5 : 0;
          const targetX = isContact ? 0 : baseX - coreExit * 1.2 * this.motionScale;
          const targetY = isContact ? 0.1 : baseY + Math.sin(coreExit * Math.PI) * 0.35 * this.motionScale;
          const targetZ = isContact ? 0 : baseZ - coreExit * 1.6;
          this.coreGroup.position.x += (targetX - this.coreGroup.position.x) * motionEase;
          this.coreGroup.position.y += (targetY - this.coreGroup.position.y) * motionEase;
          this.coreGroup.position.z += (targetZ - this.coreGroup.position.z) * motionEase;

          if (this.coreShaderMat) {
            this.coreShaderMat.uniforms.uTime.value = time;
            this.coreShaderMat.uniforms.uVelocity.value = this.scrollEnergy;
            this.coreShaderMat.uniforms.uOpacity.value = Math.min(1.0, coreInf * 1.2);
          }

          const speedMult = 1.0 + this.scrollEnergy * 1.8;
          this.coreGroup.rotation.y += 0.30 * dt * speedMult;
          this.coreGroup.rotation.x += 0.12 * dt * speedMult;

          if (this.coreWireMesh) {
            this.coreWireMesh.rotation.y -= 0.42 * dt * speedMult;
            this.coreWireMesh.rotation.z += 0.24 * dt * speedMult;
          }
          if (this.nucleusMesh) {
            this.nucleusMesh.rotation.x += 0.84 * dt * speedMult;
            this.nucleusMesh.rotation.y -= 0.60 * dt * speedMult;
            const breathe = 1 + Math.sin(time * 1.6) * 0.045 + this.scrollEnergy * 0.025;
            this.nucleusMesh.scale.setScalar(breathe);
          }
          this.gimbalRings.forEach(ring => {
            ring.rotation.z += ring.userData.speed * dt * speedMult;
            ring.rotation.y += ring.userData.speed * 0.5 * dt * speedMult;
          });
        }
      }

      if (this.synapticGroup) {
        const curScale = this.synapticGroup.scale.x;
        const newScale = curScale + (synapInf - curScale) * 0.08;
        this.synapticGroup.scale.setScalar(Math.max(0.0001, newScale));
        this.synapticGroup.visible = newScale > 0.01;

        if (this.synapticGroup.visible) {
          const targetX = -1.8 + synapticEnter * 0.65 - synapticExit * 1.4;
          const targetY = 0.2 + Math.sin(synapticEnter * Math.PI) * 0.35;
          const targetZ = -3.5 + synapticEnter * 0.8 - synapticExit * 1.2;
          this.synapticGroup.position.x += (targetX - this.synapticGroup.position.x) * motionEase;
          this.synapticGroup.position.y += (targetY - this.synapticGroup.position.y) * motionEase;
          this.synapticGroup.position.z += (targetZ - this.synapticGroup.position.z) * motionEase;
          this.synapticGroup.rotation.y = time * 0.28 + this.mouse.x * 0.22 + this.scrollEnergy * 0.06 * this.scrollDirection;
          this.synapticGroup.rotation.x = Math.sin(time * 0.35) * 0.08 - this.mouse.y * 0.15;
          this.synapticGroup.rotation.z = synapticEnter * 0.16 - synapticExit * 0.24;

          this.synapticNodes.forEach(node => {
            const pulse = 1.0 + Math.sin(time * node.userData.speed + node.userData.phase) * (0.13 + this.scrollEnergy * 0.05);
            node.scale.setScalar(pulse);
          });
        }
      }

      if (this.matrixGroup) {
        const curScale = this.matrixGroup.scale.x;
        const newScale = curScale + (matrixInf - curScale) * 0.08;
        this.matrixGroup.scale.setScalar(Math.max(0.0001, newScale));
        this.matrixGroup.visible = newScale > 0.01;

        if (this.matrixGroup.visible) {
          const targetMatrixZ = -8 + matrixEnter * 1.2 - matrixExit * 1.8;
          this.matrixGroup.position.z += (targetMatrixZ - this.matrixGroup.position.z) * motionEase;
          this.matrixGroup.rotation.y += 0.24 * dt * (1.0 + this.scrollEnergy * 1.6);
          this.matrixGroup.rotation.x = Math.sin(time * 0.28) * 0.05 + this.mouse.y * 0.08;
          this.matrixObjects.forEach(obj => {
            obj.userData.angle += obj.userData.orbitSpeed * dt * (1 + this.scrollEnergy * 1.8);
            const radius = obj.userData.radius * (1 + matrixEnter * 0.11 + this.scrollEnergy * 0.025);
            obj.position.x = Math.cos(obj.userData.angle) * radius;
            obj.position.z = Math.sin(obj.userData.angle) * radius;
            obj.position.y = Math.sin(time * 1.6 + obj.userData.elevationPhase) * (0.58 + matrixEnter * 0.32);
            obj.rotation.x += obj.userData.spinSpeedX * dt * 60;
            obj.rotation.y += obj.userData.spinSpeedY * dt * 60;
          });
        }
      }

      if (this.chronometerGroup) {
        const curScale = this.chronometerGroup.scale.x;
        const newScale = curScale + (chronoInf - curScale) * 0.08;
        this.chronometerGroup.scale.setScalar(Math.max(0.0001, newScale));
        this.chronometerGroup.visible = newScale > 0.01;

        if (this.chronometerGroup.visible) {
          const targetChronoZ = -5.5 + chronoEnter * 1.8;
          this.chronometerGroup.position.z += (targetChronoZ - this.chronometerGroup.position.z) * motionEase;
          this.chronometerGroup.position.x += ((2.2 - chronoEnter * 0.5) - this.chronometerGroup.position.x) * motionEase;
          this.chronometerGroup.rotation.z = time * 0.38 + this.mouse.x * 0.18 + this.scrollEnergy * 0.08 * this.scrollDirection;
          this.chronometerGroup.rotation.y = Math.sin(time * 0.24) * 0.06 - this.mouse.y * 0.1;
          this.chronometerRings.forEach(ring => {
            ring.rotation.z += ring.userData.speed * dt * (1 + this.scrollEnergy * 1.5);
          });
        }
      }

      if (this.gridGroup) {
        const curScale = this.gridGroup.scale.x;
        const newScale = curScale + (gridInf - curScale) * 0.08;
        this.gridGroup.scale.setScalar(Math.max(0.0001, newScale));
        this.gridGroup.visible = newScale > 0.01;

        if (this.gridGroup.visible) {
          this.gridGroup.position.z += ((-7 + gridEnter * 1.4) - this.gridGroup.position.z) * motionEase;
          this.gridGroup.rotation.z = Math.sin(time * 0.18) * 0.025 + this.mouse.x * 0.035;
          this.shards.forEach(shard => {
            const shardSpread = 1 + gridEnter * 0.14 + this.scrollEnergy * 0.06;
            shard.position.x = Math.cos(shard.userData.angle + time * 0.045) * shard.userData.rad * shardSpread;
            shard.position.z = Math.sin(shard.userData.angle + time * 0.045) * 4.0 * shardSpread;
            shard.rotation.x += shard.userData.rotSpeed * dt * 60 * (1 + this.scrollEnergy);
            shard.rotation.y += shard.userData.rotSpeed * 1.3 * dt * 60 * (1 + this.scrollEnergy);
            shard.position.y = shard.userData.baseY + Math.sin(time * shard.userData.floatSpeed + shard.userData.angle) * (0.34 + gridEnter * 0.2);
          });
        }
      }

      if (this.waveField && this.waveGeo) {
        const curScale = this.waveField.scale.x;
        const newScale = curScale + (waveInf - curScale) * 0.08;
        this.waveField.scale.setScalar(Math.max(0.0001, newScale));
        this.waveField.visible = newScale > 0.01;

        if (this.waveField.visible && time - this.motion.lastWaveUpdate > 0.033) {
          this.motion.lastWaveUpdate = time;
          const posAttr = this.waveGeo.attributes.position;
          const posArray = posAttr.array;
          const cols = this.tier >= 1 ? 36 : 22;
          const rows = this.tier >= 1 ? 36 : 22;
          const waveAmplitude = 0.78 + waveEnter * 0.28 + this.scrollEnergy * 0.16;

          let idx = 0;
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const x = posArray[idx * 3];
              const z = posArray[idx * 3 + 2];
              posArray[idx * 3 + 1] = (Math.sin(x * 0.48 + time * 1.9) * 0.55 +
                Math.cos(z * 0.48 + time * 1.4) * 0.45 +
                Math.sin((x + z) * 0.35 + time * 2.2) * 0.25) * waveAmplitude;
              idx++;
            }
          }
          posAttr.needsUpdate = true;
        }
      }

      if (this.warpLines && this.warpPoints) {
        const curScale = this.warpLines.scale.x;
        const newScale = curScale + (warpInf - curScale) * 0.08;
        this.warpLines.scale.setScalar(Math.max(0.0001, newScale));
        this.warpLines.visible = newScale > 0.01;

        if (this.warpLines.visible) {
          const posAttr = this.warpLines.geometry.attributes.position;
          const posArray = posAttr.array;
          const warpSpeedMult = 1.0 + this.scrollEnergy * 3.2;

          for (let i = 0; i < this.warpPoints.length; i++) {
            const wp = this.warpPoints[i];
            wp.z += wp.speed * dt * warpSpeedMult * (0.72 + warpEnter * 0.28);
            if (wp.z > 14) wp.z = -28;

            posArray[i * 6 + 2] = wp.z;
            posArray[i * 6 + 5] = wp.z - wp.len * (1.0 + this.scrollVelocity * 0.8);
          }
          posAttr.needsUpdate = true;
        }
      }

      if (this.ambientParticles) {
        this.ambientParticles.rotation.y = time * 0.07 + this.mouse.x * 0.05 + this.scrollProgress * 0.16;
        this.ambientParticles.rotation.x = time * 0.035 - this.mouse.y * 0.03 + this.scrollVelocity * 0.008;
      }

      if (this.pointLightCyan) {
        this.pointLightCyan.position.x = 2.5 + this.mouse.x * 4.5 + this.scrollProgress * 1.5;
        this.pointLightCyan.position.y = 2.0 - this.mouse.y * 3.5 + this.scrollVelocity * 0.35;
        this.pointLightCyan.intensity = 3.0 + this.scrollEnergy * 1.2;
      }
      if (this.pointLightViolet) {
        this.pointLightViolet.position.x = -3.0 + this.mouse.x * 3.5 - this.scrollProgress * 1.2;
        this.pointLightViolet.position.y = -2.0 - this.mouse.y * 2.5 - this.scrollVelocity * 0.24;
        this.pointLightViolet.intensity = 2.5 + this.scrollEnergy * 0.9;
      }

      // 5. Render Pass
      this.renderer.render(this.scene, this.camera);
    }

    onVisibilityChange() {
      this.isPageVisible = !document.hidden;
      if (this.isPageVisible && !this.animationId && !this.isDisposed) {
        this.clock?.start();
        this.animate();
      }
    }

    onThemeChange(isDark) {
      const isLight = !isDark;
      if (this.coreShaderMat?.uniforms?.uIsLight) {
        this.coreShaderMat.uniforms.uIsLight.value = isLight ? 1.0 : 0.0;
      }
      if (this.ambientLight) {
        this.ambientLight.color.setHex(isLight ? 0xdce8f6 : 0x0b162e);
        this.ambientLight.intensity = isLight ? 0.9 : 0.55;
      }
      if (this.coreWireMesh?.material) {
        this.coreWireMesh.material.color.setHex(isLight ? 0x0088cc : 0x49e8fa);
        this.coreWireMesh.material.opacity = isLight ? 0.16 : 0.35;
      }
      if (this.scene?.fog) {
        this.scene.fog.color.setHex(isLight ? 0xf0f4fb : 0x000000);
      }
    }

    dispose() {
      if (this.isDisposed) return;
      this.isDisposed = true;

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);

      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      if (this.sharedShardGeometry) {
        this.sharedShardGeometry.dispose();
        this.sharedShardGeometry = null;
      }

      if (this.scene) {
        this.scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        this.scene.clear();
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      console.log('🌌 Cinematic 3D Experience disposed');
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
      this.caseStudyModal = document.getElementById('caseStudyModal');
      this.caseStudyContent = document.getElementById('caseStudyContent');
      this.boundClickHandler = null;
      this.boundKeyHandler = null;
    }

    init() {
      this.boundClickHandler = (e) => {
        const ctaBtn = e.target.closest('.cta-button');
        const slideContent = e.target.closest('.slide-content');
        if (ctaBtn || slideContent) {
          if (e.target.closest('#projects')) {
            e.preventDefault();
            const card = e.target.closest('.swiper-slide');
            if (card) this.openProject(card);
          }
        }
      };
      document.addEventListener('click', this.boundClickHandler);

      this.closeBtn?.addEventListener('click', () => this.closeModal());
      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });

      this.boundKeyHandler = (e) => {
        if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
          this.closeModal();
        }
      };
      document.addEventListener('keydown', this.boundKeyHandler);
    }

    openProject(card) {
      if (!card) return;

      const title = card.querySelector('.slide-title')?.textContent?.trim() || 'Project Details';
      const desc = card.querySelector('.slide-desc')?.textContent?.trim() || 'Modern web application';
      const img = card.querySelector('img')?.src || '';

      AnalyticsTracker.sendEvent('project_modal_open', { project: title });
      AnalyticsTracker.upgradeSession('project_modal_opened');

      // If dedicated #projectModal exists in DOM, use it
      if (this.modal && this.modalTitle && this.modalDesc) {
        this.modalTitle.textContent = title;
        this.modalDesc.textContent = desc + " - This project represents a deep dive into modern web technologies, focusing on user experience and performance efficiency. Built with clean code and scalability in mind.";
        if (this.modalImage && img) {
          this.modalImage.src = img;
        }

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
      }

      // If #projectModal is not in DOM (commented out), delegate to matching case study
      const titleLower = title.toLowerCase();
      let projectKey = '';
      if (titleLower.includes('commerce')) projectKey = 'ecommerce';
      else if (titleLower.includes('task')) projectKey = 'taskapp';
      else if (titleLower.includes('dashboard') || titleLower.includes('social')) projectKey = 'dashboard';

      if (projectKey) {
        const triggerBtn = document.querySelector(`.case-study-btn[data-project="${projectKey}"]`);
        if (triggerBtn) {
          triggerBtn.click();
          return;
        }
      }

      // Fallback: display in caseStudyModal if available
      if (this.caseStudyModal && this.caseStudyContent) {
        this.caseStudyContent.innerHTML = `
          <h2>${Utils.escapeHtml(title)}</h2>
          <p>${Utils.escapeHtml(desc)}</p>
          <p>This project represents a deep dive into modern web technologies, focusing on user experience and performance efficiency.</p>
        `;
        this.caseStudyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeModal() {
      if (this.modal) {
        this.modal.classList.remove('active');
      }
      document.body.style.overflow = '';
    }

    destroy() {
      if (this.boundClickHandler) {
        document.removeEventListener('click', this.boundClickHandler);
      }
      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler);
      }
      this.closeModal();
    }
  }

  // Main Portfolio App
  class PortfolioApp {
    constructor() {
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
      this.cinematic3D = new Cinematic3DExperience();
      this.projectManager = new ProjectManager();
      this.typewriter = null;
    }

    async init() {
      if (AppState.isInitialized) return;

      try {
        if (!window.loadingManager) {
          window.loadingManager = this.loadingManager;
          await this.loadingManager.init();
        }

        AnalyticsTracker.init();

        this.backgroundEffects.init();
        this.navigationManager.init();
        this.animationManager.init();
        this.interactiveManager.init();
        this.swiperManager.init();
        this.phase2Manager.init();
        this.commandPaletteManager.init();
        this.cinematic3D.init();
        this.projectManager.init();

        this.typewriter = new Typewriter('typewriter', [
          'a Software Engineer',
          'a Web Developer',
          'a UI/UX Designer',
          'a Problem Solver'
        ]);

        const carouselContainer = document.querySelector('.image-carousel');
        if (carouselContainer && !window.imageCarousel) {
          window.imageCarousel = new ImageCarousel(carouselContainer);
        }

        AppState.isInitialized = true;
        console.log('🚀 Portfolio app initialized successfully');

      } catch (error) {
        console.error('Failed to initialize app:', error);
        this.handleInitializationError(error);
      }
    }

    handleInitializationError(error) {
      this.loadingManager?.forceHide();
      if (!document || typeof document.createElement !== 'function') return;
      const errorElement = document.createElement('div');
      errorElement.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: #ff4444; color: white; padding: 10px 15px; 
        border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;
      `;
      errorElement.textContent = 'App initialization encountered a notice. Please refresh if needed.';
      document.body.appendChild(errorElement);
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement);
        }
      }, 5000);
    }

    destroy() {
      Utils.cancelSmoothScroll();
      this.loadingManager?.destroy?.();
      this.backgroundEffects?.destroy?.();
      this.navigationManager?.destroy?.();
      this.animationManager?.destroy?.();
      this.interactiveManager?.destroy?.();
      this.swiperManager?.destroy?.();
      this.commandPaletteManager?.destroy?.();
      this.tiltEffect?.destroy?.();
      this.proFeaturesManager?.destroy?.();
      this.cinematic3D?.dispose?.();
      this.projectManager?.destroy?.();
      this.typewriter?.destroy?.();

      if (window.imageCarousel?.destroy) {
        window.imageCarousel.destroy();
        window.imageCarousel = null;
      }

      AppState.isInitialized = false;
      console.log('PortfolioApp destroyed — all listeners removed');
    }
  }

  // Initialize application when DOM is ready
  const initApp = () => {
    if (window.portfolioApp) return;
    window.portfolioApp = new PortfolioApp();
    window.portfolioApp.init();

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

  window.addEventListener('beforeunload', () => window.portfolioApp?.destroy(), { once: true });

  window.AppState = AppState;
  window.Utils = Utils;
  performanceMonitor.mark('script_end');
  performanceMonitor.measure('script_start', 'script_end');
})();
