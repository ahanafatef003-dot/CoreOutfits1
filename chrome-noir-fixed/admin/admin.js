/* ==========================================================
   CHROME NOIR ADMIN - Dashboard Logic
   Uses Backendless REST API for data + Backendless built-in
   user authentication (email/password -> user-token).

   SECURITY NOTE (Backendless ACL setup):
   In the Backendless console, configure table permissions so
   that the Products, Orders, Site_Content, and Settings tables
   can only be written to (CREATE/UPDATE/DELETE) by authenticated
   users with the "admin" role. Public/guest users should only
   have READ (FIND) permission on Products, Site_Content, and
   Settings, and CREATE-only permission on Orders (so customers
   can place orders but not read/modify other customers' orders).
   This is configured under: Data -> [table] -> Security (ACL).
   ========================================================== */

// ==========================================
// STATE
// ==========================================

let currentUserToken = localStorage.getItem('cn_admin_token') || null;
let currentUser = JSON.parse(localStorage.getItem('cn_admin_user') || 'null');

let allProducts = [];
let allOrders = [];
let currentOrderStatusFilter = 'all';
let productsPage = 1;
const PRODUCTS_PER_PAGE = 10;
let ordersPage = 1;
const ORDERS_PER_PAGE = 10;
let currentContentKey = 'privacy_policy';
let deleteHandler = null;

// ==========================================
// AUTH
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  if (currentUserToken && currentUser) {
    showDashboard();
  } else {
    showLogin();
  }

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSave);
  document.getElementById('product-form').addEventListener('submit', handleProductSave);

  document.getElementById('global-search').addEventListener('input', debounce(handleGlobalSearch, 350));

  // Live-update image previews
  ['product-image-1', 'product-image-2', 'product-image-3'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
      const preview = document.getElementById(id + '-preview');
      if (e.target.value) {
        preview.src = e.target.value;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    });
  });
});

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-layout').style.display = 'none';
}

async function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-layout').style.display = 'flex';

  if (currentUser) {
    const name = currentUser.name || currentUser.email || 'Admin';
    document.getElementById('sidebar-user-name').textContent = name;
    document.getElementById('sidebar-user-role').textContent = currentUser.role || 'admin';
    document.getElementById('sidebar-user-avatar').textContent = name.charAt(0).toUpperCase();
  }

  await Promise.all([loadAllProducts(), loadAllOrders(), loadSettingsIntoForm()]);
  renderOverview();
  renderProductsTable();
  renderOrdersTable();
  loadContentForKey(currentContentKey);
}

