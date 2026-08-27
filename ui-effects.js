// UI Effects Module
const UIEffects = (function() {
    
    // Background image slider - zdjęcia z folderu gallery/main (M00001.JPG ... M00025.JPG)
    const SLIDER_FOLDER = 'main';
    const SLIDER_PREFIX = 'M';
    const SLIDER_COUNT = 25;   // ile numerów sprawdzić (zwiększ, jeśli dodasz zdjęcia)
    const SLIDER_EXT = 'JPG';

    // Sprawdza, czy plik istnieje (Promise<boolean>)
    function sliderImageExists(src) {
        return new Promise((resolve) => {
            const probe = new Image();
            probe.onload = () => resolve(true);
            probe.onerror = () => resolve(false);
            probe.src = src;
        });
    }

    function initBackgroundSlider() {
        const container = document.getElementById('background-slider');
        if (!container) return;

        // Zbuduj listę kandydatów: M00001.JPG ... M000NN.JPG
        const candidates = [];
        for (let i = 1; i <= SLIDER_COUNT; i++) {
            const num = String(i).padStart(5, '0');
            candidates.push(`./gallery/${SLIDER_FOLDER}/${SLIDER_PREFIX}${num}.${SLIDER_EXT}`);
        }

        // Pobierz listę zdjęć: najpierw manifest.json, w razie braku - skan z pomijaniem brakujących
        function getSliderList() {
            return fetch(`./gallery/${SLIDER_FOLDER}/manifest.json`, { cache: 'no-cache' })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        return data.map(name => `./gallery/${SLIDER_FOLDER}/${name}`);
                    }
                    return Promise.all(
                        candidates.map(src => sliderImageExists(src).then(ok => ok ? src : null))
                    ).then(results => results.filter(src => src !== null));
                })
                .catch(() => Promise.all(
                    candidates.map(src => sliderImageExists(src).then(ok => ok ? src : null))
                ).then(results => results.filter(src => src !== null)));
        }

        getSliderList()
            .then(existing => {
                if (existing.length === 0) return;

                // Wstaw znalezione zdjęcia do kontenera
                existing.forEach((src, index) => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = 'Realizacja Drewno i kamień';
                    if (index === 0) {
                        img.classList.add('active');
                        img.fetchPriority = 'high';
                    } else {
                        img.loading = 'lazy';
                    }
                    container.appendChild(img);
                });

                // Uruchom przewijanie, jeśli jest więcej niż jedno zdjęcie
                const images = container.querySelectorAll('img');
                if (images.length > 1) {
                    let currentImageIndex = 0;
                    setInterval(() => {
                        images[currentImageIndex].classList.remove('active');
                        currentImageIndex = (currentImageIndex + 1) % images.length;
                        images[currentImageIndex].classList.add('active');
                    }, 4000);
                }
            });
    }

    // Smooth scrolling for anchor links
    function initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Navbar scroll effect
    function initNavbarScrollEffect() {
        const navbar = document.querySelector('.navbar');
        
        if (!navbar) return;

        function updateNavbar() {
            if (window.scrollY > 50) {
                navbar.style.background = 'linear-gradient(135deg, rgba(138, 109, 59, 0.95) 0%, rgba(92, 67, 38, 0.95) 100%)';
                navbar.style.backdropFilter = 'blur(10px)';
                navbar.classList.add('scrolled');
            } else {
                navbar.style.background = 'linear-gradient(135deg, #8a6d3b 0%, #5c4326 100%)';
                navbar.style.backdropFilter = 'none';
                navbar.classList.remove('scrolled');
            }
        }

        // Initial check
        updateNavbar();

        // Listen for scroll events
        window.addEventListener('scroll', updateNavbar);
        
        // Throttle scroll events for better performance
        let ticking = false;
        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
                setTimeout(() => { ticking = false; }, 16); // ~60fps
            }
        }
        
        window.addEventListener('scroll', requestTick);
    }

    // Parallax effect for header (optional enhancement)
    function initParallaxEffect() {
        const header = document.getElementById('header');
        
        if (!header) return;

        function updateParallax() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            header.style.transform = `translateY(${rate}px)`;
        }

        window.addEventListener('scroll', () => {
            requestAnimationFrame(updateParallax);
        });
    }

    // Fade in animation for sections on scroll
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('fade-in-ready');
            observer.observe(section);
        });
    }

    // Hover effects for interactive elements
    function initHoverEffects() {
        // Gallery category hover sound effect (if audio is desired)
        const galleryCategories = document.querySelectorAll('.gallery-category');
        
        galleryCategories.forEach(category => {
            category.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            });
            
            category.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

        // Feature box animations
        const featureBoxes = document.querySelectorAll('.feature-box');
        
        featureBoxes.forEach(box => {
            box.addEventListener('mouseenter', function() {
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.transform = 'scale(1.1) rotate(5deg)';
                    icon.style.color = '#5c4326';
                }
            });
            
            box.addEventListener('mouseleave', function() {
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.transform = 'scale(1) rotate(0deg)';
                    icon.style.color = '#8a6d3b';
                }
            });
        });
    }

    // Loading animation
    function initLoadingEffects() {
        // Hide loader when page is fully loaded
        window.addEventListener('load', function() {
            const loader = document.querySelector('.page-loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }
        });
    }

    // Typing effect for hero text (optional)
    function initTypingEffect() {
        const heroTitle = document.querySelector('.header-content h1');
        if (!heroTitle) return;

        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        heroTitle.style.borderRight = '2px solid white';
        
        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            } else {
                // Remove cursor after typing is complete
                setTimeout(() => {
                    heroTitle.style.borderRight = 'none';
                }, 1000);
            }
        }
        
        // Start typing effect after a short delay
        setTimeout(typeWriter, 500);
    }

    // Public API
    return {
        initBackgroundSlider,
        initSmoothScrolling,
        initNavbarScrollEffect,
        initParallaxEffect,
        initScrollAnimations,
        initHoverEffects,
        initLoadingEffects,
        initTypingEffect,
        
        init: function() {
            // Initialize all UI effects
            initBackgroundSlider();
            initSmoothScrolling();
            initNavbarScrollEffect();
            initHoverEffects();
            initLoadingEffects();
            // initParallaxEffect(); // Uncomment if desired
            // initScrollAnimations(); // Uncomment if desired
            // initTypingEffect(); // Uncomment if desired
            
            console.log('UI Effects module initialized');
        }
    };
})();

// Optional: Add CSS for fade-in animations
const fadeInCSS = `
    .fade-in-ready {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .fade-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .page-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #8a6d3b 0%, #5c4326 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        transition: opacity 0.5s ease;
    }
`;

// Inject CSS if needed
if (!document.querySelector('#ui-effects-css')) {
    const style = document.createElement('style');
    style.id = 'ui-effects-css';
    style.textContent = fadeInCSS;
    document.head.appendChild(style);
}