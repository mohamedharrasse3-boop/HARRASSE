/* =========================================================
   HARRASSE.SHOP — App Logic
   ========================================================= */

(function () {
  'use strict';

  // ====== CONFIG ======
  const WHATSAPP_NUMBER = '212691805347'; // رقم واتساب HARRASSE.SHOP
  const CURRENCY = 'د.م';
  const STORAGE_KEY = 'harrasse_cart_v1';

  // ====== UTILITIES ======
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const formatPrice = (n) => `${Number(n).toLocaleString('ar-MA')} ${CURRENCY}`;

  // ====== STATE ======
  let cart = loadCart();
  let activeCat = 'all';
  let searchTerm = '';
  let sortBy = 'default';
  let activeQuickFilter = 'all';

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }
  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  // ====== TOAST ======
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg, icon = 'fa-circle-check') {
    if (!toastEl) return;
    toastEl.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // ====== HEADER SHADOW ON SCROLL ======
  const header = $('#header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ====== MOBILE MENU ======
  const menuBtn = $('#menuBtn');
  const nav = $('#nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
      const icon = menuBtn.querySelector('i');
      if (icon) icon.className = nav.classList.contains('open') ? 'fas fa-xmark' : 'fas fa-bars';
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        const icon = menuBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      }
    });
  }

  // ====== PRODUCTS RENDERING ======
  const grid = $('#productsGrid');
  const emptyState = $('#productsEmpty');

  function getRatingStars(rating) {
    const full = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return `<span>(${rating}.0)</span> ${full}${empty}`;
  }

  function getBadge(badge) {
    if (!badge) return '';
    const map = {
      best: { cls: 'product__badge--best', text: 'الأكثر مبيعاً' },
      new:  { cls: 'product__badge--new',  text: 'جديد' },
    };
    if (badge === 'best' || badge === 'new') {
      return `<span class="product__badge ${map[badge].cls}">${map[badge].text}</span>`;
    }
    return `<span class="product__badge">${badge}</span>`;
  }

  function getDiscount(p) {
    if (!p.oldPrice || p.oldPrice <= p.price) return '';
    const pct = Math.round((1 - p.price / p.oldPrice) * 100);
    return `<span class="product__badge">-${pct}%</span>`;
  }

  function productCard(p, index = 0) {
    const bg = `linear-gradient(135deg, ${p.color || '#1a6b4e'} 0%, rgba(0,0,0,.35) 100%)`;
    // Load ALL images eagerly (only 30 products - no need for lazy loading)
    const imageContent = p.image
      ? `<div class="product__icon-bg" style="background: ${bg};"><i class="fas ${p.icon}"></i></div>
         <img src="${p.image}" alt="${p.name}" 
           decoding="async"
           onerror="this.style.display='none';" />`
      : `<i class="fas ${p.icon}"></i>`;
    return `
      <article class="product" data-cat="${p.cat}" data-name="${p.name.toLowerCase()}" data-price="${p.price}">
        ${p.badge ? getBadge(p.badge) : getDiscount(p)}
        <button class="product__share" data-id="${p.id}" aria-label="مشاركة عبر واتساب" title="مشاركة عبر واتساب">
          <i class="fab fa-whatsapp"></i>
        </button>
        <div class="product__img ${p.image ? 'product__img--has-photo' : ''}" data-zoom-id="${p.id}">
          ${imageContent}
        </div>
        <div class="product__body">
          <div class="product__cat">${p.catName}</div>
          <h3 class="product__name">${p.name}</h3>
          <p class="product__desc">${p.desc}</p>
          <div class="product__rating">${getRatingStars(p.rating || 5)}</div>
          <div class="product__price-row">
            <span class="product__price">${formatPrice(p.price)}</span>
            ${p.oldPrice ? `<span class="product__price-old">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
          <button class="product__add" data-id="${p.id}">
            <i class="fas fa-cart-plus"></i> أضف إلى السلة
          </button>
        </div>
      </article>`;
  }

  function renderProducts() {
    if (!grid || !window.PRODUCTS) return;

    let list = [...window.PRODUCTS];

    if (activeCat !== 'all') list = list.filter((p) => p.cat === activeCat);

    // Apply quick filter
    if (activeQuickFilter === 'best') {
      list = list.filter((p) => p.badge === 'best');
    } else if (activeQuickFilter === 'new') {
      list = list.filter((p) => p.badge === 'new');
    } else if (activeQuickFilter === 'discount') {
      list = list.filter((p) => p.oldPrice && p.oldPrice > p.price);
    }

    if (searchTerm) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.catName.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'name':       list.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
    }

    if (list.length === 0) {
      grid.innerHTML = '';
      emptyState && (emptyState.hidden = false);
      return;
    }
    emptyState && (emptyState.hidden = true);
    grid.innerHTML = list.map((p, i) => productCard(p, i)).join('');
    bindProductButtons();
  }

  function bindProductButtons() {
    $$('.product__add', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        addToCart(id);
      });
    });
    // Share buttons
    $$('.product__share', grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        shareProduct(id);
      });
    });
    // Click image to enlarge
    $$('.product__img', grid).forEach((imgWrap) => {
      imgWrap.addEventListener('click', () => {
        const id = imgWrap.dataset.zoomId;
        if (id) openLightbox(id);
      });
    });
  }

  // ====== SHARE PRODUCT VIA WHATSAPP ======
  function shareProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    const url = window.location.origin + window.location.pathname;
    const msg =
      `🛍️ *${p.name}*\n\n` +
      `${p.desc}\n\n` +
      `💰 السعر: *${formatPrice(p.price)}*` +
      (p.oldPrice ? ` (بدلاً من ${formatPrice(p.oldPrice)})` : '') +
      `\n\n🌐 شاهد المزيد: ${url}\n` +
      `📞 للطلب: HARRASSE.SHOP`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    toast('فتح واتساب لمشاركة المنتج', 'fa-share-nodes');
  }

  // ====== LIGHTBOX (Image Zoom) ======
  function openLightbox(id) {
    const p = findProduct(id);
    if (!p) return;
    const lightbox = $('#lightbox');
    if (!lightbox) return;
    const lbImg = $('#lightboxImg');
    const lbName = $('#lightboxName');
    const lbDesc = $('#lightboxDesc');
    const lbPrice = $('#lightboxPrice');
    const lbAdd = $('#lightboxAdd');
    if (lbImg && p.image) {
      lbImg.src = p.image;
      lbImg.alt = p.name;
      lbImg.style.display = 'block';
    } else if (lbImg) {
      lbImg.style.display = 'none';
    }
    if (lbName) lbName.textContent = p.name;
    if (lbDesc) lbDesc.textContent = p.desc;
    if (lbPrice) {
      lbPrice.innerHTML = `<span class="lightbox__price-new">${formatPrice(p.price)}</span>` +
        (p.oldPrice ? ` <span class="lightbox__price-old">${formatPrice(p.oldPrice)}</span>` : '');
    }
    if (lbAdd) lbAdd.dataset.id = p.id;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    const lightbox = $('#lightbox');
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  const lightboxEl = $('#lightbox');
  if (lightboxEl) {
    lightboxEl.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]') || e.target.closest('[data-close]')) closeLightbox();
    });
    const lbAdd = $('#lightboxAdd');
    if (lbAdd) {
      lbAdd.addEventListener('click', () => {
        const id = lbAdd.dataset.id;
        if (id) {
          addToCart(id);
          closeLightbox();
        }
      });
    }
    const lbShare = $('#lightboxShare');
    if (lbShare) {
      lbShare.addEventListener('click', () => {
        const id = $('#lightboxAdd')?.dataset.id;
        if (id) shareProduct(id);
      });
    }
  }

  // ====== CATEGORIES ======
  // Update category counts
  function updateCategoryCounts() {
    if (!window.PRODUCTS) return;
    const counts = { all: window.PRODUCTS.length };
    window.PRODUCTS.forEach(p => {
      counts[p.cat] = (counts[p.cat] || 0) + 1;
    });
    $$('.cat').forEach((btn) => {
      const cat = btn.dataset.cat;
      const count = counts[cat] || 0;
      let countEl = btn.querySelector('.cat__count');
      if (!countEl) {
        countEl = document.createElement('span');
        countEl.className = 'cat__count';
        btn.appendChild(countEl);
      }
      countEl.textContent = count;
    });
  }
  updateCategoryCounts();

  $$('.cat').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.cat').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      renderProducts();
      // smooth scroll to products
      const target = $('#products');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  // default to "all"
  const allCat = $('.cat[data-cat="all"]');
  if (allCat) allCat.classList.add('active');

  // ====== SEARCH & SORT ======
  const searchInput = $('#searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderProducts();
    });
  }
  const sortSelect = $('#sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderProducts();
    });
  }

  // ====== QUICK FILTERS ======
  $$('.quick-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.quick-filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeQuickFilter = btn.dataset.filter;
      renderProducts();
    });
  });

  // ====== ANIMATED COUNTERS ======
  function animateCounter(el, target) {
    const duration = 1500;
    const start = performance.now();
    const startVal = 0;
    const isFloat = String(target).includes('.');
    const isPlus = String(target).startsWith('+');
    const cleanTarget = parseFloat(String(target).replace(/[^\d.]/g, ''));

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startVal + (cleanTarget - startVal) * eased;
      el.textContent = (isPlus ? '+' : '') +
        (isFloat ? value.toFixed(1) : Math.floor(value).toLocaleString('ar-MA'));
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    }
    requestAnimationFrame(tick);
  }

  function setupCounters() {
    if (!('IntersectionObserver' in window)) return;
    const counters = $$('.hero__stats strong');
    if (!counters.length) return;

    const targets = counters.map((el) => el.textContent.trim());
    counters.forEach((el) => { el.dataset.target = el.textContent.trim(); el.textContent = '0'; });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target, entry.target.dataset.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => io.observe(el));
  }
  setupCounters();

  // ====== CART ======
  const cartBtn = $('#cartBtn');
  const cartBadge = $('#cartBadge');
  const cartDrawer = $('#cartDrawer');
  const cartItemsEl = $('#cartItems');
  const cartTotalEl = $('#cartTotal');
  const checkoutBtn = $('#checkoutBtn');

  function findProduct(id) {
    return (window.PRODUCTS || []).find((p) => p.id === id);
  }

  function addToCart(id) {
    const p = findProduct(id);
    if (!p) return;
    const existing = cart.find((c) => c.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, qty: 1 });
    saveCart();
    updateCartUI();
    toast(`تمت إضافة ${p.name} إلى السلة`, 'fa-cart-plus');
  }

  function removeFromCart(id) {
    cart = cart.filter((c) => c.id !== id);
    saveCart();
    updateCartUI();
  }

  function changeQty(id, delta) {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartUI();
  }

  function cartTotal() {
    return cart.reduce((sum, item) => {
      const p = findProduct(item.id);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function renderCart() {
    if (!cartItemsEl) return;
    if (cart.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-bag-shopping"></i>
          <p>سلتك فارغة. ابدأ التسوق الآن!</p>
        </div>`;
      return;
    }
    cartItemsEl.innerHTML = cart.map((item) => {
      const p = findProduct(item.id);
      if (!p) return '';
      const bg = `linear-gradient(135deg, ${p.color || '#1a6b4e'}, rgba(0,0,0,.3))`;
      return `
        <div class="cart-item" data-id="${p.id}">
          <div class="cart-item__img" style="background:${bg};">
            <i class="fas ${p.icon}"></i>
          </div>
          <div class="cart-item__info">
            <strong>${p.name}</strong>
            <span>${formatPrice(p.price)}</span>
            <div class="cart-item__qty">
              <button data-action="dec" aria-label="إنقاص">−</button>
              <span>${item.qty}</span>
              <button data-action="inc" aria-label="زيادة">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-action="remove" aria-label="حذف">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>`;
    }).join('');

    // bind cart-item buttons
    $$('.cart-item', cartItemsEl).forEach((row) => {
      const id = row.dataset.id;
      row.querySelectorAll('button[data-action]').forEach((b) => {
        b.addEventListener('click', () => {
          const a = b.dataset.action;
          if (a === 'inc') changeQty(id, +1);
          else if (a === 'dec') changeQty(id, -1);
          else if (a === 'remove') removeFromCart(id);
        });
      });
    });
  }

  function updateCartUI() {
    if (cartBadge) cartBadge.textContent = cartCount();
    const mobileBadge = $('#mobileCartBadge');
    if (mobileBadge) mobileBadge.textContent = cartCount();
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(cartTotal());
    renderCart();
  }

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  const mobileCartBtn = $('#mobileCartBtn');
  if (mobileCartBtn) mobileCartBtn.addEventListener('click', openCart);
  if (cartDrawer) {
    cartDrawer.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]') || e.target.closest('[data-close]')) closeCart();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  // ====== CHECKOUT VIA WHATSAPP ======
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        toast('سلتك فارغة. أضف منتجات أولاً.', 'fa-circle-info');
        return;
      }
      const lines = cart.map((item, i) => {
        const p = findProduct(item.id);
        if (!p) return '';
        return `${i + 1}. ${p.name} × ${item.qty} = ${formatPrice(p.price * item.qty)}`;
      }).filter(Boolean);
      const total = formatPrice(cartTotal());
      const msg =
        `*طلب جديد من HARRASSE.SHOP* \n\n` +
        lines.join('\n') +
        `\n\n*الإجمالي:* ${total}\n\n` +
        `الرجاء تأكيد الطلب وإخباري بطريقة الدفع والتوصيل. شكراً!`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  }

  // ====== CONTACT FORM → WHATSAPP ======
  const contactForm = $('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(contactForm);
      const name = (fd.get('name') || '').toString().trim();
      const phone = (fd.get('phone') || '').toString().trim();
      const city = (fd.get('city') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();

      if (!name || !phone || !city || !message) {
        toast('الرجاء تعبئة جميع الحقول', 'fa-circle-exclamation');
        return;
      }

      const msg =
        `*استفسار جديد من HARRASSE.SHOP* \n\n` +
        `*الاسم:* ${name}\n` +
        `*الهاتف:* ${phone}\n` +
        `*المدينة:* ${city}\n\n` +
        `*الرسالة:*\n${message}`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
      toast('سيتم تحويلك إلى واتساب لإكمال الطلب', 'fa-circle-check');
      contactForm.reset();
    });
  }

  // ====== REVEAL ON SCROLL ======
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    // tag elements after render
    setTimeout(() => {
      $$('.section__head, .why__item, .t-card, .trust__item, .product, .faq__item, .cat')
        .forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    }, 50);
  }

  // ====== SMOOTH ANCHORS ======
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ====== YEAR ======
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ====== SCROLL TO TOP BUTTON ======
  const scrollTopBtn = $('#scrollTopBtn');
  if (scrollTopBtn) {
    const toggleScrollBtn = () => {
      scrollTopBtn.classList.toggle('show', window.scrollY > 600);
    };
    window.addEventListener('scroll', toggleScrollBtn, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ====== PAGE LOADER ======
  // Hide loader once everything is ready
  window.addEventListener('load', () => {
    const loader = $('#pageLoader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    }
  });

  // ====== INIT ======
  renderProducts();
  updateCartUI();

})();
