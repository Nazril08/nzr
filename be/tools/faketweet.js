document.addEventListener('DOMContentLoaded', () => {
    const form = {
        name: document.getElementById('name'),
        username: document.getElementById('username'),
        avatar: document.getElementById('avatar'),
        tweet: document.getElementById('tweet'),
        retweets: document.getElementById('retweets'),
        comments: document.getElementById('comments'),
        likes: document.getElementById('likes'),
        verified: document.getElementById('verified')
    };

    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const tweetImage = document.getElementById('tweetImage');
    const status = document.getElementById('status');
    const result = document.getElementById('result');

    // Set default avatar if not provided
    const defaultAvatar = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
    
    // Initialize with some example values
    form.avatar.value = form.avatar.value || defaultAvatar;
    form.retweets.value = form.retweets.value || '0';
    form.comments.value = form.comments.value || '0';
    form.likes.value = form.likes.value || '0';

    generateBtn.addEventListener('click', generateTweet);
    downloadBtn.addEventListener('click', downloadTweet);

    // Add input validation listeners
    form.name.addEventListener('input', () => validateInput(form.name, 50));
    form.username.addEventListener('input', () => validateUsername(form.username));
    form.tweet.addEventListener('input', () => validateInput(form.tweet, 280));
    
    // Add number input validation
    [form.retweets, form.comments, form.likes].forEach(input => {
        input.addEventListener('input', () => validateNumber(input));
    });

    function validateInput(input, maxLength) {
        input.value = input.value.slice(0, maxLength);
    }

    function validateUsername(input) {
        // Remove spaces and special characters except underscore
        input.value = input.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
    }

    function validateNumber(input) {
        // Remove non-numeric characters and limit to reasonable numbers
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value > 999999999) {
            input.value = '999999999';
        }
    }

    async function generateTweet() {
        // Validate required inputs
        if (!form.name.value || !form.username.value || !form.tweet.value) {
            showStatus('Please fill in name, username, and tweet content', 'error');
            return;
        }

        try {
            showStatus('Generating tweet image...', 'info');

            // Check rate limit
            try {
                await rateLimiter.checkRateLimit('tweet-generator');
            } catch (error) {
                if (error.message.includes('Rate limit exceeded')) {
                    showStatus('Too many requests. Please wait a moment before trying again.', 'error');
                    return;
                }
                throw error;
            }

            // Format date to look like Twitter format
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            const date = now.toLocaleDateString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedDate = `${time} · ${date}`;

            // Generate cache key from all parameters
            const params = {
                bg: 'light',
                avatar: form.avatar.value || defaultAvatar,
                name: form.name.value,
                username: form.username.value,
                tweet: form.tweet.value,
                date: formattedDate,
                retweets: form.retweets.value || '0',
                comment: form.comments.value || '0',
                likes: form.likes.value || '0',
                verified: form.verified.checked.toString()
            };

            const cacheKey = `tweet-${JSON.stringify(params)}`;
            
            // Check cache
            const cachedImage = await cache.get(cacheKey);
            if (cachedImage) {
                tweetImage.src = cachedImage;
                result.classList.remove('hidden');
                showStatus('Tweet image retrieved from cache!', 'success');
                return;
            }

            // Construct URL with parameters
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`https://api.ryzumi.vip/api/image/faketweet?${queryString}`);
            
            if (!response.ok) {
                throw new Error('Failed to generate tweet image');
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            // Cache the result
            cache.set(cacheKey, imageUrl);
            
            tweetImage.src = imageUrl;
            result.classList.remove('hidden');
            
            showStatus('Tweet image generated successfully!', 'success');
        } catch (error) {
            showStatus('Error generating tweet image. Please try again.', 'error');
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

    function downloadTweet() {
        if (!tweetImage.src) {
            showStatus('Please generate a tweet first', 'error');
            return;
        }

        const link = document.createElement('a');
        link.href = tweetImage.src;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `tweet-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('Tweet image downloaded successfully!', 'success');
    }
}); 