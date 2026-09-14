/*
 * IMPORTANT — À LIRE AVANT UTILISATION :
 *
 * Comme pour l'app Android, Stripe exige qu'un petit backend crée la session
 * de paiement (avec votre clé secrète, qui ne doit jamais apparaître ici).
 *
 * Remplacez BACKEND_URL ci-dessous par l'URL de votre backend une fois créé
 * (voir le README pour les instructions, méthode identique à avant : une
 * Cloud Function Firebase gratuite).
 *
 * Cette version utilise "Stripe Checkout" : le client est redirigé vers une
 * page de paiement toute prête et sécurisée hébergée par Stripe — encore
 * plus simple à mettre en place qu'un formulaire de carte personnalisé.
 */
const BACKEND_URL = "https://votre-backend.exemple.com/create-checkout-session";

async function goToCheckout(cart, totalCents, orderType, deliveryAddress) {
  const items = Object.entries(cart).map(([id, entry]) => {
    const product = PRODUCTS.find(p => p.id === id) ||
      (window.ALL_PRODUCTS_INCLUDING_OUT_OF_STOCK || []).find(p => p.id === id);
    if (isWeighted(product)) {
      return {
        name: `${product.name} (${entry.weightKg} kg)`,
        unitAmount: Math.round(product.priceCents * entry.weightKg),
        quantity: 1,
      };
    }
    return {
      name: product.name,
      unitAmount: product.priceCents,
      quantity: entry.qty,
    };
  });

  // Enregistre la commande dans Firestore (visible dans l'espace admin)
  try {
    if (typeof db !== "undefined") {
      await db.collection("orders").add({
        items,
        totalCents,
        orderType,
        deliveryAddress: deliveryAddress || null,
        customerEmail: (typeof auth !== "undefined" && auth.currentUser) ? auth.currentUser.email : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: "commande initiée",
      });
    }
  } catch (err) {
    console.error("Impossible d'enregistrer la commande :", err);
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        currency: "eur",
        orderType,
        deliveryAddress,
      }),
    });

    if (!response.ok) throw new Error("Erreur backend : " + response.status);

    const data = await response.json();
    window.location.href = data.url;

  } catch (err) {
    alert(
      "Impossible de préparer le paiement. Avez-vous bien configuré votre " +
      "backend Stripe (BACKEND_URL dans payment.js) ? Détail : " + err.message
    );
  }
}
