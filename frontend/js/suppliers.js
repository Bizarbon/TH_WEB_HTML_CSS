const EP = API_URL + '/suppliers';

let editingId = null;

const policyLabels = {
    no_return:  '❌ Không đổi trả',
    '7_days':   '🔄 7 ngày',
    '15_days':  '🔄 15 ngày',
    '30_days':  '🔄 30 ngày',
    negotiable: '🤝 Thỏa thuận'
};

// Toast
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.classList.add('show');
        setTimeout(() => t.remove(), 3000);
    }, 100);
}

// Load & render suppliers
async function loadSuppliers() {
    try {
        const res = await fetch(EP, { headers: auth.getHeaders() });
        const data = await res.json();
        renderCards(data);
        const countEl = document.getElementById('supplierCount');
        if (countEl) countEl.textContent = `(${data.length} nhà cung cấp)`;
    } catch (e) {
        document.getElementById('supplierCards').innerHTML =
            `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Không thể kết nối server</p></div>`;
    }
}

function renderCards(suppliers) {
    const container = document.getElementById('supplierCards');
    if (!container) return;
    
    if (!suppliers.length) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">🏭</span><p>Chưa có nhà cung cấp nào</p></div>`;
        return;
    }
    container.innerHTML = suppliers.map(s => `
        <div class="supplier-card fade-in">
            <div class="supplier-card-header">
                <div class="supplier-name">🏭 ${s.name}</div>
                <span class="policy-badge policy-${s.returnPolicy}">${policyLabels[s.returnPolicy] || s.returnPolicy}</span>
            </div>
            <ul class="supplier-info-list">
                ${s.phone ? `<li><span>📞</span><span>${s.phone}</span></li>` : ''}
                ${s.email ? `<li><span>✉️</span><span>${s.email}</span></li>` : ''}
                ${s.address ? `<li><span>📍</span><span>${s.address}</span></li>` : ''}
                <li><span>🚚</span><span class="delivery-badge">Giao trong <strong>${s.deliveryTime}</strong> ngày</span></li>
            </ul>
            ${s.notes ? `<div class="supplier-notes">💬 ${s.notes}</div>` : ''}
            <div class="supplier-actions">
                <button class="btn-edit" onclick="editSupplier('${s._id}')">✏️ Sửa</button>
                <button class="btn-delete" onclick="deleteSupplier('${s._id}', '${s.name}')">🗑️ Xóa</button>
            </div>
        </div>
    `).join('');
}

// Submit (create or update)
const supplierForm = document.getElementById('supplierForm');
if (supplierForm) {
    supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('sName').value.trim(),
            phone: document.getElementById('sPhone').value.trim(),
            email: document.getElementById('sEmail').value.trim(),
            address: document.getElementById('sAddress').value.trim(),
            deliveryTime: parseInt(document.getElementById('sDelivery').value) || 3,
            returnPolicy: document.getElementById('sPolicy').value,
            notes: document.getElementById('sNotes').value.trim()
        };

        if (!payload.name) { showToast('Vui lòng nhập tên nhà cung cấp!', 'error'); return; }

        try {
            const url = editingId ? `${EP}/${editingId}` : EP;
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: auth.getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                showToast(editingId ? '✅ Đã cập nhật nhà cung cấp!' : '✅ Đã thêm nhà cung cấp!');
                resetForm();
                loadSuppliers();
            } else {
                const err = await res.json();
                showToast(err.message || 'Lỗi lưu thông tin', 'error');
            }
        } catch (err) {
            showToast('Có lỗi xảy ra. Thử lại sau!', 'error');
        }
    });
}

// Edit
async function editSupplier(id) {
    try {
        const res = await fetch(`${EP}/${id}`, { headers: auth.getHeaders() });
        const s = await res.json();
        editingId = id;
        document.getElementById('sName').value = s.name;
        document.getElementById('sPhone').value = s.phone;
        document.getElementById('sEmail').value = s.email;
        document.getElementById('sAddress').value = s.address;
        document.getElementById('sDelivery').value = s.deliveryTime;
        document.getElementById('sPolicy').value = s.returnPolicy;
        document.getElementById('sNotes').value = s.notes;
        document.getElementById('formTitle').textContent = '✏️ Chỉnh Sửa Nhà Cung Cấp';
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.textContent = '💾 Cập nhật';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        showToast('Không tải được thông tin!', 'error');
    }
}

// Delete
async function deleteSupplier(id, name) {
    if (!confirm(`Xóa nhà cung cấp "${name}"?`)) return;
    try {
        const res = await fetch(`${EP}/${id}`, { 
            method: 'DELETE',
            headers: auth.getHeaders()
        });
        if (res.ok) {
            showToast('🗑️ Đã xóa nhà cung cấp!');
            loadSuppliers();
        } else {
            const data = await res.json();
            showToast(data.message || 'Lỗi xóa nhà cung cấp!', 'error');
        }
    } catch (err) {
        showToast('Có lỗi xảy ra!', 'error');
    }
}

// Reset form
function resetForm() {
    editingId = null;
    document.getElementById('supplierForm').reset();
    document.getElementById('sDelivery').value = 3;
    document.getElementById('formTitle').textContent = '➕ Thêm Nhà Cung Cấp Mới';
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.textContent = '💾 Lưu nhà cung cấp';
}

document.addEventListener('DOMContentLoaded', loadSuppliers);
