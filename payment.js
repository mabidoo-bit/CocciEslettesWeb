/*
 * IMPORTANT — À LIRE AVANT UTILISATION :
 *
 * Stripe exige qu'un petit backend crée la session de paiement (avec votre
 * clé secrète, qui ne doit jamais apparaître ici).
 *
 * Remplacez BACKEND_URL ci-dessous par l'URL de votre backend une fois créé
 * (voir le README pour les instructions : une Cloud Function Firebase
 * gratuite suffit).
 */
const BACKEND_URL = "https://votre-backend.exemple.com/create-checkout-session";

async function goToCheckout(cart, totalCents) {
  const items = Object.entries(cart).map(([id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    return {
      name: product.name,
      unitAmount: product.priceCents,
      quantity: qty,
    };
  });

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, currency: "eur" }),
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
