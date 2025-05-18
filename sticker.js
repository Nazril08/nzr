// Rate limiter configuration
const rateLimiter = {
    regularSticker: {
        lastCall: 0,
        cooldown: 2000 // 2 seconds cooldown
    },
    animeSticker: {
        lastCall: 0,
        cooldown: 2000 // 2 seconds cooldown
    }
};

// Check if an action can be performed based on rate limits
function checkRateLimit(action) {
    const now = Date.now();
    const limiter = rateLimiter[action];
    
    if (now - limiter.lastCall < limiter.cooldown) {
        const remainingTime = Math.ceil((limiter.cooldown - (now - limiter.lastCall)) / 1000);
        return `Please wait ${remainingTime} seconds before generating another sticker`;
    }
    
    limiter.lastCall = now;
    return null;
}

// Regular Brat Sticker
function handleTextInput(input) {
    const text = input.value.trim();
    const resultDiv = document.getElementById('regularResult');
    const bwImage = document.getElementById('bwImage');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!text) {
        resultDiv.classList.add('hidden');
        return;
    }

    // Check rate limit
    const rateLimitMessage = checkRateLimit('regularSticker');
    if (rateLimitMessage) {
        showError(rateLimitMessage);
        return;
    }

    const imageUrl = `https://api.ferdev.my.id/maker/brat?text=${encodeURIComponent(text)}`;
    bwImage.src = imageUrl;
    downloadBtn.href = imageUrl;
    downloadBtn.download = `brat_sticker_${Date.now()}.png`;
    resultDiv.classList.remove('hidden');
}

// Bratv2 Anime Sticker
async function generateAnimeSticker() {
    const textInput = document.getElementById('animeTextInput');
    const statusDiv = document.getElementById('animeStatus');
    const resultDiv = document.getElementById('animeResult');
    const animeImage = document.getElementById('animeImage');
    const downloadBtn = document.getElementById('animeDownloadBtn');
    
    const text = textInput.value.trim();
    
    if (!text) {
        showAnimeStatus('error', 'Mohon masukkan teks untuk stiker');
        return;
    }

    // Check rate limit
    const rateLimitMessage = checkRateLimit('animeSticker');
    if (rateLimitMessage) {
        showAnimeStatus('error', rateLimitMessage);
        return;
    }
    
    try {
        showAnimeStatus('loading', 'Sedang membuat stiker anime...');
        resultDiv.classList.add('hidden');
        
        const imageUrl = `https://api.ferdev.my.id/maker/bratv2?text=${encodeURIComponent(text)}`;
        
        // Test if the image loads successfully
        const testImage = new Image();
        testImage.onload = function() {
            animeImage.src = imageUrl;
            downloadBtn.href = imageUrl;
            downloadBtn.download = `bratv2_anime_${Date.now()}.png`;
            resultDiv.classList.remove('hidden');
            showAnimeStatus('success', 'Stiker berhasil dibuat!');
        };
        testImage.onerror = function() {
            throw new Error('Gagal memuat gambar');
        };
        testImage.src = imageUrl;
        
    } catch (error) {
        console.error('Error:', error);
        showAnimeStatus('error', 'Gagal membuat stiker: ' + error.message);
    }
}

function showAnimeStatus(type, message) {
    const statusDiv = document.getElementById('animeStatus');
    statusDiv.className = 'text-center p-4 rounded-lg';
    
    switch(type) {
        case 'loading':
            statusDiv.innerHTML = '<div class="loading"></div>' + message;
            statusDiv.classList.add('bg-blue-100', 'text-blue-700');
            break;
        case 'success':
            statusDiv.textContent = message;
            statusDiv.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'error':
            statusDiv.textContent = message;
            statusDiv.classList.add('bg-red-100', 'text-red-700');
            break;
    }
    
    statusDiv.classList.remove('hidden');
}

function showError(message) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'text-center p-4 rounded-lg status-error mb-4';
    statusDiv.textContent = message;
    
    const regularSticker = document.querySelector('.bg-white');
    const existingError = regularSticker.querySelector('.status-error');
    
    if (existingError) {
        existingError.remove();
    }
    
    regularSticker.insertBefore(statusDiv, regularSticker.querySelector('#regularResult'));
    
    setTimeout(() => {
        statusDiv.remove();
    }, 3000);
} 