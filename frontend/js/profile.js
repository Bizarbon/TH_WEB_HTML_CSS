const EP = API_URL + '/customers';

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => toast.remove(), 3000);
    }, 100);
}

// Load Profie
async function loadProfile() {
    const user = auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${EP}/${user.id}`, { headers: auth.getHeaders() });
        const data = await res.json();
        
        if (auth.handleApiError(res, data)) return;
        if (!res.ok) throw new Error(data.message);

        // Update Bio Card
        document.getElementById('profileInitial').textContent = data.name.charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profileUsername').textContent = '@' + data.username;
        
        const badge = document.getElementById('profileRoleBadge');
        badge.textContent = data.isAdmin ? 'Quản trị viên' : 'Thành viên';
        badge.className = `role-badge ${data.isAdmin ? 'role-admin' : 'role-member'}`;

        const joinDate = new Date(data.createdAt).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        document.getElementById('profileJoinDate').textContent = joinDate;

        // Populate Form
        document.getElementById('pName').value = data.name;
        document.getElementById('pPhone').value = data.phone || '';
        document.getElementById('pEmail').value = data.email || '';
        document.getElementById('pAddress').value = data.address || '';

    } catch (err) {
        console.error('Profile error:', err);
    }
}

// Handle Update
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.getUser();
        
        const payload = {
            name: document.getElementById('pName').value.trim(),
            phone: document.getElementById('pPhone').value.trim(),
            email: document.getElementById('pEmail').value.trim(),
            address: document.getElementById('pAddress').value.trim()
        };

        const newPass = document.getElementById('pPassword').value;
        if (newPass) payload.password = newPass;

        try {
            const res = await fetch(`${EP}/${user.id}`, {
                method: 'PUT',
                headers: auth.getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            showToast('✅ Cập nhật hồ sơ thành công!');
            
            // Update local storage name if it changed
            user.name = payload.name;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Reload UI
            loadProfile();
            if (typeof updateNavbar === 'function') updateNavbar();

        } catch (err) {
            showToast(err.message || 'Lỗi khi cập nhật!', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', loadProfile);
