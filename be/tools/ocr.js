document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const imageFileInput = document.getElementById('image-file');
    const fileNameDisplay = document.getElementById('file-name');
    const fileExtractBtn = document.getElementById('file-extract-btn');
    const imagePreview = document.getElementById('image-preview');
    const resultContainer = document.getElementById('result-container');
    const extractedText = document.getElementById('extracted-text');
    const copyBtn = document.getElementById('copy-btn');
    const loadingIndicator = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');

    // Variables to store current image data
    let currentImageFile = null;
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB = 1024KB = 1024 * 1024 bytes

    // OCR.space API configuration
    const ocrSpaceEndpoint = 'https://api.ocr.space/parse/image';
    const ocrSpaceApiKey = 'K83993642088957'; // Free OCR.space API key

    // File input handling
    imageFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            currentImageFile = file;
            fileNameDisplay.textContent = file.name + ` (${(file.size / 1024).toFixed(2)} KB)`;
            fileExtractBtn.classList.remove('hidden');
            previewFile(file);
            
            // Display file size warning if needed
            if (file.size > MAX_FILE_SIZE) {
                showError(`File size (${(file.size / 1024).toFixed(2)} KB) exceeds 1024 KB. Image will be compressed before sending to OCR service.`);
            } else {
                hideError();
            }
        } else {
            fileNameDisplay.textContent = 'No file selected';
            fileExtractBtn.classList.add('hidden');
            currentImageFile = null;
        }
    });

    // Event listeners for extract button
    fileExtractBtn.addEventListener('click', function() {
        processImageFile();
    });

    // Copy text button
    copyBtn.addEventListener('click', function() {
        copyTextToClipboard();
    });

    // Process image from file upload
    async function processImageFile() {
        if (!currentImageFile) {
            showError('Please select an image file');
            return;
        }

        try {
            // Check rate limit
            try {
                await rateLimiter.checkRateLimit('ocr-service');
            } catch (error) {
                if (error.message.includes('Rate limit exceeded')) {
                    showError('Too many requests. Please wait a moment before trying again.');
                    return;
                }
                throw error;
            }

            // Reset UI state
            hideError();
            showLoading();
            resultContainer.classList.add('hidden');

            // Generate cache key from file content
            const fileBuffer = await currentImageFile.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const cacheKey = `ocr-${hashHex}`;

            // Check cache
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                hideLoading();
                displayResult(cachedResult);
                showStatus('Text retrieved from cache!', 'success');
                return;
            }
            
            // Check if file needs compression
            let fileToProcess = currentImageFile;
            if (currentImageFile.size > MAX_FILE_SIZE) {
                fileToProcess = await compressImage(currentImageFile);
                console.log(`Original: ${(currentImageFile.size / 1024).toFixed(2)} KB, Compressed: ${(fileToProcess.size / 1024).toFixed(2)} KB`);
            }

            // Process with OCR
            const result = await fetchOcrResultFromOcrSpace(fileToProcess);
            
            // Cache the result
            if (result) {
                cache.set(cacheKey, result);
            }

        } catch (error) {
            hideLoading();
            console.error('Error processing image:', error);
            showError('An error occurred while processing the image. Please try again.');
        }
    }

    // Compress image to reduce file size
    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;
                img.onload = function() {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions (maintain aspect ratio)
                    let width = img.width;
                    let height = img.height;
                    
                    // If image is too large, scale it down
                    const MAX_DIMENSION = 1800; // Maximum width or height
                    if (width > height && width > MAX_DIMENSION) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    } else if (height > MAX_DIMENSION) {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw image on canvas
                    ctx.fillStyle = '#FFFFFF'; // White background
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to Blob with reduced quality
                    canvas.toBlob(
                        blob => {
                            // Create new File from Blob
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        },
                        'image/jpeg',
                        0.7 // JPEG quality (0-1)
                    );
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    // Fetch OCR result from OCR.space API
    async function fetchOcrResultFromOcrSpace(file) {
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);
            formData.append('apikey', ocrSpaceApiKey);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '2'); // Use more accurate engine
            
            const response = await fetch(ocrSpaceEndpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            hideLoading();

            if (data.OCRExitCode === 1) {
                const extractedText = data.ParsedResults[0]?.ParsedText || '';
                displayResult(extractedText);
                return extractedText;
            } else {
                showError('Failed to extract text from the image. OCR Error: ' + data.ErrorMessage);
                return null;
            }
        } catch (error) {
            hideLoading();
            console.error('OCR.space API Error:', error);
            showError('An error occurred while preparing the image. Please try again.');
            return null;
        }
    }

    // Preview uploaded file
    function previewFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            updateImagePreview(e.target.result);
        };
        reader.onerror = function() {
            imagePreview.innerHTML = '<p class="text-red-500">Failed to load image preview</p>';
        };
        reader.readAsDataURL(file);
    }

    // Update image preview
    function updateImagePreview(imageUrl) {
        imagePreview.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Image preview';
        img.className = 'max-h-96 max-w-full rounded-md';
        img.onerror = function() {
            imagePreview.innerHTML = '<p class="text-red-500">Failed to load image preview</p>';
        };
        
        imagePreview.appendChild(img);
    }

    // Display OCR result
    function displayResult(text) {
        extractedText.textContent = text || 'No text was extracted from the image';
        resultContainer.classList.remove('hidden');
    }

    // Show status message
    function showStatus(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Copy text to clipboard
    function copyTextToClipboard() {
        const text = extractedText.textContent;
        navigator.clipboard.writeText(text)
            .then(() => {
                showStatus('Text copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                showError('Failed to copy text to clipboard');
            });
    }

    // Show loading indicator
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
    }

    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // Hide error message
    function hideError() {
        errorMessage.classList.add('hidden');
    }
}); 