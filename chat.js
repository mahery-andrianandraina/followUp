// ════════════════════════════════════════════════════════════════════════════
//  CHAT WIDGET — chat.js (Version Finale Corrigée)
//  Projet : messenger-dm
// ════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── CONFIGURATION FORCEE ──────────────────────────────────────────────────
  const CP_CONFIG = {
    apiKey: "AIzaSyCxzZnNJyvBpOKubQmEmhcZOXk8IdLsEyc",
    authDomain: "messenger-dm.firebaseapp.com",
    projectId: "messenger-dm",
    storageBucket: "messenger-dm.firebasestorage.app",
    messagingSenderId: "420241788990",
    appId: "1:420241788990:web:117e6ee57619b2a08dc16f"
  };

  function cpInit() {
    if (!window.firebase) return;
    
    // CE LOG VA NOUS DIRE SI LE FICHIER EST BIEN MIS A JOUR
    console.log("Tentative de connexion à :", CP_CONFIG.projectId);

    var app = firebase.apps.find(a => a.options.projectId === CP_CONFIG.projectId);
    if (!app) app = firebase.initializeApp(CP_CONFIG, "chat-app");
    cpDb = app.firestore();
    cpCheckUser();
  }

  function cpCheckUser() {
    if (window.currentUser) {
      cpUser = window.currentUser;
      cpStart();
    } else {
      // Attente du login via auth.js
      setTimeout(cpCheckUser, 1000);
    }
  }

  function cpStart() {
    if (cpReady) return;
    cpReady = true;
    console.log("Chat démarré sur messenger-dm pour :", cpUser.email);
    
    cpListenUsers();
    cpListenConvs();
    cpUpdateStatus(true);
    
    // Auto-update status online/offline
    window.addEventListener('beforeunload', function() { cpUpdateStatus(false); });
    document.addEventListener('visibilitychange', function() {
      cpUpdateStatus(document.visibilityState === 'visible');
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FIRESTORE - ÉCOUTEURS
  // ══════════════════════════════════════════════════════════════════════════
  
  function cpUpdateStatus(isOnline) {
    if (!cpDb || !cpUser) return;
    cpDb.collection('users').doc(cpUser.uid).set({
      uid: cpUser.uid,
      email: cpUser.email,
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      photoURL: cpUser.photoURL || '',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: isOnline
    }, { merge: true });
  }

  function cpListenUsers() {
    cpDb.collection('users').onSnapshot(function(snap) {
      cpAllUsers = [];
      snap.forEach(function(doc) {
        var u = doc.data();
        if (u.uid !== cpUser.uid) {
          cpAllUsers.push(u);
          cpOnlineMap[u.uid] = u.online || false;
        }
      });
      cpRenderUserList();
    });
  }

  function cpListenConvs() {
    if (cpConvsUnsub) cpConvsUnsub();
    cpConvsUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function(snap) {
        cpAllConvs = [];
        snap.forEach(function(doc) {
          var data = doc.data();
          data.id = doc.id;
          cpAllConvs.push(data);
        });
        cpRenderConvList();
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MESSAGES ET ENVOI
  // ══════════════════════════════════════════════════════════════════════════

  window.cpSendMessage = async function() {
    var input = document.getElementById('cp-chat-input');
    var text = input.value.trim();
    if (!text || !cpConvId) return;

    input.value = '';
    var msgData = {
      senderId: cpUser.uid,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await cpDb.collection('conversations').doc(cpConvId).collection('messages').add(msgData);
    
    // Mise à jour de la conversation parente
    var upd = {
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSenderId: cpUser.uid
    };
    upd['unread.' + cpOtherId] = firebase.firestore.FieldValue.increment(1);
    cpDb.collection('conversations').doc(cpConvId).update(upd);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  FONCTIONS D'OUVERTURE (DM / CONV)
  // ══════════════════════════════════════════════════════════════════════════

  window.cpStartDM = async function(otherId, otherName) {
    var ids = [cpUser.uid, otherId].sort();
    var convId = ids.join('_');
    var ref = cpDb.collection('conversations').doc(convId);
    var snap = await ref.get();

    if (!snap.exists) {
      var data = {
        participants: [cpUser.uid, otherId],
        otherNames: {},
        lastMessage: '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unread: {},
        typing: {}
      };
      data.otherNames[cpUser.uid] = cpUser.displayName || cpUser.email.split('@')[0];
      data.otherNames[otherId]    = otherName;
      data.unread[cpUser.uid]     = 0;
      data.unread[otherId]        = 0;
      data.typing[cpUser.uid]     = false;
      data.typing[otherId]        = false;
      await ref.set(data);
    }
    var panel = document.getElementById('cp-user-panel');
    if (panel) panel.classList.remove('open');
    window.cpOpenConv(convId, otherId, otherName);
  };

  // ... (Garde tes fonctions cpOpenConv, cpRenderUserList, etc. ici) ...

  // Lancement
  if (document.readyState === 'complete') cpInit();
  else window.addEventListener('load', cpInit);

})();
