const EP = API_URL + '/expenses';

const typeLabels = {
    ads:          '📢 Quảng cáo',
    packaging:    '📦 Bao bì',
    platform_fee: '🏪 Phí sàn',
    shipping_fee: '🚚 Phí ship',
    import_cost:  '🏭 Nhập hàng',
    other:        '📋 Khác'
};

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

function fmt(n) {
    return (n || 0).toLocaleString('vi-VN') + ' đ';
}

// ---- FILTER ----
function getFilterParams() {
    const from = document.getElementById('filterFrom').value;
    const to   = document.getElementById('filterTo').value;
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to)   params.append('to', to);
    return params.toString() ? '?' + params.toString() : '';
}

function applyFilter() { loadAll(); }

function clearFilter() {
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value   = '';
    loadAll();
}

// ---- SUMMARY ----
async function loadSummary() {
    try {
        const res  = await fetch(`${EP}/summary${getFilterParams()}`, { headers: auth.getHeaders() });
        const data = await res.json();

        document.getElementById('fcRevenue').textContent   = fmt(data.revenue);
        document.getElementById('fcExpense').textContent   = fmt(data.totalExpenses);
        document.getElementById('fcProfit').textContent    = fmt(data.profit);
        document.getElementById('fcOrderCount').textContent = `(${data.orderCount} đơn hoàn thành)`;

        // Bar chart
        const max = Math.max(data.revenue, data.totalExpenses, 1);
        const profitPct = Math.max(0, data.profit) / max * 100;

        setBar('barRevenue', 'barRevAmt', data.revenue / max * 100, data.revenue);
        setBar('barExpense', 'barExpAmt', data.totalExpenses / max * 100, data.totalExpenses);
        setBar('barProfit',  'barProfAmt', profitPct, data.profit);

        // Type breakdown
        const breakdown = document.getElementById('typeBreakdown');
        const byType = data.byType || {};
        const hasData = Object.keys(byType).length > 0;
        breakdown.innerHTML = hasData
            ? Object.entries(byType).map(([type, amt]) => `
                <div class="type-card">
                    <div class="type-name">${typeLabels[type] || type}</div>
                    <div class="type-value">${fmt(amt)}</div>
                </div>`).join('')
            : '<div style="color:var(--text-muted);font-size:0.85rem;">Chưa có chi phí nào.</div>';

    } catch (e) {
        console.error('Summary error:', e);
    }
}

function setBar(barId, amtId, pct, value) {
    const bar = document.getElementById(barId);
    const amt = document.getElementById(amtId);
    setTimeout(() => { bar.style.width = Math.max(pct, 0) + '%'; }, 100);
    // bar.textContent = pct >= 8 ? fmt(value) : ''; // Đã hiển thị ở amt rồi, không cần hiển thị trong bar nữa
    amt.textContent = fmt(value);
}

// ---- EXPENSES ----
async function loadExpenses() {
    try {
        const res  = await fetch(`${EP}${getFilterParams()}`, { headers: auth.getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('expenseBody');

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">Chưa có chi phí nào</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map((e, i) => `
            <tr>
                <td style="color:var(--text-muted)">${i + 1}</td>
                <td>${new Date(e.date).toLocaleDateString('vi-VN')}</td>
                <td><span class="expense-type-badge type-${e.type}">${typeLabels[e.type] || e.type}</span></td>
                <td style="color:var(--text-secondary)">${e.description || '—'}</td>
                <td class="td-price">${fmt(e.amount)}</td>
                <td><button class="btn-delete btn-sm" onclick="deleteExpense('${e._id}')">🗑️ Xóa</button></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load expenses error:', err);
    }
}

// ---- SUBMIT ----
async function submitExpense(e) {
    e.preventDefault();
    const payload = {
        type:        document.getElementById('eType').value,
        amount:      parseFloat(document.getElementById('eAmount').value),
        description: document.getElementById('eDescription').value.trim(),
        date:        document.getElementById('eDate').value || new Date().toISOString()
    };

    if (!payload.amount || payload.amount <= 0) {
        showToast('Số tiền phải lớn hơn 0!', 'error');
        return;
    }

    try {
        const res = await fetch(EP, {
            method: 'POST',
            headers: auth.getHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        showToast('✅ Đã ghi nhận chi phí!');
        document.getElementById('expenseForm').reset();
        // Reset date to today
        document.getElementById('eDate').value = new Date().toISOString().split('T')[0];
        loadAll();
    } catch (err) {
        showToast('Có lỗi xảy ra!', 'error');
    }
}

// ---- DELETE ----
async function deleteExpense(id) {
    if (!confirm('Xóa khoản chi phí này?')) return;
    try {
        const res = await fetch(`${EP}/${id}`, { 
            method: 'DELETE',
            headers: auth.getHeaders()
        });
        if (!res.ok) throw new Error();
        showToast('🗑️ Đã xóa chi phí!');
        loadAll();
    } catch (err) {
        showToast('Có lỗi xảy ra!', 'error');
    }
}

function loadAll() {
    loadSummary();
    loadExpenses();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('expenseForm');
    if (form) form.addEventListener('submit', submitExpense);

    const dateInput = document.getElementById('eDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    loadAll();
});
