const EP = API_URL + '/orders';

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

// Format date
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const statusLabels = {
    pending: '⏳ Chờ xử lý',
    processing: '🔄 Đang xử lý',
    shipping: '🚚 Đang giao',
    completed: '✅ Hoàn thành',
    returned: '🔙 Hoàn/Đổi trả',
    boom: '💣 Khách boom',
    cancelled: '❌ Đã hủy'
};

// Load orders
async function loadOrders() {
    try {
        const res = await fetch(EP, { headers: auth.getHeaders() });
        const data = await res.json();
        
        if (auth.handleApiError(res, data)) return;
        if (!res.ok) throw new Error(data.message || 'Lỗi từ server');

        // Update stats
        const statTotal = document.getElementById('statTotal');
        const statPending = document.getElementById('statPending');
        const statProcessing = document.getElementById('statProcessing');
        const statCompleted = document.getElementById('statCompleted');
        const statShipping = document.getElementById('statShipping');

        if(statTotal) statTotal.textContent = data.length;
        if(statPending) statPending.textContent = data.filter(o => o.status === 'pending').length;
        if(statProcessing) statProcessing.textContent = data.filter(o => o.status === 'processing').length;
        if(statCompleted) statCompleted.textContent = data.filter(o => o.status === 'completed').length;
        if(statShipping) statShipping.textContent = data.filter(o => o.status === 'shipping').length;

        const tableBody = document.querySelector('#orderTable tbody');
        if (!tableBody) return;

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        Chưa có đơn hàng nào
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = data.map(o => `
            <tr class="fade-in">
                <td style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">
                    #${String(o._id).padStart(4, '0')}
                </td>
                <td>
                    <strong>${o.customer?.name || o.customerName || 'N/A'}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${o.customer?.phone || o.customerPhone || ''}</div>
                </td>
                <td>
                    <div class="order-products">
                        ${o.products.map(p => `
                            <div class="order-product-item">
                                <strong>${p.product?.name || p.productName || 'SP không tồn tại'}</strong> × ${p.quantity}
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td class="td-price">${o.totalAmount.toLocaleString('vi-VN')} đ</td>
                <td style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">
                    ${o.paymentMethod === 'Thanh toán trước' ? '💳 CK' : (o.paymentMethod === 'Trả góp' ? '⏱️ Trả góp' : '💵 COD')}
                </td>
                <td>
                    <select class="status-select" onchange="updateStatus('${o._id}', this.value)">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Chờ xử lý</option>
                        <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>🔄 Đang xử lý</option>
                        <option value="shipping" ${o.status === 'shipping' ? 'selected' : ''}>🚚 Đang giao</option>
                        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>✅ Hoàn thành</option>
                        <option value="returned" ${o.status === 'returned' ? 'selected' : ''}>🔙 Hoàn/Đổi trả</option>
                        <option value="boom" ${o.status === 'boom' ? 'selected' : ''}>💣 Khách boom</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Đã hủy</option>
                    </select>
                </td>
                <td style="font-size:0.8rem;">
                    <div style="font-weight:600; color:var(--primary-light); cursor:pointer;" 
                         onclick="updateTracking('${o._id}', '${o.trackingNumber || ''}', '${o.shippingUnit || ''}')">
                        ${o.trackingNumber ? '🔗 ' + o.trackingNumber : '➕ Nhập mã vận đơn'}
                    </div>
                    <div style="color:var(--text-muted); margin-top:0.2rem;">${o.shippingUnit ? '📦 ' + o.shippingUnit : ''}</div>
                </td>
                <td style="font-size:0.8rem; color:var(--text-secondary);">
                    ${formatDate(o.orderDate || o.createdAt)}
                </td>
                <td>
                    <button class="btn-delete" onclick="deleteOrder('${o._id}')">🗑️ Xóa</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi tải danh sách đơn hàng!', 'error');
    }
}

// Update status
async function updateStatus(id, status) {
    try {
        const res = await fetch(`${EP}/${id}`, {
            method: 'PUT',
            headers: auth.getHeaders(),
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error();

        showToast(`Đã cập nhật trạng thái: ${statusLabels[status] || status}`);
        loadOrders();
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi cập nhật!', 'error');
    }
}

// Update tracking
async function updateTracking(id, currentTracking, currentUnit) {
    const trackingNumber = prompt('Nhập mã vận đơn:', currentTracking);
    if (trackingNumber === null) return;
    const shippingUnit = prompt('Nhập đơn vị giao hàng (VD: GHTK, SPX):', currentUnit || 'GHTK');
    if (shippingUnit === null) return;

    try {
        const res = await fetch(`${EP}/${id}`, {
            method: 'PUT',
            headers: auth.getHeaders(),
            body: JSON.stringify({ trackingNumber, shippingUnit, status: 'shipping' })
        });
        if (!res.ok) throw new Error();
        showToast('🚚 Đã lưu mã vận đơn và chuyển trạng thái "Đang giao"!');
        loadOrders();
    } catch (error) {
        showToast('Lỗi cập nhật mã vận đơn!', 'error');
    }
}

// Delete
async function deleteOrder(id) {
    if (!confirm('Xóa đơn hàng này?')) return;

    try {
        const res = await fetch(`${EP}/${id}`, { 
            method: 'DELETE', 
            headers: auth.getHeaders() 
        });
        if (res.ok) {
            showToast('🗑️ Đã xóa đơn hàng!');
            loadOrders();
        } else {
            const data = await res.json();
            showToast(data.message || 'Lỗi xóa đơn hàng!', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi xóa đơn hàng!', 'error');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});