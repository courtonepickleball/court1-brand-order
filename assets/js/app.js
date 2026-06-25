 HEAD
const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS.filter(p => p && p.active) : [];
const CART_CODES = Array.isArray(window.CART_CODES) ? window.CART_CODES : [];
const cart = JSON.parse(localStorage.getItem('cart') || '[]');

const grid = document.getElementById('productGrid');
const cartList = document.getElementById('cartList');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const promoState = document.getElementById('promoState');
const customerCode = document.getElementById('customerCode');
const checkCodeBtn = document.getElementById('checkCode');
const clearCodeBtn = document.getElementById('clearCode');
const addressWrap = document.getElementById('addressWrap');
const addressInput = document.getElementById('customerAddress');
const brandFilters = document.getElementById('brandFilters');
const categoryFilters = document.getElementById('categoryFilters');
const resetFiltersBtn = document.getElementById('resetFilters');
const showAllProductsBtn = document.getElementById('showAllProducts');
const clearCartBtn = document.getElementById('clearCart');
const orderForm = document.getElementById('orderForm');
const orderCodeInfo = document.getElementById('orderCodeInfo');

let codeMode = null;
let codeChecked = false;
let codeValid = false;

let selectedBrand = 'all';
let selectedCategory = 'all';
let activeFilterType = 'none';
let selectedSort = 'default';
let currentImageIndex = {};

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function formatPrice(value) {
  return '₩' + Number(value || 0).toLocaleString('ko-KR');
}

function getTotal() {
  return cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
}

function parseMeta(name) {
  const parts = String(name || '').toLowerCase().split(/\s+/);
  return {
    brand: parts[0] || '',
    category: parts[1] || '',
    series: parts[2] || '',
    subseries: parts.slice(3).join(' ')
  };
}

function getEnhancedProducts() {
  return products.map(product => ({
    ...product,
    meta: parseMeta(product.name)
  }));
}

function getBrandLabel(name) {
  const first = String(name || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
  if (first.includes('franklin')) return 'franklin';
  return first;
}

function getVisibleProducts() {
  let list = getEnhancedProducts();

  if (activeFilterType === 'brand' && selectedBrand !== 'all') {
    list = list.filter(item => getBrandLabel(item.name) === selectedBrand);
  }

  if (activeFilterType === 'category' && selectedCategory !== 'all') {
    list = list.filter(item => item.meta.category === selectedCategory);
  }

  if (selectedSort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (selectedSort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

  return list;
}

function uniqueValues(key) {
  return [...new Set(getEnhancedProducts().map(item => item.meta[key]).filter(Boolean))].sort();
}

function renderFilterButtons(container, values, allLabel) {
  if (!container) return;
  container.innerHTML = [
    `<button type="button" class="filter-btn is-active" data-value="all">${allLabel}</button>`,
    ...values.map(value => `<button type="button" class="filter-btn" data-value="${value}">${value}</button>`)
  ].join('');
}

function updateFilterButtons() {
  brandFilters?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', activeFilterType === 'brand' && btn.dataset.value === selectedBrand);
  });
  categoryFilters?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', activeFilterType === 'category' && btn.dataset.value === selectedCategory);
  });
}

function updateModeButtons() {
  checkCodeBtn?.classList.toggle('is-active', codeMode === 'code');
  clearCodeBtn?.classList.toggle('is-active', codeMode === 'none');
}

function setPromoState(type, message) {
  if (!promoState) return;
  promoState.textContent = message || '';
  promoState.style.display = type ? 'block' : 'none';
  promoState.classList.remove('is-code', 'is-none');
  if (type) promoState.classList.add(type === 'code' ? 'is-code' : 'is-none');
}

function requireMode() {
  if (codeMode) return true;
  setPromoState(null, '');
  alert('코드 모드를 먼저 선택해 주세요.');
  return false;
}

function validateCode() {
  const value = customerCode?.value.trim().toUpperCase() || '';
  if (!value) {
    codeChecked = false;
    codeValid = false;
    setPromoState(null, '');
    renderOrderInfo();
    return;
  }

  codeChecked = true;
  codeValid = CART_CODES.includes(value);
  setPromoState(codeValid ? 'code' : 'none', codeValid ? '코드 확인 완료' : '코드를 다시 확인해 주세요');
  renderOrderInfo();
}

