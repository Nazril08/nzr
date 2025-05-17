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

document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');

    searchBtn.addEventListener('click', searchPlayer);

    async function searchPlayer() {
        const uid = document.getElementById('uid').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();

        if (!uid) {
            showError('Please enter a valid UID');
            return;
        }

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Check cache first
            const cacheKey = `${uid}-${apiKey}`;
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                // Update UI with cached data
                updatePlayerInfo(cachedResult.player);
                updatePlayerStats(cachedResult.playerStatistics);
                updateExplorationProgress(cachedResult.player.detail.exploration);
                updateSpiralAbyss(cachedResult.player.detail.spiralAbyss);

                // Show results
                loadingDiv.classList.add('hidden');
                resultDiv.classList.remove('hidden');
                return;
            }

            // Show loading state
            loadingDiv.classList.remove('hidden');
            resultDiv.classList.add('hidden');
            errorDiv.classList.add('hidden');

            const response = await fetch(`https://fastrestapis.fasturl.cloud/stalk/genshin/advanced?uid=${uid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'x-api-key': apiKey })
                }
            });

            const data = await response.json();

            if (data.status !== 200) {
                throw new Error(data.content || 'Failed to fetch player data');
            }

            // Store in cache
            cache.set(cacheKey, data.result);

            // Update UI with player data
            updatePlayerInfo(data.result.player);
            updatePlayerStats(data.result.playerStatistics);
            updateExplorationProgress(data.result.player.detail.exploration);
            updateSpiralAbyss(data.result.player.detail.spiralAbyss);

            // Show results
            loadingDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
        } catch (error) {
            if (error.message.includes('Rate limit exceeded')) {
                showError(error.message);
            } else {
                showError(error.message);
            }
            loadingDiv.classList.add('hidden');
        }
    }

    function updatePlayerInfo(player) {
        document.getElementById('playerAvatar').src = player.iconUrl || 'default-avatar.png';
        document.getElementById('playerName').textContent = player.nickname;
        document.getElementById('playerUID').textContent = `UID: ${player.uid}`;
        document.getElementById('playerLevel').textContent = `Level ${player.level}`;
        document.getElementById('playerServer').textContent = player.server.toUpperCase();
    }

    function updatePlayerStats(stats) {
        // Update achievements
        const achievementCount = document.getElementById('achievementCount');
        const achievementProgress = document.getElementById('achievementProgress');
        achievementCount.textContent = stats.achievements.current;
        achievementProgress.style.width = `${stats.achievements.currentRate * 100}%`;

        // Update characters
        const characterCount = document.getElementById('characterCount');
        const characterProgress = document.getElementById('characterProgress');
        characterCount.textContent = stats.characters.current;
        characterProgress.style.width = `${stats.characters.currentRate * 100}%`;
    }

    function updateExplorationProgress(exploration) {
        const explorationDiv = document.getElementById('explorationProgress');
        explorationDiv.innerHTML = '';

        // Map region IDs to names
        const regionNames = {
            '1': 'Mondstadt',
            '2': 'Liyue',
            '3': 'Inazuma',
            '4': 'Sumeru',
            '6': 'Enkanomiya',
            '7': 'The Chasm',
            '8': 'The Chasm Underground',
            '9': 'Golden Apple Archipelago',
            '10': 'Desert',
            '12': 'Dragon Spine',
            '13': 'Fontaine',
            '14': 'Underwater Fontaine',
            '15': 'Chenyu Vale',
            '16': 'Chenyu Vale Underground'
        };

        for (const [regionId, progress] of Object.entries(exploration)) {
            const regionName = regionNames[regionId] || `Region ${regionId}`;
            const progressPercentage = (progress * 100).toFixed(1);

            const regionElement = document.createElement('div');
            regionElement.className = 'stat-card';
            regionElement.innerHTML = `
                <h4 class="text-sm font-medium text-gray-500">${regionName}</h4>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-lg font-bold text-gray-900">${progressPercentage}%</span>
                    <div class="w-24">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
            explorationDiv.appendChild(regionElement);
        }
    }

    function updateSpiralAbyss(abyssData) {
        const abyssDiv = document.getElementById('spiralAbyssInfo');
        
        if (!abyssData || !abyssData.maxFloor) {
            abyssDiv.innerHTML = '<p class="text-gray-500">No Spiral Abyss data available</p>';
            return;
        }

        abyssDiv.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">Max Floor Reached</p>
                    <p class="text-lg font-bold text-gray-900">${abyssData.maxFloor}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Total Battles</p>
                    <p class="text-lg font-bold text-gray-900">${abyssData.battleTimes}</p>
                </div>
            </div>
        `;
    }

    function showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
    }
}); 