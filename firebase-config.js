// Configuration Firebase — projet cocci-eslettes
// (Ces informations ne sont pas secrètes, elles identifient juste votre projet)
const firebaseConfig = {
  apiKey: "AIzaSyAAHTlU9TZgysGls-Q9RkK7j0ZjWA5BDvQ",
  authDomain: "cocci-eslettes.firebaseapp.com",
  projectId: "cocci-eslettes",
  storageBucket: "cocci-eslettes.firebasestorage.app",
  messagingSenderId: "692433655644",
  appId: "1:692433655644:web:77033cdbc5287abf03d399",
  measurementId: "G-E7KKZ79PXV"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