function renderBadges(item) {
  const badges = [];
  if (item.featured) badges.push(`<span class="badge badge-featured">코트원 추천</span>`);
  if (item.special) badges.push(`<span class="badge badge-special">코드 할인</span>`);
  return badges.length ? `<div class="badge-row">${badges.join('')}</div>` : '';
}

function getDisplayImage(product) {
  const list = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
  const index = currentImageIndex[product.id] || 0;
  return list[index % list.length];
}

function hasMultipleImages(product) {
  return Array.isArray(product.images) && product.images.length > 1;
}

function nextProductImage(productId) {
  const product = products.find(item => item.id === productId);
  if (!product || !Array.isArray(product.images) || product.images.length < 2) return;
  currentImageIndex[productId] = ((currentImageIndex[productId] || 0) + 1) % product.images.length;
  const img = grid?.querySelector(`[data-product-id="${productId}"]`);
  if (img) img.src = product.images[currentImageIndex[productId]];
}

function renderVisibleProducts(list) {
  if (!grid) return;
  const target = Array.isArray(list) && list.length ? list : products;
  grid.innerHTML = target.map(product => `
    <article class="product-card ${product.featured ? 'is-featured' : ''} ${product.special ? 'is-special' : ''}">
      <div class="product-media">
        <img class="product-image" data-product-id="${product.id}" src="${getDisplayImage(product)}" alt="${product.name}">
        ${hasMultipleImages(product) ? `<button type="button" class="img-switch-btn" data-switch="${product.id}">이미지 변경</button>` : ''}
      </div>
      <div class="product-body">
        <div class="productname">${product.name}</div>
        <div class="product-meta-row">
          <div class="price-main">${formatPrice(product.price)}</div>
          ${renderBadges(product)}
        </div>
        <button class="add-btn" data-id="${product.id}">담기</button>
      </div>
    </article>
  `).join('');
}
function renderProducts() {
  renderVisibleProducts(getVisibleProducts());
}

