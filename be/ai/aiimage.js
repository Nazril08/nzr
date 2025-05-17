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

// DOM Elements
const promptInput = document.getElementById('prompt');
const reffImageInput = document.getElementById('reffImage');
const styleSelect = document.getElementById('style');
const widthSelect = document.getElementById('width');
const heightSelect = document.getElementById('height');
const creativitySlider = document.getElementById('creativity');
const generateBtn = document.getElementById('generateBtn');
const resultImage = document.getElementById('resultImage');
const resultSection = document.getElementById('result');
const loadingSection = document.getElementById('loading');
const statusDiv = document.getElementById('status');

async function generateImage() {
    try {
        // Check rate limit
        rateLimiter.checkLimit();

        const prompt = promptInput.value.trim();
        const reffImage = reffImageInput.value.trim();
        const style = styleSelect.value;
        const width = widthSelect.value;
        const height = heightSelect.value;
        const creativity = creativitySlider.value;

        if (!prompt) {
            showStatus('error', 'Please provide an image description');
            return;
        }

        // Generate cache key
        const cacheKey = `${prompt}-${reffImage}-${style}-${width}-${height}-${creativity}`;
        
        // Check cache first
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            showStatus('success', 'Retrieved from cache!');
            displayResult(cachedResult);
            return;
        }

        // Show loading state
        showLoading(true);
        generateBtn.disabled = true;

        // Construct API URL
        let apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/aiimage?prompt=${encodeURIComponent(prompt)}&style=${encodeURIComponent(style)}&width=${width}&height=${height}&creativity=${creativity}`;
        
        if (reffImage) {
            apiUrl += `&reffImage=${encodeURIComponent(reffImage)}`;
        }

        // Make API request
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        // Store in cache
        cache.set(cacheKey, imageUrl);

        // Display result
        displayResult(imageUrl);
        showStatus('success', 'Image generated successfully!');

    } catch (error) {
        if (error.message.includes('Rate limit exceeded')) {
            showStatus('error', error.message);
        } else {
            showStatus('error', `Failed to generate image: ${error.message}`);
        }
    } finally {
        showLoading(false);
        generateBtn.disabled = false;
    }
}

function showStatus(type, message) {
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700', 'bg-blue-100', 'text-blue-700');
    
    switch(type) {
        case 'error':
            statusDiv.classList.add('bg-red-100', 'text-red-700');
            break;
        case 'success':
            statusDiv.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'loading':
            statusDiv.classList.add('bg-blue-100', 'text-blue-700');
            break;
    }
}

function showLoading(show) {
    if (show) {
        loadingSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
    } else {
        loadingSection.classList.add('hidden');
    }
}

function displayResult(imageUrl) {
    resultImage.src = imageUrl;
    resultSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
}

// Event Listeners
generateBtn.addEventListener('click', generateImage);

// Preview reference image if provided
reffImageInput.addEventListener('input', function() {
    const url = this.value.trim();
    if (url) {
        showStatus('loading', 'Loading reference image...');
        
        const img = new Image();
        img.onload = () => showStatus('success', 'Reference image loaded successfully!');
        img.onerror = () => showStatus('error', 'Failed to load reference image. Please check the URL.');
        img.src = url;
    }
}); 