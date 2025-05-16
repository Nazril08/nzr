/**
 * Rate Limiter for API Protection
 * Implements Terms of Service compliance:
 * 1. No flooding requests
 * 2. Adaptable to API changes
 * 3. Gentle request handling
 * 4. Responsible usage
 * 
 * @version 1.0.1
 */

class RateLimiter {
    constructor() {
        // Reduced from 30 to 20 for more conservative rate limiting
        this.maxRequestsPerMinute = 20;
        // Increased from 2000 to 3000 ms for gentler request handling
        this.minDelayBetweenRequests = 3000;
        this.requests = new Map();
        this.endpoints = new Map();
        this.waitingQueue = new Map();
    }

    async checkRateLimit(endpoint) {
        const now = Date.now();
        
        // Check endpoint-specific rate limit
        if (!this.endpoints.has(endpoint)) {
            this.endpoints.set(endpoint, {
                count: 0,
                lastReset: now,
                consecutiveRequests: 0
            });
        }

        const endpointData = this.endpoints.get(endpoint);
        
        // Reset counter if a minute has passed
        if (now - endpointData.lastReset >= 60000) {
            endpointData.count = 0;
            endpointData.lastReset = now;
            endpointData.consecutiveRequests = 0;
        }

        // Check if rate limit exceeded
        if (endpointData.count >= this.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Progressive delay for consecutive requests
        const baseDelay = this.minDelayBetweenRequests;
        const consecutiveDelay = Math.min(endpointData.consecutiveRequests * 500, 5000);
        const totalDelay = baseDelay + consecutiveDelay;

        // Check minimum delay between requests
        const lastRequest = this.requests.get(endpoint) || 0;
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest < totalDelay) {
            const delayNeeded = totalDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delayNeeded));
            // Reset consecutive requests after waiting
            endpointData.consecutiveRequests = 0;
        } else {
            // Increment consecutive requests if making requests too quickly
            endpointData.consecutiveRequests++;
        }

        // Update tracking
        this.requests.set(endpoint, now);
        endpointData.count++;

        return true;
    }

    // Cleanup old entries periodically
    cleanup() {
        const now = Date.now();
        
        // Cleanup requests older than 1 minute
        for (const [endpoint, timestamp] of this.requests.entries()) {
            if (now - timestamp > 60000) {
                this.requests.delete(endpoint);
            }
        }

        // Cleanup expired endpoint counters
        for (const [endpoint, data] of this.endpoints.entries()) {
            if (now - data.lastReset > 60000) {
                this.endpoints.delete(endpoint);
            }
        }
    }

    // Get current rate limit status
    getStatus(endpoint) {
        const endpointData = this.endpoints.get(endpoint);
        if (!endpointData) return { remaining: this.maxRequestsPerMinute, resetIn: 0 };

        const now = Date.now();
        const resetIn = Math.max(0, 60000 - (now - endpointData.lastReset));
        const remaining = Math.max(0, this.maxRequestsPerMinute - endpointData.count);

        return { remaining, resetIn };
    }
}

// Create global instance
const rateLimiter = new RateLimiter();

// Run cleanup every minute
setInterval(() => rateLimiter.cleanup(), 60000); 