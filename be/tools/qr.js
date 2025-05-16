document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const qrImage = document.getElementById('qrImage');
    const status = document.getElementById('status');
    const result = document.getElementById('result');

    generateBtn.addEventListener('click', generateQRCode);
    downloadBtn.addEventListener('click', downloadQRCode);

    

    async function generateQRCode() {
        const text = textInput.value.trim();
        if (!text) {
            showStatus('Please enter some text', 'error');
            result.classList.add('hidden');
            return;
        }

        try {
            showStatus('Generating QR Code...', 'info');

            // Check rate limit
            try {
                await rateLimiter.checkRateLimit('qr-generator');
            } catch (error) {
                if (error.message.includes('Rate limit exceeded')) {
                    showStatus('Too many requests. Please wait a moment before trying again.', 'error');
                    return;
                }
                throw error;
            }

            // Check cache
            const cacheKey = `qr-${text}`;
            const cachedImage = await cache.get(cacheKey);
            if (cachedImage) {
                qrImage.src = cachedImage;
                result.classList.remove('hidden');
                showStatus('QR Code retrieved from cache!', 'success');
                return;
            }

            // Make API request
            const response = await fetch(`https://api.ferdev.my.id/tools/text2qr?text=${encodeURIComponent(text)}`);
            
            if (!response.ok) {
                throw new Error('Failed to generate QR code');
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            // Cache the result
            cache.set(cacheKey, imageUrl);
            
            qrImage.src = imageUrl;
            result.classList.remove('hidden');
            
            showStatus('QR Code generated successfully!', 'success');
        } catch (error) {
            showStatus('Error generating QR code. Please try again.', 'error');
            console.error('Error:', error);
            result.classList.add('hidden');
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.classList.remove('hidden');
        
        // Reset classes
        status.className = 'mt-4 text-center p-3 rounded-lg';
        
        // Add appropriate color class
        switch(type) {
            case 'error':
                status.classList.add('bg-red-100', 'text-red-700');
                break;
            case 'success':
                status.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'info':
                status.classList.add('bg-blue-100', 'text-blue-700');
                break;
        }
    }

    function downloadQRCode() {
        if (!qrImage.src) {
            showStatus('Please generate a QR code first', 'error');
            return;
        }

        const link = document.createElement('a');
        link.href = qrImage.src;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `qr-code-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('QR Code downloaded successfully!', 'success');
    }
}); 