(function () {
  'use strict';

  const firebaseConfig = {
  apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
  authDomain: "messenger-dm-9c709.firebaseapp.com",
  projectId: "messenger-dm-9c709",
  storageBucket: "messenger-dm-9c709.firebasestorage.app",
  messagingSenderId: "147694824892",
  appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
  };

  let cpDb = null, cpUser = null, cpReady = false;
  let cpAllUsers = [], cpOnlineMap = {};

  // ── INITIALISATION ──
  function cpInit() {
    try {
      // FIX LIGNE 36 : Utilisation de firebaseConfig
      const app = firebase.apps.find(a => a.name === 'chat-widget')
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore connecté avec succès');
      cpWaitForAuth();
    } catch(e) { console.error('[chat] Erreur init:', e); }
  }

  function cpWaitForAuth() {
    const check = setInterval(() => {
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser = window.currentUser;
        clearInterval(check);
        _cpSetupUser();
      }
    }, 500);
  }

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email: cpUser.email,
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    cpWatchAllOnline();
  }

  // ── EXPOSITION DES FONCTIONS AU HTML ──
  window.cpToggleUserPanel = function() {
    if (!cpDb) return console.error("Base de données non prête.");
    const p = document.getElementById('cp-user-panel'); 
    if (!p) return;
    p.classList.toggle('open');
    if (p.classList.contains('open')) cpLoadUsers();
  };

  async function cpLoadUsers() {
    const el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement...</div>';
    try {
      const snap = await cpDb.collection('users').get();
      let html = '';
      snap.forEach(doc => {
        if (doc.id !== cpUser.uid) {
          const u = doc.data();
          const name = u.displayName || u.email;
          html += `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${name}','${doc.id}')">
                     ${name}
                   </div>`;
        }
      });
      el.innerHTML = html || '<div class="cp-empty">Aucun utilisateur</div>';
    } catch(e) { console.error("Erreur Firestore:", e); }
  }

  // Fonctions de support
  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(snap => {
      snap.forEach(d => cpOnlineMap[d.id] = d.data().online || false);
    });
  }

  cpInit();
})();
