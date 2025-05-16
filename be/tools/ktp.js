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

class KTPGenerator {
    constructor() {
        this.form = {};
        this.elements = {};
        this.currentBlob = null;
        this.defaults = {
            provinsi: 'JAWA BARAT',
            kota: 'BANDUNG',
            jenisKelamin: 'LAKI-LAKI',
            golonganDarah: 'A',
            status: 'BELUM MENIKAH',
            kewarganegaraan: 'WNI',
            berlaku: 'SEUMUR HIDUP',
            pasPhoto: 'https://fastmanager.fasturl.cloud/Uploads/Pas-Photo/psf-l1.jpeg'
        };
        this.API_URL = 'https://fastrestapis.fasturl.cloud/maker/ktp';
    }

    initialize() {
        this.initializeFormElements();
        this.initializeDefaults();
        this.setupEventListeners();
    }

    initializeFormElements() {
        // Form fields
        this.form = {
            provinsi: document.getElementById('provinsi'),
            kota: document.getElementById('kota'),
            nik: document.getElementById('nik'),
            nama: document.getElementById('nama'),
            ttl: document.getElementById('ttl'),
            jenisKelamin: document.getElementById('jenisKelamin'),
            golonganDarah: document.getElementById('golonganDarah'),
            alamat: document.getElementById('alamat'),
            rtRw: document.getElementById('rtRw'),
            kelDesa: document.getElementById('kelDesa'),
            kecamatan: document.getElementById('kecamatan'),
            agama: document.getElementById('agama'),
            status: document.getElementById('status'),
            pekerjaan: document.getElementById('pekerjaan'),
            kewarganegaraan: document.getElementById('kewarganegaraan'),
            berlaku: document.getElementById('berlaku'),
            pasPhoto: document.getElementById('pasPhoto')
        };

        // UI elements
        this.elements = {
            generateBtn: document.getElementById('generateBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            ktpImage: document.getElementById('ktpImage'),
            status: document.getElementById('status'),
            result: document.getElementById('result')
        };
    }

    initializeDefaults() {
        Object.keys(this.defaults).forEach(key => {
            if (this.form[key]) {
                this.form[key].value = this.form[key].value || this.defaults[key];
            }
        });
    }

    setupEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.generateKTP());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadKTP());

        // Input validation listeners
        if (this.form.nik) {
            this.form.nik.addEventListener('input', () => this.validateNIK(this.form.nik));
        }
        if (this.form.rtRw) {
            this.form.rtRw.addEventListener('input', () => this.validateRTRW(this.form.rtRw));
        }
    }

    validateNIK(input) {
        input.value = input.value.replace(/[^0-9]/g, '').slice(0, 16);
    }

    validateRTRW(input) {
        input.value = input.value.replace(/[^0-9/]/g, '');
    }

    showStatus(message, type) {
        this.elements.status.textContent = message;
        this.elements.status.classList.remove('hidden');
        
        // Reset classes
        this.elements.status.className = 'mt-4 text-center p-3 rounded-lg';
        
        // Add appropriate color class
        switch(type) {
            case 'error':
                this.elements.status.classList.add('bg-red-100', 'text-red-700');
                break;
            case 'success':
                this.elements.status.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'info':
                this.elements.status.classList.add('bg-blue-100', 'text-blue-700');
                break;
        }
    }

    async generateKTP() {
        // Validate required inputs
        const requiredFields = ['provinsi', 'kota', 'nik', 'nama', 'ttl', 'jenisKelamin', 'alamat'];
        const missingFields = requiredFields.filter(field => !this.form[field]?.value);
        
        if (missingFields.length > 0) {
            this.showStatus(`Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }

        try {
            this.showStatus('Generating KTP image...', 'info');

            // Check rate limit
            try {
                rateLimiter.checkLimit();
            } catch (error) {
                this.showStatus(error.message, 'error');
                return;
            }

            // Prepare parameters
            const params = {
                provinsi: this.form.provinsi.value,
                kota: this.form.kota.value,
                nik: this.form.nik.value,
                nama: this.form.nama.value,
                ttl: this.form.ttl.value,
                jenisKelamin: this.form.jenisKelamin.value,
                golonganDarah: this.form.golonganDarah.value,
                alamat: this.form.alamat.value,
                rtRw: this.form.rtRw.value,
                kelDesa: this.form.kelDesa.value,
                kecamatan: this.form.kecamatan.value,
                agama: this.form.agama.value,
                status: this.form.status.value,
                pekerjaan: this.form.pekerjaan.value,
                kewarganegaraan: this.form.kewarganegaraan.value,
                masaBerlaku: this.form.berlaku.value,
                terbuat: new Date().toLocaleDateString('id-ID'),
                pasPhoto: this.form.pasPhoto.value
            };

            // Generate cache key
            const cacheKey = JSON.stringify(params);
            
            // Check cache
            const cachedImage = cache.get(cacheKey);
            if (cachedImage) {
                this.elements.ktpImage.src = cachedImage;
                this.elements.result.classList.remove('hidden');
                this.showStatus('KTP image retrieved from cache!', 'success');
                return;
            }

            // Construct URL with parameters
            const queryString = new URLSearchParams(params).toString();
            const imageUrl = `${this.API_URL}?${queryString}`;

            // Update image source directly
            this.elements.ktpImage.src = imageUrl;
            this.elements.result.classList.remove('hidden');
            
            // Add load event listener
            this.elements.ktpImage.onload = () => {
                // Cache the successful result
                cache.set(cacheKey, imageUrl);
                this.showStatus('KTP image generated successfully!', 'success');
            };

            // Add error event listener
            this.elements.ktpImage.onerror = () => {
                throw new Error('Failed to load KTP image');
            };

        } catch (error) {
            this.showStatus('Error generating KTP image. Please try again.', 'error');
            console.error('Error:', error);
            this.elements.result.classList.add('hidden');
        }
    }

    downloadKTP() {
        if (!this.elements.ktpImage.src || this.elements.ktpImage.src === window.location.href) {
            this.showStatus('Please generate a KTP first', 'error');
            return;
        }

        // Create a temporary link
        const link = document.createElement('a');
        link.href = this.elements.ktpImage.src;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `ktp-${timestamp}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatus('KTP image downloaded successfully!', 'success');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const ktpGenerator = new KTPGenerator();
    ktpGenerator.initialize();
}); 