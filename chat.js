(function () {
  'use strict';

  // ── CONFIGURATION (messenger-dm) ──────────────────────────────────────────
  const firebaseConfig = {
  apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
  authDomain: "messenger-dm-9c709.firebaseapp.com",
  projectId: "messenger-dm-9c709",
  storageBucket: "messenger-dm-9c709.firebasestorage.app",
  messagingSenderId: "147694824892",
  appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
  };

  let cpDb = null, cpUser = null, cpReady = false;
  let cpConvId = null;
  let cpAllUsers = [], cpOnlineMap = {};

  // ══════════════════════════════════════════════════════════════════════════
  //  INITIALISATION
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      // CORRECTION CRITIQUE : Utilisation de firebaseConfig (ligne 36 de votre fichier)
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore connecté avec succès');
      cpWaitForAuth();
    } catch(e) { console.error('[chat] Erreur init:', e); }
  }

  function cpWaitForAuth() {
    var id = setInterval(function() {
      // On attend que l'utilisateur global soit détecté
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
    
    cpWatchAllOnline();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS POUR LE BOUTON "NOUVEAU MESSAGE"
  // ══════════════════════════════════════════════════════════════════════════

  window.cpToggleUserPanel = function() {
    // Si cpDb est toujours null, on affiche un log clair
    if (!cpDb) {
      console.error("Firestore n'est pas initialisé. Vérifiez la ligne 36.");
      return;
    }
    var p = document.getElementById('cp-user-panel'); 
    if (!p) return;
    p.classList.toggle('open');
    if (p.classList.contains('open')) {
      cpLoadUsers();
    }
  };

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement des contacts...</div>';

    try {
      // Récupère tous les utilisateurs enregistrés dans messenger-dm
      var snap = await cpDb.collection('users').get();
      var html = '';
      snap.forEach(function(doc) {
        if (doc.id !== cpUser.uid) {
          var u = doc.data();
          var name = u.displayName || u.email;
          html += `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${name}','${doc.id}')">
                    <div class="cp-avatar" style="width:30px;height:30px;font-size:10px">${name.substring(0,2).toUpperCase()}</div>
                    <div class="cp-user-info">
                      <div class="cp-user-name">${name}</div>
                    </div>
                  </div>`;
        }
      });
      if (el) el.innerHTML = html || '<div class="cp-empty">Aucun autre utilisateur</div>';
    } catch(e) {
      console.error("Erreur de lecture Firestore:", e);
      if (el) el.innerHTML = '<div class="cp-empty">Erreur : Vérifiez vos règles Firestore</div>';
    }
  }

  window.cpStartDM = async function(email, name, uid) {
    var convId = [cpUser.uid, uid].sort().join('_');
    var ref = cpDb.collection('conversations').doc(convId);
    var snap = await ref.get();
    
    if (!snap.exists) {
      await ref.set({
        participants: [cpUser.uid, uid],
        otherNames: { [cpUser.uid]: cpUser.displayName, [uid]: name },
        lastMessage: "",
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    document.getElementById('cp-user-panel').classList.remove('open');
    if (window.cpOpenConv) window.cpOpenConv(convId, uid, name);
  };

  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(function(snap) {
      snap.forEach(function(d){ cpOnlineMap[d.id] = d.data().online || false; });
    });
  }

  cpInit();
})();