async function handleLogin(e) {
  e.preventDefault();

  const email = sanitizeInput(document.getElementById('login-email').value.trim());
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  errorEl.style.display = 'none';

  if (!isValidEmail(email)) {
    errorEl.textContent = 'Please enter a valid email address.';
    errorEl.style.display = 'block';
    return;
  }

  if (!password || password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    errorEl.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    const url = getBackendlessUserURL('login');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: email, password: password })
    });

    if (!res.ok) {
      let errBody = {};
      try { errBody = await res.json(); } catch (e) {}
      const code = errBody.code ? ` (code ${errBody.code})` : '';
      const msg = errBody.message || 'Invalid email or password.';
      console.error(`[Admin Login] HTTP ${res.status}${code}: ${msg}`);
      throw new Error(msg);
    }

    const data = await res.json();

    currentUserToken = data['user-token'];
    currentUser = {
      objectId: data.objectId,
      email: data.email || email,
      name: data.name || email.split('@')[0],
      role: data.role || 'admin'
    };

    localStorage.setItem('cn_admin_token', currentUserToken);
    localStorage.setItem('cn_admin_user', JSON.stringify(currentUser));

    await showDashboard();
  } catch (err) {
    console.error('[Admin Login] Failed:', err.message);
    errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

function logout() {
  // Attempt to invalidate session on Backendless (best-effort)
  if (currentUserToken) {
    fetch(getBackendlessUserURL('logout'), {
      headers: { 'user-token': currentUserToken }
    }).catch(() => {});
  }

  currentUserToken = null;
  currentUser = null;
  localStorage.removeItem('cn_admin_token');
  localStorage.removeItem('cn_admin_user');
  showLogin();
}

// Authenticated fetch wrapper - attaches user-token header.
// On 401/403, the session is invalid/expired -> force re-login.
async function authFetch(url, options = {}) {
  const headers = Object.assign({}, options.headers || {}, {
    'Content-Type': 'application/json',
    'user-token': currentUserToken || ''
  });

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    const msg = `[Admin] Network error: ${url} — ${networkErr.message}`;
    console.error(msg);
    throw new Error(msg);
  }

  if (res.status === 401 || res.status === 403) {
    showToast('Your session has expired. Please sign in again.', 'error');
    logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let body = '';
    let errCode = '';
    try {
      const json = await res.json();
      body = json.message || JSON.stringify(json);
      errCode = json.code ? ` (Backendless code: ${json.code})` : '';
    } catch (e) {
      try { body = await res.text(); } catch (_) {}
    }
    const msg = `[Admin] HTTP ${res.status}${errCode} for ${url}: ${body}`;
    console.error(msg);
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ==========================================
// NAVIGATION
// ==========================================

function showSection(section) {
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  document.getElementById('section-' + section).classList.add('active');

  document.querySelectorAll('.admin-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  const headings = {
    overview: 'Overview',
    products: 'Products',
    orders: 'Orders',
    content: 'Site Content',
    settings: 'Settings'
  };
  document.getElementById('page-heading').textContent = headings[section] || '';

  clearGlobalSearch();

  if (window.matchMedia('(max-width: 1024px)').matches) {
    document.getElementById('admin-sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('open');
}

// ==========================================
// TOASTS
// ==========================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// UTILITY
// ==========================================

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtCurrency(amount) {
  return '৳' + Number(amount || 0).toLocaleString('en-US');
}

function fmtDate(dateVal) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==========================================
// OVERVIEW
// ==========================================

function renderOverview() {
  document.getElementById('stat-total-products').textContent = allProducts.length;
  document.getElementById('stat-total-orders').textContent = allOrders.length;

  const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  document.getElementById('stat-total-revenue').textContent = fmtCurrency(totalRevenue);

  const lowStock = allProducts.filter(p => Number(p.stock_quantity) <= 5);
  document.getElementById('stat-low-stock').textContent = lowStock.length;

  // Recent orders (last 5 by created_date)
  const recent = [...allOrders]
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
    .slice(0, 5);

  const recentTbody = document.getElementById('recent-orders-tbody');
  if (recent.length === 0) {
    recentTbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No orders yet.</td></tr>`;
  } else {
    recentTbody.innerHTML = recent.map(o => `
      <tr>
        <td class="font-mono">${escapeHtml((o.objectId || '').slice(-8))}</td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td>${fmtCurrency(o.total)}</td>
        <td style="text-transform:capitalize;">${escapeHtml(o.payment_method)}</td>
        <td><span class="badge ${(o.status || 'pending').toLowerCase()}">${escapeHtml(o.status || 'Pending')}</span></td>
        <td>${fmtDate(o.created_date)}</td>
      </tr>
    `).join('');
  }

  // Low stock products
  const lowStockTbody = document.getElementById('low-stock-tbody');
  if (lowStock.length === 0) {
    lowStockTbody.innerHTML = `<tr><td colspan="5" class="admin-empty">All products are well stocked.</td></tr>`;
  } else {
    lowStockTbody.innerHTML = lowStock.slice(0, 10).map(p => `
      <tr>
        <td><img class="admin-table-thumb" src="${escapeHtml(p.image_1 || '')}" alt=""></td>
        <td>${escapeHtml(p.name)}</td>
        <td style="text-transform:capitalize;">${escapeHtml(p.category)}</td>
        <td>${Number(p.stock_quantity) || 0}</td>
        <td><span class="badge ${stockStatusClass(p)}">${escapeHtml(p.stock_status || computeStockStatus(p))}</span></td>
      </tr>
    `).join('');
  }
}

function computeStockStatus(p) {
  const qty = Number(p.stock_quantity) || 0;
  if (qty <= 0) return 'Out of Stock';
  if (qty <= 5) return 'Low Stock';
  return 'In Stock';
}

function stockStatusClass(p) {
  const status = p.stock_status || computeStockStatus(p);
  if (status === 'Out of Stock') return 'out-of-stock';
  if (status === 'Low Stock') return 'low-stock';
  return 'in-stock';
}

// ==========================================
// PRODUCTS - LOAD
// ==========================================

async function loadAllProducts() {
  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.PRODUCTS);
    const PAGE_SIZE = 100;
    let offset = 0;
    let collected = [];
    let page;

    do {
      const url = `${tableUrl}?sortBy=created%20desc&pageSize=${PAGE_SIZE}&offset=${offset}`;
      page = await authFetch(url);
      if (Array.isArray(page) && page.length > 0) {
        collected = collected.concat(page);
        offset += PAGE_SIZE;
      }
    } while (Array.isArray(page) && page.length === PAGE_SIZE);

    allProducts = collected;
  } catch (err) {
    console.error('[Admin] Failed to load products:', err.message);
    allProducts = [];
    showToast('Failed to load products: ' + err.message, 'error');
  }
}

// ==========================================
// PRODUCTS - TABLE RENDER
// ==========================================

function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  const countLabel = document.getElementById('products-count-label');

  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">No products found. Click "Add Product" to create one.</td></tr>`;
    countLabel.textContent = '0 products';
    document.getElementById('products-pagination').innerHTML = '';
    return;
  }

  countLabel.textContent = `${allProducts.length} product${allProducts.length === 1 ? '' : 's'}`;

  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  if (productsPage > totalPages) productsPage = totalPages;
  if (productsPage < 1) productsPage = 1;

  const start = (productsPage - 1) * PRODUCTS_PER_PAGE;
  const pageItems = allProducts.slice(start, start + PRODUCTS_PER_PAGE);

  tbody.innerHTML = pageItems.map(p => {
    const hasSale = p.sale_price != null && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price);
    return `
    <tr>
      <td><img class="admin-table-thumb" src="${escapeHtml(p.image_1 || '')}" alt=""></td>
      <td>
        <div style="font-weight:500;">${escapeHtml(p.name)}</div>
        <div style="font-size:0.7rem; color: var(--mid-gray); font-family:monospace;">${escapeHtml(p.slug)}</div>
      </td>
      <td style="text-transform:capitalize;">${escapeHtml(p.category)}</td>
      <td>
        ${hasSale
          ? `<span style="text-decoration:line-through; color: var(--mid-gray); font-size:0.75rem;">${fmtCurrency(p.price)}</span> ${fmtCurrency(p.sale_price)}`
          : fmtCurrency(p.price)}
      </td>
      <td>${Number(p.stock_quantity) || 0}</td>
      <td><span class="badge ${stockStatusClass(p)}">${escapeHtml(p.stock_status || computeStockStatus(p))}</span></td>
      <td>${p.is_featured ? '✓' : '—'}</td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="btn-icon" onclick="openProductModal('${p.objectId}')" title="Edit">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>
          </button>
          <button class="btn-icon" onclick="confirmDeleteProduct('${p.objectId}', '${escapeHtml(p.name).replace(/'/g, "\\'")}')" title="Delete">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');

  renderPagination('products-pagination', totalPages, productsPage, 'products');
}

function renderPagination(containerId, totalPages, currentPage, target) {
  const container = document.getElementById(containerId);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const handlerName = target === 'products' ? 'goToProductsPage' : 'goToOrdersPage';

  let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="${handlerName}(${currentPage - 1})">‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="${handlerName}(${i})">${i}</button>`;
  }

  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="${handlerName}(${currentPage + 1})">›</button>`;

  container.innerHTML = html;
}

function goToProductsPage(page) {
  productsPage = page;
  renderProductsTable();
}

function goToOrdersPage(page) {
  ordersPage = page;
  renderOrdersTable();
}

// ==========================================
// PRODUCTS - CREATE / EDIT MODAL
// ==========================================

function openProductModal(productId) {
  const form = document.getElementById('product-form');
  form.reset();
  document.getElementById('product-form-error').style.display = 'none';
  ['product-image-1-preview', 'product-image-2-preview', 'product-image-3-preview'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  if (productId) {
    const product = allProducts.find(p => p.objectId === productId);
    if (!product) return;

    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product.objectId;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-slug').value = product.slug || '';
    document.getElementById('product-category').value = product.category || 'tshirts';
    document.getElementById('product-stock-status').value = product.stock_status || 'In Stock';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price != null ? product.price : '';
    document.getElementById('product-sale-price').value = product.sale_price != null ? product.sale_price : '';
    document.getElementById('product-stock-quantity').value = product.stock_quantity != null ? product.stock_quantity : '';
    document.getElementById('product-sizes').value = product.sizes || '';
    document.getElementById('product-details').value = product.product_details || '';
    document.getElementById('product-image-1').value = product.image_1 || '';
    document.getElementById('product-image-2').value = product.image_2 || '';
    document.getElementById('product-image-3').value = product.image_3 || '';
    document.getElementById('product-is-featured').checked = !!product.is_featured;

    ['product-image-1', 'product-image-2', 'product-image-3'].forEach(id => {
      const val = document.getElementById(id).value;
      const preview = document.getElementById(id + '-preview');
      if (val) {
        preview.src = val;
        preview.style.display = 'block';
      }
    });
  } else {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-id').value = '';
    document.getElementById('product-stock-status').value = 'In Stock';
  }

  document.getElementById('product-modal-overlay').classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
}

async function handleProductSave(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('product-save-btn');
  const errorEl = document.getElementById('product-form-error');
  errorEl.style.display = 'none';

  const productId = document.getElementById('product-id').value;

  const name = sanitizeInput(document.getElementById('product-name').value.trim());
  const slug = sanitizeInput(document.getElementById('product-slug').value.trim())
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const category = document.getElementById('product-category').value;
  const stockStatus = document.getElementById('product-stock-status').value;
  const description = sanitizeInput(document.getElementById('product-description').value.trim());
  const price = parseInt(document.getElementById('product-price').value, 10);
  const salePriceRaw = document.getElementById('product-sale-price').value;
  const salePrice = salePriceRaw === '' ? null : parseInt(salePriceRaw, 10);
  const stockQuantity = parseInt(document.getElementById('product-stock-quantity').value, 10);
  const sizes = sanitizeInput(document.getElementById('product-sizes').value.trim());
  const productDetails = sanitizeInput(document.getElementById('product-details').value.trim());
  const image1 = document.getElementById('product-image-1').value.trim();
  const image2 = document.getElementById('product-image-2').value.trim();
  const image3 = document.getElementById('product-image-3').value.trim();
  const isFeatured = document.getElementById('product-is-featured').checked;

  // Validation
  const errors = [];
  if (!name || name.length < 2) errors.push('Product name must be at least 2 characters.');
  if (!slug || slug.length < 2) errors.push('Slug must be at least 2 characters (letters, numbers, hyphens only).');
  if (isNaN(price) || price < 0) errors.push('Price must be a valid non-negative number.');
  if (salePrice != null && (isNaN(salePrice) || salePrice < 0)) errors.push('Sale price must be a valid non-negative number.');
  if (salePrice != null && salePrice >= price) errors.push('Sale price must be less than the regular price.');
  if (isNaN(stockQuantity) || stockQuantity < 0) errors.push('Stock quantity must be a valid non-negative number.');

  // Slug uniqueness check (exclude current product when editing)
  const slugTaken = allProducts.some(p => p.slug === slug && p.objectId !== productId);
  if (slugTaken) errors.push('This slug is already used by another product. Please choose a unique slug.');

  if (errors.length > 0) {
    errorEl.innerHTML = errors.map(e => `&bull; ${escapeHtml(e)}`).join('<br>');
    errorEl.style.display = 'block';
    return;
  }

  const payload = {
    name,
    slug,
    category,
    description,
    price,
    sale_price: salePrice,
    stock_quantity: stockQuantity,
    stock_status: stockStatus,
    sizes,
    product_details: productDetails,
    image_1: image1,
    image_2: image2,
    image_3: image3,
    is_featured: isFeatured
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.PRODUCTS);

    if (productId) {
      await authFetch(`${tableUrl}/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Product updated successfully.', 'success');
    } else {
      await authFetch(tableUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Product created successfully.', 'success');
    }

    await loadAllProducts();
    renderProductsTable();
    renderOverview();
    closeProductModal();
  } catch (err) {
    console.error('[Admin] Failed to save product. URL:', getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.PRODUCTS), '| Error:', err.message);
    errorEl.textContent = `Failed to save product: ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
}

// ==========================================
// PRODUCTS - DELETE
// ==========================================

function confirmDeleteProduct(productId, productName) {
  document.getElementById('delete-modal-message').textContent =
    `Are you sure you want to delete "${productName}"? This will remove it from the customer-facing site immediately. This action cannot be undone.`;

  deleteHandler = async () => {
    try {
      const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.PRODUCTS);
      await authFetch(`${tableUrl}/${productId}`, { method: 'DELETE' });
      showToast('Product deleted.', 'success');
      await loadAllProducts();
      renderProductsTable();
      renderOverview();
    } catch (err) {
      console.error('[Admin] Failed to delete product. URL:', getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.PRODUCTS), '| Error:', err.message);
      showToast('Failed to delete product: ' + err.message, 'error');
    }
    closeDeleteModal();
  };

  document.getElementById('confirm-delete-btn').onclick = deleteHandler;
  document.getElementById('delete-modal-overlay').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('delete-modal-overlay').classList.remove('open');
  deleteHandler = null;
}

// ==========================================
// ORDERS - LOAD
// ==========================================

async function loadAllOrders() {
  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.ORDERS);
    const PAGE_SIZE = 100;
    let offset = 0;
    let collected = [];
    let page;

    do {
      const url = `${tableUrl}?sortBy=created%20desc&pageSize=${PAGE_SIZE}&offset=${offset}`;
      page = await authFetch(url);
      if (Array.isArray(page) && page.length > 0) {
        collected = collected.concat(page);
        offset += PAGE_SIZE;
      }
    } while (Array.isArray(page) && page.length === PAGE_SIZE);

    allOrders = collected;
  } catch (err) {
    console.error('[Admin] Failed to load orders:', err.message);
    allOrders = [];
    showToast('Failed to load orders: ' + err.message, 'error');
  }
}

// ==========================================
// ORDERS - TABLE RENDER
// ==========================================

function filterOrdersByStatus(status) {
  currentOrderStatusFilter = status;
  ordersPage = 1;

  document.querySelectorAll('#order-status-tabs .admin-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.status === status);
  });

  renderOrdersTable();
}

function getFilteredOrders() {
  if (currentOrderStatusFilter === 'all') return allOrders;
  return allOrders.filter(o => (o.status || 'Pending') === currentOrderStatusFilter);
}

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  const filtered = getFilteredOrders();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="admin-empty">No orders found for this filter.</td></tr>`;
    document.getElementById('orders-pagination').innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / ORDERS_PER_PAGE);
  if (ordersPage > totalPages) ordersPage = totalPages;
  if (ordersPage < 1) ordersPage = 1;

  const start = (ordersPage - 1) * ORDERS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ORDERS_PER_PAGE);

  tbody.innerHTML = pageItems.map(o => `
    <tr>
      <td class="font-mono" style="cursor:pointer;" onclick="openOrderModal('${o.objectId}')">${escapeHtml((o.objectId || '').slice(-8))}</td>
      <td style="cursor:pointer;" onclick="openOrderModal('${o.objectId}')">${escapeHtml(o.customer_name)}</td>
      <td>${escapeHtml(o.customer_phone)}</td>
      <td>${escapeHtml(o.customer_district)}</td>
      <td>${fmtCurrency(o.total)}</td>
      <td style="text-transform:capitalize;">${escapeHtml(o.payment_method)}</td>
      <td>
        <select class="admin-select" style="padding:6px 10px; font-size:0.75rem;" onchange="updateOrderStatus('${o.objectId}', this.value)">
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === (o.status || 'Pending') ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${fmtDate(o.created_date)}</td>
      <td>
        <button class="btn-icon" onclick="openOrderModal('${o.objectId}')" title="View Details">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  renderPagination('orders-pagination', totalPages, ordersPage, 'orders');
}

// ==========================================
// ORDERS - STATUS UPDATE
// ==========================================

async function updateOrderStatus(orderId, newStatus) {
  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.ORDERS);
    await authFetch(`${tableUrl}/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    const order = allOrders.find(o => o.objectId === orderId);
    if (order) order.status = newStatus;

    showToast('Order status updated.', 'success');
    renderOverview();
  } catch (err) {
    console.error('[Admin] Failed to update order status. URL:', getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.ORDERS), '| Error:', err.message);
    showToast('Failed to update order status: ' + err.message, 'error');
    renderOrdersTable();
  }
}