function renderCart() {
  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = '<p class="page-subtitle">장바구니가 비어 있습니다.</p>';
  } else {
    cartList.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div>
          <div class="name">${item.name}</div>
          ${renderBadges(item)}
          <div class="meta">${item.id} · ${formatPrice(item.price)}</div>
        </div>
        <div class="meta">${formatPrice(item.price)}</div>
        <div class="qty-wrap">
          <button class="qty-btn" data-dec="${item.id}">-</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" data-inc="${item.id}">+</button>
        </div>
        <div class="meta">${formatPrice(item.price * item.qty)}</div>
        <button class="remove-btn" data-remove="${item.id}">삭제</button>
      </div>
    `).join('');
  }

  if (cartTotal) cartTotal.textContent = formatPrice(getTotal());
  if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  saveCart();
}

function addItem(id) {
  if (!requireMode()) return;
  const product = products.find(item => item.id === id);
  if (!product) return;

  const found = cart.find(item => item.id === id);
  if (found) found.qty += 1;
  else {
    cart.push({
      id: product.id,
      name: product.name,
      qty: 1,
      price: product.price,
      image: product.image,
      images: product.images,
      featured: product.featured,
      special: product.special
    });
  }

  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    const index = cart.findIndex(x => x.id === id);
    if (index > -1) cart.splice(index, 1);
  }

  renderCart();
}

function renderOrderInfo() {
  if (!orderCodeInfo) return;
  if (!codeChecked) orderCodeInfo.textContent = '코드 상태 미선택';
  else if (codeValid) orderCodeInfo.textContent = `코드번호: ${customerCode.value.trim().toUpperCase()}`;
  else orderCodeInfo.textContent = `코드번호: ${customerCode.value.trim().toUpperCase()} / 확인 실패`;
}

function syncAddressUI() {
  const type = document.querySelector('input[name="deliveryType"]:checked')?.value;
  if (!addressWrap) return;

  if (type === 'delivery') {
    addressWrap.classList.remove('is-hidden');
    if (addressInput) addressInput.required = true;
  } else {
    addressWrap.classList.add('is-hidden');
    if (addressInput) {
      addressInput.required = false;
      addressInput.value = '';
    }
  }
}

function applyFilters() {
  renderVisibleProducts(getVisibleProducts());
  updateFilterButtons();
}

function showAllProducts() {
  selectedBrand = 'all';
  selectedCategory = 'all';
  activeFilterType = 'none';
  selectedSort = 'default';
  const defaultSort = document.querySelector('input[name="sortType"][value="default"]');
  if (defaultSort) defaultSort.checked = true;
  updateFilterButtons();
  renderVisibleProducts(products);
}

function initFilters() {
  renderFilterButtons(brandFilters, uniqueValues('brand'), '전체');
  renderFilterButtons(categoryFilters, uniqueValues('category'), '전체');
  updateFilterButtons();
}

function resetOrderState() {
  cart.length = 0;
  localStorage.removeItem('cart');

  if (customerCode) customerCode.value = '';
  codeMode = null;
  codeChecked = false;
  codeValid = false;
  updateModeButtons();
  setPromoState(null, '');
  renderOrderInfo();

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const memoInput = document.getElementById('customerMemo');

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (memoInput) memoInput.value = '';

  const pickupRadio = document.querySelector('input[name="deliveryType"][value="pickup"]');
  if (pickupRadio) pickupRadio.checked = true;

  syncAddressUI();
  renderCart();
}

function initSplash() {
  const splash = document.getElementById('splashScreen');
  const logo = document.getElementById('splashLogo');
  const emblem = document.getElementById('splashEmblem');
  if (!splash || !logo || !emblem) return;

  emblem.classList.add('is-hidden');

  setTimeout(() => {
    logo.classList.add('fade-out');
    emblem.classList.remove('is-hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        emblem.classList.add('fade-in');
      });
    });
  }, 2200);

  setTimeout(() => {
    splash.classList.add('hide');
    document.body.classList.add('ready');
  }, 4200);
}

checkCodeBtn?.addEventListener('click', () => {
  codeMode = 'code';
  updateModeButtons();
  validateCode();
});

clearCodeBtn?.addEventListener('click', () => {
  codeMode = 'none';
  codeChecked = false;
  codeValid = false;
  if (customerCode) customerCode.value = '';
  updateModeButtons();
  setPromoState('none', '코드 없음');
  renderOrderInfo();
});

customerCode?.addEventListener('input', () => {
  if (codeMode !== 'code') return;
  const value = customerCode.value.trim();
  if (!value) {
    codeChecked = false;
    codeValid = false;
    setPromoState(null, '');
    renderOrderInfo();
    return;
  }
  validateCode();
});

document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
  radio.addEventListener('change', syncAddressUI);
});

document.querySelectorAll('input[name="sortType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedSort = radio.value;
    applyFilters();
  });
});

brandFilters?.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;
  selectedBrand = button.dataset.value;
  selectedCategory = 'all';
  activeFilterType = selectedBrand === 'all' ? 'none' : 'brand';
  updateFilterButtons();
  applyFilters();
});

categoryFilters?.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;
  selectedCategory = button.dataset.value;
  selectedBrand = 'all';
  activeFilterType = selectedCategory === 'all' ? 'none' : 'category';
  updateFilterButtons();
  applyFilters();
});

showAllProductsBtn?.addEventListener('click', showAllProducts);
resetFiltersBtn?.addEventListener('click', showAllProducts);

grid?.addEventListener('click', event => {
  const switchBtn = event.target.closest('[data-switch]');
  if (switchBtn) {
    nextProductImage(switchBtn.dataset.switch);
    return;
  }

  const button = event.target.closest('.add-btn');
  if (button) addItem(button.dataset.id);
});

cartList?.addEventListener('click', event => {
  const incBtn = event.target.closest('[data-inc]');
  const decBtn = event.target.closest('[data-dec]');
  const removeBtn = event.target.closest('[data-remove]');

  if (incBtn) return changeQty(incBtn.dataset.inc, 1);
  if (decBtn) return changeQty(decBtn.dataset.dec, -1);

  if (removeBtn) {
    const index = cart.findIndex(item => item.id === removeBtn.dataset.remove);
    if (index > -1) cart.splice(index, 1);
    renderCart();
  }
});

clearCartBtn?.addEventListener('click', () => {
  cart.length = 0;
  localStorage.removeItem('cart');
  renderCart();
});

orderForm?.addEventListener('submit', event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert('장바구니가 비어 있습니다.');
    return;
  }

  if (codeMode === null) {
    alert('코드 모드를 먼저 선택해 주세요.');
    return;
  }

  if (codeMode === 'code' && !codeValid) {
    alert('코드를 확인해 주세요.');
    return;
  }

  const name = document.getElementById('customerName')?.value.trim();
  const phone = document.getElementById('customerPhone')?.value.trim();
  const memo = document.getElementById('customerMemo')?.value.trim();
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'pickup';
  const address = deliveryType === 'delivery' ? (addressInput?.value.trim() || '') : '';

  if (!name || !phone) {
    alert('이름과 연락처를 입력해 주세요.');
    return;
  }

  if (deliveryType === 'delivery' && !address) {
    alert('주소를 입력해 주세요.');
    return;
  }

  alert('입력하신 번호로 견적서가 발송 됩니다');

  const lines = [
    `이름: ${name}`,
    `연락처: ${phone}`,
    `배송방식: ${deliveryType === 'pickup' ? '직접 수령' : '택배 배송'}`,
    address ? `주소: ${address}` : '',
    codeMode ? `코드모드: ${codeMode}` : '',
    codeChecked ? `코드번호: ${customerCode.value.trim().toUpperCase()}` : '',
    '',
    '주문상품:'
  ];

  cart.forEach(item => {
    lines.push(`- ${item.name} (${item.id}) x ${item.qty} / ${formatPrice(item.price * item.qty)}`);
  });

  lines.push('');
  lines.push(`합계: ${formatPrice(getTotal())}`);

  if (memo) {
    lines.push('');
    lines.push(`메모: ${memo}`);
  }

  const subject = encodeURIComponent(`${name} ${formatPrice(getTotal())}`);
  const body = encodeURIComponent(lines.filter(Boolean).join('\n'));
  window.location.href = `mailto:disnis3@gmail.com?subject=${subject}&body=${body}`;

  setTimeout(() => {
    resetOrderState();
  }, 200);
});

initFilters();
renderProducts();
renderCart();
syncAddressUI();
updateModeButtons();
renderOrderInfo();

const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS.filter(p => p && p.active) : [];
const CART_CODES = Array.isArray(window.CART_CODES) ? window.CART_CODES : [];
const cart = JSON.parse(localStorage.getItem('cart') || '[]');

const grid = document.getElementById('productGrid');
const cartList = document.getElementById('cartList');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const promoState = document.getElementById('promoState');
const customerCode = document.getElementById('customerCode');
const checkCodeBtn = document.getElementById('checkCode');
const clearCodeBtn = document.getElementById('clearCode');
const addressWrap = document.getElementById('addressWrap');
const addressInput = document.getElementById('customerAddress');
const brandFilters = document.getElementById('brandFilters');
const categoryFilters = document.getElementById('categoryFilters');
const resetFiltersBtn = document.getElementById('resetFilters');
const showAllProductsBtn = document.getElementById('showAllProducts');
const clearCartBtn = document.getElementById('clearCart');
const orderForm = document.getElementById('orderForm');
const orderCodeInfo = document.getElementById('orderCodeInfo');

let codeMode = null;
let codeChecked = false;
let codeValid = false;

let selectedBrand = 'all';
let selectedCategory = 'all';
let activeFilterType = 'none';
let selectedSort = 'default';
let currentImageIndex = {};

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function formatPrice(value) {
  return '₩' + Number(value || 0).toLocaleString('ko-KR');
}

function getTotal() {
  return cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
}

function parseMeta(name) {
  const parts = String(name || '').toLowerCase().split(/\s+/);
  return {
    brand: parts[0] || '',
    category: parts[1] || '',
    series: parts[2] || '',
    subseries: parts.slice(3).join(' ')
  };
}

function getEnhancedProducts() {
  return products.map(product => ({
    ...product,
    meta: parseMeta(product.name)
  }));
}

function getBrandLabel(name) {
  const first = String(name || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
  if (first.includes('franklin')) return 'franklin';
  return first;
}

function getVisibleProducts() {
  let list = getEnhancedProducts();

  if (activeFilterType === 'brand' && selectedBrand !== 'all') {
    list = list.filter(item => getBrandLabel(item.name) === selectedBrand);
  }

  if (activeFilterType === 'category' && selectedCategory !== 'all') {
    list = list.filter(item => item.meta.category === selectedCategory);
  }

  if (selectedSort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (selectedSort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

  return list;
}

function uniqueValues(key) {
  return [...new Set(getEnhancedProducts().map(item => item.meta[key]).filter(Boolean))].sort();
}

function renderFilterButtons(container, values, allLabel) {
  if (!container) return;
  container.innerHTML = [
    `<button type="button" class="filter-btn is-active" data-value="all">${allLabel}</button>`,
    ...values.map(value => `<button type="button" class="filter-btn" data-value="${value}">${value}</button>`)
  ].join('');
}

function updateFilterButtons() {
  brandFilters?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', activeFilterType === 'brand' && btn.dataset.value === selectedBrand);
  });
  categoryFilters?.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', activeFilterType === 'category' && btn.dataset.value === selectedCategory);
  });
}

function updateModeButtons() {
  checkCodeBtn?.classList.toggle('is-active', codeMode === 'code');
  clearCodeBtn?.classList.toggle('is-active', codeMode === 'none');
}

function setPromoState(type, message) {
  if (!promoState) return;
  promoState.textContent = message || '';
  promoState.style.display = type ? 'block' : 'none';
  promoState.classList.remove('is-code', 'is-none');
  if (type) promoState.classList.add(type === 'code' ? 'is-code' : 'is-none');
}

function requireMode() {
  if (codeMode) return true;
  setPromoState(null, '');
  alert('코드 모드를 먼저 선택해 주세요.');
  return false;
}

function validateCode() {
  const value = customerCode?.value.trim().toUpperCase() || '';
  if (!value) {
    codeChecked = false;
    codeValid = false;
    setPromoState(null, '');
    renderOrderInfo();
    return;
  }

  codeChecked = true;
  codeValid = CART_CODES.includes(value);
  setPromoState(codeValid ? 'code' : 'none', codeValid ? '코드 확인 완료' : '코드를 다시 확인해 주세요');
  renderOrderInfo();
}

function renderBadges(item) {
  const badges = [];
  if (item.featured) badges.push(`<span class="badge badge-featured">코트원 추천</span>`);
  if (item.special) badges.push(`<span class="badge badge-special">코드 할인</span>`);
  return badges.length ? `<div class="badge-row">${badges.join('')}</div>` : '';
}

function getDisplayImage(product) {
  const list = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
  const index = currentImageIndex[product.id] || 0;
  return list[index % list.length];
}

function hasMultipleImages(product) {
  return Array.isArray(product.images) && product.images.length > 1;
}

function nextProductImage(productId) {
  const product = products.find(item => item.id === productId);
  if (!product || !Array.isArray(product.images) || product.images.length < 2) return;
  currentImageIndex[productId] = ((currentImageIndex[productId] || 0) + 1) % product.images.length;
  const img = grid?.querySelector(`[data-product-id="${productId}"]`);
  if (img) img.src = product.images[currentImageIndex[productId]];
}

function renderVisibleProducts(list) {
  if (!grid) return;
  const target = Array.isArray(list) && list.length ? list : products;
  grid.innerHTML = target.map(product => `
    <article class="product-card ${product.featured ? 'is-featured' : ''} ${product.special ? 'is-special' : ''}">
      <div class="product-media">
        <img class="product-image" data-product-id="${product.id}" src="${getDisplayImage(product)}" alt="${product.name}">
        ${hasMultipleImages(product) ? `<button type="button" class="img-switch-btn" data-switch="${product.id}">이미지 변경</button>` : ''}
      </div>
      <div class="product-body">
        <div class="product-name">${product.name}</div>
        <div class="product-meta-row">
          <div class="price-main">${formatPrice(product.price)}</div>
          ${renderBadges(product)}
        </div>
        <button class="add-btn" data-id="${product.id}">담기</button>
      </div>
    </article>
  `).join('');
}

function renderProducts() {
  renderVisibleProducts(getVisibleProducts());
}

function renderCart() {
  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = '<p class="page-subtitle">장바구니가 비어 있습니다.</p>';
  } else {
    cartList.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div>
          <div class="name">${item.name}</div>
          ${renderBadges(item)}
          <div class="meta">${item.id} · ${formatPrice(item.price)}</div>
        </div>
        <div class="meta">${formatPrice(item.price)}</div>
        <div class="qty-wrap">
          <button class="qty-btn" data-dec="${item.id}">-</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" data-inc="${item.id}">+</button>
        </div>
        <div class="meta">${formatPrice(item.price * item.qty)}</div>
        <button class="remove-btn" data-remove="${item.id}">삭제</button>
      </div>
    `).join('');
  }

  if (cartTotal) cartTotal.textContent = formatPrice(getTotal());
  if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  saveCart();
}

