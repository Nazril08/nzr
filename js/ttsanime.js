// Rate limiter configuration
const RATE_LIMIT = 5; // requests per minute
const CACHE_SIZE = 50;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Cache implementation
class Cache {
    constructor(maxSize = 50) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    set(key, value, ttl) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }
}

// Rate limiter implementation
class RateLimiter {
    constructor(limit, interval = 60000) {
        this.limit = limit;
        this.interval = interval;
        this.requests = [];
    }

    tryRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.interval);
        
        if (this.requests.length >= this.limit) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }

    getTimeUntilNext() {
        if (this.requests.length === 0) return 0;
        return this.interval - (Date.now() - this.requests[0]);
    }
}

// Initialize cache and rate limiter
const cache = new Cache(CACHE_SIZE);
const rateLimiter = new RateLimiter(RATE_LIMIT);

// DOM Elements
const textInput = document.getElementById('text');
const languageSelect = document.getElementById('language');
const modelSelect = document.getElementById('model');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('generateBtn');
const audioPlayer = document.getElementById('audioPlayer');
const audio = document.getElementById('audio');
const loading = document.getElementById('loading');
const status = document.getElementById('status');

// Helper function to show status message
function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = `text-center p-3 rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    status.style.display = 'block';
}

// Helper function to generate cache key
function generateCacheKey(text, language, model, speed) {
    return `${text}|${language}|${model}|${speed}`;
}

// Main function to generate speech
async function generateSpeech() {
    const text = textInput.value.trim();
    const language = languageSelect.value;
    const model = modelSelect.value;
    const speed = speedInput.value;

    // Input validation
    if (!text) {
        showStatus('Please enter some text to convert.', true);
        return;
    }

    if (text.length > 150) {
        showStatus('Text must be 150 characters or less.', true);
        return;
    }

    // Check rate limit
    if (!rateLimiter.tryRequest()) {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilNext() / 1000);
        showStatus(`Rate limit exceeded. Please wait ${waitTime} seconds.`, true);
        return;
    }

    // Check cache
    const cacheKey = generateCacheKey(text, language, model, speed);
    const cachedAudio = cache.get(cacheKey);
    if (cachedAudio) {
        audio.src = cachedAudio;
        audioPlayer.style.display = 'block';
        showStatus('Audio generated from cache.');
        return;
    }

    // Show loading state
    loading.style.display = 'block';
    generateBtn.disabled = true;
    status.style.display = 'none';

    try {
        // Construct URL parameters
        const params = new URLSearchParams({
            text: text,
            speed: parseFloat(speed),
            language: language,
            model: model
        });

        const response = await fetch(`https://fastrestapis.fasturl.cloud/tts/anime?${params.toString()}`, {
            method: 'GET',
            headers: {
                'accept': 'audio/mpeg'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        // Cache the result
        cache.set(cacheKey, audioUrl, CACHE_TTL);

        // Update audio player
        audio.src = audioUrl;
        audioPlayer.style.display = 'block';
        showStatus('Audio generated successfully!');

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Failed to generate audio: ${error.message}`, true);
    } finally {
        loading.style.display = 'none';
        generateBtn.disabled = false;
    }
}

// Event Listeners
generateBtn.addEventListener('click', generateSpeech);

// Character counter
textInput.addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('charCount').textContent = `${count}/150 characters`;
    
    if (count > 150) {
        this.value = this.value.substring(0, 150);
    }
});

// Speed slider value display
speedInput.addEventListener('input', function() {
    document.getElementById('speedValue').textContent = this.value;
}); 