(function () {
  'use strict';

  // ── CONFIGURATION CORRECTE ──
  const firebaseConfig = {
 apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
  authDomain: "messenger-dm-9c709.firebaseapp.com",
  projectId: "messenger-dm-9c709",
  storageBucket: "messenger-dm-9c709.firebasestorage.app",
  messagingSenderId: "147694824892",
  appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
  };

  let cpDb = null, cpUser = null, cpReady = false;

  // ══════════════════════════════════════════════════════════════════════════
  //  INITIALISATION SÉCURISÉE
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      // CORRECTION : Utilisation de firebaseConfig au lieu de CP_CONFIG
      const app = firebase.apps.find(a => a.name === 'chat-widget')
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore connecté avec succès');
      
      // On lance l'attente de l'utilisateur
      cpWaitForAuth();
    } catch(e) { 
      console.error('[chat] Erreur fatale init:', e); 
    }
  }

  function cpWaitForAuth() {
    const id = setInterval(() => {
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser = window.currentUser;
        clearInterval(id);
        console.log('[chat] Utilisateur prêt:', cpUser.email);
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
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS PUBLIQUES (Attachées à window pour le HTML)
  // ══════════════════════════════════════════════════════════════════════════
  
  // Cette fonction gère l'ouverture/fermeture du widget principal
  window.cpToggle = function() {
    const p = document.getElementById('chat-popup');
    if (p) p.classList.toggle('open');
  };

  // Cette fonction gère le bouton "Nouveau message"
  window.cpToggleUserPanel = function() {
    if (!cpDb) {
      console.warn("[chat] Attente de la connexion Firestore...");
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
      el.innerHTML = html || '<div class="cp-empty">Aucun utilisateur trouvé</div>';
    } catch(e) {
      console.error("[chat] Erreur chargement users:", e);
      el.innerHTML = '<div class="cp-empty">Erreur de permission</div>';
    }
  }

  // Lancement manuel du démarrage
  cpInit();

})();
