// Base configuration
const API_URL = 'http://localhost:5000/api';

// Export to window object for global access
window.API_URL = API_URL;

// Auth State Management
const auth = {
    getToken: () => localStorage.getItem('token'),
    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch(e) { return null; }
    },
    isLoggedIn: () => !!localStorage.getItem('token'),
    isAdmin: () => {
        const user = auth.getUser();
        return user && user.isAdmin;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const isSubDir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pages/');
        window.location.href = isSubDir ? '../index.html' : 'index.html';
    },
    saveAuth: (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },
    getHeaders: () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },
    handleApiError: (res, data) => {
        if (res.status === 401 && (data.message === 'Người dùng không tồn tại!' || data.message.includes('token'))) {
            alert('Phiên làm việc hết hạn do dữ liệu đã được làm mới. Vui lòng đăng nhập lại!');
            auth.logout();
            return true;
        }
        return false;
    }
};

// Global helpers 
window.auth = auth;
window.isLoggedIn = auth.isLoggedIn;
window.isAdmin = auth.isAdmin;

// Update UI based on auth state
function updateNavbar() {
    const authSection = document.getElementById('nav-auth-section');
    if (!authSection) return;

    // Handle Admin-only visibility
    const isAdmin = auth.isAdmin();
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = isAdmin ? 'inline-block' : 'none';
    });

    const isSubDir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pages/');
    const base = isSubDir ? '../' : '';

    if (auth.isLoggedIn()) {
        const user = auth.getUser();
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        authSection.innerHTML = `
            <div class="user-menu-container">
                <div class="user-profile-btn">
                    <div class="user-avatar">${initial}</div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-role">${isAdmin ? 'Quản trị viên' : 'Thành viên'}</span>
                    </div>
                </div>
                <div class="dropdown-menu">
                    ${isAdmin ? `<a href="${base}admin/products.html" class="dropdown-item">📦 Bảng quản trị</a>` : ''}
                    <a href="${base}profile.html" class="dropdown-item">👤 Hồ sơ cá nhân</a>
                    <a href="#" class="dropdown-item logout" onclick="auth.logout()">🚪 Đăng xuất</a>
                </div>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <div class="auth-btns">
                <a href="${base}login.html" class="btn-login">Đăng nhập</a>
                <a href="${base}register.html" class="btn-register">Đăng ký</a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Immediate check for redirect
    if (window.location.pathname.includes('/admin/')) {
        if (!auth.isLoggedIn() || !auth.isAdmin()) {
            alert('Bạn không có quyền truy cập trang quản trị!');
            const isSubDir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/pages/');
            window.location.href = isSubDir ? '../login.html' : 'login.html';
            return;
        }
    }
    updateNavbar();
});
