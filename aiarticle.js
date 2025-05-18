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

// Article generation functionality
async function generateArticles() {
    const topicInput = document.getElementById('topicInput');
    const styleSelect = document.getElementById('styleSelect');
    const statusDiv = document.getElementById('status');
    const articlesContainer = document.getElementById('articlesContainer');
    
    const topic = topicInput.value.trim();
    const style = styleSelect.value;

    if (!topic) {
        showStatus('Please enter a topic or idea', 'error');
        return;
    }

    try {
        // Check rate limit
        rateLimiter.checkLimit();

        // Check cache
        const cacheKey = `${topic}-${style}`.toLowerCase();
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            displayArticles(cachedResponse);
            return;
        }

        // Show loading state
        showStatus('Generating articles...', 'loading');
        articlesContainer.innerHTML = '<div class="loading"></div>';

        // Prepare the prompt
        const prompt = `Anda adalah penulis artikel profesional yang sangat berpengalaman. Tugas Anda adalah menciptakan artikel berkualitas tinggi berdasarkan topik yang diberikan. Artikel harus dalam format teks biasa tanpa simbol markdown atau formatting khusus.

Panduan Penulisan:
1. STRUKTUR ARTIKEL
   - Judul: Buat judul yang menarik dan relevan (tanpa simbol #)
   - Pembuka: Paragraf pembuka yang menggugah minat pembaca (2-3 kalimat)
   - Isi Utama: 3-4 bagian utama dengan sub-judul yang jelas
   - Penutup: Kesimpulan yang kuat dan call-to-action jika relevan

2. GAYA PENULISAN
   - Gunakan bahasa yang sesuai dengan gaya yang dipilih: ${style}
   - Professional: Formal dan berbasis fakta
   - Casual: Santai dan mudah dipahami
   - Academic: Analitis dan mendalam
   - Creative: Ekspresif dan menarik

3. KUALITAS KONTEN
   - Berikan contoh konkret dan data pendukung
   - Sertakan statistik atau fakta jika relevan
   - Gunakan analogi untuk penjelasan kompleks
   - Hindari kalimat yang berulang
   - Jika ada sebuah perbandingan data gunakan tabel
   - Pastikan setiap paragraf memiliki ide utama yang jelas

4. FORMATTING
   - Gunakan paragraf yang pendek (3-4 kalimat per paragraf)
   - Beri jarak antar bagian dengan baris kosong
   - Untuk daftar, gunakan angka (1. 2. 3.) bukan bullet points
   - Jangan gunakan simbol markdown atau karakter khusus
   - Setiap sub-judul diikuti baris kosong

5. PANJANG DAN KEDALAMAN
   - Minimal 5 paragraf substantif
   - Setiap bagian utama minimal 2 paragraf
   - Seimbangkan antara informasi dan keterbacaan
   - Berikan insight yang mendalam namun mudah dipahami

Topik: ${topic}

Harap tulis artikel yang informatif, menarik, dan mudah dibaca dengan mengikuti semua panduan di atas. Pastikan tidak ada simbol formatting khusus dalam output.`;

        // Make API request
        const response = await fetch(`https://fastrestapis.fasturl.cloud/aillm/gpt-4?ask=${encodeURIComponent(prompt)}&style=${style}`);

        if (!response.ok) {
            throw new Error('Failed to generate articles');
        }

        const data = await response.json();
        
        if (data.status === 200 && data.result) {
            // Cache the response
            cache.set(cacheKey, data.result);
            
            // Display the articles
            displayArticles(data.result);
            
            // Clear status
            showStatus('', '');
        } else {
            throw new Error(data.error || 'Failed to generate articles');
        }

    } catch (error) {
        console.error('Error:', error);
        showStatus(error.message, 'error');
        articlesContainer.innerHTML = '';
    }
}

function displayArticles(content) {
    const articlesContainer = document.getElementById('articlesContainer');
    
    // Create article version element
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-version';
    articleDiv.innerHTML = `
        <div class="prose max-w-none">
            ${content}
        </div>
    `;
    
    // Add to container
    articlesContainer.innerHTML = '';
    articlesContainer.appendChild(articleDiv);
}

// Function to download article as PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Get the article content
    const articleContent = document.querySelector('.prose').textContent;
    
    // Set font size and type
    doc.setFontSize(12);
    
    // Add title
    doc.setFontSize(16);
    doc.text('Generated Article', 20, 20);
    
    // Reset font size for content
    doc.setFontSize(12);
    
    // Split text into lines that fit the page width
    const lines = doc.splitTextToSize(articleContent, 170);
    
    // Add lines to document, creating new pages as needed
    let y = 30;
    lines.forEach(line => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, 20, y);
        y += 7;
    });
    
    // Save the PDF
    doc.save('generated-article.pdf');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    
    // Reset classes
    statusDiv.className = 'text-sm';
    
    // Add appropriate styling
    switch (type) {
        case 'error':
            statusDiv.classList.add('text-red-600');
            break;
        case 'loading':
            statusDiv.classList.add('text-blue-600');
            break;
        case 'success':
            statusDiv.classList.add('text-green-600');
            break;
    }
}

function copyArticle(button) {
    const articleText = document.querySelector('.prose').textContent;
    navigator.clipboard.writeText(articleText).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}