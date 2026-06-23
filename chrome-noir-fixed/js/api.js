/* ==========================================================
   CHROME NOIR - Backendless API Helper
   Shared across all customer-facing pages.
   Uses Backendless REST Data API (fetch-based) and the
   Backendless RT (real-time) WebSocket protocol for live
   product/order updates.
   ========================================================== */

// ----------------------------------------------------------
// Generic REST helpers
// ----------------------------------------------------------

async function blFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch (networkErr) {
    const msg = `[Backendless] Network error reaching: ${url} — ${networkErr.message}`;
    console.error(msg);
    throw new Error(msg);
  }

  if (!res.ok) {
    let errBody = "";
    let errCode = "";
    try {
      const json = await res.json();
      errBody = json.message || JSON.stringify(json);
      errCode = json.code ? ` (code ${json.code})` : "";
    } catch (e) {
      try { errBody = await res.text(); } catch (_) {}
    }
    const msg = `[Backendless] HTTP ${res.status}${errCode} for ${url}: ${errBody}`;
    console.error(msg);
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ----------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------

// Fetch products. Pass { sortBy, pageSize, where } for custom queries.
async function fetchProducts({ sortBy = "created desc", pageSize = 100, where = "" } = {}) {
  const tableName = BACKENDLESS_CONFIG.TABLES.PRODUCTS;
  let url = `${getBackendlessDataURL(tableName)}?sortBy=${encodeURIComponent(sortBy)}&pageSize=${pageSize}`;
  if (where) url += `&where=${encodeURIComponent(where)}`;
  try {
    const data = await blFetch(url);
    return (data || []).map(normalizeProduct);
  } catch (err) {
    console.error(`[fetchProducts] Table: ${tableName} | URL: ${url} | Error: ${err.message}`);
    throw err;
  }
}

async function fetchProductBySlug(slug) {
  const tableName = BACKENDLESS_CONFIG.TABLES.PRODUCTS;
  const where = `slug='${slug.replace(/'/g, "\\'")}'`;
  const url = `${getBackendlessDataURL(tableName)}?where=${encodeURIComponent(where)}&pageSize=1`;
  try {
    const data = await blFetch(url);
    if (!data || data.length === 0) return null;
    return normalizeProduct(data[0]);
  } catch (err) {
    console.error(`[fetchProductBySlug] Table: ${tableName} | Slug: ${slug} | URL: ${url} | Error: ${err.message}`);
    throw err;
  }
}

// Normalize a raw Backendless product record into the shape
// used throughout the front-end (arrays for sizes/images, etc.)
function normalizeProduct(raw) {
  const sizes = (raw.sizes || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const images = [raw.image_1, raw.image_2, raw.image_3].filter(Boolean);

  return {
    objectId: raw.objectId,
    id: raw.objectId,
    name: raw.name || "",
    slug: raw.slug || "",
    category: raw.category || "",
    description: raw.description || "",
    price: Number(raw.price) || 0,
    sale_price: raw.sale_price != null ? Number(raw.sale_price) : null,
    stock_quantity: Number(raw.stock_quantity) || 0,
    stock_status: raw.stock_status || "In Stock",
    sizes: sizes.length ? sizes : ["One Size"],
    product_details: raw.product_details || "",
    images: images.length ? images : ["https://placehold.co/800x1000?text=No+Image"],
    image: images[0] || "https://placehold.co/800x1000?text=No+Image",
    is_featured: !!raw.is_featured,
    created: raw.created
  };
}

// ----------------------------------------------------------
// SETTINGS (single-row table)
// ----------------------------------------------------------

let _settingsCache = null;

async function fetchSettings() {
  if (_settingsCache) return _settingsCache;
  const tableName = BACKENDLESS_CONFIG.TABLES.SETTINGS;
  const url = `${getBackendlessDataURL(tableName)}?pageSize=1`;
  try {
    const data = await blFetch(url);
    _settingsCache = (data && data[0]) ? data[0] : {};
    return _settingsCache;
  } catch (err) {
    console.error(`[fetchSettings] Table: ${tableName} | URL: ${url} | Error: ${err.message}`);
    throw err;
  }
}

// ----------------------------------------------------------
// SITE CONTENT (key/value pairs for policy pages etc.)
// ----------------------------------------------------------

async function fetchSiteContent(key) {
  const tableName = BACKENDLESS_CONFIG.TABLES.SITE_CONTENT;
  const where = `key='${key.replace(/'/g, "\\'")}'`;
  const url = `${getBackendlessDataURL(tableName)}?where=${encodeURIComponent(where)}&pageSize=1`;
  try {
    const data = await blFetch(url);
    if (!data || data.length === 0) return null;
    return data[0].value || "";
  } catch (err) {
    console.error(`[fetchSiteContent] Table: ${tableName} | Key: ${key} | URL: ${url} | Error: ${err.message}`);
    throw err;
  }
}

// ----------------------------------------------------------
// ORDERS
// ----------------------------------------------------------

async function createOrder(orderPayload) {
  const tableName = BACKENDLESS_CONFIG.TABLES.ORDERS;
  const url = getBackendlessDataURL(tableName);
  try {
    return await blFetch(url, {
      method: "POST",
      body: JSON.stringify(orderPayload)
    });
  } catch (err) {
    console.error(`[createOrder] Table: ${tableName} | URL: ${url} | Payload: ${JSON.stringify(orderPayload)} | Error: ${err.message}`);
    throw err;
  }
}

// ----------------------------------------------------------
// REAL-TIME SUBSCRIPTIONS (Backendless RT via WebSocket)
// ----------------------------------------------------------
// Backendless real-time data uses a WebSocket connection at:
// wss://api.backendless.com/<APP_ID>/<API_KEY>/data/<table>
// Each message is a JSON object describing create/update/delete events.

function subscribeToTable(tableName, callbacks = {}) {
  try {
    const wsUrl = `wss://${BACKENDLESS_CONFIG.API_BASE.replace(/^https?:\/\//, "")}/${BACKENDLESS_CONFIG.APP_ID}/${BACKENDLESS_CONFIG.API_KEY}/data/${tableName}`;
    const socket = new WebSocket(wsUrl);

    socket.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Backendless RT event types: create, update, delete, bulkUpdate, bulkDelete
        if (msg.event === "create" && callbacks.onCreate) callbacks.onCreate(msg.data);
        if (msg.event === "update" && callbacks.onUpdate) callbacks.onUpdate(msg.data);
        if (msg.event === "delete" && callbacks.onDelete) callbacks.onDelete(msg.data);
      } catch (e) {
        // Ignore malformed messages
      }
    });

    socket.addEventListener("error", () => {
      // Real-time is a progressive enhancement - fail silently and
      // fall back to the static data already loaded via REST.
    });

    return socket;
  } catch (e) {
    return null;
  }
}

