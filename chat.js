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
  let cpConvId = null, cpOtherId = null, cpOtherName = null;
  let cpMsgUnsub = null, cpConvsUnsub = null, cpStatusUnsub = null, cpTypingUnsub = null;
  let cpAllConvs = [], cpAllUsers = [], cpOnlineMap = {};
  let cpPopupOpen = false, cpTypingTimeout = null;

  // ══════════════════════════════════════════════════════════════════════════
  //  INIT FIREBASE
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      // CORRECTION : On utilise firebaseConfig (et pas CP_CONFIG)
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore();
      console.log('[chat] Firestore chat prêt sur messenger-dm');
      cpWaitForAuth();
    } catch(e) { console.error('[chat] init error', e); }
  }

  function cpWaitForAuth() {
    var id = setInterval(function() {
      // On vérifie que window.currentUser existe ET que cpDb est initialisé
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser  = window.currentUser;
        clearInterval(id);
        _cpSetupUser();
      }
    }, 500);
  }

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email:       cpUser.email,
      online:      true,
      lastSeen:    firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function(e){ console.error("Erreur setup user:", e); });

    cpLoadConvs();
    cpWatchAllOnline();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS PUBLIQUES (Accessibles par le HTML)
  // ══════════════════════════════════════════════════════════════════════════

  window.cpToggleUserPanel = function() {
    // SÉCURITÉ : On empêche l'ouverture si la DB n'est pas encore là
    if (!cpDb) {
      console.warn("Connexion Firebase en cours...");
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

  window.cpToggle = function() {
    cpPopupOpen = !cpPopupOpen;
    var p = document.getElementById('chat-popup');
    if (p) p.classList.toggle('open', cpPopupOpen);
  };

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement…</div>';

    try {
      // CORRECTION : L'erreur "collection of null" ne peut plus arriver ici
      var snap = await cpDb.collection('users').get();
      var users = [];
      snap.forEach(function(doc) {
        if (doc.id !== cpUser.uid) users.push(Object.assign({id: doc.id}, doc.data()));
      });
      cpRenderUsers(users);
    } catch(e) { 
      console.error("Erreur chargement utilisateurs:", e);
      if (el) el.innerHTML = '<div class="cp-empty">Erreur de permission Firestore</div>';
    }
  }

  function cpRenderUsers(users) {
    var el = document.getElementById('cp-user-list');
    if (!el) return;
    if (users.length === 0) {
      el.innerHTML = '<div class="cp-empty">Aucun utilisateur trouvé</div>';
      return;
    }
    el.innerHTML = users.map(function(u) {
      return `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${u.displayName || u.email}','${u.id}')">
                ${u.displayName || u.email}
              </div>`;
    }).join('');
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
    window.cpOpenConv(convId, uid, name);
  };

  // ── Autres fonctions nécessaires ──
  function cpLoadConvs() {
    cpConvsUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .onSnapshot(function(snap) {
        cpAllConvs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        cpRenderConvs(cpAllConvs);
      });
  }

  function cpRenderConvs(convs) {
    var el = document.getElementById('cp-conv-list');
    if (el) el.innerHTML = convs.map(c => `<div class="cp-conv-item" onclick="cpOpenConv('${c.id}')">Discussion</div>`).join('');
  }

  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(function(snap) {
      snap.forEach(function(d){ cpOnlineMap[d.id] = d.data().online || false; });
    });
  }

  // Lancement automatique
  cpInit();

})();
