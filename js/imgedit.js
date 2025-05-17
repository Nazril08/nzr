// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5,
    timeWindow: 60000, // 1 minute
    requests: [],
    
    checkLimit: function() {
        const now = Date.now();
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
    maxSize: 50,
    timeToLive: 3600000, // 1 hour
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
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
        
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

async function changeImageBackground(imageUrl, prompt) {
    try {
        // Check rate limit
        rateLimiter.checkLimit();

        // Generate cache key
        const cacheKey = `${imageUrl}-${prompt}`;
        
        // Check cache first
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            showStatus('success', 'Retrieved from cache!');
            return cachedResult;
        }

        // Make API request to change background
        const apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/aibackground?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const resultUrl = URL.createObjectURL(blob);

        // Store result in cache
        cache.set(cacheKey, resultUrl);

        showStatus('success', 'Image processed successfully!');
        return resultUrl;
    } catch (error) {
        if (error.message.includes('Rate limit exceeded')) {
            showStatus('error', error.message);
        } else {
            showStatus('error', `Failed to change image background: ${error.message}`);
        }
        throw error;
    }
}

// DOM Elements
const imageUrlInput = document.getElementById('imageUrl');
const promptInput = document.getElementById('prompt');
const changeButton = document.getElementById('changeBackground');
const resultImage = document.getElementById('resultImage');
const resultSection = document.getElementById('result');
const loadingSection = document.getElementById('loading');

// Event Listeners
changeButton.addEventListener('click', async () => {
    const imageUrl = imageUrlInput.value.trim();
    const prompt = promptInput.value.trim();

    if (!imageUrl || !prompt) {
        showStatus('error', 'Please fill in both the image URL and background description.');
        return;
    }

    try {
        // Reset UI
        resultSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        changeButton.disabled = true;

        // Process image
        const resultUrl = await changeImageBackground(imageUrl, prompt);
        
        // Update UI with result
        resultImage.src = resultUrl;
        loadingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
    } catch (error) {
        loadingSection.classList.add('hidden');
    } finally {
        changeButton.disabled = false;
    }
});

// Helper functions
function showStatus(status, message) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = status === 'success' ? 'success' : 'error';
    statusDiv.classList.remove('hidden');
    setTimeout(() => statusDiv.classList.add('hidden'), 3000);
} 