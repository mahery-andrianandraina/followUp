// ════════════════════════════════════════════════════════════════════════════
//  CHAT WIDGET — chat.js (Version Finale Corrigée)
//  Projet : messenger-dm
// ════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── CONFIGURATION FIREBASE (MESSENGER-DM) ──────────────────────────────────
  const firebaseConfig = {
  apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
  authDomain: "messenger-dm-9c709.firebaseapp.com",
  projectId: "messenger-dm-9c709",
  storageBucket: "messenger-dm-9c709.firebasestorage.app",
  messagingSenderId: "147694824892",
  appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
};

  // ── ÉTAT GLOBAL ───────────────────────────────────────────────────────────
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
      // Vérifie si l'app est déjà initialisée sous le nom 'chat-widget'
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(firebaseConfig, 'chat-widget');
      
      cpDb = app.firestore(); // Initialisation de la variable globale cpDb
      console.log('[chat] Firestore chat prêt sur messenger-dm');
      cpWaitForAuth();
    } catch(e) { 
      console.error('[chat] init error', e); 
    }
  }

  function cpWaitForAuth() {
    const id = setInterval(function() {
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
  //  FONCTIONS PUBLIQUES (Accessibles depuis le HTML)
  // ══════════════════════════════════════════════════════════════════════════

  // Permet au bouton du HTML d'ouvrir/fermer le chat
  window.cpToggle = function() {
    cpPopupOpen = !cpPopupOpen;
    const p = document.getElementById('chat-popup');
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
    const input = document.getElementById('cp-msg-input');
    const text = input.value.trim();
    if (!text || !cpConvId || !cpUser) return;

    input.value = '';
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    await cpDb.collection('conversations').doc(cpConvId)
      .collection('messages').add({ text: text, senderId: cpUser.uid, createdAt: now });
    
    const upd = { lastMessage: text, lastMessageAt: now };
    upd['unread.' + cpOtherId] = firebase.firestore.FieldValue.increment(1);
    await cpDb.collection('conversations').doc(cpConvId).update(upd);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIQUE INTERNE (Privée)
  // ══════════════════════════════════════════════════════════════════════════

  function cpLoadConvs() {
    cpConvsUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function(snap) {
        cpAllConvs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        cpRenderConvs(cpAllConvs);
      });
  }

  function cpRenderConvs(convs) {
    const el = document.getElementById('cp-conv-list');
    if (!el) return;
    el.innerHTML = convs.map(function(c) {
      const name = (c.otherNames && c.otherNames[cpUser.uid]) || 'Inconnu';
      return `<div class="cp-conv-item" onclick="cpOpenConv('${c.id}', '${name}')">
                ${name} - ${c.lastMessage}
              </div>`;
    }).join('');
  }

  function cpRenderMessages(docs) {
    const el = document.getElementById('cp-messages');
    if (!el) return;
    el.innerHTML = docs.map(function(d) {
      const m = d.data();
      return `<div class="cp-msg ${m.senderId === cpUser.uid ? 'own' : 'other'}">
                ${m.text}
              </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(function(snap) {
      snap.forEach(function(d){ cpOnlineMap[d.id] = d.data().online || false; });
    });
  }

  // Démarrage
  cpInit();

})();
