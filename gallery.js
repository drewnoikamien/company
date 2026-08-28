// Gallery Module with Optimized Loading
const Gallery = (function() {
    // ============ KONFIGURACJA GALERII ============
    // Każda sekcja galerii ma swój folder w gallery/. Listy plików pobierane
    // są z manifest.json w danym folderze (generowanym skryptem generate-manifests.py).
    // Mapowanie: identyfikator kategorii (użyty w index.html) -> nazwa folderu.
    const GALLERY_CATEGORIES = {
        'domy': 'house',
        'baseny': 'swimming_pool',
        'zadaszenia': 'others'
    };

    // Cache informacji, które pliki istnieją (nazwa -> true/false)
    const existenceCache = new Map();

    // Sprawdza, czy plik obrazu istnieje (zwraca Promise<boolean>)
    function checkImageExists(folder, imageName) {
        const key = `${folder}/${imageName}`;
        if (existenceCache.has(key)) {
            return Promise.resolve(existenceCache.get(key));
        }
        return new Promise((resolve) => {
            const probe = new Image();
            probe.onload = () => { existenceCache.set(key, true); resolve(true); };
            probe.onerror = () => { existenceCache.set(key, false); resolve(false); };
            probe.src = `./gallery/${folder}/${imageName}`;
        });
    }

    // Z podanej listy nazw zwraca tylko te, których pliki istnieją (z zachowaniem kolejności)
    async function filterExistingImages(folder, names) {
        const results = await Promise.all(
            names.map(name => checkImageExists(folder, name).then(ok => ok ? name : null))
        );
        return results.filter(name => name !== null);
    }

    // Pobiera listę zdjęć z manifest.json danego folderu.
    // Manifesty generuje skrypt generate-manifests.py.
    async function resolveImageList(folder) {
        try {
            const res = await fetch(`./gallery/${folder}/manifest.json`, { cache: 'no-cache' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (e) {
            // brak manifestu
        }
        return [];
    }

    // ============ OPTIMIZATION FEATURES ============

    // Cache obrazów WYŁĄCZONY - powodował, że przy drugim otwarciu galerii
    // kafelki zostawały ciemne. Przeglądarka i tak trzyma zdjęcia we własnej
    // pamięci podręcznej, więc osobny cache w kodzie jest zbędny.
    // Ta atrapa udaje zawsze pustą mapę, dzięki czemu kod zawsze ładuje
    // obrazy normalną, sprawdzoną ścieżką (tą, która działa za pierwszym razem).
    const imageCache = {
        has: () => false,
        get: () => undefined,
        set: () => {},
        clear: () => {},
        get size() { return 0; }
    };

    // Loading queue management
    let loadingQueue = [];
    let currentlyLoading = 0;
    const MAX_CONCURRENT_LOADS = 4; // Maximum simultaneous image loads

    // Gallery lightbox variables
    let currentImageIndex = 0;
    let currentImageArray = [];
    let currentImageFolder = '';
    // Aktualnie wyświetlana (odfiltrowana) lista zdjęć galerii i jej folder
    let galleryImages = [];
    let galleryFolder = 'projects';

    // ============ OPTIMIZED LOADING SYSTEM ============

    // Get cache key for image
    function getCacheKey(folder, imageName) {
        return `${folder}/${imageName}`;
    }

    // Add image to loading queue
    function queueImageLoad(item, img, placeholder, folder, imageName, priority = false) {
        const loadTask = {
            item,
            img,
            placeholder,
            folder,
            imageName,
            priority
        };

        if (priority) {
            loadingQueue.unshift(loadTask);
        } else {
            loadingQueue.push(loadTask);
        }

        processLoadingQueue();
    }

    // Process the loading queue
    function processLoadingQueue() {
        while (currentlyLoading < MAX_CONCURRENT_LOADS && loadingQueue.length > 0) {
            const task = loadingQueue.shift();
            currentlyLoading++;
            loadImageForItem(task.img, task.placeholder, task.item, task.folder, task.imageName);
        }
    }

    // Check if image is visible in viewport
    function isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        return (
            rect.top < windowHeight &&
            rect.bottom > 0 &&
            rect.left < windowWidth &&
            rect.right > 0
        );
    }

    // ============ MAIN GALLERY FUNCTIONS ============

    function openGalleryLightbox(category) {
        const modal = document.getElementById(category + '-modal');
        const gallery = document.getElementById(category + '-gallery');

        if (!modal || !gallery) {
            return;
        }

        // Show modal immediately
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Kategoria -> folder w gallery/
        const folder = GALLERY_CATEGORIES[category];
        if (!folder) {
            gallery.innerHTML = '<div class="gallery-loading-note">Nieznana kategoria galerii.</div>';
            return;
        }

        // Pokaż informację o ładowaniu, wczytaj listę z manifestu, potem zbuduj galerię
        gallery.innerHTML = '<div class="gallery-loading-note">Ładowanie zdjęć...</div>';
        resolveImageList(folder).then(existing => {
            if (existing.length === 0) {
                gallery.innerHTML = '<div class="gallery-loading-note">Brak zdjęć do wyświetlenia.</div>';
                return;
            }
            createOptimizedGallery(existing, folder, gallery);
        });
    }

    function createOptimizedGallery(images, folder, gallery) {
        // Zapamiętaj aktualną listę i folder (używane przez podgląd/zoom)
        galleryImages = images;
        galleryFolder = folder;
        // Clear gallery and reset queue
        gallery.innerHTML = '';
        gallery.className = 'lightbox-gallery';
        loadingQueue = [];
        currentlyLoading = 0;

        // Create all placeholders first
        const galleryItems = [];

        images.forEach((imageName, index) => {
            const item = document.createElement('div');
            item.className = 'lightbox-item placeholder-active';

            // Placeholder with loader
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder loading';
            placeholder.innerHTML = `
                <div class="spinner"></div>
                <div class="loading-text">Ładowanie...</div>
            `;

            // Hidden image element
            const img = document.createElement('img');
            img.style.display = 'none';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = imageName.replace(/\.(jpg|png|jpeg)$/i, '');

            const title = document.createElement('div');
            title.className = 'lightbox-item-title';
            title.textContent = imageName.replace(/\.(jpg|png|jpeg)$/i, '');

            item.appendChild(placeholder);
            item.appendChild(img);
            item.appendChild(title);
            gallery.appendChild(item);

            galleryItems.push({
                item,
                img,
                placeholder,
                imageName,
                index
            });
        });

        // Prioritize visible images, then queue the rest
        setTimeout(() => {
            // First, identify visible images
            const visibleItems = [];
            const hiddenItems = [];

            galleryItems.forEach(galleryItem => {
                if (isElementVisible(galleryItem.item)) {
                    visibleItems.push(galleryItem);
                } else {
                    hiddenItems.push(galleryItem);
                }
            });

            // Load visible images first (high priority)
            visibleItems.forEach(galleryItem => {
                queueImageLoad(
                    galleryItem.item,
                    galleryItem.img,
                    galleryItem.placeholder,
                    folder,
                    galleryItem.imageName,
                    true // high priority
                );
            });

            // Then queue hidden images
            hiddenItems.forEach(galleryItem => {
                queueImageLoad(
                    galleryItem.item,
                    galleryItem.img,
                    galleryItem.placeholder,
                    folder,
                    galleryItem.imageName,
                    false // normal priority
                );
            });

        }, 50);
    }

    function loadImageForItem(img, placeholder, item, folder, imageName) {
        const cacheKey = getCacheKey(folder, imageName);

        // Check if image is already in cache
        if (imageCache.has(cacheKey)) {
            const cachedSrc = imageCache.get(cacheKey);
            img.src = cachedSrc;
            showLoadedImage(img, placeholder, item, imageName);
            currentlyLoading--;
            processLoadingQueue(); // Continue with queue
            return;
        }

        // Load image with error handling and retry
        loadImageWithRetry(img, folder, imageName, 3)
            .then(() => {
                // Cache the loaded image
                imageCache.set(cacheKey, img.src);
                showLoadedImage(img, placeholder, item, imageName);
            })
            .catch(() => {
                showImageError(placeholder);
            })
            .finally(() => {
                currentlyLoading--;
                processLoadingQueue(); // Continue with queue
            });
    }

    // Load image with retry mechanism
    function loadImageWithRetry(img, folder, imageName, maxRetries) {
        return new Promise((resolve, reject) => {
            let retries = 0;

            function attemptLoad() {
                const newImg = new Image();

                newImg.onload = function() {
                    img.src = this.src;
                    resolve();
                };

                newImg.onerror = function() {
                    retries++;
                    if (retries < maxRetries) {
                        // Exponential backoff: 500ms, 1s, 2s
                        const delay = Math.pow(2, retries - 1) * 500;
                        setTimeout(attemptLoad, delay);
                    } else {
                        reject();
                    }
                };

                newImg.src = `./gallery/${folder}/${imageName}`;
            }

            attemptLoad();
        });
    }

    // Show successfully loaded image
    function showLoadedImage(img, placeholder, item, imageName) {
        // Funkcja finalnie odsłaniająca obraz w kafelku
        function reveal() {
            placeholder.style.display = 'none';
            img.style.display = 'block';
            // Płynne pojawienie się (bez gubienia przy wielu obrazach z cache)
            requestAnimationFrame(() => {
                img.style.opacity = '1';
                item.classList.remove('placeholder-active');
                item.classList.add('image-loaded');
            });
        }

        img.style.opacity = '0';

        // Jeśli obraz jest już zdekodowany i gotowy - pokaż od razu.
        // W przeciwnym razie poczekaj na załadowanie, żeby nie odsłonić pustego kafelka.
        if (img.complete && img.naturalWidth) {
            reveal();
        } else {
            img.onload = reveal;
            img.onerror = function() {
                showImageError(placeholder);
            };
            // Bezpiecznik - gdyby onload nie odpalił, pokaż mimo to
            setTimeout(reveal, 1000);
        }

        // Add click event when image is loaded
        item.addEventListener('click', function() {
            const cleanImageName = imageName.replace(/\.(jpg|png|jpeg)$/i, '');
            openImageZoom(img.src, cleanImageName);
        });
    }

    // Show image error
    function showImageError(placeholder) {
        placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div class="error-text">Nie udało się załadować</div>
        `;
        placeholder.classList.add('error');
    }

    // ============ IMAGE ZOOM FUNCTIONS (Optimized) ============

    function openImageZoom(imageSrc, imageTitle) {
        // Clear previous image immediately
        const zoomedImage = document.getElementById('zoomed-image');
        const zoomedTitle = document.getElementById('zoomed-title');

        // Reset image state immediately
        zoomedImage.src = '';
        zoomedImage.style.opacity = '0';
        zoomedTitle.textContent = 'Ładowanie...';

        // Użyj aktualnie wyświetlanej (odfiltrowanej) listy zdjęć galerii
        currentImageArray = galleryImages;
        currentImageFolder = galleryFolder;

        // Find current image index
        const fileName = imageSrc.split('/').pop();
        currentImageIndex = currentImageArray.findIndex(img => img === fileName);

        // Show modal immediately
        const modal = document.getElementById('image-zoom-modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Show loader immediately
        const imageContainer = zoomedImage.parentElement;
        let loader = imageContainer.querySelector('.zoom-loader');

        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'zoom-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            imageContainer.appendChild(loader);
        }

        loader.style.display = 'flex';

        // Clear thumbnails container
        const thumbnailsContainer = document.getElementById('thumbnails-container');
        thumbnailsContainer.innerHTML = '';

        // Load the selected image and create thumbnails
        updateZoomedImage();
        createThumbnails();

        // Preload next and previous images
        preloadAdjacentImages();
    }

    // Preload next and previous images for smooth navigation
    function preloadAdjacentImages() {
        const preloadIndexes = [
            (currentImageIndex - 1 + currentImageArray.length) % currentImageArray.length,
            (currentImageIndex + 1) % currentImageArray.length
        ];

        preloadIndexes.forEach(index => {
            const imageName = currentImageArray[index];
            const cacheKey = getCacheKey(currentImageFolder, imageName);

            if (!imageCache.has(cacheKey)) {
                const img = new Image();
                img.onload = () => {
                    imageCache.set(cacheKey, img.src);
                };
                img.src = `./gallery/${currentImageFolder}/${imageName}`;
            }
        });
    }

    function updateZoomedImage() {
        const zoomedImage = document.getElementById('zoomed-image');
        const zoomedTitle = document.getElementById('zoomed-title');
        const currentImage = currentImageArray[currentImageIndex];

        // Show loading state for zoom
        const imageContainer = zoomedImage.parentElement;
        let loader = imageContainer.querySelector('.zoom-loader');

        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'zoom-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            imageContainer.appendChild(loader);
        }

        loader.style.display = 'flex';
        zoomedImage.style.opacity = '0.3';

        // showZoomedImage sama ładuje obraz na widocznym elemencie i niezawodnie
        // go pokazuje (obsługuje też obrazy z pamięci podręcznej przeglądarki).
        const src = `./gallery/${currentImageFolder}/${currentImage}`;
        showZoomedImage(zoomedImage, zoomedTitle, src, currentImage, loader);

        // Update active thumbnail
        updateActiveThumbnail();

        // Preload adjacent images
        preloadAdjacentImages();
    }

    function showZoomedImage(zoomedImage, zoomedTitle, src, imageName, loader) {
        zoomedTitle.textContent = imageName.replace(/\.(jpg|png|jpeg)$/i, '');

        let shown = false;
        function reveal() {
            if (shown) return;
            shown = true;

            const nw = zoomedImage.naturalWidth;
            const nh = zoomedImage.naturalHeight;
            if (nw && nh) {
                const imageAspectRatio = nw / nh;
                const maxWidth = window.innerWidth * 0.9;
                const maxHeight = window.innerHeight * 0.7;
                const maxAspectRatio = maxWidth / maxHeight;
                let finalWidth, finalHeight;
                if (imageAspectRatio > maxAspectRatio) {
                    finalWidth = Math.min(maxWidth, nw);
                    finalHeight = finalWidth / imageAspectRatio;
                } else {
                    finalHeight = Math.min(maxHeight, nh);
                    finalWidth = finalHeight * imageAspectRatio;
                }
                zoomedImage.style.width = finalWidth + 'px';
                zoomedImage.style.height = finalHeight + 'px';
                zoomedImage.style.maxWidth = 'none';
                zoomedImage.style.maxHeight = 'none';
            } else {
                zoomedImage.style.width = 'auto';
                zoomedImage.style.height = 'auto';
                zoomedImage.style.maxWidth = '90vw';
                zoomedImage.style.maxHeight = '70vh';
            }
            if (loader) loader.style.display = 'none';
            zoomedImage.style.opacity = '1';
        }

        // Ustawiamy źródło bezpośrednio na widocznym obrazie
        zoomedImage.style.opacity = '0';
        zoomedImage.onload = reveal;
        zoomedImage.onerror = function() {
            if (loader) loader.style.display = 'none';
            zoomedImage.style.opacity = '1';
            zoomedTitle.textContent = 'Nie udało się załadować zdjęcia';
            shown = true;
        };
        zoomedImage.src = src;

        // 1) Obraz już gotowy (w cache przeglądarki) - onload może nie odpalić, więc pokaż od razu
        if (zoomedImage.complete && zoomedImage.naturalWidth) {
            reveal();
        }
        // 2) decode() zawsze rozwiązuje się dla obrazu z cache - najpewniejszy sposób
        if (zoomedImage.decode) {
            zoomedImage.decode().then(reveal).catch(function(){ /* onload/onerror obsłuży */ });
        }
        // 3) Ostateczny bezpiecznik - gdyby wszystko inne zawiodło
        setTimeout(reveal, 500);
    }

    function createThumbnails() {
        const container = document.getElementById('thumbnails-container');
        container.innerHTML = '';

        currentImageArray.forEach((imageName, index) => {
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = 'thumbnail-item';
            if (index === currentImageIndex) {
                thumbnailDiv.classList.add('active');
            }

            const img = document.createElement('img');
            const cacheKey = getCacheKey(currentImageFolder, imageName);

            // Use cached image if available
            if (imageCache.has(cacheKey)) {
                img.src = imageCache.get(cacheKey);
            } else {
                img.src = `./gallery/${currentImageFolder}/${imageName}`;
                img.loading = 'lazy';
            }

            img.alt = imageName.replace(/\.(jpg|png|jpeg)$/i, '');

            img.onerror = function() {
                this.style.display = 'none';
                thumbnailDiv.style.display = 'none';
            };

            thumbnailDiv.appendChild(img);
            thumbnailDiv.addEventListener('click', () => {
                currentImageIndex = index;
                updateZoomedImage();
            });

            container.appendChild(thumbnailDiv);
        });

        setTimeout(() => {
            scrollToActiveThumbnail();
        }, 100);
    }

    function scrollToActiveThumbnail() {
        const container = document.getElementById('thumbnails-container');
        const activeThumbnail = container.querySelector('.thumbnail-item.active');

        if (activeThumbnail && container) {
            const containerRect = container.getBoundingClientRect();
            const thumbnailRect = activeThumbnail.getBoundingClientRect();

            const isVisible = thumbnailRect.left >= containerRect.left &&
                             thumbnailRect.right <= containerRect.right;

            if (!isVisible) {
                const containerWidth = container.clientWidth;
                const thumbnailLeft = activeThumbnail.offsetLeft;
                const thumbnailWidth = activeThumbnail.offsetWidth;
                const scrollLeft = thumbnailLeft - (containerWidth / 2) + (thumbnailWidth / 2);

                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }

    function updateActiveThumbnail() {
        const thumbnails = document.querySelectorAll('.thumbnail-item');
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentImageIndex);
        });

        scrollToActiveThumbnail();
    }

    function nextImage() {
        if (currentImageArray.length > 0) {
            const zoomedImage = document.getElementById('zoomed-image');
            zoomedImage.style.opacity = '0.3';

            currentImageIndex = (currentImageIndex + 1) % currentImageArray.length;
            updateZoomedImage();
        }
    }

    function previousImage() {
        if (currentImageArray.length > 0) {
            const zoomedImage = document.getElementById('zoomed-image');
            zoomedImage.style.opacity = '0.3';

            currentImageIndex = (currentImageIndex - 1 + currentImageArray.length) % currentImageArray.length;
            updateZoomedImage();
        }
    }

    function closeImageZoom() {
        const modal = document.getElementById('image-zoom-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        const zoomedImage = document.getElementById('zoomed-image');
        const zoomedTitle = document.getElementById('zoomed-title');
        const thumbnailsContainer = document.getElementById('thumbnails-container');

        // Odpinamy handlery zanim wyczyścimy src, żeby ustawienie src='' nie
        // wywołało starego onerror ani nie zostawiło wiszącego onload.
        zoomedImage.onload = null;
        zoomedImage.onerror = null;
        zoomedImage.removeAttribute('src');
        zoomedImage.style.opacity = '0';
        zoomedTitle.textContent = '';
        thumbnailsContainer.innerHTML = '';

        const imageContainer = zoomedImage.parentElement;
        const loader = imageContainer.querySelector('.zoom-loader');
        if (loader) {
            loader.style.display = 'none';
        }

        // UWAGA: czyścimy tylko stan podglądu, NIE galleryImages/galleryFolder,
        // bo są potrzebne przy ponownym otwarciu podglądu z tej samej galerii.
        currentImageIndex = 0;
        currentImageArray = [];
        currentImageFolder = '';
    }

    function closeGalleryLightbox(category) {
        const modal = document.getElementById(category + '-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Clear gallery content to prevent stale images
        const gallery = document.getElementById(category + '-gallery');
        if (gallery) {
            gallery.innerHTML = '';
        }

        // Clear loading queue
        loadingQueue = [];
        currentlyLoading = 0;
    }

    function handleResize() {
        const modal = document.getElementById('image-zoom-modal');
        if (modal && modal.style.display === 'block') {
            setTimeout(updateZoomedImage, 100);
        }
    }

    // ============ FILMY (VIDEO) ============
    // Filmy w folderze videos, pliki V00001.MP4 ... V00004.MP4
    const VIDEO_FOLDER = 'videos';
    const VIDEO_PREFIX = 'V';
    const VIDEO_COUNT = 4;      // ile numerów sprawdzić (zwiększ, jeśli dodasz filmy)
    const VIDEO_EXT = 'MP4';

    // Sprawdza, czy plik wideo istnieje (Promise<boolean>)
    function checkVideoExists(src) {
        return new Promise((resolve) => {
            fetch(src, { method: 'HEAD' })
                .then(res => resolve(res.ok))
                .catch(() => resolve(false));
        });
    }

    // Pobiera listę filmów: najpierw manifest.json, w razie braku - skan z pomijaniem brakujących
    function resolveVideoList() {
        const candidates = [];
        for (let i = 1; i <= VIDEO_COUNT; i++) {
            const num = String(i).padStart(5, '0');
            candidates.push(`./${VIDEO_FOLDER}/${VIDEO_PREFIX}${num}.${VIDEO_EXT}`);
        }
        return fetch(`./${VIDEO_FOLDER}/manifest.json`, { cache: 'no-cache' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    return data.map(name => `./${VIDEO_FOLDER}/${name}`);
                }
                return Promise.all(
                    candidates.map(src => checkVideoExists(src).then(ok => ok ? src : null))
                ).then(results => results.filter(src => src !== null));
            })
            .catch(() => Promise.all(
                candidates.map(src => checkVideoExists(src).then(ok => ok ? src : null))
            ).then(results => results.filter(src => src !== null)));
    }

    function openVideoLightbox() {
        const modal = document.getElementById('video-modal');
        const gallery = document.getElementById('video-gallery');
        if (!modal || !gallery) return;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        gallery.innerHTML = '<div class="gallery-loading-note">Ładowanie filmów...</div>';
        resolveVideoList().then(videos => {
            if (videos.length === 0) {
                gallery.innerHTML = '<div class="gallery-loading-note">Brak filmów do wyświetlenia.</div>';
                return;
            }
            gallery.innerHTML = '';
            videos.forEach(src => {
                const wrapper = document.createElement('div');
                wrapper.className = 'video-item';

                const video = document.createElement('video');
                // Fragment #t=2 podpowiada przeglądarce, by pokazała klatkę z 2. sekundy
                // nagrania jako podgląd, zamiast czarnego pola.
                video.src = src + '#t=2';
                video.controls = true;
                video.preload = 'auto';   // wczytaj dane, by dało się pokazać klatkę podglądu
                video.playsInline = true;
                video.muted = true;       // pozwala przeglądarce wygenerować klatkę podglądu

                // Podgląd od 2. sekundy: po wczytaniu danych przewijamy wideo na 2 s,
                // żeby zamiast czarnego pola pokazać realną klatkę z nagrania.
                // Gdy film jest krótszy niż 2 s, pokazujemy jego środek.
                let seeked = false;
                function seekToPreview() {
                    if (seeked) return;
                    if (!video.duration || isNaN(video.duration)) return;
                    seeked = true;
                    const target = video.duration > 2 ? 2 : video.duration / 2;
                    try { video.currentTime = target; } catch (e) {}
                }
                video.addEventListener('loadedmetadata', seekToPreview);
                video.addEventListener('loadeddata', seekToPreview);

                wrapper.appendChild(video);
                gallery.appendChild(wrapper);
            });
        });
    }

    function closeVideoLightbox() {
        const modal = document.getElementById('video-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Zatrzymaj i wyczyść filmy, aby nie grały w tle
        const gallery = document.getElementById('video-gallery');
        if (gallery) {
            gallery.querySelectorAll('video').forEach(v => { v.pause(); });
            gallery.innerHTML = '';
        }
    }

    // ============ PUBLIC API ============
    return {
        openGalleryLightbox,
        closeGalleryLightbox,
        openVideoLightbox,
        closeVideoLightbox,
        nextImage,
        previousImage,
        closeImageZoom,
        handleResize,

        // Debug methods
        getCacheSize: () => imageCache.size,
        clearCache: () => imageCache.clear(),
        getQueueLength: () => loadingQueue.length,

        init: function() {
            console.log('Optimized Gallery module initialized');
            console.log(`Max concurrent loads: ${MAX_CONCURRENT_LOADS}`);
        }
    };
})();

// Make functions globally available for onclick handlers
window.openGalleryLightbox = Gallery.openGalleryLightbox;
window.closeGalleryLightbox = Gallery.closeGalleryLightbox;
window.openVideoLightbox = Gallery.openVideoLightbox;
window.closeVideoLightbox = Gallery.closeVideoLightbox;
window.nextImage = Gallery.nextImage;
window.previousImage = Gallery.previousImage;
window.closeImageZoom = Gallery.closeImageZoom;

// ============ KEYBOARD & TOUCH NAVIGATION FOR ZOOM MODAL ============
(function () {
    function zoomModalIsOpen() {
        const modal = document.getElementById('image-zoom-modal');
        return modal && modal.style.display === 'block';
    }

    // --- Keyboard: left/right arrows navigate, Escape closes ---
    document.addEventListener('keydown', function (e) {
        if (!zoomModalIsOpen()) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            Gallery.nextImage();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            Gallery.previousImage();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            Gallery.closeImageZoom();
        }
    });

    // --- Escape zamyka modale galerii zdjęć i filmów (gdy podgląd zoom nie jest otwarty) ---
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || zoomModalIsOpen()) return;
        // Sprawdź każdą kategorię galerii zdjęć
        const categories = ['domy', 'baseny', 'zadaszenia'];
        for (const cat of categories) {
            const m = document.getElementById(cat + '-modal');
            if (m && m.style.display === 'block') {
                Gallery.closeGalleryLightbox(cat);
                return;
            }
        }
        const videoModal = document.getElementById('video-modal');
        if (videoModal && videoModal.style.display === 'block') {
            Gallery.closeVideoLightbox();
        }
    });

    // --- Touch: swipe left/right to change image ---
    const zoomMain = document.querySelector('.image-zoom-main');
    if (zoomMain) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        zoomMain.addEventListener('touchstart', function (e) {
            const t = e.changedTouches[0];
            touchStartX = t.screenX;
            touchStartY = t.screenY;
            touchStartTime = Date.now();
        }, { passive: true });

        zoomMain.addEventListener('touchend', function (e) {
            if (!zoomModalIsOpen()) return;

            const t = e.changedTouches[0];
            const dx = t.screenX - touchStartX;
            const dy = t.screenY - touchStartY;
            const elapsed = Date.now() - touchStartTime;

            // Only treat as swipe: mostly horizontal, long enough, and reasonably quick
            const MIN_DISTANCE = 50;   // px
            const MAX_OFF_AXIS = 80;   // px vertical tolerance
            const MAX_TIME = 800;      // ms

            if (Math.abs(dx) >= MIN_DISTANCE &&
                Math.abs(dy) <= MAX_OFF_AXIS &&
                elapsed <= MAX_TIME) {
                if (dx < 0) {
                    Gallery.nextImage();      // swipe left -> next
                } else {
                    Gallery.previousImage();  // swipe right -> previous
                }
            }
        }, { passive: true });
    }
})();