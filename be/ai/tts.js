class TextToSpeech {
    constructor() {
        this.form = {};
        this.elements = {};
        this.API_URL = 'https://fastrestapis.fasturl.cloud/tts/openai';
        this.currentBlob = null;

        // Rate limiter configuration
        this.rateLimiter = {
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
        this.cache = {
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
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Form inputs
        this.form = {
            textInput: document.getElementById('textInput'),
            voiceModel: document.getElementById('voiceModel')
        };

        // UI elements
        this.elements = {
            convertBtn: document.getElementById('convertBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            audioElement: document.getElementById('audioElement'),
            audioPlayer: document.getElementById('audioPlayer'),
            status: document.getElementById('status')
        };
    }

    setupEventListeners() {
        this.elements.convertBtn.addEventListener('click', () => this.convertToSpeech());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadAudio());
    }

    showStatus(message, type) {
        this.elements.status.textContent = message;
        this.elements.status.classList.remove('hidden');
        
        // Reset classes
        this.elements.status.className = 'mt-4 text-center p-3 rounded-lg';
        
        // Add appropriate color class
        switch(type) {
            case 'error':
                this.elements.status.classList.add('bg-red-100', 'text-red-700');
                break;
            case 'success':
                this.elements.status.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'info':
                this.elements.status.classList.add('bg-blue-100', 'text-blue-700');
                break;
        }
    }

    async convertToSpeech() {
        // Validate input
        const text = this.form.textInput.value.trim();
        if (!text) {
            this.showStatus('Please enter some text to convert', 'error');
            return;
        }

        try {
            // Check rate limit
            this.rateLimiter.checkLimit();

            // Check cache first
            const cacheKey = `${text}-${this.form.voiceModel.value}`;
            const cachedAudio = this.cache.get(cacheKey);
            
            if (cachedAudio) {
                this.showStatus('Retrieved from cache', 'success');
                this.displayAudio(cachedAudio);
                return;
            }

            this.showStatus('Converting text to speech...', 'info');

            // Construct URL with parameters
            const params = new URLSearchParams({
                text: text,
                model: this.form.voiceModel.value
            });

            const response = await fetch(`${this.API_URL}?${params.toString()}`, {
                headers: {
                    'accept': 'audio/mpeg'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to convert text to speech');
            }

            const blob = await response.blob();
            
            // Cache the result
            this.cache.set(cacheKey, blob);
            
            // Display the audio
            this.displayAudio(blob);
            
            this.showStatus('Text converted to speech successfully!', 'success');
        } catch (error) {
            this.showStatus(error.message || 'Error converting text to speech. Please try again.', 'error');
            console.error('Error:', error);
        }
    }

    displayAudio(blob) {
        if (this.currentBlob) {
            URL.revokeObjectURL(this.currentBlob);
        }
        this.currentBlob = URL.createObjectURL(blob);
        
        // Update audio player
        this.elements.audioElement.src = this.currentBlob;
        this.elements.audioPlayer.classList.remove('hidden');
        this.elements.downloadBtn.disabled = false;
    }

    downloadAudio() {
        if (!this.currentBlob) {
            this.showStatus('Please convert text to speech first', 'error');
            return;
        }

        const link = document.createElement('a');
        link.href = this.currentBlob;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `tts-${timestamp}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatus('Audio downloaded successfully!', 'success');
    }

    cleanup() {
        if (this.currentBlob) {
            URL.revokeObjectURL(this.currentBlob);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const tts = new TextToSpeech();
    tts.initialize();

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        tts.cleanup();
    });
}); 