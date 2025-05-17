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
            throw new Error(`Batas permintaan tercapai. Mohon tunggu ${timeToWait} detik sebelum mencoba lagi.`);
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

async function checkML() {
    const userId = document.getElementById('userId').value.trim();
    const zoneId = document.getElementById('zoneId').value.trim();
    const resultDiv = document.getElementById('result');
    const statusDiv = document.getElementById('status');
    
    // Reset tampilan
    resultDiv.classList.add('hidden');
    
    if (!userId || !zoneId) {
        showStatus('error', 'Mohon masukkan User ID dan Zone ID');
        return;
    }

    try {
        // Check rate limit
        rateLimiter.checkLimit();

        // Check cache first
        const cacheKey = `${userId}-${zoneId}`;
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            document.getElementById('username').textContent = cachedResult.username || '-';
            document.getElementById('displayUserId').textContent = userId;
            document.getElementById('displayZoneId').textContent = zoneId;
            document.getElementById('region').textContent = cachedResult.region || '-';

            resultDiv.classList.remove('hidden');
            showStatus('success', 'Data akun ditemukan (dari cache)');
            return;
        }

        showStatus('loading', 'Sedang mengecek akun...');

        const response = await fetch(`https://fastrestapis.fasturl.cloud/stalk/mlbb?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`);

        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.status === 200) {
            // Store in cache
            cache.set(cacheKey, data.result);

            document.getElementById('username').textContent = data.result.username || '-';
            document.getElementById('displayUserId').textContent = userId;
            document.getElementById('displayZoneId').textContent = zoneId;
            document.getElementById('region').textContent = data.result.region || '-';

            resultDiv.classList.remove('hidden');
            showStatus('success', 'Data akun berhasil ditemukan');
        } else {
            throw new Error('Data tidak ditemukan');
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Batas permintaan tercapai')) {
            showStatus('error', error.message);
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showStatus('error', 'Gagal terhubung ke server. Mohon coba lagi beberapa saat.');
        } else {
            showStatus('error', error.message);
        }
    }
}

function showStatus(type, message) {
    const statusDiv = document.getElementById('status');
    statusDiv.className = 'mt-4 text-center p-3 rounded-lg';
    
    switch(type) {
        case 'loading':
            statusDiv.classList.add('bg-blue-100', 'text-blue-700');
            break;
        case 'success':
            statusDiv.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'error':
            statusDiv.classList.add('bg-red-100', 'text-red-700');
            break;
    }
    
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const checkButton = document.getElementById('checkBtn');
    if (checkButton) {
        checkButton.addEventListener('click', checkML);
    }
}); 