function addItem(id) {
  if (!requireMode()) return;
  const product = products.find(item => item.id === id);
  if (!product) return;

  const found = cart.find(item => item.id === id);
  if (found) found.qty += 1;
  else {
    cart.push({
      id: product.id,
      name: product.name,
      qty: 1,
      price: product.price,
      image: product.image,
      images: product.images,
      featured: product.featured,
      special: product.special
    });
  }

  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    const index = cart.findIndex(x => x.id === id);
    if (index > -1) cart.splice(index, 1);
  }

  renderCart();
}

function renderOrderInfo() {
  if (!orderCodeInfo) return;
  if (!codeChecked) orderCodeInfo.textContent = '코드 상태 미선택';
  else if (codeValid) orderCodeInfo.textContent = `코드번호: ${customerCode.value.trim().toUpperCase()}`;
  else orderCodeInfo.textContent = `코드번호: ${customerCode.value.trim().toUpperCase()} / 확인 실패`;
}

function syncAddressUI() {
  const type = document.querySelector('input[name="deliveryType"]:checked')?.value;
  if (!addressWrap) return;

  if (type === 'delivery') {
    addressWrap.classList.remove('is-hidden');
    if (addressInput) addressInput.required = true;
  } else {
    addressWrap.classList.add('is-hidden');
    if (addressInput) {
      addressInput.required = false;
      addressInput.value = '';
    }
  }
}