// ----------------------------------------------------------
// INPUT SANITIZATION / VALIDATION
// ----------------------------------------------------------

// Strips HTML tags and dangerous characters from user input
function sanitizeInput(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

// ----------------------------------------------------------
// CLIENT-SIDE RATE LIMITING (3 order submissions / 10 min)
// ----------------------------------------------------------

const ORDER_RATE_LIMIT = { MAX: 3, WINDOW_MS: 10 * 60 * 1000 };

function canSubmitOrder() {
  const key = "chrome_noir_order_timestamps";
  const now = Date.now();
  let timestamps = [];
  try {
    timestamps = JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    timestamps = [];
  }
  timestamps = timestamps.filter(ts => now - ts < ORDER_RATE_LIMIT.WINDOW_MS);

  if (timestamps.length >= ORDER_RATE_LIMIT.MAX) {
    localStorage.setItem(key, JSON.stringify(timestamps));
    return false;
  }

  timestamps.push(now);
  localStorage.setItem(key, JSON.stringify(timestamps));
  return true;
}

// ----------------------------------------------------------
// CURRENCY / FORMATTING
// ----------------------------------------------------------

function formatCurrency(amount, symbol = "৳") {
  return symbol + Number(amount).toLocaleString("en-US");
}

function getStockStatus(product) {
  if (product.stock_status) return product.stock_status;
  if (product.stock_quantity <= 0) return "Out of Stock";
  if (product.stock_quantity <= 5) return "Low Stock";
  return "In Stock";
}

