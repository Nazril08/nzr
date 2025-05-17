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

        // Show loading state
        loadingDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');

        try {
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

            // Update UI with player data
            updatePlayerInfo(data.result.player);
            updatePlayerStats(data.result.playerStatistics);
            updateExplorationProgress(data.result.player.detail.exploration);
            updateSpiralAbyss(data.result.player.detail.spiralAbyss);

            // Show results
            loadingDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
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