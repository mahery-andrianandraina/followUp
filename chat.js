(function () {
  'use strict';

  // ── CONFIGURATION ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
  authDomain: "messenger-dm-9c709.firebaseapp.com",
  projectId: "messenger-dm-9c709",
  storageBucket: "messenger-dm-9c709.firebasestorage.app",
  messagingSenderId: "147694824892",
  appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
};

  let cpDb = null, cpUser = null, cpReady = false;
  let cpConvId = null, cpMsgUnsub = null;

  // ══════════════════════════════════════════════════════════════════════════
  //  INITIALISATION SÉCURISÉE
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      // CORRECTION : Utilisation de firebaseConfig au lieu de CP_CONFIG
      const app = firebase.apps.find(a => a.name === 'chat-widget')
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore connecté à messenger-dm');
      cpWaitForAuth();
    } catch(e) { console.error('[chat] init error', e); }
  }

  function cpWaitForAuth() {
    const check = setInterval(() => {
      // On attend que l'utilisateur soit connecté ET que Firestore soit prêt
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser = window.currentUser;
        clearInterval(check);
        console.log('[chat] Utilisateur détecté :', cpUser.email);
        _cpSetupUser();
      }
    }, 500);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS PUBLIQUES (window.)
  // ══════════════════════════════════════════════════════════════════════════
  
  window.cpToggleUserPanel = function() {
    // SÉCURITÉ : On vérifie si Firestore est prêt avant de charger
    if (!cpDb) {
      console.warn("[chat] Firestore n'est pas encore prêt...");
      return;
    }
    const p = document.getElementById('cp-user-panel');
    if (!p) return;
    p.classList.toggle('open');
    if (p.classList.contains('open')) cpLoadUsers();
  };

  async function cpLoadUsers() {
    const el = document.getElementById('cp-user-list');
    if (!el) return;
    el.innerHTML = '<div class="cp-empty">Chargement...</div>';

    try {
      // Cette ligne ne plantera plus car cpDb est vérifié plus haut
      const snap = await cpDb.collection('users').get();
      let html = '';
      snap.forEach(doc => {
        if (doc.id !== cpUser.uid) {
          const u = doc.data();
          html += `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${u.displayName}','${doc.id}')">
                     ${u.displayName || u.email}
                   </div>`;
        }
      });
      el.innerHTML = html || '<div class="cp-empty">Aucun autre utilisateur</div>';
    } catch(e) {
      console.error("[chat] Erreur chargement users", e);
      el.innerHTML = '<div class="cp-empty">Erreur de permission Firestore</div>';
    }
  }

  // Ajoute ici tes autres fonctions (cpOpenConv, cpSend, etc.) en veillant 
  // à bien mettre "window." devant pour qu'elles soient accessibles.

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email: cpUser.email,
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  cpInit();
})();
