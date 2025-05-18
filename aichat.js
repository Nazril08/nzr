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

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
}

function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    messagesContainer.appendChild(typingIndicator);
    scrollToBottom(messagesContainer);
    return typingIndicator;
}

function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

function updateStatus(message, isError = false) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? '#dc3545' : '#666';
        statusElement.style.opacity = message ? '1' : '0';
        statusElement.style.transition = 'opacity 0.3s ease';
    }
}

function processMessageContent(message) {
    if (!message) return '';
    
    // Handle code blocks with language support
    message = message.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        const language = lang || '';
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });
    
    // Handle inline code
    message = message.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle lists
    message = message.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    message = message.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    
    // Handle line breaks
    message = message.replace(/\n/g, '<br>');
    
    return message;
}

function addMessage(message, isUser) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isUser ? 'user-message' : 'ai-message'} opacity-0`;
    
    // Process message content
    const processedMessage = processMessageContent(message);
    messageElement.innerHTML = processedMessage;
    
    messagesContainer.appendChild(messageElement);
    
    // Trigger fade in animation
    setTimeout(() => {
        messageElement.classList.remove('opacity-0');
        messageElement.classList.add('opacity-100');
        scrollToBottom(messagesContainer);
    }, 10);
    
    // Trigger MathJax to process new content
    if (!isUser && window.MathJax) {
        MathJax.typesetPromise([messageElement]).catch((err) => {
            console.error('MathJax typesetting failed:', err);
        });
    }
}

function getPromptByCategory(category, userMessage) {
    const basePrompt = {
        general: `Anda adalah asisten AI yang sangat membantu dan profesional. Berikan jawaban yang informatif dan mudah dipahami.

Panduan Menjawab:
1. STRUKTUR JAWABAN
   - Berikan jawaban yang terstruktur dan jelas
   - Mulai dengan poin utama
   - Berikan detail pendukung
   - Akhiri dengan kesimpulan jika diperlukan

2. GAYA PENULISAN
   - Gunakan bahasa yang formal dan profesional
   - Hindari jargon yang tidak perlu
   - Berikan contoh jika diperlukan
   - Pastikan penjelasan mudah dimengerti

3. FORMAT TEKS
   - Gunakan paragraf yang pendek dan jelas
   - Gunakan nomor untuk langkah-langkah
   - Hindari simbol atau karakter khusus
   - Gunakan tanda baca yang tepat

Pertanyaan: ${userMessage}`,

        math: `Anda adalah ahli matematika yang sangat berpengalaman. Berikan penjelasan yang jelas dan terstruktur menggunakan format teks biasa.

Panduan Menjawab:
1. STRUKTUR PENJELASAN
   - Mulai dengan judul yang jelas menggunakan tanda bintang (**)
   - Jelaskan konsep atau rumus yang akan digunakan
   - Tunjukkan langkah-langkah penyelesaian
   - Berikan interpretasi hasil

2. FORMAT PENULISAN RUMUS (Gunakan format teks biasa)
   - Pangkat: gunakan ^ (contoh: x^2 untuk x kuadrat)
   - Pecahan: gunakan / (contoh: 3/4)
   - Perkalian: gunakan * atau x (contoh: 2*x atau 2x)
   - Akar: gunakan sqrt() (contoh: sqrt(16) = 4)
   - Tanda negatif: gunakan - (contoh: -5)
   - Desimal: gunakan titik (contoh: 3.14)
   - Kurung: gunakan () untuk mengelompokkan (contoh: (x+y)/2)
   - Indeks: gunakan _ (contoh: x_1 untuk x sub 1)

3. CONTOH FORMAT PENULISAN
   Rumus kuadrat: ax^2 + bx + c = 0
   Rumus pythagoras: c = sqrt(a^2 + b^2)
   Pecahan campuran: 3 + 1/4
   Persamaan linear: y = mx + b
   Logaritma: log(x) atau ln(x)
   Trigonometri: sin(x), cos(x), tan(x)

4. LANGKAH PERHITUNGAN
   - Tunjukkan substitusi nilai dengan jelas
   - Pisahkan setiap langkah dengan baris baru
   - Gunakan tanda "=" untuk menunjukkan hasil
   - Berikan spasi yang cukup antar operator

5. PENJELASAN
   - Jelaskan setiap langkah dengan bahasa sederhana
   - Berikan alasan setiap langkah jika perlu
   - Interpretasikan hasil akhir
   - Gunakan format teks biasa, hindari simbol khusus

Contoh Jawaban Lengkap:
**Menghitung Luas Lingkaran**

Rumus luas lingkaran:
A = pi * r^2

Di mana:
- A = luas lingkaran
- pi = 3.14
- r = jari-jari = 5 cm

Perhitungan:
A = 3.14 * 5^2
A = 3.14 * 25
A = 78.5 cm^2

Jadi, luas lingkaran dengan jari-jari 5 cm adalah 78.5 cm^2.

Pertanyaan: ${userMessage}`,

        code: `Anda adalah programmer expert yang sangat berpengalaman. Berikan solusi kode yang efisien dan mudah dipahami.

Panduan Menjawab:
1. STRUKTUR JAWABAN
   - Jelaskan pendekatan solusi
   - Berikan pseudocode jika perlu
   - Tulis kode dengan format yang benar
   - Jelaskan cara kerja kode

