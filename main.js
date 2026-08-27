// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing modules...');
    
    // Initialize all modules
    try {
        // Initialize Gallery module
        if (typeof Gallery !== 'undefined') {
            Gallery.init();
            console.log('✓ Gallery module initialized');
        } else {
            console.error('Gallery module not found');
        }
        
        // Initialize UI Effects module
        if (typeof UIEffects !== 'undefined') {
            UIEffects.init();
            console.log('✓ UI Effects module initialized');
        } else {
            console.error('UIEffects module not found');
        }
        
        // Initialize Utils module
        if (typeof Utils !== 'undefined') {
            Utils.init();
            console.log('✓ Utils module initialized');
        } else {
            console.error('Utils module not found');
        }
        
        console.log('All modules initialized successfully!');
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
    
    // Additional initialization code can go here
    
    // Log initial state
    console.log('Background slider images:', document.querySelectorAll('.background-slider img').length);
    console.log('Gallery cache size:', Gallery.getCacheSize ? Gallery.getCacheSize() : 'N/A');
});

// Handle page visibility changes (pause/resume animations when tab is not visible)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page is hidden - pausing animations');
        // You could pause animations here if needed
    } else {
        console.log('Page is visible - resuming animations');
        // Resume animations here if needed
    }
});

// Error handling for uncaught errors
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    // You could send error reports to a logging service here
});

// Performance monitoring
window.addEventListener('load', function() {
    // Log performance metrics
    if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
});