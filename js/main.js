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
    isMobile: window.innerWidth <= 768,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    currentTheme: Storage.get('theme') ||
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

  // Analytics & Microsoft Clarity Telemetry Helper
  const AnalyticsTracker = {
    init() {
      // Set initial telemetry tags in Microsoft Clarity
      this.setTag('theme', AppState.currentTheme || 'dark');
      this.setTag('device_type', AppState.isMobile ? 'mobile' : 'desktop');
      this.setTag('reduced_motion', AppState.prefersReducedMotion ? 'true' : 'false');
      this.setTag('viewport', `${window.innerWidth}x${window.innerHeight}`);
    },

    // Set custom tag in Microsoft Clarity
    setTag(key, value) {
      try {
        if (typeof window.clarity === 'function') {
          window.clarity('set', key, String(value));
        }
      } catch (err) {
        // Fail silently without disrupting UI
      }
    },

    // Fire custom smart event in Clarity & GA4
    sendEvent(eventName, params = {}) {
      try {
        if (typeof window.clarity === 'function') {
          window.clarity('event', eventName);
        }
        if (typeof window.gtag === 'function') {
          window.gtag('event', eventName, params);
        }
      } catch (err) {
        // Fail silently
      }
    },

    // Upgrade session priority in Clarity for high-value interactions
    upgradeSession(reason) {
      try {
        if (typeof window.clarity === 'function') {
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
    }

    async init() {
      if (!this.loadingScreen) {
        // Loading screen element is intentionally absent — skip gracefully
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
          this.timeoutPromise(1400)
        ]);

        // Ensure minimum display time
        const elapsed = performance.now() - this.startTime;
        const remaining = Math.max(0, this.minDisplayTime - elapsed);

        if (remaining > 0) {
          await this.timeoutPromise(remaining);
        }

        // Hide loading screen
        await this.hideLoadingScreen();

      } catch (error) {
        console.warn('Loading screen error:', error);
        this.forceHide();
      }
    }

    setupForceHide() {
      // Always fail open if a third-party asset stalls.
      this.forceHideTimeout = setTimeout(() => {
        if (!this.isHidden) {
          console.warn('Force hiding loading screen after timeout');
          this.forceHide();
        }
      }, this.maxDisplayTime);

      // Add global escape hatch for debugging
      // window.forceHideLoading = () => this.forceHide();
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
        const duration = AppState.prefersReducedMotion ? 0 : 1350;
        const startedAt = performance.now();

        const updateProgress = () => {
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

          setTimeout(updateProgress, 32);
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

      this.progress = 100;
      this.updateProgressElements();

      // Final message
      if (this.loadingPercentage) {
        this.loadingPercentage.innerHTML = `
                <span>100%</span>
                <div>Ready to explore.</div>`;
      }

      // Give the completion state a brief moment to register.
      await this.timeoutPromise(AppState.prefersReducedMotion ? 0 : 220);

      // Fade out animation
      if (this.loadingScreen) {
        this.loadingScreen.style.transition = 'opacity 0.45s ease, visibility 0.45s ease';
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
        }, 480);

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
      const skipLoading = Storage.get('skipLoading') === 'true' ||
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

      // Note: LoadingManager.setupForceHide() already handles the 12s max timeout internally.

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
      this.animatedBackground = document.querySelector('.animated-background, .animated-bg');

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
      this.sectionDots = document.querySelectorAll('.section-dot');
      // Store bound scroll handlers so they can be removed in destroy()
      this.boundHandlers = { updateBackToTop: null, updateHeader: null, resetMobileMenu: null };
      this.sectionObserver = null;

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

      this.sectionDots.forEach(dot => {
        const navigate = () => {
          const target = document.getElementById(dot.dataset.section);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.mainNav.classList.contains('active')) {
          this.closeMobileMenu();
          this.mobileMenuToggle.focus();
        }
      });
      this.boundHandlers.resetMobileMenu = () => {
        AppState.isMobile = window.innerWidth <= 768;
        if (!AppState.isMobile && this.mainNav.classList.contains('active')) {
          this.closeMobileMenu();
        }
      };
      window.addEventListener('resize', this.boundHandlers.resetMobileMenu, { passive: true });
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

      this.sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.setActiveSection(entry.target.id);
          }
        });
      }, observerOptions);

      document.querySelectorAll('section[id]').forEach(section => {
        this.sectionObserver.observe(section);
      });
    }

    setActiveSection(sectionId) {
      if (AppState.activeSection !== sectionId) {
        AppState.activeSection = sectionId;
        AnalyticsTracker.setTag('active_section', sectionId);
        AnalyticsTracker.sendEvent('section_view', { section: sectionId });
      }

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
      this.mainNav.classList.remove('active');
      this.mobileMenuToggle.classList.remove('active');
      document.body.classList.remove('nav-open');
      this.mobileMenuToggle.setAttribute('aria-expanded', 'false');

      const icon = this.mobileMenuToggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    }

    initThemeToggle() {
      if (!this.themeToggle) return;

      this.applyTheme(AppState.currentTheme, false);

      this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
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
      this.themeToggle.setAttribute('aria-pressed', String(isDark));
      this.themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      this.updateThemeIcon(isDark ? 'sun' : 'moon');

      if (persist) {
        Storage.set('theme', themeStr);
        AnalyticsTracker.setTag('theme', themeStr);
        AnalyticsTracker.sendEvent('theme_toggle', { theme: themeStr });
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

      this.boundHandlers.updateBackToTop = Utils.throttle(() => {
        this.backToTop.classList.toggle('visible', window.pageYOffset > 300);
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.boundHandlers.updateBackToTop);

      this.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    initHeaderScrollEffect() {
      const header = document.querySelector('header');
      if (!header) return;

      this.boundHandlers.updateHeader = Utils.throttle(() => {
        header.classList.toggle('scrolled', window.scrollY > 50);
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.boundHandlers.updateHeader);
    }

    destroy() {
      if (this.boundHandlers.updateBackToTop) {
        window.removeEventListener('scroll', this.boundHandlers.updateBackToTop);
      }
      if (this.boundHandlers.updateHeader) {
        window.removeEventListener('scroll', this.boundHandlers.updateHeader);
      }
      if (this.boundHandlers.resetMobileMenu) {
        window.removeEventListener('resize', this.boundHandlers.resetMobileMenu);
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
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
        scrollIndicator.style.width = `${scrollPercent}%`;
      }, CONFIG.animations.scrollThrottle);

      window.addEventListener('scroll', this.scrollIndicatorHandler, { passive: true });
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

    destroy() {
      if (this.scrollIndicatorHandler) {
        window.removeEventListener('scroll', this.scrollIndicatorHandler);
      }
      if (this.observer) {
        this.observer.disconnect();
      }
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
      // chatWidget and chatBox removed — chat feature disabled
      this.caseStudyModal = document.getElementById('caseStudyModal');
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
        // Swiper project CTAs are handled by ProjectManager and open the project view.
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

        // Track contact form submission and prioritize Clarity session recording
        AnalyticsTracker.sendEvent('contact_form_submit', { timestamp: Date.now() });
        AnalyticsTracker.upgradeSession('contact_form_submission');

        // Loading state
        btn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Sending...</span>';
        btn.disabled = true;
        btn.style.opacity = '0.8';
        if (status) status.textContent = 'Preparing your message…';

        // Simulate request
        setTimeout(() => {
          btn.innerHTML = '<span><i class="fas fa-check"></i> Sent!</span>';
          btn.style.backgroundColor = '#00C851';
          btn.style.borderColor = '#00C851';
          if (status) status.textContent = 'Thanks — your message is ready to send.';

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
            if (status) status.textContent = '';
          }, 3000);
        }, 1500);
      });
    }

    initInteractiveCards() {
      document.querySelectorAll('.interactive-card').forEach(card => {
        if (AppState.isMobile || AppState.prefersReducedMotion) return;

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

    initProjectFilters() {
      const filterButtons = document.querySelectorAll('.filter-btn');
      const projectCards = document.querySelectorAll('.project-card');

      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          const filter = button.getAttribute('data-filter') || 'all';
          AnalyticsTracker.sendEvent('project_filter_click', { filter });
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

      // Improved keyboard trap: uses comprehensive selector, handles disabled elements
      // and single-focusable-element edge cases
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
          this.caseStudyModal.classList.remove('active');
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
            e.preventDefault(); // trap on single element
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
          img.onload = () => img.classList.remove('skeleton-loading');
          img.onerror = () => img.classList.remove('skeleton-loading');
        }
      });
    }

    initHighContrast() {
      const toggle = document.getElementById('highContrastToggle');
      if (!toggle) return;

      if (Storage.get('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
      }

      toggle.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        const isHighContrast = document.body.classList.contains('high-contrast');
        Storage.set('highContrast', isHighContrast);
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
          const cmd = commands[index];
          if (cmd) {
            AnalyticsTracker.sendEvent('command_palette_action', { command: cmd.name });
            cmd.action();
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
      dots.forEach(dot => dot.setAttribute('aria-current', 'false'));
      if (dots[index]) {
        dots[index].classList.add('active');
        dots[index].setAttribute('aria-current', 'true');
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
      if (!this.dotsContainer) return;
      this.dotsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('carousel-dot')) {
          const index = parseInt(e.target.dataset.index);
          this.showSlide(index);
        }
      });

      // Keyboard nav
      document.addEventListener('keydown', (e) => {
        if (!this.container.contains(document.activeElement)) return;
        if (e.key === 'ArrowLeft') this.prevSlide();
        if (e.key === 'ArrowRight') this.nextSlide();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopAutoScroll();
        else this.startAutoScroll();
      });
    }
  }
  // Pro Features Manager (Custom Cursor & Scroll Progress)
  class ProFeaturesManager {
    constructor() {
      this.cursorDot = document.querySelector('[data-cursor-dot]');
      this.cursorOutline = document.querySelector('[data-cursor-outline]');
      this.scrollProgress = document.getElementById('scrollProgress');
      this.ticking = false; // Initialize to prevent undefined-check race conditions

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

      this.scrollProgressHandler = () => {
        if (this.ticking) return;
        this.ticking = true;
        window.requestAnimationFrame(() => {
          const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
          const scrollHeight = Math.max(
            document.documentElement.scrollHeight - document.documentElement.clientHeight,
            1
          );
          const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
          this.scrollProgress.style.width = `${progress}%`;
          this.ticking = false;
        });
      };

      window.addEventListener('scroll', this.scrollProgressHandler, { passive: true });
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
      this.ticking = false; // Initialize to prevent undefined-check race conditions

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

  // ChatWidget removed — chat feature disabled



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

      // Interaction state
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.scrollProgress = 0;
      this.targetScrollProgress = 0;
      this.clock = null;

      // Scene components
      this.coreGroup = null;
      this.coreShaderMat = null;
      this.gimbalRings = [];
      this.synapticGroup = null;
      this.synapticLines = null;
      this.matrixGroup = null;
      this.chronometerGroup = null;
      this.gridGroup = null;
      this.gridMesh = null;
      this.shards = [];
      this.waveField = null;
      this.waveGeo = null;
      this.warpLines = null;
      this.warpPoints = null;
      this.singularityGroup = null;
      this.ambientParticles = null;

      // Lights
      this.ambientLight = null;
      this.dirLight = null;
      this.pointLightCyan = null;
      this.pointLightViolet = null;

      // Dynamic camera targets
      this.camPos = null;
      this.camLook = null;
      this.currentCamPos = null;
      this.currentCamLook = null;

      this.animate = this.animate.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
    }

    init() {
      if (!window.THREE || AppState.prefersReducedMotion) return;
      const targetCanvas = this.canvas || (this.container ? this.container.querySelector('canvas') : null);

      // Tier detection for performance budget
      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
      this.tier = isMobile ? 0 : isTablet ? 1 : 2;
      const particleCount = [250, 600, 1100][this.tier];
      const maxPixelRatio = [1.0, 1.25, 1.5][this.tier];

      try {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05070d, 0.032);
        this.clock = new THREE.Clock();

        // 2. Camera Setup
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 800);
        this.camPos = new THREE.Vector3(0, 0, 18);
        this.camLook = new THREE.Vector3(0, 0, 0);
        this.currentCamPos = this.camPos.clone();
        this.currentCamLook = this.camLook.clone();
        this.camera.position.copy(this.currentCamPos);
        this.camera.lookAt(this.currentCamLook);

        // 3. Renderer Setup
        const renderOptions = {
          alpha: true,
          antialias: this.tier >= 1,
          powerPreference: 'high-performance'
        };
        if (this.canvas) {
          renderOptions.canvas = this.canvas;
          this.renderer = new THREE.WebGLRenderer(renderOptions);
        } else {
          this.renderer = new THREE.WebGLRenderer(renderOptions);
          this.renderer.domElement.id = 'webgl-3d-canvas';
          this.renderer.domElement.className = 'webgl-3d-canvas';
          const parent = document.querySelector('.animated-bg') || document.body;
          parent.prepend(this.renderer.domElement);
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
        this.renderer.setClearColor(0x05070d, 0);

        // 4. Build Environment Systems
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
        window.addEventListener('beforeunload', () => this.dispose(), { once: true });

        // Initial layout sync
        this.onScroll();

        // 6. Start Loop
        this.animate();
        console.log('🌌 Cinematic 3D Experience initialized successfully [Tier: ' + this.tier + ']');
      } catch (err) {
        console.warn('WebGL 3D Experience initialization skipped:', err);
      }
    }

    buildLighting() {
      this.ambientLight = new THREE.AmbientLight(0x0f1c3f, 0.45);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xbbeeff, 0.9);
      this.dirLight.position.set(5, 12, 10);
      this.scene.add(this.dirLight);

      this.pointLightCyan = new THREE.PointLight(0x00f0ff, 3.2, 35, 1.4);
      this.pointLightCyan.position.set(2, 2, 8);
      this.scene.add(this.pointLightCyan);

      this.pointLightViolet = new THREE.PointLight(0x8855ff, 2.5, 30, 1.4);
      this.pointLightViolet.position.set(-3, -2, 6);
      this.scene.add(this.pointLightViolet);
    }

    buildQuantumCore() {
      this.coreGroup = new THREE.Group();
      this.coreGroup.position.set(2.8, 0.5, 0); // Positioned elegantly in hero
      this.scene.add(this.coreGroup);

      // Custom GLSL noise vertex deformation + Fresnel glow
      const vertexShader = `
                uniform float uTime;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;

                // Classic 3D Simplex-like hash noise
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
                    float noise = snoise(position * 0.45 + vec3(uTime * 0.35));
                    vDisplacement = noise;
                    vec3 newPosition = position + normal * (noise * 0.45);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `;

      const fragmentShader = `
                uniform vec3 uColorCyan;
                uniform vec3 uColorViolet;
                uniform float uTime;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;

                void main() {
                    vec3 viewDir = normalize(-vPosition);
                    float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.4);
                    float pulse = 0.5 + 0.5 * sin(uTime * 1.8 + vDisplacement * 4.0);
                    vec3 glowColor = mix(uColorCyan, uColorViolet, pulse);
                    vec3 baseColor = vec3(0.02, 0.05, 0.12);
                    vec3 finalColor = mix(baseColor, glowColor, fresnel * 1.25);
                    finalColor += glowColor * (vDisplacement * 0.25);
                    gl_FragColor = vec4(finalColor, 0.88);
                }
            `;

      this.coreShaderMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorCyan: { value: new THREE.Color(0x00f0ff) },
          uColorViolet: { value: new THREE.Color(0x8855ff) }
        },
        transparent: true,
        wireframe: false
      });

      const coreGeo = new THREE.IcosahedronGeometry(2.4, this.tier >= 1 ? 4 : 2);
      const coreMesh = new THREE.Mesh(coreGeo, this.coreShaderMat);
      this.coreGroup.add(coreMesh);

      // Outer wireframe crystalline aura
      const wireGeo = new THREE.IcosahedronGeometry(2.65, 2);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x49e8fa,
        wireframe: true,
        transparent: true,
        opacity: 0.32
      });
      this.coreWireMesh = new THREE.Mesh(wireGeo, wireMat);
      this.coreGroup.add(this.coreWireMesh);

      // Nested chromatic nucleus
      const nucleusGeo = new THREE.OctahedronGeometry(1.2, 0);
      const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.9
      });
      this.nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
      this.coreGroup.add(this.nucleusMesh);

      // Gyroscopic Gimbal Rings with orbiting beads
      const ringConfigs = [
        { r: 3.5, tube: 0.035, color: 0x00f0ff, rot: [0.8, 0.2, 0], speed: 0.45 },
        { r: 4.3, tube: 0.028, color: 0x8855ff, rot: [-0.6, 0.9, 0.3], speed: -0.32 },
        { r: 5.1, tube: 0.022, color: 0x00d4ff, rot: [0.3, -0.7, 0.8], speed: 0.22 }
      ];

      this.gimbalRings = [];
      ringConfigs.forEach(cfg => {
        const ringGeo = new THREE.TorusGeometry(cfg.r, cfg.tube, 12, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          emissive: cfg.color,
          emissiveIntensity: 0.6,
          metalness: 0.85,
          roughness: 0.2,
          transparent: true,
          opacity: 0.75
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.set(...cfg.rot);
        ringMesh.userData = { speed: cfg.speed, baseRot: [...cfg.rot] };
        this.coreGroup.add(ringMesh);
        this.gimbalRings.push(ringMesh);

        // Small orbiting photon bead on each ring
        const beadGeo = new THREE.SphereGeometry(0.09, 8, 8);
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.x = cfg.r;
        ringMesh.add(bead);
      });
    }

    buildSynapticLattice() {
      // Neural constellation for #about
      this.synapticGroup = new THREE.Group();
      this.synapticGroup.position.set(-2, 0, -4);
      this.synapticGroup.visible = false;
      this.scene.add(this.synapticGroup);

      const nodeCount = this.tier >= 1 ? 28 : 14;
      const nodes = [];
      const nodeGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00b4ff,
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.1
      });

      for (let i = 0; i < nodeCount; i++) {
        const mesh = new THREE.Mesh(nodeGeo, nodeMat);
        mesh.position.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        );
        this.synapticGroup.add(mesh);
        nodes.push(mesh.position);
      }

      // Connect nearby nodes with glowing lines
      const linePoints = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].distanceTo(nodes[j]) < 4.2) {
            linePoints.push(nodes[i].clone(), nodes[j].clone());
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x49e8fa,
        transparent: true,
        opacity: 0.35
      });
      this.synapticLines = new THREE.LineSegments(lineGeo, lineMat);
      this.synapticGroup.add(this.synapticLines);
    }

    buildCyberMatrix() {
      // High-tech floating crystalline objects for #tech-stack & #services
      this.matrixGroup = new THREE.Group();
      this.matrixGroup.position.set(0, 0, -10);
      this.matrixGroup.visible = false;
      this.scene.add(this.matrixGroup);

      const geometries = [
        new THREE.TetrahedronGeometry(0.45, 0),
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.DodecahedronGeometry(0.38, 0),
        new THREE.BoxGeometry(0.5, 0.5, 0.5)
      ];

      const count = this.tier >= 1 ? 16 : 8;
      for (let i = 0; i < count; i++) {
        const geo = geometries[i % geometries.length];
        const isViolet = i % 2 === 0;
        const mat = new THREE.MeshPhysicalMaterial({
          color: isViolet ? 0x8855ff : 0x00f0ff,
          emissive: isViolet ? 0x331166 : 0x003355,
          metalness: 0.85,
          roughness: 0.15,
          transmission: 0.5,
          transparent: true,
          opacity: 0.85
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8
        );
        mesh.userData = {
          speedX: 0.008 + Math.random() * 0.015,
          speedY: 0.006 + Math.random() * 0.012,
          floatOffset: Math.random() * Math.PI * 2
        };
        this.matrixGroup.add(mesh);
      }
    }

    buildCircadianChronometer() {
      // Concentric orbital rings with markers for #routine & #goals
      this.chronometerGroup = new THREE.Group();
      this.chronometerGroup.position.set(2.5, 0, -6);
      this.chronometerGroup.rotation.x = 0.55;
      this.chronometerGroup.visible = false;
      this.scene.add(this.chronometerGroup);

      const ringRadii = [2.2, 3.4, 4.6];
      ringRadii.forEach((rad, idx) => {
        const geo = new THREE.RingGeometry(rad, rad + 0.03, 64);
        const mat = new THREE.MeshBasicMaterial({
          color: idx === 1 ? 0x8855ff : 0x00f0ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45
        });
        const ring = new THREE.Mesh(geo, mat);
        this.chronometerGroup.add(ring);

        // Add 4 tick markers per ring
        for (let k = 0; k < 4; k++) {
          const angle = (k / 4) * Math.PI * 2;
          const markerGeo = new THREE.BoxGeometry(0.12, 0.04, 0.04);
          const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.position.set(Math.cos(angle) * rad, Math.sin(angle) * rad, 0);
          marker.rotation.z = angle;
          this.chronometerGroup.add(marker);
        }
      });
    }

    buildPerspectiveGridAndShards() {
      // 3D Perspective Grid & Iridescent Shards for #projects
      this.gridGroup = new THREE.Group();
      this.gridGroup.position.set(0, -5, -8);
      this.gridGroup.visible = false;
      this.scene.add(this.gridGroup);

      // Infinite wireframe grid floor
      const gridHelper = new THREE.GridHelper(50, 40, 0x00f0ff, 0x1a284e);
      gridHelper.position.y = 0;
      this.gridGroup.add(gridHelper);

      // Floating translucent refractive glass shards
      this.shards = [];
      const shardCount = this.tier >= 1 ? 10 : 5;
      for (let i = 0; i < shardCount; i++) {
        const geo = new THREE.ConeGeometry(0.7, 1.8, 3);
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0x49e8fa,
          emissive: 0x002233,
          metalness: 0.9,
          roughness: 0.1,
          transmission: 0.75,
          ior: 1.45,
          transparent: true,
          opacity: 0.8
        });
        const shard = new THREE.Mesh(geo, mat);
        shard.position.set(
          (Math.random() - 0.5) * 18,
          1.5 + Math.random() * 4,
          (Math.random() - 0.5) * 12
        );
        shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        shard.userData = {
          rotSpeed: 0.005 + Math.random() * 0.01,
          floatSpeed: 0.8 + Math.random() * 0.6,
          baseY: shard.position.y
        };
        this.gridGroup.add(shard);
        this.shards.push(shard);
      }
    }

    buildSignalWaveField() {
      // Undulating particle wave field for #open-source, #speaking, #blog
      const cols = this.tier >= 1 ? 32 : 20;
      const rows = this.tier >= 1 ? 32 : 20;
      const count = cols * rows;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const cyan = new THREE.Color(0x00f0ff);
      const violet = new THREE.Color(0x8855ff);

      let idx = 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - cols / 2) * 0.65;
          const z = (j - rows / 2) * 0.65;
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
        size: 0.09,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });

      this.waveField = new THREE.Points(this.waveGeo, waveMat);
      this.waveField.position.set(0, -3.2, -6);
      this.waveField.visible = false;
      this.scene.add(this.waveField);
    }

    buildTemporalWarp() {
      // High-velocity light streaks for #experience & #tools
      const count = this.tier >= 1 ? 160 : 70;
      const positions = new Float32Array(count * 6); // 2 vertices per streak
      this.warpPoints = [];

      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 18;
        const y = (Math.random() - 0.5) * 12;
        const z = -25 + Math.random() * 30;
        const len = 1.2 + Math.random() * 2.5;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;

        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y;
        positions[i * 6 + 5] = z - len;

        this.warpPoints.push({ x, y, z, len, speed: 18 + Math.random() * 25 });
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.5
      });

      this.warpLines = new THREE.LineSegments(geo, mat);
      this.warpLines.visible = false;
      this.scene.add(this.warpLines);
    }

    buildAmbientDust(count) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 35;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 45;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.05,
        transparent: true,
        opacity: 0.4,
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
      this.targetScrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    }

    onResize() {
      if (!this.renderer || !this.camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    animate() {
      this.animationId = requestAnimationFrame(this.animate);
      if (!this.clock || !this.renderer || !this.scene || !this.camera) return;

      const dt = Math.min(0.05, this.clock.getDelta());
      const time = this.clock.getElapsedTime();

      // ── 1. Smooth Interpolation (Lerp) ──
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;
      this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.065;
      const p = this.scrollProgress;

      // ── 2. Multi-Zone Scroll Pathing ──
      // Zones:
      // 0.00 - 0.12 : #home (Genesis Core)
      // 0.12 - 0.26 : #about (Synaptic Lattice)
      // 0.26 - 0.42 : #tech-stack & #services (Cyber Matrix)
      // 0.42 - 0.56 : #routine & #goals (Circadian Chronometer)
      // 0.56 - 0.72 : #projects & #stats (Cyber Grid & Prisms)
      // 0.72 - 0.84 : #open-source / #blog (Signal Wave)
      // 0.84 - 0.94 : #experience & #tools (Temporal Warp)
      // 0.94 - 1.00 : #contact (Singularity Convergence)

      if (p < 0.12) {
        // Zone 0: Hero
        this.camPos.set(1.2 + this.mouse.x * 0.8, -this.mouse.y * 0.5, 14);
        this.camLook.set(1.0, 0, 0);
        this.coreGroup.visible = true;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      } else if (p < 0.26) {
        // Zone 1: About
        const t = (p - 0.12) / 0.14;
        this.camPos.set(-2 + this.mouse.x * 0.8, 1 - this.mouse.y * 0.4, 12 - t * 2);
        this.camLook.set(-1.5, 0, 0);
        this.coreGroup.visible = t < 0.5;
        this.synapticGroup.visible = true;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      } else if (p < 0.42) {
        // Zone 2: Tech Stack / Services
        const t = (p - 0.26) / 0.16;
        this.camPos.set(0 + this.mouse.x * 0.9, 3 - this.mouse.y * 0.5, 13);
        this.camLook.set(0, 0, -5);
        this.coreGroup.visible = false;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = true;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      } else if (p < 0.56) {
        // Zone 3: Routine & Goals
        this.camPos.set(2.0 + this.mouse.x * 0.7, 2 - this.mouse.y * 0.4, 11);
        this.camLook.set(1.5, 0, -3);
        this.coreGroup.visible = false;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = true;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      } else if (p < 0.72) {
        // Zone 4: Projects & Stats
        const t = (p - 0.56) / 0.16;
        this.camPos.set(0 + this.mouse.x * 1.0, 1 - this.mouse.y * 0.4, 14);
        this.camLook.set(0, -2, -6);
        this.coreGroup.visible = false;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = true;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      } else if (p < 0.84) {
        // Zone 5: Open Source & Publications
        this.camPos.set(0 + this.mouse.x * 0.8, 3 - this.mouse.y * 0.4, 11);
        this.camLook.set(0, -2.5, -4);
        this.coreGroup.visible = false;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = true;
        this.warpLines.visible = false;
      } else if (p < 0.94) {
        // Zone 6: Timeline & Tools
        this.camPos.set(0 + this.mouse.x * 0.6, -this.mouse.y * 0.4, 8);
        this.camLook.set(0, 0, -20);
        this.coreGroup.visible = false;
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = true;
      } else {
        // Zone 7: Contact (Singularity Convergence)
        this.camPos.set(0 + this.mouse.x * 0.6, 0.5 - this.mouse.y * 0.4, 9);
        this.camLook.set(0, 0, 0);
        this.coreGroup.visible = true;
        this.coreGroup.position.set(0, 0, 0); // Converge to center
        this.coreGroup.scale.setScalar(0.75);
        this.synapticGroup.visible = false;
        this.matrixGroup.visible = false;
        this.chronometerGroup.visible = false;
        this.gridGroup.visible = false;
        this.waveField.visible = false;
        this.warpLines.visible = false;
      }

      // Damped Camera Movement
      this.currentCamPos.lerp(this.camPos, 0.05);
      this.currentCamLook.lerp(this.camLook, 0.05);
      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLook);

      // ── 3. Component Animations ──

      // Quantum Core Updates
      if (this.coreGroup && this.coreGroup.visible) {
        if (this.coreShaderMat) {
          this.coreShaderMat.uniforms.uTime.value = time;
        }
        this.coreGroup.rotation.y += 0.005;
        this.coreGroup.rotation.x += 0.002;

        if (this.coreWireMesh) {
          this.coreWireMesh.rotation.y -= 0.007;
          this.coreWireMesh.rotation.z += 0.004;
        }
        if (this.nucleusMesh) {
          this.nucleusMesh.rotation.x += 0.012;
          this.nucleusMesh.rotation.y -= 0.008;
        }
        this.gimbalRings.forEach(ring => {
          ring.rotation.z += ring.userData.speed * dt;
          ring.rotation.y += ring.userData.speed * 0.5 * dt;
        });
      }

      // Synaptic Lattice Updates
      if (this.synapticGroup && this.synapticGroup.visible) {
        this.synapticGroup.rotation.y = time * 0.04 + this.mouse.x * 0.15;
        this.synapticGroup.rotation.x = Math.sin(time * 0.3) * 0.08;
      }

      // Cyber Matrix Updates
      if (this.matrixGroup && this.matrixGroup.visible) {
        this.matrixGroup.children.forEach(child => {
          child.rotation.x += child.userData.speedX;
          child.rotation.y += child.userData.speedY;
          child.position.y += Math.sin(time * 1.5 + child.userData.floatOffset) * 0.004;
        });
      }

      // Chronometer Updates
      if (this.chronometerGroup && this.chronometerGroup.visible) {
        this.chronometerGroup.rotation.z = time * 0.12;
      }

      // Grid & Shards Updates
      if (this.gridGroup && this.gridGroup.visible) {
        this.shards.forEach(shard => {
          shard.rotation.x += shard.userData.rotSpeed;
          shard.rotation.y += shard.userData.rotSpeed * 1.2;
          shard.position.y = shard.userData.baseY + Math.sin(time * shard.userData.floatSpeed) * 0.3;
        });
      }

      // Signal Wave Field Updates
      if (this.waveField && this.waveField.visible && this.waveGeo) {
        const posAttr = this.waveGeo.attributes.position;
        const posArray = posAttr.array;
        const cols = this.tier >= 1 ? 32 : 20;
        const rows = this.tier >= 1 ? 32 : 20;

        let idx = 0;
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = posArray[idx * 3];
            const z = posArray[idx * 3 + 2];
            posArray[idx * 3 + 1] = Math.sin(x * 0.45 + time * 1.8) * 0.55 +
              Math.cos(z * 0.45 + time * 1.4) * 0.45;
            idx++;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Temporal Warp Streak Updates
      if (this.warpLines && this.warpLines.visible) {
        const posAttr = this.warpLines.geometry.attributes.position;
        const posArray = posAttr.array;

        for (let i = 0; i < this.warpPoints.length; i++) {
          const wp = this.warpPoints[i];
          wp.z += wp.speed * dt;
          if (wp.z > 12) wp.z = -28;

          posArray[i * 6 + 2] = wp.z;
          posArray[i * 6 + 5] = wp.z - wp.len;
        }
        posAttr.needsUpdate = true;
      }

      // Ambient Particles Rotation
      if (this.ambientParticles) {
        this.ambientParticles.rotation.y = time * 0.015;
        this.ambientParticles.rotation.x = time * 0.008;
      }

      // Dynamic Point Lights tracking mouse
      if (this.pointLightCyan) {
        this.pointLightCyan.position.x = 2 + this.mouse.x * 4;
        this.pointLightCyan.position.y = 2 - this.mouse.y * 3;
      }
      if (this.pointLightViolet) {
        this.pointLightViolet.position.x = -3 + this.mouse.x * 3;
        this.pointLightViolet.position.y = -2 - this.mouse.y * 2;
      }

      // ── 4. Render ──
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);

      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }

      // Dispose geometries and materials recursively
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

      // Track project interaction in Clarity & upgrade session priority
      AnalyticsTracker.sendEvent('project_modal_open', { project: title });
      AnalyticsTracker.upgradeSession('project_modal_opened');

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
      // Cinematic 3D Experience Engine
      this.cinematic3D = new Cinematic3DExperience();
      this.projectManager = new ProjectManager();
    }

    async init() {
      if (AppState.isInitialized) return;

      try {
        // Initialize loading screen first (if not already running)
        if (!window.loadingManager) {
          await this.loadingManager.init();
        }

        // Initialize telemetry & analytics tracker
        AnalyticsTracker.init();

        // Initialize all components
        this.backgroundEffects.init();
        this.navigationManager.init();
        this.animationManager.init();
        this.interactiveManager.init();
        this.swiperManager.init();
        this.phase2Manager.init();
        this.commandPaletteManager.init();
        this.cinematic3D.init();
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

    /* Cleanup all resources — call on page unload or SPA route change */
    destroy() {
      this.navigationManager?.destroy();
      this.animationManager?.destroy();
      this.proFeaturesManager?.destroy();
      this.cinematic3D?.dispose();
      AppState.isInitialized = false;
      console.log('PortfolioApp destroyed — all listeners removed');
    }
  }
  // Initialize application when DOM is ready
  const initApp = () => {
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
  // Clean up all resources on page unload
  window.addEventListener('beforeunload', () => window.portfolioApp?.destroy(), { once: true });
  // Export for debugging
  window.AppState = AppState;
  window.Utils = Utils;
  performanceMonitor.mark('script_end');
  performanceMonitor.measure('script_start', 'script_end');
})();




