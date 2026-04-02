// ════════════════════════════════════════════════════════════════════════════
//  CHAT WIDGET — chat.js (Version Finale Corrigée)
//  Projet : messenger-dm
// ════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyCxzZnNJyvBpOKubQmEmhcZOXk8IdLsEyc",
    authDomain: "messenger-dm.firebaseapp.com",
    projectId: "messenger-dm",
    storageBucket: "messenger-dm.firebasestorage.app",
    messagingSenderId: "420241788990",
    appId: "1:420241788990:web:117e6ee57619b2a08dc16f"
  };

  // ── État ──
  let cpDb = null, cpUser = null;
  let cpConvId = null, cpOtherId = null, cpOtherName = null;
  let cpMsgUnsub = null, cpConvsUnsub = null, cpStatusUnsub = null, cpTypingUnsub = null;
  let cpAllConvs = [], cpAllUsers = [], cpOnlineMap = {};
  let cpPopupOpen = false, cpReady = false, cpTypingTimeout = null;

  // ══════════════════════════════════════════════════════════════════════════
  //  INITIALISATION
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      cpDb = app.firestore();
      console.log('[chat] Firestore chat prêt sur messenger-dm');
      cpWaitForAuth();
    } catch(e) { console.error('[chat] init error', e); }
  }

  function cpWaitForAuth() {
    var id = setInterval(function() {
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser  = window.currentUser;
        clearInterval(id);
        _cpSetupUser();
      }
    }, 300);
  }

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email:       cpUser.email,
      online:      true,
      lastSeen:    firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    cpLoadConvs();
    cpWatchAllOnline();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS PUBLIQUES (Accessibles par le HTML)
  // ══════════════════════════════════════════════════════════════════════════

  // Ouvre la liste pour créer un nouveau message
  window.cpToggleUserPanel = function() {
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

  window.cpOpenConv = async function(convId, otherId, otherName) {
    cpConvId = convId; cpOtherId = otherId; cpOtherName = otherName;
    document.getElementById('cp-view-list').style.display = 'none';
    document.getElementById('cp-view-chat').style.display = 'flex';

    if (cpMsgUnsub) cpMsgUnsub();
    cpMsgUnsub = cpDb.collection('conversations').doc(convId)
      .collection('messages').orderBy('createdAt')
      .onSnapshot(function(snap){ cpRenderMessages(snap.docs); });
  };

  window.cpBackToList = function() {
    if (cpMsgUnsub) cpMsgUnsub();
    cpConvId = null;
    document.getElementById('cp-view-chat').style.display = 'none';
    document.getElementById('cp-view-list').style.display = 'flex';
  };

  window.cpSend = async function() {
    var input = document.getElementById('cp-msg-input');
    var text = input.value.trim();
    if (!text || !cpConvId || !cpUser) return;
    input.value = '';
    var now = firebase.firestore.FieldValue.serverTimestamp();
    await cpDb.collection('conversations').doc(cpConvId)
      .collection('messages').add({ text:text, senderId:cpUser.uid, createdAt:now });
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIQUE INTERNE
  // ══════════════════════════════════════════════════════════════════════════

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement…</div>';
    
    try {
      var snap = await cpDb.collection('users').get();
      var users = [];
      snap.forEach(function(doc) {
        if (doc.id !== cpUser.uid) users.push(Object.assign({id: doc.id}, doc.data()));
      });
      cpRenderUsers(users);
    } catch(e) { console.error(e); }
  }

  function cpRenderUsers(users) {
    var el = document.getElementById('cp-user-list');
    if (!el) return;
    el.innerHTML = users.map(function(u) {
      return `<div class="cp-user-item" onclick="cpStartDM('${u.email}','${u.displayName}','${u.id}')">
                ${u.displayName}
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
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    document.getElementById('cp-user-panel').classList.remove('open');
    window.cpOpenConv(convId, uid, name);
  };

  function cpLoadConvs() {
    cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .onSnapshot(function(snap) {
        var convs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        cpRenderConvs(convs);
      });
  }

  function cpRenderConvs(convs) {
    var el = document.getElementById('cp-conv-list');
    if (el) el.innerHTML = convs.map(conv => `<div onclick="cpOpenConv('${conv.id}')">Conv</div>`).join('');
  }

  function cpRenderMessages(docs) {
    var el = document.getElementById('cp-messages');
    if (el) el.innerHTML = docs.map(d => `<div>${d.data().text}</div>`).join('');
  }

  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(function(snap) {
      snap.forEach(function(d){ cpOnlineMap[d.id] = d.data().online || false; });
    });
  }

  cpInit();
})();