function applyFilters() {
  renderVisibleProducts(getVisibleProducts());
  updateFilterButtons();
}

function showAllProducts() {
  selectedBrand = 'all';
  selectedCategory = 'all';
  activeFilterType = 'none';
  selectedSort = 'default';
  const defaultSort = document.querySelector('input[name="sortType"][value="default"]');
  if (defaultSort) defaultSort.checked = true;
  updateFilterButtons();
  renderVisibleProducts(products);
}

function initFilters() {
  renderFilterButtons(brandFilters, uniqueValues('brand'), '전체');
  renderFilterButtons(categoryFilters, uniqueValues('category'), '전체');
  updateFilterButtons();
}

function resetOrderState() {
  cart.length = 0;
  localStorage.removeItem('cart');

  if (customerCode) customerCode.value = '';
  codeMode = null;
  codeChecked = false;
  codeValid = false;
  updateModeButtons();
  setPromoState(null, '');
  renderOrderInfo();

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const memoInput = document.getElementById('customerMemo');

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (memoInput) memoInput.value = '';

  const pickupRadio = document.querySelector('input[name="deliveryType"][value="pickup"]');
  if (pickupRadio) pickupRadio.checked = true;

  syncAddressUI();
  renderCart();
}

function initSplash() {
  const splash = document.getElementById('splashScreen');
  const logo = document.getElementById('splashLogo');
  const emblem = document.getElementById('splashEmblem');
  if (!splash || !logo || !emblem) return;

  emblem.classList.add('is-hidden');

  setTimeout(() => {
    logo.classList.add('fade-out');
    emblem.classList.remove('is-hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        emblem.classList.add('fade-in');
      });
    });
  }, 2200);

  setTimeout(() => {
    splash.classList.add('hide');
    document.body.classList.add('ready');
  }, 4200);
}

