document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const translateBtn = document.getElementById('translateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const sourceCount = document.getElementById('sourceCount');
    const translatedCount = document.getElementById('translatedCount');

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

    // Function to auto-resize textarea
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Update character count and resize textarea
    function updateCharCount(textarea, countElement) {
        const count = textarea.value.length;
        countElement.textContent = `${count} characters`;
        autoResize(textarea);
    }

    // Add input and change event listeners for auto-resize
    sourceText.addEventListener('input', () => {
        updateCharCount(sourceText, sourceCount);
    });

    translatedText.addEventListener('input', () => {
        updateCharCount(translatedText, translatedCount);
    });

    // Initial resize for both textareas
    autoResize(sourceText);
    autoResize(translatedText);

    // Input validation
    function validateInput(text) {
        if (!text) {
            throw new Error('Please enter some text to translate');
        }
        if (text.length > 5000) {
            throw new Error('Text is too long. Maximum 5000 characters allowed.');
        }
        // Check for potentially harmful content
        const harmfulPatterns = [
            /<script/i,
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i
        ];
        
        for (const pattern of harmfulPatterns) {
            if (pattern.test(text)) {
                throw new Error('Invalid input detected');
            }
        }
    }

    // Translation function
    async function translateText() {
        const text = sourceText.value.trim();
        
        try {
            // Validate input
            validateInput(text);
            
            // Check rate limit
            rateLimiter.checkLimit();

            // Check cache first
            const cacheKey = text.toLowerCase();
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                translatedText.value = cachedResult;
                updateCharCount(translatedText, translatedCount);
                return;
            }

            // Show loading state
            loadingSpinner.style.display = 'inline-block';
            translateBtn.disabled = true;
            translatedText.value = 'Translating...';
            autoResize(translatedText);

            const style = "Bertindaklah sebagai penerjemah profesional novel Tiongkok ke dalam bahasa indonesia, gunakan narasi past tense, hasilkan terjemahan yang alami dan mengalir seperti novel berbahasa indonesia tanpa menggunakan kosakata pinyin, serta sesuaikan idiom, ungkapan budaya, dan nama agar mudah dipahami pembaca internasional.";
            
            const apiUrl = `https://fastrestapis.fasturl.cloud/aillm/gpt-4?ask=${encodeURIComponent('translate text ini ke bahasa indonesia: ' + text)}&style=${encodeURIComponent(style)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                    }
                    throw new Error(`Server error: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data && data.status === 200 && data.result) {
                    const translation = data.result.trim();
                    translatedText.value = translation;
                    updateCharCount(translatedText, translatedCount);
                    
                    // Cache successful translation
                    cache.set(cacheKey, translation);
                } else {
                    throw new Error('Invalid response format from API');
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timed out. Please try again.');
                }
                throw error;
            }
        } catch (error) {
            console.error('Translation error:', error);
            translatedText.value = `Translation failed: ${error.message}`;
            updateCharCount(translatedText, translatedCount);
        } finally {
            // Hide loading state
            loadingSpinner.style.display = 'none';
            translateBtn.disabled = false;
        }
    }

    // Copy translation to clipboard
    async function copyTranslation() {
        const text = translatedText.value;
        if (!text) {
            alert('No translation to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy text');
        }
    }

    // Clear all text
    function clearAll() {
        sourceText.value = '';
        translatedText.value = '';
        updateCharCount(sourceText, sourceCount);
        updateCharCount(translatedText, translatedCount);
    }

    // Event listeners
    translateBtn.addEventListener('click', translateText);
    copyBtn.addEventListener('click', copyTranslation);
    clearBtn.addEventListener('click', clearAll);
}); 