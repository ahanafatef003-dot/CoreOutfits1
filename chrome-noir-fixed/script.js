/* ========================================
   CHROME NOIR - Premium Fashion E-Commerce
   Vanilla JavaScript - Backendless Powered
   ======================================== */

// ==========================================
// STATIC DATA (non-product content)
// ==========================================

const reviews = [
  { name: "Saiful Islam", rating: 5, text: "The quality is absolutely insane. The chrome details on the hoodie catch light beautifully. Worth every penny.", date: "2 weeks ago", avatar: "AM" },
  { name: "Sadiya Sultana", rating: 5, text: "Finally a brand that understands futuristic streetwear. The cargo pants are my new everyday essential.", date: "1 month ago", avatar: "JK" },
  { name: "Ariya Jahan", rating: 4, text: "Shipping was fast, packaging felt like unboxing a luxury watch. The bomber jacket is a statement piece.", date: "3 weeks ago", avatar: "RS" },
  { name: "Zayan Mahmud", rating: 5, text: "The attention to detail is remarkable. Even the buttons have weight to them. Obsessed with the aesthetic.", date: "1 week ago", avatar: "ML" },
  { name: "Tashin Ahmed", rating: 5, text: "Best purchase I've made this year. The leather gloves fit like a second skin. Chrome details are flawless.", date: "2 days ago", avatar: "CT" }
];

// Hero slides — titles/subtitles stay here; images come from siteSettings (admin-controlled)
const heroSlideDefaults = [
  { title: "Chrome Noir", subtitle: "The Future of Gothic Luxury" },
  { title: "Void Collection", subtitle: "Embrace the Darkness" },
  { title: "Eclipse Series", subtitle: "Where Light Meets Shadow" },
  { title: "Abyss Line", subtitle: "Depth Beyond Measure" },
  { title: "Spectre Edit", subtitle: "Ghosts of the Future" }
];

const heroSlideFallbacks = [
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&h=900&fit=crop"
];

function getHeroSlides() {
  return heroSlideDefaults.map((slide, i) => ({
    ...slide,
    image: (siteSettings && siteSettings[`hero_image_${i + 1}`]) || heroSlideFallbacks[i]
  }));
}

const categories = [
  { id: "all", name: "All", icon: "M4 6h16M4 12h16M4 18h16" },
  { id: "tshirts", name: "T-Shirts", icon: "M6 2L2 8l10 6 10-6-4-6H6z" },
  { id: "bandanas", name: "Bandanas", icon: "M12 2a10 10 0 100 20 10 10 0 000-20z" },
  { id: "hoodies", name: "Hoodies", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { id: "accessories", name: "Accessories", icon: "M12 2a10 10 0 100 20 10 10 0 000-20z" }
];

const BD_DISTRICTS = [
  "Bagerhat","Bandarban","Barguna","Barishal","Bhola","Bogura","Brahmanbaria","Chandpur",
  "Chattogram","Chuadanga","Cox's Bazar","Cumilla","Dhaka","Dinajpur","Faridpur","Feni",
  "Gaibandha","Gazipur","Gopalganj","Habiganj","Jamalpur","Jashore","Jhalokati","Jhenaidah",
  "Joypurhat","Khagrachhari","Khulna","Kishoreganj","Kurigram","Kushtia","Lakshmipur",
  "Lalmonirhat","Madaripur","Magura","Manikganj","Meherpur","Moulvibazar","Munshiganj",
  "Mymensingh","Naogaon","Narail","Narayanganj","Narsingdi","Natore","Netrokona",
  "Nilphamari","Noakhali","Pabna","Panchagarh","Patuakhali","Pirojpur","Rajbari",
  "Rajshahi","Rangamati","Rangpur","Satkhira","Shariatpur","Sherpur","Sirajganj",
  "Sunamganj","Sylhet","Tangail","Thakurgaon"
];

// ==========================================
// STATE
// ==========================================

let products = [];
let cart = JSON.parse(localStorage.getItem('chromenoir_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('chromenoir_wishlist')) || [];
let siteSettings = {};
let currentCategory = 'all';
let searchQuery = '';
let priceRange = { min: 0, max: 50000 };
let selectedSizes = [];
let currentHeroSlide = 0;
let heroInterval;
let productsSocket = null;

// ==========================================
// DOM READY
// ==========================================

let _siteDataReady = false;

document.addEventListener('DOMContentLoaded', async () => {
  initLoadingScreen();
  initCursorGlow();
  initMagneticButtons();
  initHeroSlider();
  initFloatingObjects();
  initScrollAnimations();
  initNavbar();
  renderCategories();
  renderReviews();
  initCart();
  initWishlist();
  initSearch();
  initFilters();
  initMobileMenu();

  await loadSettings();
  await loadProducts();
  _siteDataReady = true;

  applyCategoryFromQueryParam();

  if (typeof initSiteWideUI === 'function') {
    initSiteWideUI();
  }

  initRealtimeProducts();
});

// ==========================================
// QUERY PARAM HANDLING
// ==========================================

function applyCategoryFromQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  if (category && categories.some(c => c.id === category)) {
    filterByCategory(category);
  }
}

// ==========================================
// LOADING SCREEN
// ==========================================

function initLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  if (!loader) return;

  setTimeout(() => {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.style.display = 'none';
      triggerInitialAnimations();
    }, 800);
  }, 1500);
}

