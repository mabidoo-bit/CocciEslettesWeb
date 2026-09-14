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

      <label>Nom complet (pour un nouveau compte)</label>
      <input type="text" id="authName" placeholder="Votre nom">

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
    <h2>Bonjour${window.currentUserName ? " " + window.currentUserName : ""} 👋</h2>
    <p class="account-email">${user.email}</p>

    <label>Nom complet</label>
    <input type="text" id="accountName" placeholder="Votre nom">

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
  const name = document.getElementById("authName").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorBox = document.getElementById("authError");
  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Merci de remplir l'e-mail et le mot de passe.";
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      await db.collection("users").doc(cred.user.uid).set({ name, email }, { merge: true });
      window.currentUserName = name;
    }
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
  window.currentUserName = null;
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

    if (data.name) {
      document.getElementById("accountName").value = data.name;
      window.currentUserName = data.name;
      updateAccountButtonLabel();
    }

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

  const name = document.getElementById("accountName").value.trim();
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
      name,
      email: user.email,
      delivery,
      billing,
      billingSameAsDelivery: sameAsDelivery,
    }, { merge: true });

    window.currentUserName = name;
    updateAccountButtonLabel();

    msg.textContent = "✅ Adresses enregistrées !";

    // Ferme automatiquement le panneau et revient aux achats après un court délai
    setTimeout(() => {
      closeAccount();
    }, 1200);
  } catch (err) {
    msg.textContent = "Erreur lors de l'enregistrement.";
    console.error(err);
  }
}

function updateAccountButtonLabel() {
  const btn = document.getElementById("accountBtn");
  if (btn && window.currentUserName) {
    btn.textContent = "👤 " + window.currentUserName;
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
auth.onAuthStateChanged(async (user) => {
  const btn = document.getElementById("accountBtn");
  if (!user) {
    window.currentUserName = null;
    if (btn) btn.textContent = "👤 Connexion";
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    window.currentUserName = doc.exists ? doc.data().name : null;
  } catch (err) {
    window.currentUserName = null;
  }

  if (btn) {
    btn.textContent = window.currentUserName ? "👤 " + window.currentUserName : "👤 Mon compte";
  }
});
