// ---- Page admin : connexion + gestion complète ----

let liveProducts = [];
let liveCategories = [];
let activeAdminCategory = null;

// ---------- Connexion ----------
async function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errorBox = document.getElementById("loginError");
  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Merci de remplir l'e-mail et le mot de passe.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errorBox.textContent = "E-mail ou mot de passe incorrect.";
  }
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("accessDenied").style.display = "none";
    document.getElementById("mainTabs").style.display = "none";
    document.querySelectorAll(".admin-section").forEach(s => s.style.display = "none");
    return;
  }

  const adminDoc = await db.collection("admins").doc(user.uid).get();
  if (!adminDoc.exists) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("accessDenied").style.display = "block";
    document.getElementById("mainTabs").style.display = "none";
    return;
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("accessDenied").style.display = "none";
  document.getElementById("mainTabs").style.display = "flex";
  document.getElementById("section-products").style.display = "block";

  await loadLiveCategories();
  await loadLiveProducts();
});

// ---------- Onglets principaux ----------
function switchTab(tab) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("#mainTabs button").forEach(b => b.classList.remove("active"));

  document.getElementById("section-" + tab).classList.add("active");
  document.getElementById("tabBtn" + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add("active");

  if (tab === "orders") loadOrders();
}

// ---------- Import initial ----------
async function importInitialCatalog() {
  let batch = db.batch();
  let count = 0;

  for (const product of PRODUCTS) {
    const ref = db.collection("products").doc(product.id);
    batch.set(ref, { ...product, inStock: true, isPromo: false });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();

  let catBatch = db.batch();
  CATEGORIES.forEach((cat, index) => {
    const ref = db.collection("categories").doc(cat.id);
    catBatch.set(ref, { ...cat, order: index });
  });
  await catBatch.commit();

  alert("✅ Catalogue et rayons importés avec succès !");
  await loadLiveCategories();
  await loadLiveProducts();
}

// ---------- Rayons ----------
async function loadLiveCategories() {
  const snapshot = await db.collection("categories").orderBy("order").get();
  liveCategories = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

  renderCategoryManageList();
  renderAdminTabs();
  populateCategorySelect();
}

function renderCategoryManageList() {
  const list = document.getElementById("categoryList");
  if (liveCategories.length === 0) {
    list.innerHTML = "<p style='padding:16px;color:#888;'>Aucun rayon pour l'instant.</p>";
    return;
  }
  list.innerHTML = liveCategories.map(cat => `
    <div class="category-row">
      <div class="emoji">${cat.emoji}</div>
      <div class="name">${cat.name}</div>
      <button class="delete-btn" onclick="deleteCategory('${cat.docId}', '${cat.name.replace(/'/g, "\\'")}')">🗑️</button>
    </div>
  `).join("");
}

async function addCategory() {
  const name = document.getElementById("newCatName").value.trim();
  const emoji = document.getElementById("newCatEmoji").value.trim() || "🛒";

  if (!name) {
    alert("Merci de donner un nom au rayon.");
    return;
  }

  const id = name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  await db.collection("categories").doc(id).set({
    id, name, emoji, order: liveCategories.length,
  });

  document.getElementById("newCatName").value = "";
  document.getElementById("newCatEmoji").value = "";

  await loadLiveCategories();
}

async function deleteCategory(docId, name) {
  const hasProducts = liveProducts.some(p => p.category === docId);
  if (hasProducts) {
    if (!confirm(`Le rayon "${name}" contient encore des produits. Le supprimer quand même ? (les produits resteront mais n'apparaîtront plus dans aucun rayon visible)`)) {
      return;
    }
  } else {
    if (!confirm(`Supprimer le rayon "${name}" ?`)) return;
  }

  await db.collection("categories").doc(docId).delete();
  await loadLiveCategories();
  await loadLiveProducts();
}

function populateCategorySelect() {
  const select = document.getElementById("newProdCategory");
  select.innerHTML = liveCategories.map(cat =>
    `<option value="${cat.docId}">${cat.emoji} ${cat.name}</option>`
  ).join("");
}

// ---------- Produits ----------
async function loadLiveProducts() {
  const snapshot = await db.collection("products").get();

  if (snapshot.empty) {
    document.getElementById("importSection").style.display = "block";
    liveProducts = [];
  } else {
    document.getElementById("importSection").style.display = "none";
    liveProducts = snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }));
  }

  if (liveCategories.length > 0) {
    activeAdminCategory = activeAdminCategory || liveCategories[0].docId;
  }
  renderAdminTabs();
  renderAdminProducts();
}

function renderAdminTabs() {
  const tabsContainer = document.getElementById("categoryTabs");
  tabsContainer.innerHTML = liveCategories.map(cat => `
    <button
      class="category-tab ${cat.docId === activeAdminCategory ? 'active' : ''}"
      onclick="selectAdminCategory('${cat.docId}')"
    >
      ${cat.emoji} ${cat.name}
    </button>
  `).join("");
}

function selectAdminCategory(categoryId) {
  activeAdminCategory = categoryId;
  renderAdminTabs();
  renderAdminProducts();
}

