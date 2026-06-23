/* ==========================================================
   BACKENDLESS CONFIGURATION
   ==========================================================
   1. Go to https://backendless.com and log in to your console.
   2. Open (or create) your app.
   3. Click the small "key" icon in the left sidebar -> "App Settings"
      to find your APP_ID and the REST API_KEY (under "API Keys").
   4. Paste those values below. Do NOT commit real production keys
      to a public repository.
   ========================================================== */

const BACKENDLESS_CONFIG = {
  // Found in: Backendless Console -> App Settings -> App ID
  APP_ID: "6507EBB2-62B8-4983-A6AA-9005906256E0",

  // Found in: Backendless Console -> App Settings -> API Keys -> REST API Key
  API_KEY: "B2656139-0289-46B8-A235-AF70048E2946",

  // Base REST API URL - do not change unless using a custom/EU host
  API_BASE: "https://api.backendless.com",

  // Table names (must match the tables created in Backendless)
  TABLES: {
    PRODUCTS: "Products",
    ORDERS: "Orders",
    SITE_CONTENT: "Site_Content",
    SETTINGS: "Settings",
    ADMIN_USERS: "Admin_Users"
  }
};

// Builds the base REST data URL, e.g.
// https://api.backendless.com/APP_ID/API_KEY/data/Products
function getBackendlessDataURL(tableName) {
  return `${BACKENDLESS_CONFIG.API_BASE}/${BACKENDLESS_CONFIG.APP_ID}/${BACKENDLESS_CONFIG.API_KEY}/data/${tableName}`;
}

// Builds the base REST user-service URL for authentication
function getBackendlessUserURL(path) {
  return `${BACKENDLESS_CONFIG.API_BASE}/${BACKENDLESS_CONFIG.APP_ID}/${BACKENDLESS_CONFIG.API_KEY}/users/${path}`;
}

// Backendless real-time data API endpoint (WebSocket / SUB protocol via REST events)
function getBackendlessRTURL(tableName) {
  return `${BACKENDLESS_CONFIG.API_BASE}/${BACKENDLESS_CONFIG.APP_ID}/${BACKENDLESS_CONFIG.API_KEY}/data/${tableName}/rt`;
}

// Export for use across pages (script tag based, no bundler)
window.BACKENDLESS_CONFIG = BACKENDLESS_CONFIG;
window.getBackendlessDataURL = getBackendlessDataURL;
window.getBackendlessUserURL = getBackendlessUserURL;
window.getBackendlessRTURL = getBackendlessRTURL;
