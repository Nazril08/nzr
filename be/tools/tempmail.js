let currentEmail = '';
let currentId = '';
let checkInterval;

async function generateEmail() {
    console.log('Generating email...');
    try {
        const response = await fetch('https://api.ferdev.my.id/internet/tempmail', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log('Raw response:', response);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            currentEmail = data.data.addresses[0].address;
            currentId = data.data.id;
            console.log('Generated Email:', currentEmail);
            console.log('Generated ID:', currentId);
            
            document.getElementById('emailAddress').textContent = currentEmail;
            document.getElementById('emailId').textContent = currentId;
            document.getElementById('emailResult').classList.remove('hidden');
            
            // Auto fill the inbox ID and start checking
            document.getElementById('inboxId').value = currentId;
            startAutoCheck();
        } else {
            console.error('Failed to generate email:', data);
            alert('Failed to generate email. Please try again.');
        }
    } catch (error) {
        console.error('Error generating email:', error);
        alert('An error occurred. Please try again.');
    }
}

function startAutoCheck() {
    // Clear any existing interval
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    // Check immediately
    checkInbox();
    
    // Then check every 3 seconds
    checkInterval = setInterval(checkInbox, 3000);
    console.log('Started auto-check interval');
}

async function checkInbox() {
    const inboxId = document.getElementById('inboxId').value.trim();
    if (!inboxId) {
        console.log('No inbox ID provided');
        return;
    }

    try {
        console.log('Checking inbox for ID:', inboxId);
        const url = `https://api.ferdev.my.id/internet/mailbox?id=${encodeURIComponent(inboxId)}`;
        console.log('Request URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Inbox response data:', JSON.stringify(data, null, 2));
        
        const inboxResult = document.getElementById('inboxResult');
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';

        if (data.success && data.data && data.data.mails && data.data.mails.length > 0) {
            console.log('Found messages:', data.data.mails.length);
            data.data.mails.forEach((message, index) => {
                console.log(`Processing message ${index + 1}:`, JSON.stringify(message, null, 2));
                const messageElement = document.createElement('div');
                messageElement.className = 'bg-white p-6 rounded-lg shadow-sm mb-4 border border-gray-100';
                
                // Process the message text
                let processedText = message.text || '';
                
                // Convert URLs to clickable links while preserving the text
                processedText = processedText.replace(
                    /(https?:\/\/[^\s\]]+)(\[[^\]]*\])?/g,
                    (match, url, label) => {
                        // If there's a label, use it, otherwise use the URL
                        const displayText = label ? label.slice(1, -1) : url;
                        return `<a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-all">${displayText}</a>`;
                    }
                );

                // Remove email headers but preserve important content
                processedText = processedText.split('\n')
                    .filter(line => !line.match(/^(From|To|Date|Subject):/i))
                    .join('\n');
                
                // Extract verification code if exists
                let verificationCode = '';
                const subject = message.headerSubject || '';
                
                // Common patterns for verification codes
                const codePatterns = [
                    /verification code[:\s]+([A-Z0-9]{4,8})/i,
                    /code[:\s]+([A-Z0-9]{4,8})/i,
                    /verify[:\s]+([A-Z0-9]{4,8})/i,
                    /kode verifikasi[:\s]+([A-Z0-9]{4,8})/i,
                    /kode[:\s]+([A-Z0-9]{4,8})/i,
                    /([0-9]{4,8})/,  // Look for any 4-8 digit number
                    /([A-Z0-9]{4,8})/  // Fallback for any 4-8 character code
                ];
                
                // Check both subject and text for verification code
                for (const pattern of codePatterns) {
                    const matchText = processedText.match(pattern);
                    const matchSubject = subject.match(pattern);
                    if (matchText && matchText[1]) {
                        verificationCode = matchText[1];
                        console.log('Found verification code in text:', verificationCode);
                        break;
                    }
                    if (matchSubject && matchSubject[1]) {
                        verificationCode = matchSubject[1];
                        console.log('Found verification code in subject:', verificationCode);
                        break;
                    }
                }

                // Clean up the subject
                const cleanSubject = (message.headerSubject || '').replace(/^(Re|Fwd|FW|Forward):\s*/i, '');

                messageElement.innerHTML = `
                    <div class="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                        <div>
                            <div class="font-medium text-gray-900">${cleanSubject || 'No Subject'}</div>
                            <div class="text-sm text-gray-600 mt-1">${message.fromAddr || 'No Sender'}</div>
                        </div>
                        <div class="text-sm text-gray-500">${new Date().toLocaleString()}</div>
                    </div>
                    ${verificationCode ? `
                    <div class="bg-blue-50 p-4 rounded-lg mb-4 flex items-center justify-between">
                        <div>
                            <span class="text-sm font-medium text-blue-800">Verification Code:</span>
                            <span class="ml-2 font-mono text-xl font-bold text-blue-900">${verificationCode}</span>
                        </div>
                        <button onclick="copyText('${verificationCode}')" 
                                class="copy-button text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center bg-blue-100 hover:bg-blue-200 transition-colors px-4 py-2 rounded-lg">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            Copy Code
                        </button>
                    </div>
                    ` : ''}
                    <div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed space-y-2">${processedText}</div>
                `;
                messagesList.appendChild(messageElement);
            });
            
            // Show the inbox result container
            inboxResult.classList.remove('hidden');
        } else {
            console.log('No messages found or request failed:', data);
            messagesList.innerHTML = '<div class="text-center text-gray-500 py-8">No messages found</div>';
            inboxResult.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error checking inbox:', error);
        // Don't show alert for auto-check errors
        if (!checkInterval) {
            alert('An error occurred while checking inbox. Please try again.');
        }
    }
}

function copyEmail() {
    navigator.clipboard.writeText(currentEmail)
        .then(() => alert('Email copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
}

function copyId() {
    navigator.clipboard.writeText(currentId)
        .then(() => alert('ID copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
}

function copyText(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            // Create a temporary element for the copy notification
            const notification = document.createElement('div');
            notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
            notification.textContent = 'Code copied!';
            document.body.appendChild(notification);
            
            // Remove the notification after 2 seconds
            setTimeout(() => {
                notification.remove();
            }, 2000);
        })
        .catch(err => console.error('Failed to copy:', err));
}

// Clean up interval when leaving the page
window.addEventListener('beforeunload', () => {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
}); 