// ==========================================
// ORDERS - DETAIL MODAL
// ==========================================

function openOrderModal(orderId) {
  const order = allOrders.find(o => o.objectId === orderId);
  if (!order) return;

  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch (e) {
    items = [];
  }

  const itemsHtml = items.map(item => `
    <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); font-size:0.85rem;">
      <div>
        <div style="font-weight:500;">${escapeHtml(item.name)}</div>
        <div style="color: var(--mid-gray); font-size:0.75rem;">Size: ${escapeHtml(item.size)} &times; ${escapeHtml(String(item.qty))}</div>
      </div>
      <div style="font-weight:600;">${fmtCurrency((item.price || 0) * (item.qty || 1))}</div>
    </div>
  `).join('');

  document.getElementById('order-modal-content').innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div>
        <div class="admin-label">Order ID</div>
        <div class="font-mono">${escapeHtml(order.objectId)}</div>
      </div>
      <div>
        <div class="admin-label">Date</div>
        <div>${fmtDate(order.created_date)}</div>
      </div>
      <div>
        <div class="admin-label">Customer Name</div>
        <div>${escapeHtml(order.customer_name)}</div>
      </div>
      <div>
        <div class="admin-label">Phone</div>
        <div>${escapeHtml(order.customer_phone)}</div>
      </div>
      <div style="grid-column: 1 / -1;">
        <div class="admin-label">Delivery Address</div>
        <div>${escapeHtml(order.customer_address)}, ${escapeHtml(order.customer_district)}</div>
      </div>
      <div>
        <div class="admin-label">Payment Method</div>
        <div style="text-transform:capitalize;">${escapeHtml(order.payment_method)}</div>
      </div>
      ${order.payment_method === 'bkash' ? `
      <div>
        <div class="admin-label">bKash Number Used</div>
        <div class="font-mono">${escapeHtml(order.bkash_number || '-')}</div>
      </div>` : ''}
      <div>
        <div class="admin-label">Status</div>
        <select class="admin-select" onchange="updateOrderStatus('${order.objectId}', this.value); openOrderModal('${order.objectId}')">
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === (order.status || 'Pending') ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>

    <h3 style="font-size:1.1rem; font-weight:500; margin-bottom: 8px;">Items</h3>
    <div style="margin-bottom: 16px;">${itemsHtml || '<p class="admin-empty" style="padding:20px 0;">No items found.</p>'}</div>

    <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 12px; display:flex; flex-direction:column; gap: 6px;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color: var(--mid-gray);">
        <span>Subtotal</span><span>${fmtCurrency(order.subtotal)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color: var(--mid-gray);">
        <span>Shipping</span><span>${fmtCurrency(order.shipping_cost)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:600;">
        <span>Total</span><span>${fmtCurrency(order.total)}</span>
      </div>
    </div>
  `;

  document.getElementById('order-modal-overlay').classList.add('open');
}

function closeOrderModal() {
  document.getElementById('order-modal-overlay').classList.remove('open');
}

// ==========================================
// SITE CONTENT MANAGEMENT
// ==========================================

function selectContentKey(key) {
  currentContentKey = key;
  document.querySelectorAll('#content-tabs .admin-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.key === key);
  });

  const labels = {
    privacy_policy: 'Privacy Policy (HTML)',
    terms_conditions: 'Terms & Conditions (HTML)',
    shipping_policy: 'Shipping Policy (HTML)',
    return_policy: 'Return Policy (HTML)',
    homepage_announcement: 'Homepage Announcement (HTML)',
    footer_about: 'Footer About Text (HTML)'
  };
  document.getElementById('content-editor-label').textContent = labels[key] || key;

  loadContentForKey(key);
}

async function loadContentForKey(key) {
  const editor = document.getElementById('content-editor');
  editor.value = '';
  editor.placeholder = 'Loading...';
  document.getElementById('content-save-status').textContent = '';

  try {
    const where = `key='${key.replace(/'/g, "\\'")}'`;
    const url = `${getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.SITE_CONTENT)}?where=${encodeURIComponent(where)}&pageSize=1`;
    const data = await authFetch(url);

    if (data && data.length > 0) {
      editor.value = data[0].value || '';
      editor.dataset.objectId = data[0].objectId;
    } else {
      editor.value = '';
      editor.dataset.objectId = '';
    }
    editor.placeholder = 'Enter HTML content for this page...';
  } catch (err) {
    console.error('[Admin] Failed to load site content. Table:', BACKENDLESS_CONFIG.TABLES.SITE_CONTENT, '| Error:', err.message);
    editor.placeholder = 'Failed to load content.';
    showToast('Failed to load content: ' + err.message, 'error');
  }
}

