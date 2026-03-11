// ============================================================
// AW27 CHECKERS – Authentication & User Config (Firebase)
// ============================================================

const ADMIN_EMAIL = "mcformation1@gmail.com";

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
const auth     = firebase.auth();
const db       = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ─── État auth global ─────────────────────────────────────────
window.currentUser = null;

// ─── Helper : page courante ───────────────────────────────────
function isPage(name) {
    return window.location.pathname.endsWith(name);
}

// ─── Connexion Google OAuth (redirection) ─────────────────────
async function signInWithGoogle() {
    const btn = document.getElementById("btn-google-signin");
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }
    try {
        await auth.signInWithRedirect(provider);
    } catch (err) {
        console.error("Auth error:", err);
        showAuthError("Erreur de connexion. Réessayez.");
        if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
    }
}

// ─── Déconnexion ──────────────────────────────────────────────
async function signOut() {
    await auth.signOut();
    window.currentUser = null;
    window.location.href = "login.html";
}

// ══════════════════════════════════════════════════════════════
// ARCHITECTURE :
//
// login.html  → géré UNIQUEMENT par getRedirectResult()
//               onAuthStateChanged ignoré sur cette page
//
// index.html  → géré par onAuthStateChanged
//               (vérifie que la session est toujours active)
// ══════════════════════════════════════════════════════════════

if (isPage("login.html")) {

    // ── Page Login : traiter le retour OAuth ──────────────────
    auth.getRedirectResult().then(async (result) => {

        if (!result || !result.user) {
            // Pas de redirection en cours → rien à faire
            // L'user voit simplement le bouton de connexion
            return;
        }

        await handleUser(result.user);

    }).catch((err) => {
        console.error("Redirect error:", err);
        if (err.code !== "auth/no-auth-event") {
            showAuthError("Erreur de connexion Google. Réessayez.");
        }
    });

} else if (!isPage("access-request.html")) {

    // ── Pages protégées : vérifier la session ─────────────────
    auth.onAuthStateChanged(async (firebaseUser) => {
        if (!firebaseUser) {
            window.location.href = "login.html";
            return;
        }
        await handleUser(firebaseUser);
    });
}

// ══════════════════════════════════════════════════════════════
// LOGIQUE CENTRALE
// ══════════════════════════════════════════════════════════════
async function handleUser(firebaseUser) {
    const email = firebaseUser.email;

    try {
        // ── Étape 1 : Vérifier whitelist ──────────────────────
        const whitelistDoc = await db.collection("whitelist").doc(email).get();
        const isApproved   = whitelistDoc.exists && whitelistDoc.data().status === "approved";

        if (!isApproved) {
            // Non autorisé → déconnecter silencieusement puis rediriger
            const url = "access-request.html"
                + "?email=" + encodeURIComponent(email)
                + "&name="  + encodeURIComponent(firebaseUser.displayName || "")
                + "&photo=" + encodeURIComponent(firebaseUser.photoURL || "");

            auth.signOut().finally(() => {
                window.location.replace(url);
            });
            return;
        }

        // ── Étape 2 : Charger profil Firestore ────────────────
        const userDoc = await db.collection("users").doc(firebaseUser.uid).get();

        if (userDoc.exists && userDoc.data().gasUrl) {
            // Profil complet → dashboard
            window.currentUser = {
                uid:         firebaseUser.uid,
                email:       firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL:    firebaseUser.photoURL,
                gasUrl:      userDoc.data().gasUrl
            };

            if (isPage("login.html")) {
                window.location.href = "index.html";
            } else {
                onAuthReady();
            }

        } else {
            // Pas de gasUrl → step configuration
            if (isPage("login.html")) {
                showGasSetupStep(firebaseUser);
            } else {
                window.location.href = "login.html?setup=1";
            }
        }

    } catch (err) {
        console.error("Firestore error:", err);
        showAuthError("Erreur de chargement du profil. Réessayez.");
    }
}

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

// ─── Mettre à jour le GAS URL ─────────────────────────────────
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
        await fetchAllData();
    } catch (err) {
        console.error(err);
        showToast("Erreur lors de la mise à jour", "error");
    }
}

// ─── Callback app prête (index.html) ──────────────────────────
function onAuthReady() {
    if (typeof initApp === "function") initApp();
}

// ─── Helpers UI ───────────────────────────────────────────────
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