function triggerInitialAnimations() {
  document.querySelectorAll('.hero-animate').forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 200);
  });
}

// ==========================================
// CURSOR GLOW
// ==========================================

function initCursorGlow() {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'cursor-glow';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  refreshCursorHoverTargets();
}

function refreshCursorHoverTargets() {
  const cursor = document.querySelector('.cursor-glow');
  if (!cursor) return;
  const hoverElements = document.querySelectorAll('a, button, .product-card, .category-pill, .gallery-thumb');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// ==========================================
// MAGNETIC BUTTONS
// ==========================================

function initMagneticButtons() {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    if (btn.dataset.magneticBound) return;
    btn.dataset.magneticBound = 'true';

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// ==========================================
// HERO SLIDER
// ==========================================

function initHeroSlider() {
  const container = document.getElementById('hero-slides');
  if (!container) return;

  const heroSlides = getHeroSlides();

  container.innerHTML = heroSlides.map((slide, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
      <img src="${slide.image}" alt="${slide.title}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent"></div>
    </div>
  `).join('');

  updateHeroText(0);
  heroInterval = setInterval(nextHeroSlide, 5000);
  updateProgressIndicator();
}

function nextHeroSlide() {
  const heroSlides = getHeroSlides();
  const slides = document.querySelectorAll('.hero-slide');
  const current = document.querySelector('.hero-slide.active');
  const currentIndex = parseInt(current?.dataset.index || 0);
  const nextIndex = (currentIndex + 1) % heroSlides.length;

  slides.forEach(slide => {
    slide.classList.remove('active', 'prev');
    if (parseInt(slide.dataset.index) === currentIndex) {
      slide.classList.add('prev');
    }
  });

  slides[nextIndex].classList.add('active');
  updateHeroText(nextIndex);
  updateProgressIndicator();
}

function updateHeroText(index) {
  const heroSlides = getHeroSlides();
  const title = document.getElementById('hero-title');
  const subtitle = document.getElementById('hero-subtitle');
  if (title) {
    title.style.opacity = '0';
    title.style.transform = 'translateY(20px)';
    setTimeout(() => {
      title.textContent = heroSlides[index].title;
      title.style.opacity = '1';
      title.style.transform = 'translateY(0)';
    }, 400);
  }
  if (subtitle) {
    subtitle.style.opacity = '0';
    setTimeout(() => {
      subtitle.textContent = heroSlides[index].subtitle;
      subtitle.style.opacity = '1';
    }, 600);
  }
}

function updateProgressIndicator() {
  const heroSlides = getHeroSlides();
  const indicator = document.getElementById('hero-progress');
  if (!indicator) return;
  indicator.innerHTML = heroSlides.map((_, i) => `
    <div class="h-[2px] flex-1 mx-1 transition-all duration-500 ${i === currentHeroSlide ? 'bg-black' : 'bg-black/20'}"></div>
  `).join('');
  currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
  if (currentHeroSlide === 0) currentHeroSlide = heroSlides.length;
}

// ==========================================
// FLOATING OBJECTS
// ==========================================

function initFloatingObjects() {
  const containers = document.querySelectorAll('.floating-objects-container');
  containers.forEach(container => {
    if (!container) return;
    container.querySelectorAll('.chrome-orb, .chrome-ring').forEach((obj, i) => {
      obj.style.animationDelay = `${i * 2}s`;
    });
  });
}

// ==========================================
// SCROLL ANIMATIONS
// ==========================================

let scrollObserver;

function initScrollAnimations() {
  if (!scrollObserver) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  }

  document.querySelectorAll('.reveal').forEach(el => {
    if (!el.dataset.observed) {
      el.dataset.observed = 'true';
      scrollObserver.observe(el);
    }
  });
}

// ==========================================
// NAVBAR
// ==========================================

function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ==========================================
// SETTINGS
// ==========================================

async function loadSettings() {
  try {
    siteSettings = await fetchSettings();
    applyDynamicImages();
  } catch (e) {
    console.error('[loadSettings] Table:', BACKENDLESS_CONFIG.TABLES.SETTINGS, '| Error:', e.message);
    siteSettings = {};
  }
}

function getCurrencySymbol() {
  return (siteSettings && siteSettings.currency_symbol) ? siteSettings.currency_symbol : '৳';
}

// ==========================================
// CATEGORIES
// ==========================================

function renderCategories() {
  const containers = document.querySelectorAll('#category-filters');
  if (!containers.length) return;

  containers.forEach(container => {
    container.innerHTML = categories.map(cat => `
      <button class="category-pill ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">
        <span class="relative z-10 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="${cat.icon}"/>
          </svg>
          ${cat.name}
        </span>
      </button>
    `).join('');
  });
}

function filterByCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.category-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });

  renderProducts();
}

// ==========================================
// PRODUCTS - LOAD FROM BACKENDLESS
// ==========================================

async function loadProducts() {
  const container = document.getElementById('product-grid');
  const needsProducts = !!container || !!document.getElementById('related-products');

  if (!needsProducts) return;

  if (container) {
    container.innerHTML = `
      <div class="dynamic-loading">
        <div class="loading-spinner"></div>
        <p class="text-sm">Loading products...</p>
      </div>
    `;
  }

  try {
    const isHomepage = !!document.getElementById('hero');
    if (isHomepage) {
      const featured = await fetchProducts({ where: 'is_featured=true', sortBy: 'created desc', pageSize: 10 });
      const rest = await fetchProducts({ sortBy: 'created desc', pageSize: 10 });
      const featuredIds = new Set(featured.map(p => p.objectId));
      const merged = [...featured, ...rest.filter(p => !featuredIds.has(p.objectId))].slice(0, 10);
      products = merged;
    } else {
      products = await fetchProducts({ sortBy: 'created desc' });
    }
    renderProducts();
  } catch (err) {
    console.error('[loadProducts] Failed to load products:', err.message);
    if (container) {
      container.innerHTML = `
        <div class="dynamic-error">
          <p class="font-display text-2xl text-gray-400">Unable to load products</p>
          <p class="text-sm">Please check your connection and try again.</p>
          <button onclick="loadProducts()">Retry</button>
        </div>
      `;
    }
  }
}

// ==========================================
// PRODUCTS - FILTER + RENDER
// ==========================================

function getFilteredProducts() {
  return products.filter(p => {
    const effectivePrice = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price;
    const matchCategory = currentCategory === 'all' || p.category === currentCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPrice = effectivePrice >= priceRange.min && effectivePrice <= priceRange.max;
    const matchSize = selectedSizes.length === 0 || selectedSizes.some(s => p.sizes.includes(s));
    return matchCategory && matchSearch && matchPrice && matchSize;
  });
}

function renderProducts() {
  const container = document.getElementById('product-grid');
  if (!container) return;

  const filtered = getFilteredProducts();

  const countEl = document.getElementById('product-count');
  if (countEl) countEl.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-20">
        <p class="font-display text-2xl text-gray-400">No products found</p>
        <button onclick="resetFilters()" class="mt-4 btn-primary btn-magnetic text-sm">Reset Filters</button>
      </div>
    `;
    return;
  }

  const symbol = getCurrencySymbol();

  container.innerHTML = filtered.map((product, i) => {
    const hasSale = product.sale_price != null && product.sale_price > 0 && product.sale_price < product.price;
    const status = getStockStatus(product);
    const statusClass = status === 'Out of Stock' ? 'out-of-stock' : (status === 'Low Stock' ? 'low-stock' : 'in-stock');

    return `
    <div class="product-card glass-card rounded-2xl overflow-hidden reveal reveal-delay-${(i % 5) + 1}" data-product-id="${product.objectId}">
      <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="relative aspect-product overflow-hidden bg-gray-100 block">
        <img src="${product.image}" alt="${product.name}" class="product-image w-full h-full object-cover" loading="lazy">
        ${product.is_featured ? `<span class="badge-new absolute top-4 left-4 z-10">Featured</span>` : ''}
        ${status !== 'In Stock' ? `<span class="stock-badge ${statusClass} absolute top-4 right-4 z-10">${status}</span>` : ''}
        <div class="product-actions">
          <button onclick="event.preventDefault(); quickAddToCart('${product.objectId}')" class="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-black hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
            </svg>
          </button>
        </div>
      </a>
      <div class="p-5">
        <a href="product.html?slug=${encodeURIComponent(product.slug)}">
          <h3 class="font-display text-xl font-medium mb-1">${product.name}</h3>
        </a>
        <div class="flex items-center justify-between">
          <p class="text-lg font-semibold">
            ${hasSale
              ? `<span class="line-through text-gray-400 text-sm mr-2">${formatCurrency(product.price, symbol)}</span>${formatCurrency(product.sale_price, symbol)}`
              : formatCurrency(product.price, symbol)}
          </p>
          <button onclick="toggleWishlist('${product.objectId}')" class="wishlist-heart w-9 h-9 rounded-full glass flex items-center justify-center ${wishlist.includes(product.objectId) ? 'active' : ''}">
            <svg class="w-4 h-4" fill="${wishlist.includes(product.objectId) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  setTimeout(initScrollAnimations, 100);
  refreshCursorHoverTargets();
}

function resetFilters() {
  currentCategory = 'all';
  searchQuery = '';
  priceRange = { min: 0, max: 50000 };
  selectedSizes = [];

  document.querySelectorAll('.category-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });

  document.querySelectorAll('.filter-size').forEach(btn => btn.classList.remove('active'));

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  if (priceMin) priceMin.value = 0;
  if (priceMax) priceMax.value = 50000;

  renderProducts();
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      html += '<svg class="w-4 h-4 fill-black" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
      html += '<svg class="w-4 h-4" viewBox="0 0 24 24"><defs><linearGradient id="half"><stop offset="50%" stop-color="black"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half)" stroke="black" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else {
      html += '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
  }
  return html;
}

// ==========================================
// CART
// ==========================================

function initCart() {
  updateCartUI();
}

function quickAddToCart(productId) {
  const product = products.find(p => p.objectId === productId);
  if (!product) return;

  const effectivePrice = product.sale_price != null && product.sale_price > 0 ? product.sale_price : product.price;
  addToCart(product, 1, product.sizes[0], effectivePrice);
}

function addToCart(product, qty, size, priceOverride) {
  const price = priceOverride != null ? priceOverride : (product.sale_price != null && product.sale_price > 0 ? product.sale_price : product.price);

  const existing = cart.find(item =>
    item.id === product.objectId && item.size === size
  );

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.objectId,
      slug: product.slug,
      name: product.name,
      price: price,
      image: product.image,
      size: size,
      qty: qty
    });
  }

  saveCart();
  updateCartUI();
  openCart();

  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.style.transform = 'scale(1.3)';
    setTimeout(() => cartBtn.style.transform = '', 300);
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function updateCartQty(index, change) {
  cart[index].qty += change;
  if (cart[index].qty < 1) cart[index].qty = 1;
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('chromenoir_cart', JSON.stringify(cart));
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function updateCartUI() {
  const count = document.getElementById('cart-count');
  const items = document.getElementById('cart-items');
  const subtotal = document.getElementById('cart-subtotal');
  const symbol = getCurrencySymbol();

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = getCartSubtotal();

  if (count) count.textContent = totalQty;
  if (subtotal) subtotal.textContent = formatCurrency(totalPrice, symbol);

  if (items) {
    if (cart.length === 0) {
      items.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/>
          </svg>
          <p class="text-gray-400 font-display text-xl">Your cart is empty</p>
          <button onclick="closeCart()" class="mt-4 text-sm underline">Continue Shopping</button>
        </div>
      `;
    } else {
      items.innerHTML = cart.map((item, i) => `
        <div class="flex gap-4 p-4 glass-card rounded-xl">
          <img src="${item.image}" alt="${item.name}" class="w-20 h-24 object-cover rounded-lg">
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <h4 class="font-medium text-sm">${item.name}</h4>
              <p class="text-xs text-gray-500 mt-1">Size: ${item.size}</p>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button onclick="updateCartQty(${i}, -1)" class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-black hover:text-white transition-colors">-</button>
                <span class="text-sm w-4 text-center">${item.qty}</span>
                <button onclick="updateCartQty(${i}, 1)" class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-black hover:text-white transition-colors">+</button>
              </div>
              <span class="font-semibold text-sm">${formatCurrency(item.price * item.qty, symbol)}</span>
            </div>
          </div>
          <button onclick="removeFromCart(${i})" class="text-gray-400 hover:text-black transition-colors self-start">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join('');
    }
  }
}

function openCart() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ==========================================
// WISHLIST
// ==========================================

function initWishlist() {
  updateWishlistUI();
}

function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  saveWishlist();
  updateWishlistUI();
  renderProducts();
}

function saveWishlist() {
  localStorage.setItem('chromenoir_wishlist', JSON.stringify(wishlist));
}

function updateWishlistUI() {
  const count = document.getElementById('wishlist-count');
  if (count) count.textContent = wishlist.length;
}

// ==========================================
// SEARCH
// ==========================================

function initSearch() {
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInputOverlay = document.getElementById('search-input-overlay');
  const searchInput = document.getElementById('search-input');

  searchBtn?.addEventListener('click', () => {
    searchOverlay.classList.add('open');
    searchInputOverlay?.focus();
    document.body.style.overflow = 'hidden';
  });

  searchOverlay?.addEventListener('click', (e) => {
    if (e.target === searchOverlay || e.target.classList.contains('search-overlay-bg')) {
      closeSearch();
    }
  });

  let debounceTimer;

  searchInputOverlay?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value;
      if (searchInput) searchInput.value = searchQuery;
      renderProducts();
      const shopSection = document.getElementById('shop');
      if (shopSection) {
        closeSearch();
        shopSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
  });

  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value;
      if (searchInputOverlay) searchInputOverlay.value = searchQuery;
      renderProducts();
    }, 300);
  });
}

function closeSearch() {
  document.getElementById('search-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ==========================================
// FILTERS
// ==========================================

function initFilters() {
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');

  priceMin?.addEventListener('input', (e) => {
    priceRange.min = parseInt(e.target.value) || 0;
    renderProducts();
  });

  priceMax?.addEventListener('input', (e) => {
    priceRange.max = parseInt(e.target.value) || 50000;
    renderProducts();
  });

  document.querySelectorAll('.filter-size')?.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const size = btn.dataset.size;
      if (btn.classList.contains('active')) {
        selectedSizes.push(size);
      } else {
        selectedSizes = selectedSizes.filter(s => s !== size);
      }
      renderProducts();
    });
  });
}

// ==========================================
// REAL-TIME PRODUCT UPDATES
// ==========================================

function initRealtimeProducts() {
  const needsProducts = !!document.getElementById('product-grid') || !!document.getElementById('related-products');
  if (!needsProducts) return;

  Backendless.initApp(BACKENDLESS_CONFIG.APP_ID, BACKENDLESS_CONFIG.API_KEY);

  const productsRT = Backendless.Data.of('Products').rt();
  productsRT.addCreateListener(() => { loadProducts(); });
  productsRT.addUpdateListener(() => { loadProducts(); });
  productsRT.addDeleteListener(() => { loadProducts(); });

  const settingsRT = Backendless.Data.of('Settings').rt();
  settingsRT.addUpdateListener(() => {
    _settingsCache = null;
    loadSettings().then(() => renderProducts());
  });
}

// ==========================================
// CHECKOUT
// ==========================================

function openCheckout() {
  if (cart.length === 0) return;

  const modal = document.getElementById('checkout-modal');
  const orderId = generateOrderId();
  const symbol = getCurrencySymbol();

  const subtotal = getCartSubtotal();
  const shippingCost = (siteSettings && siteSettings.shipping_cost != null) ? Number(siteSettings.shipping_cost) : 0;
  const total = subtotal + shippingCost;

  document.getElementById('checkout-order-id').textContent = orderId;
  document.getElementById('checkout-total').textContent = formatCurrency(total, symbol);

  const summary = document.getElementById('checkout-summary');
  summary.innerHTML = cart.map(item => `
    <div class="flex justify-between items-center py-3 border-b border-gray-100">
      <div>
        <p class="font-medium text-sm">${item.name}</p>
        <p class="text-xs text-gray-500">Size: ${item.size} x${item.qty}</p>
      </div>
      <span class="font-semibold text-sm">${formatCurrency(item.price * item.qty, symbol)}</span>
    </div>
  `).join('') + `
    <div class="flex justify-between items-center py-3 border-b border-gray-100">
      <span class="text-sm text-gray-500">Subtotal</span>
      <span class="font-semibold text-sm">${formatCurrency(subtotal, symbol)}</span>
    </div>
    <div class="flex justify-between items-center py-3 border-b border-gray-100">
      <span class="text-sm text-gray-500">Shipping</span>
      <span class="font-semibold text-sm">${formatCurrency(shippingCost, symbol)}</span>
    </div>
  `;

  const districtSelect = document.getElementById('checkout-district');
  if (districtSelect && districtSelect.options.length <= 1) {
    districtSelect.innerHTML = `<option value="" disabled selected>Select District</option>` +
      BD_DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  updateBkashBox(total);
  onPaymentMethodChange();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function generateOrderId() {
  return 'CN-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function onPaymentMethodChange() {
  const selected = document.querySelector('input[name="payment"]:checked');
  const bkashBox = document.getElementById('bkash-instructions');
  if (!bkashBox) return;

  if (selected && selected.value === 'bkash') {
    bkashBox.classList.remove('hidden');
    const subtotal = getCartSubtotal();
    const shippingCost = (siteSettings && siteSettings.shipping_cost != null) ? Number(siteSettings.shipping_cost) : 0;
    updateBkashBox(subtotal + shippingCost);
  } else {
    bkashBox.classList.add('hidden');
  }
}

function updateBkashBox(total) {
  const bkashNumber = (siteSettings && siteSettings.bkash_number) ? siteSettings.bkash_number : '';
  const symbol = getCurrencySymbol();

  const numberEl = document.getElementById('bkash-number-display');
  const amountEl = document.getElementById('bkash-amount-display');
  const linkEl = document.getElementById('bkash-pay-link');

  if (numberEl) numberEl.textContent = bkashNumber || 'Not configured';
  if (amountEl) amountEl.textContent = formatCurrency(total, symbol);
  if (linkEl) linkEl.href = `bkash://pay?amount=${total}`;
}

async function submitCheckout(e) {
  e.preventDefault();

  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  if (!canSubmitOrder()) {
    showCheckoutError('You have reached the maximum number of order attempts. Please try again in a few minutes.');
    return;
  }

  const getVal = (name) => sanitizeInput(form.querySelector(`[name="${name}"]`)?.value || '');

  const fullName = getVal('fullName');
  const phone = getVal('phone');
  const district = getVal('district');
  const thana = getVal('thana');
  const area = getVal('area');
  const zip = getVal('zip');
  const houseNumber = getVal('houseNumber');
  const sector = getVal('sector');
  const postOffice = getVal('postOffice');
  const roadNumber = getVal('roadNumber');
  const paymentMethod = form.querySelector('input[name="payment"]:checked')?.value || 'cod';

  const errors = [];
  if (!fullName || fullName.length < 2) errors.push('Please enter a valid full name.');
  if (!isValidPhone(phone)) errors.push('Please enter a valid phone number.');
  if (!district) errors.push('Please select a district.');
  if (!thana || thana.length < 2) errors.push('Please enter your Thana / Upazila.');
  if (!area || area.length < 2) errors.push('Please enter your area name.');
  if (cart.length === 0) errors.push('Your cart is empty.');

  if (errors.length > 0) {
    showCheckoutError(errors.join(' '));
    return;
  }

  const subtotal = getCartSubtotal();
  const shippingCost = (siteSettings && siteSettings.shipping_cost != null) ? Number(siteSettings.shipping_cost) : 0;
  const total = subtotal + shippingCost;

  const addressParts = [houseNumber, roadNumber, sector, area, postOffice, thana, zip].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  const orderPayload = {
    customer_name: fullName,
    customer_phone: phone,
    customer_address: fullAddress,
    customer_district: district,
    items: JSON.stringify(cart.map(item => ({
      product_id: item.id,
      slug: item.slug,
      name: item.name,
      size: item.size,
      qty: item.qty,
      price: item.price
    }))),
    subtotal: subtotal,
    shipping_cost: shippingCost,
    total: total,
    payment_method: paymentMethod,
    bkash_number: paymentMethod === 'bkash' ? (siteSettings.bkash_number || '') : '',
    status: 'Pending'
  };

  btn.innerHTML = '<span class="animate-pulse">Processing...</span>';
  btn.disabled = true;
  clearCheckoutError();

  try {
    await createOrder(orderPayload);

    cart = [];
    saveCart();
    updateCartUI();
    closeCheckout();

    showOrderSuccessModal();

    form.reset();
    const bkashBox = document.getElementById('bkash-instructions');
    if (bkashBox) bkashBox.classList.add('hidden');
  } catch (err) {
    console.error('[submitCheckout] Table:', BACKENDLESS_CONFIG.TABLES.ORDERS, '| Error:', err.message);
    showCheckoutError('Something went wrong while placing your order. Please try again.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function showCheckoutError(message) {
  let notice = document.getElementById('checkout-error-notice');
  const form = document.querySelector('#checkout-modal form');
  if (!notice && form) {
    notice = document.createElement('div');
    notice.id = 'checkout-error-notice';
    notice.className = 'rate-limit-notice';
    form.prepend(notice);
  }
  if (notice) notice.textContent = message;
}

function clearCheckoutError() {
  const notice = document.getElementById('checkout-error-notice');
  if (notice) notice.remove();
}

// ==========================================
// ORDER SUCCESS MODAL
// ==========================================

function showOrderSuccessModal() {
  const existing = document.getElementById('order-success-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'order-success-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:48px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.3);">
      <div style="width:64px;height:64px;background:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
        <svg width="28" height="28" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 style="font-size:1.6rem;font-weight:600;margin-bottom:12px;">Order Placed!</h2>
      <p style="color:#555;line-height:1.6;margin-bottom:28px;">
        Thank you for shopping with us. We will contact you shortly to confirm your order and arrange delivery.
      </p>
      <button onclick="document.getElementById('order-success-modal').remove();document.body.style.overflow='';"
        style="background:#000;color:#fff;border:none;padding:14px 40px;border-radius:50px;font-size:0.95rem;font-weight:500;cursor:pointer;">
        Continue Shopping
      </button>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
  });
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

// ==========================================
// DYNAMIC IMAGES FROM SETTINGS
// ==========================================

function applyDynamicImages() {
  if (!siteSettings) return;

  const heroContainer = document.getElementById('hero-slides');
  if (heroContainer) {
    clearInterval(heroInterval);
    currentHeroSlide = 0;
    initHeroSlider();
  }

  for (let i = 1; i <= 3; i++) {
    const img = document.getElementById(`collection-img-${i}`);
    const url = siteSettings[`collection_image_${i}`];
    if (img && url) {
      img.src = url;
    } else if (img && !url) {
      console.warn(`[applyDynamicImages] collection_image_${i} is empty in Settings table — keeping default image.`);
    } else if (!img) {
      console.warn(`[applyDynamicImages] #collection-img-${i} not found on this page.`);
    }
  }

  // Social links — TikTok
  const tiktokBtn = document.getElementById('tiktok-follow-btn');
  if (tiktokBtn) {
    if (siteSettings.tiktok_url) {
      tiktokBtn.href = siteSettings.tiktok_url;
    } else {
      console.warn('[applyDynamicImages] tiktok_url is empty in Settings table.');
    }
  }

  // Social links — Instagram
  const igFollowBtn = document.getElementById('instagram-follow-btn');
  const igHandleLink = document.getElementById('instagram-handle-link');
  if (siteSettings.instagram_url) {
    if (igFollowBtn) igFollowBtn.href = siteSettings.instagram_url;
    if (igHandleLink) igHandleLink.href = siteSettings.instagram_url;
  } else {
    console.warn('[applyDynamicImages] instagram_url is empty in Settings table.');
  }
}

// ==========================================
// REVIEWS
// ==========================================

function renderReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  container.innerHTML = reviews.map((review, i) => `
    <div class="testimonial-card p-8 rounded-2xl reveal reveal-delay-${(i % 5) + 1}">
      <div class="flex items-center gap-1 mb-4">
        ${renderStars(review.rating)}
      </div>
      <p class="text-gray-700 leading-relaxed mb-6 font-light">"${review.text}"</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm">
          ${review.avatar}
        </div>
        <div>
          <p class="font-medium text-sm">${review.name}</p>
          <p class="text-xs text-gray-500">${review.date}</p>
        </div>
      </div>
    </div>
  `).join('');
}

// ==========================================
// MOBILE MENU
// ==========================================

function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  menuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

// ==========================================
// NEWSLETTER
// ==========================================

function subscribeNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const btn = e.target.querySelector('button');

  btn.innerHTML = 'Subscribed!';
  btn.classList.add('bg-black', 'text-white');
  input.value = '';

  setTimeout(() => {
    btn.innerHTML = 'Join';
    btn.classList.remove('bg-black', 'text-white');
  }, 3000);
}

// ==========================================
// MODAL ESCAPE HANDLING
// ==========================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
    closeCheckout();
    closeSearch();
  }
});

// ==========================================
// PRODUCT DETAIL PAGE
// ==========================================

let currentProduct = null;
let selectedSize = null;
let detailQty = 1;

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const loadingEl = document.getElementById('product-loading');
  const errorEl = document.getElementById('product-error');
  const contentEl = document.getElementById('product-content');

  if (!slug) {
    showProductError();
    return;
  }

  try {
    const product = await fetchProductBySlug(slug);
    if (!product) {
      showProductError();
      return;
    }
    currentProduct = product;
    applyProductData(product);

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    renderReviews();
    renderRelatedProducts(product);

    setTimeout(() => {
      initScrollAnimations();
      refreshCursorHoverTargets();
      initMagneticButtons();
    }, 100);
  } catch (err) {
    console.error('[initProductPage] Table:', BACKENDLESS_CONFIG.TABLES.PRODUCTS, '| Error:', err.message);
    showProductError();
  }
}

function showProductError() {
  document.getElementById('product-loading')?.classList.add('hidden');
  document.getElementById('product-error')?.classList.remove('hidden');
}

function applyProductData(product) {
  const symbol = getCurrencySymbol();
  const hasSale = product.sale_price != null && product.sale_price > 0 && product.sale_price < product.price;
  const status = getStockStatus(product);
  const statusClass = status === 'Out of Stock' ? 'out-of-stock' : (status === 'Low Stock' ? 'low-stock' : 'in-stock');

  document.title = `${product.name} | AURIX`;
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = `${product.name} | AURIX`;

  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-category-label').textContent = product.category;
  document.getElementById('product-category').textContent = product.category;
  document.getElementById('product-description').textContent = product.description;

  const priceEl = document.getElementById('product-price');
  priceEl.innerHTML = hasSale
    ? `<span class="line-through text-gray-400 text-lg mr-2">${formatCurrency(product.price, symbol)}</span>${formatCurrency(product.sale_price, symbol)}`
    : formatCurrency(product.price, symbol);

  const stockBadge = document.getElementById('product-stock-badge');
  if (status !== 'In Stock') {
    stockBadge.innerHTML = `<span class="stock-badge ${statusClass}">${status}</span>`;
  } else {
    stockBadge.innerHTML = `<span class="stock-badge in-stock">In Stock</span>`;
  }

  const stockText = document.getElementById('product-stock-text');
  stockText.textContent = product.stock_quantity > 0
    ? `${product.stock_quantity} in stock`
    : 'Out of stock';

  const addBtn = document.getElementById('add-to-cart-btn');
  if (status === 'Out of Stock') {
    addBtn.disabled = true;
    addBtn.classList.add('opacity-50', 'cursor-not-allowed');
    addBtn.textContent = 'Out of Stock';
  } else {
    addBtn.disabled = false;
    addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    addBtn.textContent = 'Add to Cart';
  }

  const mainImage = document.getElementById('main-image');
  mainImage.src = product.images[0];
  mainImage.alt = product.name;

  const thumbContainer = document.getElementById('thumbnail-container');
  if (product.images.length > 1) {
    thumbContainer.innerHTML = product.images.map((img, i) => `
      <button onclick="setMainImage('${img.replace(/'/g, "\\'")}')" class="gallery-thumb w-20 h-24 rounded-xl overflow-hidden bg-gray-100 border-2 ${i === 0 ? 'border-black' : 'border-transparent'} transition-colors">
        <img src="${img}" alt="${product.name} ${i + 1}" class="w-full h-full object-cover">
      </button>
    `).join('');
  } else {
    thumbContainer.innerHTML = '';
  }

  selectedSize = product.sizes[0];
  const sizeSelector = document.getElementById('size-selector');
  sizeSelector.innerHTML = product.sizes.map(size => `
    <button class="size-option selector-option rounded-lg text-sm py-2 px-4 ${size === selectedSize ? 'active' : ''}" data-size="${size}" onclick="selectSize('${size.replace(/'/g, "\\'")}')">
      ${size}
    </button>
  `).join('');

  const detailsSection = document.getElementById('product-details-section');
  const detailsContent = document.getElementById('product-details-content');
  if (product.product_details && product.product_details.trim()) {
    detailsContent.textContent = product.product_details;
    detailsSection.classList.remove('hidden');
  } else {
    detailsSection.classList.add('hidden');
  }

  updatePageWishlistButton();
  detailQty = 1;
  document.getElementById('detail-qty').value = 1;
}

function setMainImage(src) {
  document.getElementById('main-image').src = src;
  document.querySelectorAll('#thumbnail-container .gallery-thumb').forEach(thumb => {
    const img = thumb.querySelector('img');
    thumb.classList.toggle('border-black', img.src === src || img.getAttribute('src') === src);
    thumb.classList.toggle('border-transparent', !(img.src === src || img.getAttribute('src') === src));
  });
}

function selectSize(size) {
  selectedSize = size;
  document.querySelectorAll('#size-selector .size-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

function updateQty(change) {
  detailQty += change;
  if (detailQty < 1) detailQty = 1;
  if (currentProduct && currentProduct.stock_quantity > 0 && detailQty > currentProduct.stock_quantity) {
    detailQty = currentProduct.stock_quantity;
  }
  document.getElementById('detail-qty').value = detailQty;
}

function addToCartFromPage() {
  if (!currentProduct) return;
  const status = getStockStatus(currentProduct);
  if (status === 'Out of Stock') return;

  const effectivePrice = currentProduct.sale_price != null && currentProduct.sale_price > 0 ? currentProduct.sale_price : currentProduct.price;
  addToCart(currentProduct, detailQty, selectedSize || currentProduct.sizes[0], effectivePrice);
}

function toggleWishlistFromPage() {
  if (!currentProduct) return;
  toggleWishlist(currentProduct.objectId);
  updatePageWishlistButton();
}

function updatePageWishlistButton() {
  if (!currentProduct) return;
  const btn = document.getElementById('page-wishlist-btn');
  if (!btn) return;
  const isWishlisted = wishlist.includes(currentProduct.objectId);
  btn.classList.toggle('active', isWishlisted);
  const svg = btn.querySelector('svg');
  if (svg) svg.setAttribute('fill', isWishlisted ? 'currentColor' : 'none');
}

function renderRelatedProducts(product) {
  const container = document.getElementById('related-products');
  if (!container) return;

  const related = products
    .filter(p => p.objectId !== product.objectId && p.category === product.category)
    .slice(0, 4);

  const fallback = related.length > 0 ? related : products.filter(p => p.objectId !== product.objectId).slice(0, 4);

  if (fallback.length === 0) {
    container.innerHTML = '';
    return;
  }

  const symbol = getCurrencySymbol();

  container.innerHTML = fallback.map(p => {
    const hasSale = p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price;
    return `
    <div class="product-card glass-card rounded-2xl overflow-hidden reveal">
      <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="relative aspect-product overflow-hidden bg-gray-100 block">
        <img src="${p.image}" alt="${p.name}" class="product-image w-full h-full object-cover" loading="lazy">
      </a>
      <div class="p-4">
        <a href="product.html?slug=${encodeURIComponent(p.slug)}">
          <h3 class="font-display text-lg font-medium mb-1">${p.name}</h3>
        </a>
        <p class="text-sm font-semibold">
          ${hasSale
            ? `<span class="line-through text-gray-400 text-xs mr-1">${formatCurrency(p.price, symbol)}</span>${formatCurrency(p.sale_price, symbol)}`
            : formatCurrency(p.price, symbol)}
        </p>
      </div>
    </div>
  `;
  }).join('');
}

if (document.getElementById('product-content')) {
  document.addEventListener('DOMContentLoaded', async () => {
    const waitForData = () => new Promise(resolve => {
      const check = () => {
        if (_siteDataReady) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
    await waitForData();
    initProductPage();
  });
}
