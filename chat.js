(function () {
  'use strict';

  // ── CONFIGURATION ──
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
  //  INIT FIREBASE (CORRIGÉ)
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      // FIX CRITIQUE : Utilisation de firebaseConfig au lieu de CP_CONFIG
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore connecté avec succès');
      cpWaitForAuth();
    } catch(e) { 
      console.error('[chat] Erreur fatale init:', e); 
    }
  }

  function cpWaitForAuth() {
    var id = setInterval(function() {
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser  = window.currentUser;
        clearInterval(id);
        _cpSetupUser();
      }
    }, 400);
  }

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email:       cpUser.email,
      online:      true,
      lastSeen:    firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS EXPORTÉES (Pour vos boutons HTML)
  // ══════════════════════════════════════════════════════════════════════════

  // Pour le bouton principal du chat
  window.cpToggle = function() {
    var p = document.getElementById('chat-popup');
    if (p) p.classList.toggle('open');
  };

  // Pour le bouton "Nouveau message"
  window.cpToggleUserPanel = function() {
    if (!cpDb) {
      console.error("Firestore n'est pas prêt. Vérifiez la console pour l'erreur d'init.");
      return;
    }
    var p = document.getElementById('cp-user-panel'); 
    if (!p) return;
    
    var opening = !p.classList.contains('open');
    p.classList.toggle('open');
    if (opening) {
      cpLoadUsers();
    }
  };

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement...</div>';

    try {
      // On récupère la liste des utilisateurs pour démarrer un message
      var snap = await cpDb.collection('users').get();
      var html = '';
      snap.forEach(function(doc) {
        if (doc.id !== cpUser.uid) {
          var u = doc.data();
          var name = u.displayName || u.email;
          html += `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${name}','${doc.id}')">
                    <div class="cp-user-name">${name}</div>
                  </div>`;
        }
      });
      if (el) el.innerHTML = html || '<div class="cp-empty">Aucun contact</div>';
    } catch(e) {
      console.error("Erreur de lecture Firestore:", e);
    }
  }

  // Lancement
  cpInit();

})();
