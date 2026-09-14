// ---- État du panier (sauvegardé sur l'appareil du client) ----
// Pour les produits vendus au kg (Fruits, Légumes) : cart[id] = { weightKg: 0.5 }
// Pour les autres produits (vendus à l'unité) : cart[id] = { qty: 2 }
let cart = JSON.parse(localStorage.getItem("cocci_cart") || "{}");
let activeCategory = null;
let orderType = "retrait"; // "retrait" (drive) ou "livraison"

function setOrderType(type) {
  orderType = type;
}

// ---- Chargement du catalogue (Firestore en priorité, sinon version locale) ----
async function loadCatalog() {
  try {
    const catSnapshot = await db.collection("categories").orderBy("order").get();
    const prodSnapshot = await db.collection("products").get();

    if (!catSnapshot.empty && !prodSnapshot.empty) {
      CATEGORIES = catSnapshot.docs.map(doc => doc.data());
      PRODUCTS = prodSnapshot.docs.map(doc => doc.data()).filter(p => p.inStock !== false);
      window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK = prodSnapshot.docs.map(doc => doc.data());
    } else {
      window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK = PRODUCTS;
    }
  } catch (err) {
    console.error("Catalogue Firestore indisponible, utilisation de la version locale.", err);
    window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK = PRODUCTS;
  }

  // Ajoute l'onglet Promotions s'il y a au moins un produit en promo
  const hasPromo = window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK.some(p => p.isPromo);
  if (hasPromo && !CATEGORIES.some(c => c.id === "promotions")) {
    CATEGORIES = [{ id: "promotions", name: "Promotions", emoji: "🔥" }, ...CATEGORIES];
  }

  activeCategory = CATEGORIES[0].id;
  renderCategoryTabs();
  renderProducts();
}

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
  const category = CATEGORIES.find(c => c.id === activeCategory);

  const source = window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK || PRODUCTS;
  const productsInCategory = activeCategory === "promotions"
    ? source.filter(p => p.isPromo)
    : source.filter(p => p.category === activeCategory);

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
  const outOfStock = p.inStock === false;

  wrapper.innerHTML = `
    <div class="emoji">${p.emoji}</div>
    <div class="info">
      <div class="name">${p.name}${p.isPromo ? " 🔥" : ""}</div>
      <div class="price">${formatPrice(p.priceCents)} / ${p.unit}</div>
      ${outOfStock ? '<div class="price" style="color:#d33;">Rupture de stock</div>' : ""}
    </div>
    <div class="qty-controls">
      ${outOfStock
        ? `<button class="add-btn" disabled style="opacity:0.4;">Indisponible</button>`
        : qty === 0
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
  const outOfStock = p.inStock === false;

  const options = WEIGHT_OPTIONS.map(opt =>
    `<option value="${opt.value}" ${currentWeight === opt.value ? "selected" : ""}>${opt.label}</option>`
  ).join("");

  wrapper.innerHTML = `
    <div class="emoji">${p.emoji}</div>
    <div class="info">
      <div class="name">${p.name}${p.isPromo ? " 🔥" : ""}</div>
      <div class="price">${formatPrice(p.priceCents)} / ${p.unit}</div>
      ${outOfStock ? '<div class="price" style="color:#d33;">Rupture de stock</div>' : ""}
    </div>
    <div class="qty-controls weight-controls">
      ${outOfStock
        ? `<button class="add-btn" disabled style="opacity:0.4;">Indisponible</button>`
        : `
          <select onchange="setWeight('${p.id}', this.value)">
            <option value="" ${currentWeight ? "" : "selected"} disabled>Poids</option>
            ${options}
          </select>
          ${currentWeight
            ? `<button class="remove-btn" onclick="removeFromCart('${p.id}')">✕</button>`
            : ""
          }
        `
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
          <span class="cart-row-right">
            ${formatPrice(lineTotalCents(product, entry))}
            <button class="cart-remove-btn" onclick="removeFromCart('${id}')">🗑️</button>
          </span>
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

async function startCheckout() {
  if (cartTotalCents() === 0) {
    alert("Votre panier est vide.");
    return;
  }

  let deliveryAddress = null;

  if (orderType === "livraison") {
    if (!auth.currentUser) {
      alert("Pour une livraison, connectez-vous ou créez un compte, puis renseignez votre adresse.");
      closeCart();
      openAccount();
      return;
    }
    deliveryAddress = await getSavedDeliveryAddress();
    if (!deliveryAddress || !deliveryAddress.address) {
      alert("Merci de renseigner votre adresse de livraison dans votre compte avant de payer.");
      closeCart();
      openAccount();
      return;
    }
  }

  goToCheckout(cart, cartTotalCents(), orderType, deliveryAddress);
}

// Premier affichage
loadCatalog();
renderCartBadge();
