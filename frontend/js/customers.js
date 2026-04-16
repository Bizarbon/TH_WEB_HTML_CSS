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

// Load
async function loadCustomers() {
    try {
        const res = await fetch(EP, { headers: auth.getHeaders() });
        const data = await res.json();
        
        if (auth.handleApiError(res, data)) return;
        if (!res.ok) throw new Error(data.message || 'Lỗi từ server');

        // Update count
        const countEl = document.getElementById('customerCount');
        if (countEl) countEl.textContent = data.length;

        const tableBody = document.getElementById('customerTable');
        if (!tableBody) return;

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        Chưa có khách hàng nào
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = data.map((c, index) => `
            <tr class="fade-in">
                <td style="font-weight: 600; color: var(--text-muted);">${index + 1}</td>
                <td><strong>${c.name}</strong></td>
                <td style="color:var(--primary-light);">${c.username || '—'}</td>
                <td>${c.phone || '—'}</td>
                <td style="color:var(--text-secondary);">${c.email || '—'}</td>
                <td style="color:var(--text-secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.address || '—'}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn-edit" onclick="editCustomer('${c._id}')">✏️ Sửa</button>
                        <button class="btn-delete" onclick="deleteCustomer('${c._id}')">🗑️ Xóa</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi tải danh sách khách hàng!', 'error');
    }
}

// Submit
const customerForm = document.getElementById('customerForm');
if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('customerId').value;
        const data = {
            name: document.getElementById('name').value,
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${EP}/${id}` : EP;

            const res = await fetch(url, {
                method,
                headers: auth.getHeaders(),
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast(id ? '✅ Cập nhật thành công!' : '✅ Thêm khách hàng thành công!');
                resetForm();
                loadCustomers();
            } else {
                const err = await res.json();
                showToast(err.message || 'Có lỗi khi lưu thông tin!', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra!', 'error');
        }
    });
}

// Edit
async function editCustomer(id) {
    try {
        const res = await fetch(`${EP}/${id}`, { headers: auth.getHeaders() });
        const c = await res.json();

        document.getElementById('customerId').value = c._id;
        document.getElementById('name').value = c.name;
        document.getElementById('username').value = c.username || '';
        document.getElementById('email').value = c.email || '';
        document.getElementById('phone').value = c.phone || '';
        document.getElementById('address').value = c.address || '';
        document.getElementById('formTitle').textContent = 'Sửa khách hàng';

        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Delete
async function deleteCustomer(id) {
    if (!confirm('Xóa khách hàng này?')) return;

    try {
        const res = await fetch(`${EP}/${id}`, { 
            method: 'DELETE',
            headers: auth.getHeaders()
        });
        if (res.ok) {
            showToast('🗑️ Đã xóa khách hàng!');
            loadCustomers();
        } else {
            const data = await res.json();
            showToast(data.message || 'Lỗi xóa khách hàng!', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi xóa khách hàng!', 'error');
    }
}

// Reset
function resetForm() {
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('formTitle').textContent = 'Thêm khách hàng mới';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
});