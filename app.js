// ---- État du panier (sauvegardé sur l'appareil du client) ----
// Pour les produits vendus au kg (Fruits, Légumes) : cart[id] = { weightKg: 0.5 }
// Pour les autres produits (vendus à l'unité) : cart[id] = { qty: 2 }
let cart = JSON.parse(localStorage.getItem("cocci_cart") || "{}");
let activeCategory = CATEGORIES[0].id;

const WEIGHT_OPTIONS = [
  { label: "250 g", value: 0.25 },
  { label: "500 g", value: 0.5 },
  { label: "1 kg", value: 1 },
  { label: "1,5 kg", value: 1.5 },
  { label: "2 kg", value: 2 },
];

function isWeighted(product) {
  return product.unit === "kg";
}

function saveCart() {
  localStorage.setItem("cocci_cart", JSON.stringify(cart));
  renderCartBadge();
}

function formatPrice(cents) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// ---- Onglets des rayons ----
function renderCategoryTabs() {
  const tabsContainer = document.getElementById("categoryTabs");
  tabsContainer.innerHTML = CATEGORIES.map(cat => `
    <button
      class="category-tab ${cat.id === activeCategory ? 'active' : ''}"
      onclick="selectCategory('${cat.id}')"
    >
      ${cat.emoji} ${cat.name}
    </button>
  `).join("");
}

function selectCategory(categoryId) {
  activeCategory = categoryId;
  renderCategoryTabs();
  renderProducts();
  document.getElementById("productList").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Affichage du catalogue (filtré par rayon actif) ----
function renderProducts() {
  const list = document.getElementById("productList");
  const productsInCategory = PRODUCTS.filter(p => p.category === activeCategory);
  const category = CATEGORIES.find(c => c.id === activeCategory);

  list.innerHTML = `<h2 class="category-title">${category.emoji} ${category.name}</h2>`;

  productsInCategory.forEach(p => {
    const row = document.createElement("div");
    row.className = "product";

    if (isWeighted(p)) {
      row.appendChild(renderWeightedProduct(p));
    } else {
      row.appendChild(renderUnitProduct(p));
    }

    list.appendChild(row);
  });
}

function renderUnitProduct(p) {
  const wrapper = document.createElement("div");
  wrapper.className = "product-inner";
  const entry = cart[p.id];
  const qty = entry ? entry.qty : 0;

  wrapper.innerHTML = `
    <div class="emoji">${p.emoji}</div>
    <div class="info">
      <div class="name">${p.name}</div>
      <div class="price">${formatPrice(p.priceCents)} / ${p.unit}</div>
    </div>
    <div class="qty-controls">
      ${qty === 0
        ? `<button class="add-btn" onclick="changeUnitQty('${p.id}', 1)">Ajouter</button>`
        : `
          <button onclick="changeUnitQty('${p.id}', -1)">−</button>
          <span>${qty}</span>
          <button onclick="changeUnitQty('${p.id}', 1)">+</button>
        `
      }
    </div>
  `;
  return wrapper;
}

function renderWeightedProduct(p) {
  const wrapper = document.createElement("div");
  wrapper.className = "product-inner";
  const entry = cart[p.id];
  const currentWeight = entry ? entry.weightKg : null;

  const options = WEIGHT_OPTIONS.map(opt =>
    `<option value="${opt.value}" ${currentWeight === opt.value ? "selected" : ""}>${opt.label}</option>`
  ).join("");

  wrapper.innerHTML = `
    <div class="emoji">${p.emoji}</div>
    <div class="info">
      <div class="name">${p.name}</div>
      <div class="price">${formatPrice(p.priceCents)} / ${p.unit}</div>
    </div>
    <div class="qty-controls weight-controls">
      <select onchange="setWeight('${p.id}', this.value)">
        <option value="" ${currentWeight ? "" : "selected"} disabled>Poids</option>
        ${options}
      </select>
      ${currentWeight
        ? `<button class="remove-btn" onclick="removeFromCart('${p.id}')">✕</button>`
        : ""
      }
    </div>
  `;
  return wrapper;
}

function setWeight(id, value) {
  const weightKg = parseFloat(value);
  if (!weightKg) return;
  cart[id] = { weightKg };
  saveCart();
  renderProducts();
  renderCartItems();
}

function changeUnitQty(id, delta) {
  const current = cart[id] ? cart[id].qty : 0;
  const next = current + delta;
  if (next <= 0) {
    delete cart[id];
  } else {
    cart[id] = { qty: next };
  }
  saveCart();
  renderProducts();
  renderCartItems();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderProducts();
  renderCartItems();
}

function renderCartBadge() {
  const count = Object.keys(cart).length;
  document.getElementById("cartCount").textContent = count;
}

function lineTotalCents(product, entry) {
  if (isWeighted(product)) {
    return Math.round(product.priceCents * entry.weightKg);
  }
  return product.priceCents * entry.qty;
}

function cartTotalCents() {
  return Object.entries(cart).reduce((sum, [id, entry]) => {
    const product = PRODUCTS.find(p => p.id === id);
    return sum + (product ? lineTotalCents(product, entry) : 0);
  }, 0);
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const entries = Object.entries(cart);
  if (entries.length === 0) {
    container.innerHTML = "<p>Votre panier est vide.</p>";
  } else {
    container.innerHTML = entries.map(([id, entry]) => {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return "";
      const label = isWeighted(product)
        ? `${product.emoji} ${product.name} — ${entry.weightKg} kg`
        : `${product.emoji} ${product.name} × ${entry.qty}`;
      return `
        <div class="cart-row">
          <span>${label}</span>
          <span>${formatPrice(lineTotalCents(product, entry))}</span>
        </div>
      `;
    }).join("");
  }
  document.getElementById("cartTotal").textContent =
    "Total : " + formatPrice(cartTotalCents());
}

function openCart() {
  renderCartItems();
  document.getElementById("cartPanel").classList.add("open");
}

function closeCart() {
  document.getElementById("cartPanel").classList.remove("open");
}

function startCheckout() {
  if (cartTotalCents() === 0) {
    alert("Votre panier est vide.");
    return;
  }
  goToCheckout(cart, cartTotalCents());
}

// Premier affichage
renderCategoryTabs();
renderProducts();
renderCartBadge();