2. PENULISAN KODE
   - Gunakan indentasi yang konsisten
   - Beri komentar untuk bagian penting
   - Gunakan nama variabel yang jelas
   - Format kode dengan rapi

3. PRAKTIK TERBAIK
   - Ikuti standar penulisan kode
   - Optimasi performa jika relevan
   - Tangani error dengan baik
   - Berikan contoh penggunaan

4. FORMAT KODE
   - Gunakan \`\`\` untuk blok kode
   - Gunakan \` untuk kode inline
   - Pisahkan fungsi dengan jelas
   - Beri spasi yang konsisten

Pertanyaan: ${userMessage}`,

        science: `Anda adalah ilmuwan yang sangat berpengalaman. Jelaskan konsep ilmiah dengan akurat dan mudah dipahami.

Panduan Menjawab:
1. STRUKTUR PENJELASAN
   - Mulai dengan konsep dasar
   - Jelaskan proses atau fenomena
   - Berikan contoh konkret
   - Simpulkan poin penting

2. PENULISAN RUMUS
   - Tulis rumus dengan format yang benar
   - Jelaskan setiap variabel
   - Gunakan satuan yang tepat
   - Berikan contoh perhitungan

3. KONTEN ILMIAH
   - Gunakan fakta yang akurat
   - Sertakan data pendukung
   - Jelaskan istilah teknis
   - Berikan aplikasi praktis

Pertanyaan: ${userMessage}`,

        history: `Anda adalah sejarawan yang sangat berpengalaman. Jelaskan peristiwa sejarah dengan akurat dan kontekstual.

Panduan Menjawab:
1. STRUKTUR PENJELASAN
   - Berikan konteks historis
   - Jelaskan kronologi kejadian
   - Analisis sebab-akibat
   - Simpulkan dampak peristiwa

2. PENYAJIAN DATA
   - Gunakan tanggal yang akurat
   - Sebutkan tokoh-tokoh penting
   - Jelaskan lokasi kejadian
   - Sertakan fakta pendukung

3. ANALISIS
   - Berikan berbagai perspektif
   - Jelaskan dampak jangka panjang
   - Hubungkan dengan masa kini
   - Berikan pembelajaran penting

Pertanyaan: ${userMessage}`,

        literature: `Anda adalah ahli sastra yang sangat berpengalaman. Analisis karya sastra dengan mendalam dan komprehensif.

Panduan Menjawab:
1. STRUKTUR ANALISIS
   - Jelaskan konteks karya
   - Analisis tema dan makna
   - Bahas gaya penulisan
   - Berikan interpretasi

2. PENGUTIPAN
   - Kutip teks dengan tepat
   - Gunakan tanda kutip yang benar
   - Jelaskan konteks kutipan
   - Analisis makna kutipan

3. PEMBAHASAN
   - Jelaskan unsur intrinsik
   - Analisis unsur ekstrinsik
   - Bahas nilai-nilai karya
   - Berikan kritik yang konstruktif

Pertanyaan: ${userMessage}`
    };

    return basePrompt[category] || basePrompt.general;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const category = document.getElementById('category-select').value;
    const sendButton = document.querySelector('.send-button');

    if (!message) return;

    try {
        // Disable input and button while processing
        input.disabled = true;
        if (sendButton) sendButton.disabled = true;
        
        // Add user message to chat
        addMessage(message, true);
        input.value = '';
        input.style.height = 'auto'; // Reset height
        
        // Check cache first
        const cacheKey = `${message}-${category}`;
        const cachedResponse = cache.get(cacheKey);
        
        if (cachedResponse) {
            addMessage(cachedResponse, false);
            updateStatus('Retrieved from cache');
            return;
        }

        updateStatus('Thinking...');
        const typingIndicator = showTypingIndicator();
        
        // Get the appropriate prompt based on category
        const prompt = getPromptByCategory(category, message);
        
        const response = await fetch(`https://fastrestapis.fasturl.cloud/aillm/gpt-4?ask=${encodeURIComponent(prompt)}&style=professional&category=${category}&sessionId=1`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        removeTypingIndicator(typingIndicator);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        if (data.status === 200 && data.result) {
            // Store in cache
            cache.set(cacheKey, data.result);
            
            addMessage(data.result, false);
            updateStatus('');
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error:', error);
        updateStatus('Failed to get response. Please try again.', true);
    } finally {
        // Re-enable input and button
        input.disabled = false;
        if (sendButton) sendButton.disabled = false;
        input.focus();
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chat-input');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // Handle textarea auto-resize
    chatInput.addEventListener('input', function() {
        adjustTextareaHeight(this);
    });
    
    // Handle Enter key press
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle input focus
    chatInput.addEventListener('focus', function() {
        this.parentElement.classList.add('ring-2', 'ring-blue-500');
    });

    chatInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('ring-2', 'ring-blue-500');
    });

    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
            // Readjust textarea height
            adjustTextareaHeight(chatInput);
        }, 100);
    });

    // Initialize MathJax configuration
    if (window.MathJax) {
        window.MathJax.config = {
            tex: {
                inlineMath: [['$', '$']],
                displayMath: [['$$', '$$']]
            },
            svg: {
                fontCache: 'global'
            }
        };
    }
}); 