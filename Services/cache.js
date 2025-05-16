class Cache {
    constructor() {
        this.maxAge = 1000 * 60 * 60; // 1 jam cache duration
        this.cache = new Map();
    }

    async get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Check if cache entry has expired
        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

// Create global instance
const cache = new Cache();

// Run cleanup every hour
setInterval(() => cache.cleanup(), 1000 * 60 * 60); 