async function saveSiteContent() {
  const editor = document.getElementById('content-editor');
  const statusEl = document.getElementById('content-save-status');
  const value = editor.value;

  statusEl.textContent = 'Saving...';

  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.SITE_CONTENT);
    const objectId = editor.dataset.objectId;

    if (objectId) {
      await authFetch(`${tableUrl}/${objectId}`, {
        method: 'PUT',
        body: JSON.stringify({ key: currentContentKey, value })
      });
    } else {
      const result = await authFetch(tableUrl, {
        method: 'POST',
        body: JSON.stringify({ key: currentContentKey, value })
      });
      editor.dataset.objectId = result.objectId;
    }

    statusEl.textContent = 'Saved.';
    showToast('Content saved successfully.', 'success');
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  } catch (err) {
    console.error('[Admin] Failed to save site content. Table:', BACKENDLESS_CONFIG.TABLES.SITE_CONTENT, '| Error:', err.message);
    statusEl.textContent = 'Failed to save.';
    showToast('Failed to save content: ' + err.message, 'error');
  }
}

// ==========================================
// SETTINGS
// ==========================================

let settingsObjectId = null;

async function loadSettingsIntoForm() {
  try {
    const url = `${getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.SETTINGS)}?pageSize=1`;
    const data = await authFetch(url);

    if (data && data.length > 0) {
      const s = data[0];
      settingsObjectId = s.objectId;

      document.getElementById('set-store-name').value = s.store_name || '';
      document.getElementById('set-store-logo').value = s.store_logo || '';
      document.getElementById('set-contact-number').value = s.contact_number || '';
      document.getElementById('set-whatsapp-number').value = s.whatsapp_number || '';
      document.getElementById('set-bkash-number').value = s.bkash_number || '';
      document.getElementById('set-shipping-cost').value = s.shipping_cost != null ? s.shipping_cost : '';
      document.getElementById('set-currency-symbol').value = s.currency_symbol || '৳';
      document.getElementById('set-facebook-url').value = s.facebook_url || '';
      document.getElementById('set-instagram-url').value = s.instagram_url || '';
      document.getElementById('set-tiktok-url').value = s.tiktok_url || '';

      // Hero banner images (1-5)
      for (let i = 1; i <= 5; i++) {
        const field = document.getElementById(`set-hero-image-${i}`);
        if (field) field.value = s[`hero_image_${i}`] || '';
      }

      // Collection images (1-3)
      for (let i = 1; i <= 3; i++) {
        const field = document.getElementById(`set-collection-image-${i}`);
        if (field) field.value = s[`collection_image_${i}`] || '';
      }
    }
  } catch (err) {
    console.error('[Admin] Failed to load settings. Table:', BACKENDLESS_CONFIG.TABLES.SETTINGS, '| Error:', err.message);
    showToast('Failed to load settings: ' + err.message, 'error');
  }
}

