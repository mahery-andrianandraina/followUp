// ════════════════════════════════════════════════════════════════════════════
//  CHAT WIDGET — chat.js  (v3 — whitelist fix)
//  Dépendances : Firebase SDK compat, auth.js (window.currentUser)
// ════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Config Firebase projet CHAT ───────────────────────────────────────────
  const CP_CONFIG = {
    apiKey:            "AIzaSyAjUD1IqsLsEl0o-FJvEV15kZ36BkMced8",
    authDomain:        "messages-b1e1a.firebaseapp.com",
    projectId:         "messages-b1e1a",
    storageBucket:     "messages-b1e1a.firebasestorage.app",
    messagingSenderId: "1042430233451",
    appId:             "1:1042430233451:web:8769e50e85f36830805a2e"
  };

  // ── État ──────────────────────────────────────────────────────────────────
  let cpDb = null, cpUser = null;
  let cpConvId = null, cpOtherId = null, cpOtherName = null;
  let cpMsgUnsub = null, cpConvsUnsub = null, cpStatusUnsub = null, cpTypingUnsub = null;
  let cpAllConvs = [], cpAllUsers = [], cpOnlineMap = {};
  let cpPopupOpen = false, cpReady = false, cpTypingTimeout = null;

  // ══════════════════════════════════════════════════════════════════════════
  //  INIT FIREBASE
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      const app = firebase.apps.find(function(a){ return a.name === 'chat-widget'; })
                  || firebase.initializeApp(CP_CONFIG, 'chat-widget');
      cpDb = app.firestore();
      console.log('[chat] Firestore chat prêt');
    } catch(e) { console.error('[chat] init error', e); }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ATTENDRE window.currentUser
  // ══════════════════════════════════════════════════════════════════════════
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

    var initials = (cpUser.displayName || cpUser.email)
      .split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
    var av = document.getElementById('cp-me-avatar');
    if (av) av.textContent = initials;
    var dot = document.getElementById('cp-me-dot');
    if (dot) dot.className = 'cp-status-dot cp-dot-online';

    window.addEventListener('beforeunload', function() {
      cpDb.collection('users').doc(cpUser.uid)
        .update({ online: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(function(){});
    });

    cpLoadConvs();
    cpWatchAllOnline();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TOGGLE POPUP
  // ══════════════════════════════════════════════════════════════════════════
  window.cpToggle = function() {
    cpPopupOpen = !cpPopupOpen;
    var p = document.getElementById('chat-popup');
    if (p) p.classList.toggle('open', cpPopupOpen);
    var ctx = document.getElementById('cp-ctx-menu');
    if (ctx) ctx.classList.remove('open');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  PRÉSENCE ONLINE
  // ══════════════════════════════════════════════════════════════════════════
  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(function(snap) {
      snap.forEach(function(d){ cpOnlineMap[d.id] = d.data().online || false; });
      if (cpAllConvs.length) cpRenderConvs(cpAllConvs);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CONVERSATIONS
  // ══════════════════════════════════════════════════════════════════════════
  function cpConvKey(a, b) { return [a,b].sort().join('_'); }

  function cpLoadConvs() {
    if (!cpUser || !cpDb) return;
    if (cpConvsUnsub) cpConvsUnsub();
    cpConvsUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function(snap) {
        cpAllConvs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
        cpRenderConvs(cpAllConvs);
        cpUpdateFabBadge();
      });
  }

  function cpRenderConvs(convs) {
    var el = document.getElementById('cp-conv-list');
    if (!el) return;
    if (!convs.length) {
      el.innerHTML = '<div class="cp-empty">Aucune conversation.<br>Cliquez <strong>+</strong> pour démarrer.</div>';
      return;
    }
    el.innerHTML = convs.map(function(c) {
      var name     = (c.otherNames && c.otherNames[cpUser.uid]) || 'Inconnu';
      var initials = name.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
      var otherId  = c.participants.find(function(p){ return p !== cpUser.uid; });
      var unread   = (c.unread && c.unread[cpUser.uid]) || 0;
      var isOnline = cpOnlineMap[otherId] || false;
      var preview  = c.lastMessage
        ? (c.lastMessage.length > 36 ? c.lastMessage.slice(0,36)+'…' : c.lastMessage)
        : 'Nouvelle conversation';
      var time = c.lastMessageAt && c.lastMessageAt.toDate ? cpTimeAgo(c.lastMessageAt.toDate()) : '';
      var safeName = name.replace(/'/g,"&apos;");
      return '<div class="cp-conv-item'+(cpConvId===c.id?' active':'')+'"'
        +' onclick="cpOpenConv(\''+c.id+'\',\''+otherId+'\',\''+safeName+'\')"'
        +' oncontextmenu="cpCtxMenu(event,\''+c.id+'\')">'
        +'<div class="cp-conv-avatar-wrap">'
        +'<div class="cp-avatar">'+initials+'</div>'
        +(isOnline?'<div class="cp-conv-online"></div>':'')
        +'</div>'
        +'<div class="cp-conv-info">'
        +'<div class="cp-conv-name">'+cpEsc(name)+(isOnline?'<span class="cp-online-label">• en ligne</span>':'')+' </div>'
        +'<div class="cp-conv-preview'+(unread?' cp-preview-bold':'')+'">'+cpEsc(preview)+'</div>'
        +'</div>'
        +'<div class="cp-conv-meta">'
        +'<div class="cp-conv-time">'+time+'</div>'
        +(unread?'<div class="cp-unread-badge">'+unread+'</div>':'')
        +'</div></div>';
    }).join('');
  }

  window.cpFilterConvs = function(q) {
    var f = cpAllConvs.filter(function(c){
      return ((c.otherNames && c.otherNames[cpUser.uid]) || '').toLowerCase().includes(q.toLowerCase());
    });
    cpRenderConvs(f);
  };

  function cpUpdateFabBadge() {
    var total = cpAllConvs.reduce(function(s,c){ return s + ((c.unread && c.unread[cpUser.uid]) || 0); }, 0);
    var b = document.getElementById('chat-fab-badge');
    if (!b) return;
    b.textContent = total || '';
    b.style.display = total ? 'flex' : 'none';
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  OUVRIR CONVERSATION
  // ══════════════════════════════════════════════════════════════════════════
  window.cpOpenConv = async function(convId, otherId, otherName) {
    cpConvId = convId; cpOtherId = otherId; cpOtherName = otherName;

    var nameEl   = document.getElementById('cp-chat-name');
    var statusEl = document.getElementById('cp-chat-status');
    if (nameEl)   nameEl.textContent   = otherName;
    if (statusEl) statusEl.textContent = '…';

    var initials = otherName.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    var avatarEl = document.getElementById('cp-chat-avatar');
    if (avatarEl) {
      if (avatarEl.firstChild && avatarEl.firstChild.nodeType === 3) {
        avatarEl.firstChild.textContent = initials;
      } else {
        avatarEl.insertBefore(document.createTextNode(initials), avatarEl.firstChild);
      }
    }

    document.getElementById('cp-view-list').style.display = 'none';
    document.getElementById('cp-view-chat').style.display = 'flex';

    if (cpMsgUnsub) cpMsgUnsub();
    cpMsgUnsub = cpDb.collection('conversations').doc(convId)
      .collection('messages').orderBy('createdAt')
      .onSnapshot(function(snap){ cpRenderMessages(snap.docs); });

    var unreadUpdate = {};
    unreadUpdate['unread.'+cpUser.uid] = 0;
    await cpDb.collection('conversations').doc(convId).update(unreadUpdate).catch(function(){});

    if (cpStatusUnsub) cpStatusUnsub();
    cpStatusUnsub = cpDb.collection('users').doc(otherId).onSnapshot(function(doc) {
      var d = doc.data() || {};
      var online = d.online || false;
      var dot = document.getElementById('cp-chat-online-dot');
      if (dot) { dot.style.display='block'; dot.className='cp-status-dot '+(online?'cp-dot-online':'cp-dot-offline'); }
      if (statusEl) statusEl.textContent = online ? 'En ligne'
        : (d.lastSeen && d.lastSeen.toDate ? 'Vu '+cpTimeAgo(d.lastSeen.toDate()) : 'Hors ligne');
    });

    if (cpTypingUnsub) cpTypingUnsub();
    cpTypingUnsub = cpDb.collection('conversations').doc(convId).onSnapshot(function(doc) {
      var d = doc.data() || {};
      var isTyping = (d.typing && d.typing[otherId]) || false;
      var bar = document.getElementById('cp-typing-bar');
      var nameTyp = document.getElementById('cp-typing-name');
      if (nameTyp) nameTyp.textContent = otherName.split(' ')[0];
      if (bar) bar.style.display = isTyping ? 'flex' : 'none';
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RETOUR LISTE
  // ══════════════════════════════════════════════════════════════════════════
  window.cpBackToList = function() {
    if (cpMsgUnsub)    { cpMsgUnsub();    cpMsgUnsub    = null; }
    if (cpStatusUnsub) { cpStatusUnsub(); cpStatusUnsub = null; }
    if (cpTypingUnsub) { cpTypingUnsub(); cpTypingUnsub = null; }
    if (cpConvId && cpUser) {
      var u = {}; u['typing.'+cpUser.uid] = false;
      cpDb.collection('conversations').doc(cpConvId).update(u).catch(function(){});
    }
    cpConvId = null; cpOtherId = null; cpOtherName = null;
    document.getElementById('cp-view-chat').style.display  = 'none';
    document.getElementById('cp-view-list').style.display  = 'flex';
    document.getElementById('cp-typing-bar').style.display = 'none';
    cpRenderConvs(cpAllConvs);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  MESSAGES
  // ══════════════════════════════════════════════════════════════════════════
  function cpRenderMessages(docs) {
    var el = document.getElementById('cp-messages');
    if (!el) return;
    if (!docs.length) { el.innerHTML = '<div class="cp-empty">Dites bonjour 👋</div>'; return; }
    var html = '', prevDate = null;
    docs.forEach(function(d) {
      var m    = d.data();
      var own  = m.senderId === cpUser.uid;
      var date = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : null;
      var time = date ? date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '';
      if (date) {
        var dayStr = date.toDateString();
        if (dayStr !== prevDate) {
          html += '<div class="cp-day-sep"><span>'+cpDayLabel(date)+'</span></div>';
          prevDate = dayStr;
        }
      }
      html += '<div class="cp-msg '+(own?'own':'other')+'">'
        +'<div class="cp-bubble">'+cpEsc(m.text)+'</div>'
        +'<div class="cp-msg-time">'+time+'</div></div>';
    });
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  window.cpOnTyping = function() {
    if (!cpConvId || !cpUser) return;
    var u = {}; u['typing.'+cpUser.uid] = true;
    cpDb.collection('conversations').doc(cpConvId).update(u).catch(function(){});
    clearTimeout(cpTypingTimeout);
    cpTypingTimeout = setTimeout(function() {
      var u2 = {}; u2['typing.'+cpUser.uid] = false;
      cpDb.collection('conversations').doc(cpConvId).update(u2).catch(function(){});
    }, 2000);
  };

  window.cpSend = async function() {
    var input = document.getElementById('cp-msg-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || !cpConvId || !cpUser) return;
    input.value = ''; input.style.height = 'auto';
    clearTimeout(cpTypingTimeout);
    var now = firebase.firestore.FieldValue.serverTimestamp();
    var u = {}; u['typing.'+cpUser.uid] = false;
    cpDb.collection('conversations').doc(cpConvId).update(u).catch(function(){});
    await cpDb.collection('conversations').doc(cpConvId)
      .collection('messages').add({ text:text, senderId:cpUser.uid, createdAt:now });
    var upd = { lastMessage:text, lastMessageAt:now };
    upd['unread.'+cpOtherId] = firebase.firestore.FieldValue.increment(1);
    await cpDb.collection('conversations').doc(cpConvId).update(upd);
  };

  window.cpHandleKey = function(e) {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); window.cpSend(); }
  };

  window.cpAutoResize = function(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 72)+'px';
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  CONTEXT MENU
  // ══════════════════════════════════════════════════════════════════════════
  var cpCtxConvId = null;

  window.cpCtxMenu = function(e, convId) {
    e.preventDefault(); cpCtxConvId = convId;
    var m = document.getElementById('cp-ctx-menu'); if (!m) return;
    m.style.left = Math.min(e.clientX, window.innerWidth-200)+'px';
    m.style.top  = Math.min(e.clientY, window.innerHeight-80)+'px';
    m.classList.add('open');
  };

  window.cpDeleteConv = async function() {
    var m = document.getElementById('cp-ctx-menu'); if (m) m.classList.remove('open');
    if (!cpCtxConvId) return;
    if (cpCtxConvId === cpConvId) window.cpBackToList();
    var msgs  = await cpDb.collection('conversations').doc(cpCtxConvId).collection('messages').get();
    var batch = cpDb.batch();
    msgs.forEach(function(d){ batch.delete(d.ref); });
    batch.delete(cpDb.collection('conversations').doc(cpCtxConvId));
    await batch.commit();
    cpCtxConvId = null;
  };

  document.addEventListener('click', function() {
    var m = document.getElementById('cp-ctx-menu'); if (m) m.classList.remove('open');
  });

  window.cpShowOptions = function(e) {
    e.stopPropagation(); if (!cpConvId) return;
    cpCtxConvId = cpConvId;
    var m = document.getElementById('cp-ctx-menu'); if (!m) return;
    var rect = e.currentTarget.getBoundingClientRect();
    m.style.left = (rect.right-195)+'px'; m.style.top = (rect.bottom+4)+'px';
    m.classList.add('open');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  NOUVEAU DM — CHARGEMENT WHITELIST
  //
  //  Stratégie robuste en 3 étapes :
  //  1. Chercher dans TOUS les projets Firebase initialisés
  //  2. Fallback : lire collection 'users' du chat (ceux déjà connectés)
  //  3. Croiser les deux pour avoir noms + statut complets
  // ══════════════════════════════════════════════════════════════════════════
  window.cpToggleUserPanel = function() {
    var p = document.getElementById('cp-user-panel'); if (!p) return;
    var opening = !p.classList.contains('open');
    p.classList.toggle('open');
    if (opening) {
      var s = document.getElementById('cp-user-search'); if (s) s.value = '';
      cpLoadUsers();
    }
  };

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement…</div>';

    try {
      // ── Étape 1 : collecter tous les emails depuis la whitelist ──────────
      // On tente TOUS les projets Firebase initialisés (principal + chat)
      // pour maximiser les chances de trouver la whitelist
      var whitelistEmails = [];
      var allApps = firebase.apps; // tableau de toutes les apps initialisées

      console.log('[chat] Apps Firebase disponibles :', allApps.map(function(a){ return a.name; }));

      for (var i = 0; i < allApps.length; i++) {
        try {
          var db   = allApps[i].firestore();
          var snap = await db.collection('whitelist').get();
          if (!snap.empty) {
            console.log('[chat] Whitelist trouvée dans app "'+allApps[i].name+'" — '+snap.size+' entrées');
            snap.forEach(function(d) {
              var email = d.id.toLowerCase().trim();
              if (email && !whitelistEmails.includes(email)) {
                whitelistEmails.push(email);
              }
              // Aussi vérifier si l'email est dans un champ "email" du doc
              var data = d.data();
              if (data && data.email) {
                var e2 = data.email.toLowerCase().trim();
                if (e2 && !whitelistEmails.includes(e2)) whitelistEmails.push(e2);
              }
            });
            break; // trouvé, inutile de chercher ailleurs
          }
        } catch(err) {
          console.warn('[chat] Whitelist inaccessible dans app "'+allApps[i].name+'" :', err.message);
        }
      }

      console.log('[chat] Emails whitelist collectés :', whitelistEmails.length, whitelistEmails);

      // ── Étape 2 : profils depuis la collection 'users' du chat ──────────
      var chatSnap = await cpDb.collection('users').get();
      var chatByEmail = {};
      chatSnap.forEach(function(d) {
        var data = d.data();
        if (data.email) chatByEmail[data.email.toLowerCase().trim()] = Object.assign({uid:d.id}, data);
      });

      console.log('[chat] Profils chat existants :', Object.keys(chatByEmail).length);

      // ── Étape 3 : fusionner ─────────────────────────────────────────────
      var myEmail = (cpUser.email || '').toLowerCase().trim();

      // Si aucune whitelist trouvée → fallback sur tous les users chat connus
      if (whitelistEmails.length === 0) {
        console.warn('[chat] Whitelist vide ou inaccessible — fallback sur collection users');
        whitelistEmails = Object.keys(chatByEmail);
      }

      cpAllUsers = [];
      whitelistEmails.forEach(function(email) {
        if (email === myEmail) return; // exclure soi-même
        var profile = chatByEmail[email] || null;
        var uid     = profile ? profile.uid : null;
        cpAllUsers.push({
          id:             uid || email,
          uid:            uid,
          email:          email,
          displayName:    profile ? (profile.displayName || email.split('@')[0]) : email.split('@')[0],
          online:         uid ? (cpOnlineMap[uid] || false) : false,
          neverConnected: !profile
        });
      });

      console.log('[chat] Utilisateurs à afficher :', cpAllUsers.length);
      cpRenderUsers(cpAllUsers);

    } catch(e) {
      console.error('[chat] Erreur cpLoadUsers :', e);
      if (el) el.innerHTML = '<div class="cp-empty">Erreur : '+cpEsc(e.message)+'</div>';
    }
  }

  window.cpFilterUsers = function(q) {
    var f = cpAllUsers.filter(function(u) {
      return (u.displayName||'').toLowerCase().includes(q.toLowerCase())
          || (u.email||'').toLowerCase().includes(q.toLowerCase());
    });
    cpRenderUsers(f);
  };

  function cpRenderUsers(users) {
    var el = document.getElementById('cp-user-list'); if (!el) return;
    if (!users.length) { el.innerHTML='<div class="cp-empty">Aucun utilisateur trouvé</div>'; return; }

    users.sort(function(a,b) {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.neverConnected !== b.neverConnected) return a.neverConnected ? 1 : -1;
      return (a.displayName||'').localeCompare(b.displayName||'');
    });

    el.innerHTML = users.map(function(u) {
      var initials  = (u.displayName||u.email||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
      var safeEmail = u.email.replace(/'/g,"&apos;");
      var safeName  = (u.displayName||u.email).replace(/'/g,"&apos;");
      var safeUid   = (u.uid||'').replace(/'/g,"&apos;");
      var dotCls    = u.online ? 'cp-dot-online' : 'cp-dot-offline';
      var statusHtml;
      if (u.online)             statusHtml = '<span style="color:#22c55e;font-size:.7rem">● En ligne</span>';
      else if (u.neverConnected) statusHtml = '<span style="color:#475569;font-size:.7rem;font-style:italic">Pas encore connecté</span>';
      else                       statusHtml = '<span style="font-size:.7rem;color:#64748b">'+cpEsc(u.email)+'</span>';

      return '<div class="cp-user-item" onclick="cpStartDM(\''+safeEmail+'\',\''+safeName+'\',\''+safeUid+'\')">'
        +'<div style="position:relative;flex-shrink:0;">'
        +'<div class="cp-avatar" style="width:30px;height:30px;font-size:.7rem">'+initials+'</div>'
        +'<div class="cp-status-dot '+dotCls+'" style="width:8px;height:8px;border-color:#0a1223"></div>'
        +'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div class="cp-user-name">'+cpEsc(u.displayName)+'</div>'
        +'<div class="cp-user-email">'+statusHtml+'</div>'
        +'</div></div>';
    }).join('');
  }

  window.cpStartDM = async function(otherEmail, otherName, otherUid) {
    var otherId = otherUid || otherEmail;
    var convId  = cpConvKey(cpUser.uid, otherId);
    var ref     = cpDb.collection('conversations').doc(convId);
    var snap    = await ref.get();
    if (!snap.exists) {
      var myName = cpUser.displayName || cpUser.email.split('@')[0];
      var data   = {
        participants:  [cpUser.uid, otherId],
        otherNames:    {},
        lastMessage:   '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unread:        {},
        typing:        {}
      };
      data.otherNames[cpUser.uid] = myName;
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

  // ══════════════════════════════════════════════════════════════════════════
  //  UTILITAIRES
  // ══════════════════════════════════════════════════════════════════════════
  function cpEsc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function cpTimeAgo(d) {
    var s = Math.floor((Date.now()-d)/1000);
    if (s<60) return 'maintenant';
    if (s<3600) return Math.floor(s/60)+'min';
    if (s<86400) return Math.floor(s/3600)+'h';
    return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
  }
  function cpDayLabel(d) {
    var today = new Date(); today.setHours(0,0,0,0);
    var yest  = new Date(today); yest.setDate(today.getDate()-1);
    if (d >= today) return "Aujourd'hui";
    if (d >= yest)  return "Hier";
    return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════════════════════
  cpInit();
  cpWaitForAuth();

})();
