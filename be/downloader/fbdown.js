// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5, // Maximum requests per timeWindow
    timeWindow: 60000, // Time window in milliseconds (1 minute)
    requests: [],
    
    checkLimit: function() {
        const now = Date.now();
        // Remove requests older than timeWindow
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const timeToWait = Math.ceil((this.timeWindow - (now - oldestRequest)) / 1000);
            throw new Error(`Rate limit exceeded. Please wait ${timeToWait} seconds before trying again.`);
        }
        
        this.requests.push(now);
        return true;
    }
};

// Cache configuration
const cache = {
    data: new Map(),
    maxSize: 50, // Maximum number of cached items
    timeToLive: 3600000, // Cache TTL in milliseconds (1 hour)
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
            // Remove oldest entry if cache is full
            const firstKey = this.data.keys().next().value;
            this.data.delete(firstKey);
        }
        
        this.data.set(key, {
            value: value,
            timestamp: Date.now()
        });
    },
    
    get: function(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        // Check if cache entry has expired
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        videoUrl: document.getElementById('videoUrl'),
        downloadBtn: document.getElementById('downloadBtn'),
        btnText: document.getElementById('btnText'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        previewContainer: document.getElementById('previewContainer'),
        thumbnailPreview: document.getElementById('thumbnailPreview'),
        videoTitle: document.getElementById('videoTitle'),
        videoDuration: document.getElementById('videoDuration'),
        sdDownloadBtn: document.getElementById('sdDownloadBtn'),
        hdDownloadBtn: document.getElementById('hdDownloadBtn'),
        status: document.getElementById('status')
    };

    elements.downloadBtn.addEventListener('click', handleDownload);

    async function handleDownload() {
        const url = elements.videoUrl.value.trim();
        
        if (!url) {
            showStatus('Please enter a Facebook video URL', 'error');
            return;
        }

        if (!isValidFacebookUrl(url)) {
            showStatus('Please enter a valid Facebook video URL', 'error');
            return;
        }

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Check cache first
            const cachedResult = cache.get(url);
            if (cachedResult) {
                displayVideoInfo(cachedResult);
                showStatus('Video information retrieved from cache!', 'success');
                return;
            }

            setLoading(true);
            const apiUrl = `https://fastrestapis.fasturl.cloud/downup/fbdown?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'accept': 'application/json'
                }
            });

            const data = await response.json();

            if (data.status === 200 && data.content === "Success") {
                const result = data.result;
                // Store in cache
                cache.set(url, result);
                displayVideoInfo(result);
                showStatus('Video information retrieved successfully!', 'success');
            } else {
                throw new Error('Failed to get video information');
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('Rate limit exceeded')) {
                showStatus(error.message, 'error');
            } else {
                showStatus('Failed to get video information. Please check the URL and try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    function displayVideoInfo(videoData) {
        // Show preview container
        elements.previewContainer.classList.remove('hidden');

        // Set thumbnail
        elements.thumbnailPreview.src = videoData.thumbnail;

        // Set title
        elements.videoTitle.textContent = videoData.title || 'Untitled Video';

        // Set duration
        const durationInSeconds = Math.floor(videoData.duration_ms / 1000);
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        elements.videoDuration.textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Setup download buttons
        if (videoData.sd) {
            elements.sdDownloadBtn.classList.remove('hidden');
            elements.sdDownloadBtn.href = videoData.sd;
        } else {
            elements.sdDownloadBtn.classList.add('hidden');
        }

        if (videoData.hd) {
            elements.hdDownloadBtn.classList.remove('hidden');
            elements.hdDownloadBtn.href = videoData.hd;
        } else {
            elements.hdDownloadBtn.classList.add('hidden');
        }
    }

    function setLoading(isLoading) {
        elements.btnText.textContent = isLoading ? 'Processing...' : 'Download Video';
        elements.loadingSpinner.classList.toggle('hidden', !isLoading);
        elements.downloadBtn.disabled = isLoading;
    }

    function showStatus(message, type) {
        elements.status.textContent = message;
        elements.status.classList.remove('hidden');
        
        // Reset classes
        elements.status.className = 'mt-4 text-center p-3 rounded-lg';
        
        // Add appropriate color class
        switch(type) {
            case 'error':
                elements.status.classList.add('bg-blue-100', 'text-blue-700');
                break;
            case 'success':
                elements.status.classList.add('bg-green-100', 'text-green-700');
                break;
        }
    }

    function isValidFacebookUrl(url) {
        return url.match(/^https?:\/\/(www\.)?(facebook|fb)\.com\/.*$/i) !== null;
    }
}); 