async function handleSettingsSave(e) {
  e.preventDefault();

  const statusEl = document.getElementById('settings-save-status');
  statusEl.textContent = 'Saving...';

  const payload = {
    store_name: sanitizeInput(document.getElementById('set-store-name').value.trim()),
    store_logo: document.getElementById('set-store-logo').value.trim(),
    contact_number: sanitizeInput(document.getElementById('set-contact-number').value.trim()),
    whatsapp_number: sanitizeInput(document.getElementById('set-whatsapp-number').value.trim()),
    bkash_number: sanitizeInput(document.getElementById('set-bkash-number').value.trim()),
    shipping_cost: parseInt(document.getElementById('set-shipping-cost').value, 10) || 0,
    currency_symbol: sanitizeInput(document.getElementById('set-currency-symbol').value.trim()) || '৳',
    facebook_url: document.getElementById('set-facebook-url').value.trim(),
    instagram_url: document.getElementById('set-instagram-url').value.trim(),
    tiktok_url: document.getElementById('set-tiktok-url').value.trim()
  };

  // Hero banner images (1-5)
  for (let i = 1; i <= 5; i++) {
    const field = document.getElementById(`set-hero-image-${i}`);
    if (field) payload[`hero_image_${i}`] = field.value.trim();
  }

  // Collection images (1-3)
  for (let i = 1; i <= 3; i++) {
    const field = document.getElementById(`set-collection-image-${i}`);
    if (field) payload[`collection_image_${i}`] = field.value.trim();
  }

  try {
    const tableUrl = getBackendlessDataURL(BACKENDLESS_CONFIG.TABLES.SETTINGS);

    if (settingsObjectId) {
      await authFetch(`${tableUrl}/${settingsObjectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      const result = await authFetch(tableUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      settingsObjectId = result.objectId;
    }

    statusEl.textContent = 'Saved.';
    showToast('Settings saved successfully.', 'success');
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  } catch (err) {
    console.error('[Admin] Failed to save settings. Table:', BACKENDLESS_CONFIG.TABLES.SETTINGS, '| Error:', err.message);
    statusEl.textContent = 'Failed to save.';
    showToast('Failed to save settings: ' + err.message, 'error');
  }
}

// ==========================================
// GLOBAL SEARCH
// ==========================================

function handleGlobalSearch(e) {
  const query = sanitizeInput(e.target.value.trim().toLowerCase());

  if (!query) {
    clearGlobalSearch();
    return;
  }

  const matchedProducts = allProducts.filter(p =>
    (p.name || '').toLowerCase().includes(query) ||
    (p.category || '').toLowerCase().includes(query)
  );

  const matchedOrders = allOrders.filter(o =>
    (o.customer_name || '').toLowerCase().includes(query) ||
    (o.status || '').toLowerCase().includes(query)
  );

  document.getElementById('sections-wrapper').style.display = 'none';
  document.getElementById('search-results-section').style.display = 'block';

  const productsContainer = document.getElementById('search-results-products');
  if (matchedProducts.length === 0) {
    productsContainer.innerHTML = `<div class="admin-empty">No matching products.</div>`;
  } else {
    productsContainer.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          ${matchedProducts.map(p => `
            <tr>
              <td><img class="admin-table-thumb" src="${escapeHtml(p.image_1 || '')}" alt=""></td>
              <td>${escapeHtml(p.name)}</td>
              <td style="text-transform:capitalize;">${escapeHtml(p.category)}</td>
              <td>${fmtCurrency(p.sale_price && p.sale_price > 0 ? p.sale_price : p.price)}</td>
              <td>${Number(p.stock_quantity) || 0}</td>
              <td><button class="btn-icon" onclick="openProductModal('${p.objectId}')" title="Edit">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>
              </button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const ordersContainer = document.getElementById('search-results-orders');
  if (matchedOrders.length === 0) {
    ordersContainer.innerHTML = `<div class="admin-empty">No matching orders.</div>`;
  } else {
    ordersContainer.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${matchedOrders.map(o => `
            <tr>
              <td class="font-mono">${escapeHtml((o.objectId || '').slice(-8))}</td>
              <td>${escapeHtml(o.customer_name)}</td>
              <td>${fmtCurrency(o.total)}</td>
              <td><span class="badge ${(o.status || 'pending').toLowerCase()}">${escapeHtml(o.status || 'Pending')}</span></td>
              <td>${fmtDate(o.created_date)}</td>
              <td><button class="btn-icon" onclick="openOrderModal('${o.objectId}')" title="View">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function clearGlobalSearch() {
  document.getElementById('global-search').value = '';
  document.getElementById('search-results-section').style.display = 'none';
  document.getElementById('sections-wrapper').style.display = 'block';
}
async function sendPasswordReset() {
  try {
    const email = currentUser.email;

    const res = await fetch(
      getBackendlessUserURL('restorepassword/' + encodeURIComponent(email)),
      {
        method: 'GET'
      }
    );

    if (!res.ok) {
      throw new Error('Failed to send reset email');
    }

    showToast('Password reset email sent successfully!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Could not send reset email', 'error');
  }
}