// ============================================================
// AW27 CHECKERS – Authentication & User Config (Firebase)
// ============================================================
//
// SETUP : Remplacez firebaseConfig avec vos propres clés Firebase.
// Firebase Console → Project Settings → Your apps → SDK setup
// Activez : Authentication > Sign-in method > Google
// Activez : Firestore Database (mode production)
// ============================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYJbYbux0k8yY5OknmxOpw_DwrP7VKVp8",
  authDomain: "aw27-checkers.firebaseapp.com",
  projectId: "aw27-checkers",
  storageBucket: "aw27-checkers.firebasestorage.app",
  messagingSenderId: "122592404616",
  appId: "1:122592404616:web:499d21cd64baf6bdea6b3d",
  measurementId: "G-4MT37M3HGK"
};

// ─── Initialisation Firebase ──────────────────────────────────
firebase.initializeApp(firebaseConfig);
const auth      = firebase.auth();
const db        = firebase.firestore();
const provider  = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ─── État auth global ─────────────────────────────────────────
window.currentUser = null; // { uid, email, displayName, photoURL, gasUrl }

// ─── Connexion Google OAuth ───────────────────────────────────
async function signInWithGoogle() {
    const btn = document.getElementById("btn-google-signin");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }
    try {
        const result = await auth.signInWithPopup(provider);
        // onAuthStateChanged prend le relais
    } catch (err) {
        console.error("Auth error:", err);
        showAuthError(err.code === "auth/popup-closed-by-user"
            ? "Connexion annulée."
            : "Erreur de connexion. Réessayez.");
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

// ─── Déconnexion ──────────────────────────────────────────────
async function signOut() {
    await auth.signOut();
    window.currentUser = null;
    window.location.href = "login.html";
}

// ─── Observer état authentification ──────────────────────────
// Déclenché à chaque changement (connexion, déconnexion, refresh page)
auth.onAuthStateChanged(async (firebaseUser) => {
    if (!firebaseUser) {
        // Non connecté → rediriger vers login si on est sur index.html
        if (!window.location.pathname.endsWith("login.html")) {
            window.location.href = "login.html";
        }
        return;
    }

    // Connecté → charger profil depuis Firestore
    try {
        const doc = await db.collection("users").doc(firebaseUser.uid).get();

        if (doc.exists && doc.data().gasUrl) {
            // Profil complet → accès direct au dashboard
            window.currentUser = {
                uid:         firebaseUser.uid,
                email:       firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL:    firebaseUser.photoURL,
                gasUrl:      doc.data().gasUrl
            };

            if (window.location.pathname.endsWith("login.html")) {
                window.location.href = "index.html";
            } else {
                // On est sur index.html → initialiser l'app
                onAuthReady();
            }
        } else {
            // Première connexion ou GAS URL manquant → configurer
            if (window.location.pathname.endsWith("login.html")) {
                // Afficher l'étape de configuration du GAS URL
                showGasSetupStep(firebaseUser);
            } else {
                // Si on arrive directement sur index.html sans GAS URL
                window.location.href = "login.html?setup=1";
            }
        }
    } catch (err) {
        console.error("Firestore error:", err);
        showAuthError("Erreur de chargement du profil. Réessayez.");
        await auth.signOut();
    }
});

// ─── Sauvegarder le GAS URL dans Firestore ────────────────────
async function saveGasUrl(firebaseUser, gasUrl) {
    const btn = document.getElementById("btn-save-gas");
    if (btn) { btn.disabled = true; btn.textContent = "Enregistrement…"; }

    if (!gasUrl || !gasUrl.startsWith("https://script.google.com/")) {
        showGasError("URL invalide. Elle doit commencer par https://script.google.com/");
        if (btn) { btn.disabled = false; btn.textContent = "Accéder au Dashboard"; }
        return;
    }

    try {
        await db.collection("users").doc(firebaseUser.uid).set({
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL:    firebaseUser.photoURL || "",
            gasUrl:      gasUrl,
            createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        window.currentUser = {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL:    firebaseUser.photoURL,
            gasUrl:      gasUrl
        };

        window.location.href = "index.html";
    } catch (err) {
        console.error("Firestore save error:", err);
        showGasError("Erreur d'enregistrement. Vérifiez vos droits Firestore.");
        if (btn) { btn.disabled = false; btn.textContent = "Accéder au Dashboard"; }
    }
}

// ─── Mettre à jour le GAS URL (depuis le dashboard) ──────────
async function updateGasUrl(newUrl) {
    if (!window.currentUser) return;
    if (!newUrl || !newUrl.startsWith("https://script.google.com/")) {
        showToast("URL Google Apps Script invalide", "error");
        return;
    }
    try {
        await db.collection("users").doc(window.currentUser.uid).update({
            gasUrl:    newUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.currentUser.gasUrl = newUrl;
        showToast("URL Google Sheet mise à jour ✓", "success");
        // Recharger les données avec la nouvelle URL
        await fetchAllData();
    } catch (err) {
        console.error(err);
        showToast("Erreur lors de la mise à jour", "error");
    }
}

// ─── Callback appelé quand auth est prête dans index.html ─────
// Défini dans app.js, appelé ici une fois currentUser chargé
function onAuthReady() {
    if (typeof initApp === "function") {
        initApp();
    }
}

// ─── Helpers UI (login.html) ──────────────────────────────────
function showAuthError(msg) {
    const el = document.getElementById("auth-error");
    if (el) { el.textContent = msg; el.style.display = "block"; }
}
function showGasError(msg) {
    const el = document.getElementById("gas-error");
    if (el) { el.textContent = msg; el.style.display = "block"; }
}

let _pendingFirebaseUser = null;

function showGasSetupStep(firebaseUser) {
    _pendingFirebaseUser = firebaseUser;
    const stepLogin = document.getElementById("step-login");
    const stepGas   = document.getElementById("step-gas");
    const userName  = document.getElementById("setup-user-name");
    const userEmail = document.getElementById("setup-user-email");
    const userPhoto = document.getElementById("setup-user-photo");

    if (stepLogin) stepLogin.style.display = "none";
    if (stepGas)   stepGas.style.display   = "flex";
    if (userName)  userName.textContent     = firebaseUser.displayName || firebaseUser.email;
    if (userEmail) userEmail.textContent    = firebaseUser.email;
    if (userPhoto && firebaseUser.photoURL) {
        userPhoto.src = firebaseUser.photoURL;
        userPhoto.style.display = "block";
    }
}

function submitGasUrl() {
    const input = document.getElementById("gas-url-input");
    if (!input || !_pendingFirebaseUser) return;
    saveGasUrl(_pendingFirebaseUser, input.value.trim());
}
