// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const body = document.body;

    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        body.style.overflow = '';
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        body.style.overflow = 'hidden';
    }
}

// Initialize mobile menu button
document.getElementById('mobileMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
});

// Close sidebar when clicking overlay
document.getElementById('overlay').addEventListener('click', toggleSidebar);

// Close sidebar when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('sidebar').classList.contains('open')) {
        toggleSidebar();
    }
});

// Category filtering
function filterByCategory(category) {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        if (item.textContent.toLowerCase() === category.toLowerCase() || 
            (category === 'all' && item.textContent === 'All')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (category === 'all') {
        window.location.href = 'index.html';
    } else {
        window.location.href = `index.html#${category.toLowerCase()}`;
    }
}

// Set initial active state based on current page
document.addEventListener('DOMContentLoaded', function() {
    const categoryItems = document.querySelectorAll('.category-item');
    const currentCategory = document.body.dataset.category || 'all';
    
    categoryItems.forEach(item => {
        if (item.textContent.toLowerCase() === currentCategory.toLowerCase()) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}); 