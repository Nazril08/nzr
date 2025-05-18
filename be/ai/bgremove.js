// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5,
    timeWindow: 60000, // 1 minute
    requests: [],
    
    checkLimit: function() {
        const now = Date.now();
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
    maxSize: 50,
    timeToLive: 3600000, // 1 hour
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
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
        
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const imageFile = document.getElementById('imageFile');
    const imageUrl = document.getElementById('imageUrl');
    const fetchUrlBtn = document.getElementById('fetchUrlBtn');
    const previewImg = document.getElementById('previewImg');
    const imagePreview = document.getElementById('imagePreview');
    const removeImage = document.getElementById('removeImage');
    const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const originalImage = document.getElementById('originalImage');
    const processedImage = document.getElementById('processedImage');
    const downloadBtn = document.getElementById('downloadBtn');

    let selectedFile = null;
    let selectedUrl = null;

    // Handle URL input
    imageUrl.addEventListener('input', () => {
        selectedFile = null;
        imageFile.value = '';
        if (imageUrl.value.trim()) {
            fetchUrlBtn.disabled = false;
        } else {
            fetchUrlBtn.disabled = true;
        }
    });

    // Handle file selection
    imageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showStatus('File size exceeds 5MB limit', 'error');
                return;
            }
            if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
                showStatus('Only JPG and PNG files are supported', 'error');
                return;
            }
            selectedFile = file;
            selectedUrl = null;
            imageUrl.value = '';
            previewImage(file);
            removeBackgroundBtn.disabled = false;
        }
    });

    // Fetch image from URL
    fetchUrlBtn.addEventListener('click', async () => {
        const url = imageUrl.value.trim();
        if (!url) {
            showStatus('Please enter an image URL', 'error');
            return;
        }

        try {
            showStatus('Fetching image...', 'info');
            fetchUrlBtn.disabled = true;

            // Validate URL format
            if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png)$/i)) {
                throw new Error('Invalid image URL. Must be a direct link to a JPG or PNG file.');
            }

            // Fetch the image
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch image from URL');
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('URL does not point to a valid image');
            }

            const blob = await response.blob();
            if (blob.size > 5 * 1024 * 1024) {
                throw new Error('Image size exceeds 5MB limit');
            }

            // Create a File object from the blob
            selectedFile = new File([blob], 'image_from_url.' + contentType.split('/')[1], {
                type: contentType
            });
            selectedUrl = url;

            // Preview the image
            previewImage(selectedFile);
            removeBackgroundBtn.disabled = false;
            showStatus('Image loaded successfully!', 'success');
        } catch (error) {
            console.error('Error fetching image:', error);
            showStatus(error.message, 'error');
            selectedFile = null;
            selectedUrl = null;
            removeBackgroundBtn.disabled = true;
        } finally {
            fetchUrlBtn.disabled = false;
        }
    });

    // Handle drag and drop
    const dropZone = imageFile.parentElement;
    
    // Add click handler for the drop zone
    dropZone.addEventListener('click', () => {
        imageFile.click();
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showStatus('File size exceeds 5MB limit', 'error');
                return;
            }
            if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
                showStatus('Only JPG and PNG files are supported', 'error');
                return;
            }
            imageFile.files = e.dataTransfer.files;
            selectedFile = file;
            selectedUrl = null;
            imageUrl.value = '';
            previewImage(file);
            removeBackgroundBtn.disabled = false;
        }
    });

    // Remove selected image
    removeImage.addEventListener('click', () => {
        imageFile.value = '';
        imageUrl.value = '';
        selectedFile = null;
        selectedUrl = null;
        imagePreview.classList.add('hidden');
        removeBackgroundBtn.disabled = true;
        result.classList.add('hidden');
    });

    // Preview selected image
    function previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    removeBackgroundBtn.addEventListener('click', removeBackground);

    async function removeBackground() {
        if (!selectedFile && !selectedUrl) {
            showStatus('Please select an image or enter an image URL', 'error');
            return;
        }

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            removeBackgroundBtn.disabled = true;
            result.classList.add('hidden');
            showStatus('Removing background...', 'info');

            let imageUrl;
            if (selectedUrl) {
                // If we have a direct URL, use it
                imageUrl = selectedUrl;
            } else {
                // Upload to tmpfiles.org if we have a file
                const formData = new FormData();
                formData.append('file', selectedFile);

                const uploadResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload image');
                }

                const uploadResult = await uploadResponse.json();
                imageUrl = uploadResult.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            }

            // Call the background removal API
            const response = await fetch(`https://fastrestapis.fasturl.cloud/aiimage/removebg?imageUrl=${encodeURIComponent(imageUrl)}&type=auto&shadow=false`, {
                method: 'GET',
                headers: {
                    'Accept': 'image/*'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to remove background (${response.status})`);
            }

            // Get the processed image blob
            const imageBlob = await response.blob();
            const processedImageUrl = URL.createObjectURL(imageBlob);
            
            // Set original image
            originalImage.src = selectedUrl || URL.createObjectURL(selectedFile);
            
            // Update UI with processed image
            processedImage.src = processedImageUrl;
            downloadBtn.href = processedImageUrl;
            downloadBtn.download = `nobg_${selectedFile.name}`;

            // Show result
            result.classList.remove('hidden');
            setTimeout(() => {
                result.classList.add('show');
            }, 100);

            showStatus('Background removed successfully!', 'success');

            // Cache the result
            const cacheKey = selectedUrl || selectedFile.name;
            cache.set(cacheKey, processedImageUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to remove background. Please try again.', 'error');
            result.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            removeBackgroundBtn.disabled = false;
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

    // Handle image load errors
    originalImage.addEventListener('error', () => {
        showStatus('Failed to load original image', 'error');
        result.classList.add('hidden');
    });

    processedImage.addEventListener('error', () => {
        showStatus('Failed to load processed image. Please try again.', 'error');
        result.classList.add('hidden');
    });
}); 