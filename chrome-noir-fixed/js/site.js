/* ==========================================================
   CHROME NOIR - Shared Site UI (WhatsApp button, footer socials)
   Included on every customer-facing page after api.js
   ========================================================== */

async function initSiteWideUI() {
  let settings = {};
  try {
    settings = await fetchSettings();
  } catch (e) {
    settings = {};
  }

  initWhatsAppButton(settings);
  initFooterSocials(settings);
  initFooterStoreName(settings);
}

// ----------------------------------------------------------
// WHATSAPP FLOATING BUTTON
// ----------------------------------------------------------

function initWhatsAppButton(settings) {
  const number = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
  if (!number) return;

  const existing = document.getElementById("whatsapp-float-btn");
  if (existing) existing.remove();

  const btn = document.createElement("a");
  btn.id = "whatsapp-float-btn";
  btn.href = `https://wa.me/${number}`;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.setAttribute("aria-label", "Chat with us on WhatsApp");
  btn.className = "whatsapp-float-btn";
  btn.innerHTML = `
    <svg class="w-7 h-7" viewBox="0 0 32 32" fill="#25D366">
      <path d="M16.001 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.69.781 5.196 2.135 7.314L2.667 29.333l6.214-2.094A13.27 13.27 0 0 0 16.001 29.333c7.364 0 13.333-5.97 13.333-13.333S23.365 2.667 16.001 2.667zm0 24.222a10.85 10.85 0 0 1-5.55-1.527l-.397-.236-3.69 1.244 1.262-3.59-.258-.413A10.86 10.86 0 0 1 5.333 16c0-5.891 4.776-10.667 10.668-10.667 5.891 0 10.667 4.776 10.667 10.667 0 5.892-4.776 10.889-10.667 10.889zm5.84-7.99c-.32-.16-1.892-.933-2.186-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-1.013 1.253-.187.213-.373.24-.693.08-1.866-.933-3.093-1.666-4.32-3.78-.16-.28.16-.253.453-.84.107-.213.054-.4-.053-.56-.107-.16-.587-1.413-.8-1.893-.213-.48-.427-.413-.587-.413-.16 0-.347-.013-.533-.013-.187 0-.48.067-.733.347-.253.28-.973.96-.973 2.32 0 1.36.987 2.667 1.12 2.853.133.187 1.864 2.84 4.586 3.973 2.722 1.133 2.722.76 3.213.706.49-.053 1.892-.773 2.16-1.52.267-.747.267-1.387.187-1.52-.08-.133-.293-.213-.613-.373z"/>
    </svg>
  `;
  document.body.appendChild(btn);
}

// ----------------------------------------------------------
// FOOTER SOCIAL ICONS (Facebook, TikTok, Instagram)
// ----------------------------------------------------------

function initFooterSocials(settings) {
  const containers = document.querySelectorAll(".footer-social-icons");
  if (!containers.length) return;

  const links = [
    {
      url: settings.facebook_url,
      label: "Facebook",
      svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    },
    {
      url: settings.instagram_url,
      label: "Instagram",
      svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
    },
    {
      url: settings.tiktok_url,
      label: "TikTok",
      svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.88c.26 0 .51.04.75.1V9.4a6.36 6.36 0 00-.75-.05A6.34 6.34 0 005.5 15.69a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.35a8.23 8.23 0 004.83 1.55V6.69h-.42z"/></svg>`
    }
  ];

  containers.forEach(container => {
    container.innerHTML = links
      .filter(l => l.url)
      .map(l => `
        <a href="${l.url}" target="_blank" rel="noopener noreferrer" aria-label="${l.label}" class="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-black hover:text-white transition-all">
          ${l.svg}
        </a>
      `).join("");
  });
}

// ----------------------------------------------------------
// FOOTER STORE NAME (from settings)
// ----------------------------------------------------------

function initFooterStoreName(settings) {
  if (!settings.store_name) return;
  document.querySelectorAll(".store-name-text").forEach(el => {
    el.textContent = settings.store_name;
  });
}
