// ---- État du panier (sauvegardé sur l'appareil du client) ----
let cart = JSON.parse(localStorage.getItem("cocci_cart") || "{}");

function saveCart() {
  localStorage.setItem("cocci_cart", JSON.stringify(cart));
  renderCartBadge();
}

function formatPrice(cents) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// ---- Affichage du catalogue ----
function renderProducts() {
  const list = document.getElementById("productList");
  list.innerHTML = "";
  PRODUCTS.forEach(p => {
    const qty = cart[p.id] || 0;
    const row = document.createElement("div");
    row.className = "product";
    row.innerHTML = `
      <div class="emoji">${p.emoji}</div>
      <div class="info">
        <div class="name">${p.name}</div>
        <div class="price">${formatPrice(p.priceCents)} / ${p.unit}</div>
      </div>
      <div class="qty-controls">
        ${qty === 0
          ? `<button class="add-btn" onclick="changeQty('${p.id}', 1)">Ajouter</button>`
          : `
            <button onclick="changeQty('${p.id}', -1)">−</button>
            <span>${qty}</span>
            <button onclick="changeQty('${p.id}', 1)">+</button>
          `
        }
      </div>
    `;
    list.appendChild(row);
  });
}

function changeQty(id, delta) {
  const current = cart[id] || 0;
  const next = current + delta;
  if (next <= 0) {
    delete cart[id];
  } else {
    cart[id] = next;
  }
  saveCart();
  renderProducts();
  renderCartItems();
}

function renderCartBadge() {
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  document.getElementById("cartCount").textContent = count;
}

function cartTotalCents() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    return sum + (product ? product.priceCents * qty : 0);
  }, 0);
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const entries = Object.entries(cart);
  if (entries.length === 0) {
    container.innerHTML = "<p>Votre panier est vide.</p>";
  } else {
    container.innerHTML = entries.map(([id, qty]) => {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return "";
      return `
        <div class="cart-row">
          <span>${product.emoji} ${product.name} × ${qty}</span>
          <span>${formatPrice(product.priceCents * qty)}</span>
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
renderProducts();
renderCartBadge();
