// ---- Gestion du compte client (connexion, inscription, adresses) ----

function openAccount() {
  renderAccountPanel();
  document.getElementById("accountPanel").classList.add("open");
}

function closeAccount() {
  document.getElementById("accountPanel").classList.remove("open");
}

function renderAccountPanel() {
  const container = document.getElementById("accountContent");
  const user = auth.currentUser;

  if (!user) {
    container.innerHTML = `
      <h2>Mon compte</h2>
      <p>Connectez-vous ou créez un compte pour enregistrer vos adresses
      et commander plus rapidement.</p>

      <label>Adresse e-mail</label>
      <input type="email" id="authEmail" placeholder="vous@exemple.com">

      <label>Mot de passe</label>
      <input type="password" id="authPassword" placeholder="••••••••">

      <div id="authError" class="auth-error"></div>

      <button class="account-btn primary" onclick="handleLogin()">Se connecter</button>
      <button class="account-btn" onclick="handleSignup()">Créer un compte</button>
      <button id="closeAccount" onclick="closeAccount()">Fermer</button>
    `;
    return;
  }

  // Utilisateur connecté : afficher ses infos + formulaire d'adresses
  container.innerHTML = `
    <h2>Mon compte</h2>
    <p class="account-email">${user.email}</p>

    <h3>📦 Adresse de livraison</h3>
    <label>Nom complet</label>
    <input type="text" id="delName" placeholder="Nom et prénom">
    <label>Adresse</label>
    <input type="text" id="delAddress" placeholder="N° et rue">
    <label>Code postal</label>
    <input type="text" id="delZip" placeholder="76710">
    <label>Ville</label>
    <input type="text" id="delCity" placeholder="Eslettes">
    <label>Téléphone</label>
    <input type="tel" id="delPhone" placeholder="06 12 34 56 78">

    <h3>🧾 Adresse de facturation</h3>
    <label>
      <input type="checkbox" id="billSameAsDelivery" onchange="toggleBillingFields()">
      Identique à l'adresse de livraison
    </label>
    <div id="billingFields">
      <label>Nom complet</label>
      <input type="text" id="billName" placeholder="Nom et prénom">
      <label>Adresse</label>
      <input type="text" id="billAddress" placeholder="N° et rue">
      <label>Code postal</label>
      <input type="text" id="billZip" placeholder="76710">
      <label>Ville</label>
      <input type="text" id="billCity" placeholder="Eslettes">
    </div>

    <div id="accountSaveMsg" class="account-save-msg"></div>

    <button class="account-btn primary" onclick="saveAddresses()">Enregistrer mes adresses</button>
    <button class="account-btn" onclick="handleLogout()">Se déconnecter</button>
    <button id="closeAccount" onclick="closeAccount()">Fermer</button>
  `;

  loadAddresses();
}

function toggleBillingFields() {
  const same = document.getElementById("billSameAsDelivery").checked;
  document.getElementById("billingFields").style.display = same ? "none" : "block";
}

async function handleSignup() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorBox = document.getElementById("authError");
  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Merci de remplir l'e-mail et le mot de passe.";
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    renderAccountPanel();
  } catch (err) {
    errorBox.textContent = translateAuthError(err);
  }
}

async function handleLogin() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorBox = document.getElementById("authError");
  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Merci de remplir l'e-mail et le mot de passe.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    renderAccountPanel();
  } catch (err) {
    errorBox.textContent = translateAuthError(err);
  }
}

async function handleLogout() {
  await auth.signOut();
  renderAccountPanel();
}

function translateAuthError(err) {
  const map = {
    "auth/email-already-in-use": "Cette adresse e-mail est déjà utilisée.",
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/weak-password": "Le mot de passe doit faire au moins 6 caractères.",
    "auth/user-not-found": "Aucun compte avec cet e-mail.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
  };
  return map[err.code] || "Une erreur est survenue. Réessayez.";
}

async function loadAddresses() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) return;
    const data = doc.data();

    if (data.delivery) {
      document.getElementById("delName").value = data.delivery.name || "";
      document.getElementById("delAddress").value = data.delivery.address || "";
      document.getElementById("delZip").value = data.delivery.zip || "";
      document.getElementById("delCity").value = data.delivery.city || "";
      document.getElementById("delPhone").value = data.delivery.phone || "";
    }
    if (data.billing) {
      document.getElementById("billName").value = data.billing.name || "";
      document.getElementById("billAddress").value = data.billing.address || "";
      document.getElementById("billZip").value = data.billing.zip || "";
      document.getElementById("billCity").value = data.billing.city || "";
    }
    if (data.billingSameAsDelivery) {
      document.getElementById("billSameAsDelivery").checked = true;
      toggleBillingFields();
    }
  } catch (err) {
    console.error("Erreur chargement adresses :", err);
  }
}

async function saveAddresses() {
  const user = auth.currentUser;
  if (!user) return;

  const sameAsDelivery = document.getElementById("billSameAsDelivery").checked;

  const delivery = {
    name: document.getElementById("delName").value.trim(),
    address: document.getElementById("delAddress").value.trim(),
    zip: document.getElementById("delZip").value.trim(),
    city: document.getElementById("delCity").value.trim(),
    phone: document.getElementById("delPhone").value.trim(),
  };

  const billing = sameAsDelivery
    ? { ...delivery }
    : {
        name: document.getElementById("billName").value.trim(),
        address: document.getElementById("billAddress").value.trim(),
        zip: document.getElementById("billZip").value.trim(),
        city: document.getElementById("billCity").value.trim(),
      };

  const msg = document.getElementById("accountSaveMsg");

  try {
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      delivery,
      billing,
      billingSameAsDelivery: sameAsDelivery,
    }, { merge: true });

    msg.textContent = "✅ Adresses enregistrées !";
    setTimeout(() => { msg.textContent = ""; }, 3000);
  } catch (err) {
    msg.textContent = "Erreur lors de l'enregistrement.";
    console.error(err);
  }
}

// Renvoie l'adresse de livraison sauvegardée du client connecté (ou null)
async function getSavedDeliveryAddress() {
  const user = auth.currentUser;
  if (!user) return null;
  const doc = await db.collection("users").doc(user.uid).get();
  if (!doc.exists) return null;
  return doc.data().delivery || null;
}

// Met à jour l'affichage du bouton "Mon compte" selon l'état de connexion
auth.onAuthStateChanged((user) => {
  const btn = document.getElementById("accountBtn");
  if (btn) {
    btn.textContent = user ? "👤 Mon compte" : "👤 Connexion";
  }
});