function renderAdminProducts() {
  const list = document.getElementById("productList");
  const productsInCategory = liveProducts.filter(p => p.category === activeAdminCategory);

  if (productsInCategory.length === 0) {
    list.innerHTML = "<p style='padding:16px;color:#888;'>Aucun produit dans ce rayon.</p>";
    return;
  }

  list.innerHTML = productsInCategory.map(p => `
    <div class="product-row">
      <div class="product-row-top">
        <div class="emoji">${p.emoji}</div>
        <div class="info">
          <input class="name-input" value="${p.name}" onchange="saveField('${p.docId}', 'name', this.value)">
        </div>
        <span class="save-status" id="status-${p.docId}"></span>
        <button class="delete-btn" onclick="deleteProduct('${p.docId}', '${p.name.replace(/'/g, "\\'")}')">🗑️</button>
      </div>
      <div class="product-row-controls">
        <input
          type="number" step="0.01"
          value="${(p.priceCents / 100).toFixed(2)}"
          onchange="saveField('${p.docId}', 'priceCents', Math.round(parseFloat(this.value) * 100))"
        > €
        <select onchange="saveField('${p.docId}', 'unit', this.value)">
          ${["kg","L","unité","barquette","botte","sachet","douzaine"].map(u =>
            `<option value="${u}" ${p.unit === u ? "selected" : ""}>${u}</option>`
          ).join("")}
        </select>
        <label class="stock-toggle">
          <input type="checkbox" ${p.inStock !== false ? "checked" : ""}
            onchange="saveField('${p.docId}', 'inStock', this.checked)">
          En stock
        </label>
        <label class="promo-toggle">
          <input type="checkbox" ${p.isPromo ? "checked" : ""}
            onchange="saveField('${p.docId}', 'isPromo', this.checked)">
          Promo
        </label>
      </div>
    </div>
  `).join("");
}

async function saveField(docId, field, value) {
  const status = document.getElementById(`status-${docId}`);
  try {
    await db.collection("products").doc(docId).update({ [field]: value });
    const product = liveProducts.find(p => p.docId === docId);
    if (product) product[field] = value;
    if (status) {
      status.textContent = "✅";
      setTimeout(() => { status.textContent = ""; }, 2000);
    }
  } catch (err) {
    if (status) status.textContent = "❌";
    console.error(err);
  }
}

async function deleteProduct(docId, name) {
  if (!confirm(`Supprimer "${name}" définitivement ?`)) return;
  await db.collection("products").doc(docId).delete();
  await loadLiveProducts();
}

async function addProduct() {
  const name = document.getElementById("newProdName").value.trim();
  const emoji = document.getElementById("newProdEmoji").value.trim() || "🛒";
  const category = document.getElementById("newProdCategory").value;
  const unit = document.getElementById("newProdUnit").value;
  const price = parseFloat(document.getElementById("newProdPrice").value);

  if (!name || isNaN(price) || price < 0 || !category) {
    alert("Merci de remplir au moins le nom, le rayon et le prix.");
    return;
  }

  const id = "p" + Date.now();
  await db.collection("products").doc(id).set({
    id, name, emoji, category, unit,
    priceCents: Math.round(price * 100),
    inStock: true, isPromo: false,
  });

  document.getElementById("newProdName").value = "";
  document.getElementById("newProdEmoji").value = "";
  document.getElementById("newProdPrice").value = "";

  activeAdminCategory = category;
  await loadLiveProducts();
}

// ---------- Commandes ----------
async function loadOrders() {
  const list = document.getElementById("orderList");
  list.innerHTML = "<p style='padding:16px;color:#888;'>Chargement…</p>";

  try {
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(50).get();

    if (snapshot.empty) {
      list.innerHTML = "<p style='padding:16px;color:#888;'>Aucune commande pour l'instant.</p>";
      return;
    }

    list.innerHTML = snapshot.docs.map(doc => {
      const o = doc.data();
      const date = o.createdAt && o.createdAt.toDate
        ? o.createdAt.toDate().toLocaleString("fr-FR")
        : "";
      const typeLabel = o.orderType === "livraison" ? "🚚 Livraison" : "🏪 Retrait magasin";
      const addressLine = o.orderType === "livraison" && o.deliveryAddress
        ? `${o.deliveryAddress.name || ""} — ${o.deliveryAddress.address || ""}, ${o.deliveryAddress.zip || ""} ${o.deliveryAddress.city || ""} — ${o.deliveryAddress.phone || ""}`
        : "";
      const itemsHtml = (o.items || []).map(it =>
        `<div class="order-item-line"><span>${it.name}</span><span>${(it.unitAmount * it.quantity / 100).toFixed(2)} €</span></div>`
      ).join("");

      return `
        <div class="order-card">
          <div class="order-header">
            <span>${date}</span>
            <span>${(o.totalCents / 100).toFixed(2)} €</span>
          </div>
          <div class="order-type">${typeLabel}</div>
          ${addressLine ? `<div class="order-address">${addressLine}</div>` : ""}
          <div class="order-items">${itemsHtml}</div>
        </div>
      `;
    }).join("");
  } catch (err) {
    list.innerHTML = "<p style='padding:16px;color:#d33;'>Erreur de chargement des commandes.</p>";
    console.error(err);
  }
}