checkCodeBtn?.addEventListener('click', () => {
  codeMode = 'code';
  updateModeButtons();
  validateCode();
});

clearCodeBtn?.addEventListener('click', () => {
  codeMode = 'none';
  codeChecked = false;
  codeValid = false;
  if (customerCode) customerCode.value = '';
  updateModeButtons();
  setPromoState('none', '코드 없음');
  renderOrderInfo();
});

customerCode?.addEventListener('input', () => {
  if (codeMode !== 'code') return;
  const value = customerCode.value.trim();
  if (!value) {
    codeChecked = false;
    codeValid = false;
    setPromoState(null, '');
    renderOrderInfo();
    return;
  }
  validateCode();
});

document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
  radio.addEventListener('change', syncAddressUI);
});

document.querySelectorAll('input[name="sortType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedSort = radio.value;
    applyFilters();
  });
});

brandFilters?.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;
  selectedBrand = button.dataset.value;
  selectedCategory = 'all';
  activeFilterType = selectedBrand === 'all' ? 'none' : 'brand';
  updateFilterButtons();
  applyFilters();
});

categoryFilters?.addEventListener('click', event => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;
  selectedCategory = button.dataset.value;
  selectedBrand = 'all';
  activeFilterType = selectedCategory === 'all' ? 'none' : 'category';
  updateFilterButtons();
  applyFilters();
});

