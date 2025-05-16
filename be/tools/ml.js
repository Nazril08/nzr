async function checkML() {
    const userId = document.getElementById('userId').value.trim();
    const zoneId = document.getElementById('zoneId').value.trim();
    const resultDiv = document.getElementById('result');
    const statusDiv = document.getElementById('status');

    
    
    // Reset tampilan
    resultDiv.classList.add('hidden');
    
    if (!userId || !zoneId) {
        showStatus('error', 'Mohon masukkan User ID dan Zone ID');
        return;
    }

    try {
        showStatus('loading', 'Sedang mengecek akun...');

        const response = await fetch(`https://fastrestapis.fasturl.cloud/stalk/mlbb?userId=${encodeURIComponent(userId)}&zoneId=${encodeURIComponent(zoneId)}`);

        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.status === 200) {
            document.getElementById('username').textContent = data.result.username || '-';
            document.getElementById('displayUserId').textContent = userId;
            document.getElementById('displayZoneId').textContent = zoneId;
            document.getElementById('region').textContent = data.result.region || '-';

            resultDiv.classList.remove('hidden');
            showStatus('success', 'Data akun berhasil ditemukan');
        } else {
            throw new Error('Data tidak ditemukan');
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showStatus('error', 'Gagal terhubung ke server. Mohon coba lagi beberapa saat.');
        } else {
            showStatus('error', error.message);
        }
    }
}

function showStatus(type, message) {
    const statusDiv = document.getElementById('status');
    statusDiv.className = 'mt-4 text-center p-3 rounded-lg';
    
    switch(type) {
        case 'loading':
            statusDiv.classList.add('bg-blue-100', 'text-blue-700');
            break;
        case 'success':
            statusDiv.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'error':
            statusDiv.classList.add('bg-red-100', 'text-red-700');
            break;
    }
    
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const checkButton = document.getElementById('checkBtn');
    if (checkButton) {
        checkButton.addEventListener('click', checkML);
    }
}); 