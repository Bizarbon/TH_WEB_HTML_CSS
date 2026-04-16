const EP = API_URL + '/products';

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

// Load danh sách nhà cung cấp cho select
async function loadSuppliersForSelect() {
    try {
        const res = await fetch(`${API_URL}/suppliers`, { headers: auth.getHeaders() });
        const suppliers = await res.json();
        const select = document.getElementById('supplier');
        if(select) {
            select.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>' +
                suppliers.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
        }
    } catch(e) {
        console.error("Error loading suppliers", e);
    }
}

// Load danh sách sản phẩm
async function loadProducts() {
    try {
        const response = await fetch(EP, { headers: auth.getHeaders() });
        const products = await response.json();

        // Update count
        const countEl = document.getElementById('productCount');
        if (countEl) countEl.textContent = products.length;

        const tbody = document.querySelector('#productTable tbody');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        Chưa có sản phẩm nào
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = products.map((product, index) => {
            const minStock = product.minStock !== undefined ? product.minStock : 5;
            let stockClass = 'in-stock';
            
            if (product.stock === 0) {
                stockClass = 'no-stock';
            } else if (product.stock <= minStock) {
                stockClass = 'low-stock';
            }

            return `
            <tr class="fade-in">
                <td style="font-weight: 600; color: var(--text-muted);">${index + 1}</td>
                <td>
                    <img src="${product.image}" alt="${product.name}" 
                         style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);"
                         onerror="this.src='https://via.placeholder.com/50?text=N/A'">
                </td>
                <td>
                    <strong>${product.name}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">${product.description || ''}</div>
                </td>
                <td class="td-price">${product.price.toLocaleString('vi-VN')} đ</td>
                <td><span class="category-badge">${product.category}</span></td>
                <td><span class="td-stock ${stockClass}">${product.stock}</span></td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${product.supplier ? '🏭 ' + product.supplier.name : '—'}</td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${product.warranty || 'Không'}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn-edit" onclick="editProduct('${product._id}')">✏️ Sửa</button>
                        <button class="btn-delete" onclick="deleteProduct('${product._id}')">🗑️ Xóa</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi tải danh sách sản phẩm!', 'error');
    }
}

// Thêm/Cập nhật sản phẩm
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productId = document.getElementById('productId').value;
        const productData = {
            name: document.getElementById('name').value,
            price: document.getElementById('price').value,
            category: document.getElementById('category').value,
            stock: document.getElementById('stock').value,
            description: document.getElementById('description').value,
            image: document.getElementById('image').value,
            supplier: document.getElementById('supplier').value || null,
            minStock: parseInt(document.getElementById('minStock').value) || 5,
            warranty: document.getElementById('warranty').value || 'Không bảo hành'
        };

        try {
            const method = productId ? 'PUT' : 'POST';
            const url = productId ? `${EP}/${productId}` : EP;

            const response = await fetch(url, {
                method: method,
                headers: auth.getHeaders(),
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                showToast(productId ? '✅ Cập nhật thành công!' : '✅ Thêm sản phẩm thành công!');
                resetForm();
                loadProducts();
            } else {
                const err = await response.json();
                showToast(err.message || 'Có lỗi khi lưu thông tin!', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi kết nối mạng!', 'error');
        }
    });
}

// Sửa sản phẩm
async function editProduct(id) {
    try {
        const response = await fetch(`${EP}/${id}`, { headers: auth.getHeaders() });
        const product = await response.json();

        document.getElementById('productId').value = product._id;
        document.getElementById('name').value = product.name;
        document.getElementById('price').value = product.price;
        document.getElementById('category').value = product.category;
        document.getElementById('stock').value = product.stock;
        document.getElementById('description').value = product.description;
        document.getElementById('image').value = product.image;
        if(document.getElementById('supplier')) document.getElementById('supplier').value = product.supplier?._id || product.supplier || '';
        if(document.getElementById('minStock')) document.getElementById('minStock').value = product.minStock !== undefined ? product.minStock : 5;
        if(document.getElementById('warranty')) document.getElementById('warranty').value = product.warranty || 'Không bảo hành';
        document.getElementById('formTitle').textContent = 'Sửa sản phẩm';

        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Xóa sản phẩm
async function deleteProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

    try {
        const response = await fetch(`${EP}/${id}`, {
            method: 'DELETE',
            headers: auth.getHeaders()
        });

        if (response.ok) {
            showToast('🗑️ Xóa thành công!');
            loadProducts();
        } else {
            const err = await response.json();
            showToast(err.message || 'Lỗi xóa sản phẩm!', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Lỗi xóa sản phẩm!', 'error');
    }
}

// Reset form
function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    if(document.getElementById('minStock')) document.getElementById('minStock').value = 5;
    if(document.getElementById('warranty')) document.getElementById('warranty').value = 'Không bảo hành';
    document.getElementById('formTitle').textContent = 'Thêm sản phẩm mới';
}

// Load khi trang vừa mở
document.addEventListener('DOMContentLoaded', () => {
    loadSuppliersForSelect().then(loadProducts);
});