showAllProductsBtn?.addEventListener('click', showAllProducts);
resetFiltersBtn?.addEventListener('click', showAllProducts);

grid?.addEventListener('click', event => {
  const switchBtn = event.target.closest('[data-switch]');
  if (switchBtn) {
    nextProductImage(switchBtn.dataset.switch);
    return;
  }

  const button = event.target.closest('.add-btn');
  if (button) addItem(button.dataset.id);
});

cartList?.addEventListener('click', event => {
  const incBtn = event.target.closest('[data-inc]');
  const decBtn = event.target.closest('[data-dec]');
  const removeBtn = event.target.closest('[data-remove]');

  if (incBtn) return changeQty(incBtn.dataset.inc, 1);
  if (decBtn) return changeQty(decBtn.dataset.dec, -1);

  if (removeBtn) {
    const index = cart.findIndex(item => item.id === removeBtn.dataset.remove);
    if (index > -1) cart.splice(index, 1);
    renderCart();
  }
});

clearCartBtn?.addEventListener('click', () => {
  cart.length = 0;
  localStorage.removeItem('cart');
  renderCart();
});

orderForm?.addEventListener('submit', event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert('장바구니가 비어 있습니다.');
    return;
  }

  if (codeMode === null) {
    alert('코드 모드를 먼저 선택해 주세요.');
    return;
  }

  if (codeMode === 'code' && !codeValid) {
    alert('코드를 확인해 주세요.');
    return;
  }

  const name = document.getElementById('customerName')?.value.trim();
  const phone = document.getElementById('customerPhone')?.value.trim();
  const memo = document.getElementById('customerMemo')?.value.trim();
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'pickup';
  const address = deliveryType === 'delivery' ? (addressInput?.value.trim() || '') : '';

  if (!name || !phone) {
    alert('이름과 연락처를 입력해 주세요.');
    return;
  }

  if (deliveryType === 'delivery' && !address) {
    alert('주소를 입력해 주세요.');
    return;
  }

  alert('입력하신 번호로 견적서가 발송 됩니다');

  const lines = [
    `이름: ${name}`,
    `연락처: ${phone}`,
    `배송방식: ${deliveryType === 'pickup' ? '직접 수령' : '택배 배송'}`,
    address ? `주소: ${address}` : '',
    codeMode ? `코드모드: ${codeMode}` : '',
    codeChecked ? `코드번호: ${customerCode.value.trim().toUpperCase()}` : '',
    '',
    '주문상품:'
  ];

  cart.forEach(item => {
    lines.push(`- ${item.name} (${item.id}) x ${item.qty} / ${formatPrice(item.price * item.qty)}`);
  });

  lines.push('');
  lines.push(`합계: ${formatPrice(getTotal())}`);

  if (memo) {
    lines.push('');
    lines.push(`메모: ${memo}`);
  }

  const subject = encodeURIComponent(`${name} ${formatPrice(getTotal())}`);
  const body = encodeURIComponent(lines.filter(Boolean).join('\n'));
  window.location.href = `mailto:disnis3@gmail.com?subject=${subject}&body=${body}`;

  setTimeout(() => {
    resetOrderState();
  }, 200);
});

initFilters();
renderProducts();
renderCart();
syncAddressUI();
updateModeButtons();
renderOrderInfo();
initSplash();