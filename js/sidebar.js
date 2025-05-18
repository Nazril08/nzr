// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // Mobile menu toggle
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.classList.toggle('overflow-hidden');
    }

    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    }

    // Add click event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close sidebar when clicking overlay
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeSidebar();
            }
        });
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        const isClickInside = sidebar.contains(e.target) || mobileMenuBtn.contains(e.target);
        if (!isClickInside && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Close sidebar when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth >= 768) {
                closeSidebar();
            }
        }, 100);
    });

    // Set active nav item based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage.includes(href.split('#')[0]) && href !== 'index.html')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Handle navigation item clicks on mobile
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });
}); 