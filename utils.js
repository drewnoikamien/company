// Utils Module
const Utils = (function() {
    
    // Form submission handler
    function initFormHandler() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form data
                const formData = new FormData(this);
                const formObject = {};
                
                // Convert FormData to object
                for (let [key, value] of formData.entries()) {
                    formObject[key] = value;
                }
                
                // Validate form
                if (validateForm(formObject)) {
                    // Show success message
                    showNotification('Thank you for your message! We will get back to you soon.', 'success');
                    
                    // Reset form
                    this.reset();
                    
                    // Here you could send data to server
                    // sendFormData(formObject);
                } else {
                    showNotification('Please fill in all required fields correctly.', 'error');
                }
            });
        });
    }

    // Simple form validation
    function validateForm(data) {
        const required = ['name', 'email', 'message'];
        
        for (let field of required) {
            if (!data[field] || data[field].trim() === '') {
                return false;
            }
        }
        
        // Email validation
        if (data.email && !isValidEmail(data.email)) {
            return false;
        }
        
        return true;
    }

    // Email validation helper
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideNotification(notification);
        }, 5000);
        
        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            hideNotification(notification);
        });
    }

    function getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    function hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    // Event listeners manager
    function initEventListeners() {
        // Modal click outside to close
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('lightbox-modal')) {
                event.target.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            if (event.target.classList.contains('image-zoom-modal')) {
                Gallery.closeImageZoom();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', function(event) {
            const modal = document.getElementById('image-zoom-modal');
            if (modal && modal.style.display === 'block') {
                switch(event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        Gallery.previousImage();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        Gallery.nextImage();
                        break;
                    case 'Escape':
                        event.preventDefault();
                        Gallery.closeImageZoom();
                        break;
                }
            }
            
            // Global escape key handler
            if (event.key === 'Escape') {
                closeAllModals();
            }
        });

        // Window resize handler
        window.addEventListener('resize', function() {
            // Debounce resize events
            clearTimeout(window.resizeTimeout);
            window.resizeTimeout = setTimeout(() => {
                Gallery.handleResize();
                // Add other resize handlers here
            }, 250);
        });

        // Prevent right-click on gallery images (optional)
        document.addEventListener('contextmenu', function(event) {
            if (event.target.closest('.lightbox-gallery img, .image-zoom-modal img')) {
                event.preventDefault();
            }
        });

        // Handle broken images
        document.addEventListener('error', function(event) {
            if (event.target.tagName === 'IMG') {
                handleBrokenImage(event.target);
            }
        }, true);
    }

    // Close all open modals
    function closeAllModals() {
        const modals = document.querySelectorAll('.lightbox-modal, .image-zoom-modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    // Handle broken images
    function handleBrokenImage(img) {
        img.style.display = 'none';
        
        // Add placeholder if in gallery
        if (img.closest('.lightbox-gallery')) {
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.innerHTML = '<i class="fas fa-image"></i><br>Image not available';
            img.parentNode.appendChild(placeholder);
        }
    }

    // Utility functions
    function debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Device detection
    function getDeviceType() {
        const width = window.innerWidth;
        if (width <= 768) return 'mobile';
        if (width <= 1024) return 'tablet';
        return 'desktop';
    }

    // Browser detection
    function getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        
        return {
            browser,
            userAgent,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
        };
    }

    // Local storage helpers
    function setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }

    function getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    // Performance monitoring
    function measurePerformance(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }

    // Add CSS for notifications
    function addNotificationStyles() {
        if (document.querySelector('#utils-css')) return;
        
        const css = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 100000;
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }
            
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification-content {
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border-left: 4px solid #8a6d3b;
            }
            
            .notification-success .notification-content {
                border-left-color: #28a745;
            }
            
            .notification-error .notification-content {
                border-left-color: #dc3545;
            }
            
            .notification-warning .notification-content {
                border-left-color: #ffc107;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: auto;
                opacity: 0.6;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .image-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 200px;
                background: #f8f9fa;
                color: #6c757d;
                border-radius: 10px;
                font-size: 0.9rem;
            }
            
            .image-placeholder i {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
        `;
        
        const style = document.createElement('style');
        style.id = 'utils-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Public API
    return {
        initFormHandler,
        initEventListeners,
        showNotification,
        closeAllModals,
        debounce,
        throttle,
        getDeviceType,
        getBrowserInfo,
        setStorage,
        getStorage,
        measurePerformance,
        validateForm,
        isValidEmail,
        
        init: function() {
            addNotificationStyles();
            initFormHandler();
            initEventListeners();
            
            console.log('Utils module initialized');
            console.log('Device:', getDeviceType());
            console.log('Browser:', getBrowserInfo().browser);
        }
    };
})();