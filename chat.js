// ════════════════════════════════════════════════════════════════════════════
//  CHAT WIDGET — chat.js
//  Widget de messagerie temps réel utilisant Firebase Firestore
//  Dépendances : Firebase SDK (compat v10+), auth.js (window.currentUser)
// ════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Configuration Firebase du chat ────────────────────────────────────────
  const CP_CONFIG = {
    apiKey:            "AIzaSyAjUD1IqsLsEl0o-FJvEV15kZ36BkMced8",
    authDomain:        "messages-b1e1a.firebaseapp.com",
    projectId:         "messages-b1e1a",
    storageBucket:     "messages-b1e1a.firebasestorage.app",
    messagingSenderId: "1042430233451",
    appId:             "1:1042430233451:web:8769e50e85f36830805a2e"
  };

  // ── État global du widget ─────────────────────────────────────────────────
  let cpDb           = null;
  let cpUser         = null;
  let cpConvId       = null;
  let cpOtherId      = null;
  let cpOtherName    = null;
  let cpMsgUnsub     = null;
  let cpConvsUnsub   = null;
  let cpStatusUnsub  = null;
  let cpTypingUnsub  = null;
  let cpAllConvs     = [];
  let cpAllUsers     = [];
  let cpOnlineMap    = {};
  let cpPopupOpen    = false;
  let cpReady        = false;
  let cpTypingTimeout = null;

  // ══════════════════════════════════════════════════════════════════════════
  //  INITIALISATION FIREBASE
  // ══════════════════════════════════════════════════════════════════════════
  function cpInit() {
    try {
      const cpApp = firebase.apps.find(a => a.name === 'chat-widget') ||
                    firebase.initializeApp(CP_CONFIG, 'chat-widget');
      cpDb = cpApp.firestore();
      console.log('[chat.js] Firebase initialisé ✓');
    } catch (e) {
      console.error('[chat.js] Erreur init Firebase :', e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ATTENDRE window.currentUser (défini par auth.js)
  // ══════════════════════════════════════════════════════════════════════════
  function cpWaitForAuth() {
    const check = () => {
      if (window.currentUser && cpDb && !cpReady) {
        cpReady = true;
        cpUser  = window.currentUser;
        _cpSetupUser();
      }
    };
    check();
    const id = setInterval(() => {
      check();
      if (cpReady) clearInterval(id);
    }, 300);
  }

  function _cpSetupUser() {
    // ── Profil Firestore ──
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email:       cpUser.email,
      photoURL:    cpUser.photoURL || null,
      online:      true,
      lastSeen:    firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // ── Avatar dans le header du popup ──
    const initials = (cpUser.displayName || cpUser.email)
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const avatarEl = document.getElementById('cp-me-avatar');
    if (avatarEl) avatarEl.textContent = initials;
    const dotEl = document.getElementById('cp-me-dot');
    if (dotEl) dotEl.className = 'cp-status-dot cp-dot-online';

    // ── Marquer offline à la fermeture ──
    window.addEventListener('beforeunload', () => {
      cpDb.collection('users').doc(cpUser.uid)
        .update({
          online:   false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    });

    cpLoadConvs();
    cpWatchAllOnline();
    console.log('[chat.js] Utilisateur connecté :', cpUser.email);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TOGGLE POPUP
  // ══════════════════════════════════════════════════════════════════════════
  window.cpToggle = function () {
    cpPopupOpen = !cpPopupOpen;
    const popup = document.getElementById('chat-popup');
    if (popup) popup.classList.toggle('open', cpPopupOpen);
    // Fermer le context-menu s'il est ouvert
    const ctx = document.getElementById('cp-ctx-menu');
    if (ctx) ctx.classList.remove('open');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  PRÉSENCE ONLINE — surveiller tous les utilisateurs
  // ══════════════════════════════════════════════════════════════════════════
  function cpWatchAllOnline() {
    cpDb.collection('users').onSnapshot(snap => {
      snap.forEach(d => { cpOnlineMap[d.id] = d.data()?.online || false; });
      if (cpAllConvs.length) cpRenderConvs(cpAllConvs);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CONVERSATIONS
  // ══════════════════════════════════════════════════════════════════════════
  function cpConvKey(a, b) { return [a, b].sort().join('_'); }

  function cpLoadConvs() {
    if (!cpUser || !cpDb) return;
    if (cpConvsUnsub) cpConvsUnsub();
    cpConvsUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(snap => {
        cpAllConvs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cpRenderConvs(cpAllConvs);
        cpUpdateFabBadge();
      });
  }

  function cpRenderConvs(convs) {
    const el = document.getElementById('cp-conv-list');
    if (!el) return;
    if (!convs.length) {
      el.innerHTML = '<div class="cp-empty">Aucune conversation.<br>Cliquez <strong>+</strong> pour démarrer.</div>';
      return;
    }
    el.innerHTML = convs.map(c => {
      const name     = c.otherNames?.[cpUser.uid] || 'Inconnu';
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const otherId  = c.participants.find(p => p !== cpUser.uid);
      const unread   = c.unread?.[cpUser.uid] || 0;
      const isOnline = cpOnlineMap[otherId] || false;
      const preview  = c.lastMessage
        ? (c.lastMessage.length > 36 ? c.lastMessage.slice(0, 36) + '…' : c.lastMessage)
        : 'Nouvelle conversation';
      const time = c.lastMessageAt?.toDate ? cpTimeAgo(c.lastMessageAt.toDate()) : '';

      return `<div class="cp-conv-item ${cpConvId === c.id ? 'active' : ''}"
          onclick="cpOpenConv('${c.id}','${otherId}','${name.replace(/'/g, "&apos;")}')"
          oncontextmenu="cpCtxMenu(event,'${c.id}')">
        <div class="cp-conv-avatar-wrap">
          <div class="cp-avatar">${initials}</div>
          ${isOnline ? '<div class="cp-conv-online"></div>' : ''}
        </div>
        <div class="cp-conv-info">
          <div class="cp-conv-name">${cpEsc(name)}${isOnline ? '<span class="cp-online-label">• en ligne</span>' : ''}</div>
          <div class="cp-conv-preview ${unread ? 'cp-preview-bold' : ''}">${cpEsc(preview)}</div>
        </div>
        <div class="cp-conv-meta">
          <div class="cp-conv-time">${time}</div>
          ${unread ? `<div class="cp-unread-badge">${unread}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  window.cpFilterConvs = function (q) {
    const filtered = cpAllConvs.filter(c =>
      (c.otherNames?.[cpUser.uid] || '').toLowerCase().includes(q.toLowerCase())
    );
    cpRenderConvs(filtered);
  };

  function cpUpdateFabBadge() {
    const total = cpAllConvs.reduce((s, c) => s + (c.unread?.[cpUser.uid] || 0), 0);
    const badge = document.getElementById('chat-fab-badge');
    if (!badge) return;
    badge.textContent = total || '';
    badge.style.display = total ? 'flex' : 'none';
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  OUVRIR UNE CONVERSATION
  // ══════════════════════════════════════════════════════════════════════════
  window.cpOpenConv = async function (convId, otherId, otherName) {
    cpConvId    = convId;
    cpOtherId   = otherId;
    cpOtherName = otherName;

    // ── Mettre à jour le header du chat ──
    const nameEl = document.getElementById('cp-chat-name');
    if (nameEl) nameEl.textContent = otherName;
    const statusEl = document.getElementById('cp-chat-status');
    if (statusEl) statusEl.textContent = '…';
    const initials = otherName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const avatarEl = document.getElementById('cp-chat-avatar');
    if (avatarEl) {
      // Premier nœud texte = les initiales
      if (avatarEl.firstChild && avatarEl.firstChild.nodeType === Node.TEXT_NODE) {
        avatarEl.firstChild.textContent = initials;
      } else {
        avatarEl.insertBefore(document.createTextNode(initials), avatarEl.firstChild);
      }
    }

    // ── Basculer les vues ──
    const listView = document.getElementById('cp-view-list');
    const chatView = document.getElementById('cp-view-chat');
    if (listView) listView.style.display = 'none';
    if (chatView) chatView.style.display = 'flex';

    // ── Écoute des messages ──
    if (cpMsgUnsub) cpMsgUnsub();
    cpMsgUnsub = cpDb.collection('conversations').doc(convId)
      .collection('messages').orderBy('createdAt')
      .onSnapshot(snap => cpRenderMessages(snap.docs));

    // ── Marquer comme lu ──
    await cpDb.collection('conversations').doc(convId)
      .update({ [`unread.${cpUser.uid}`]: 0 }).catch(() => {});

    // ── Statut online de l'autre utilisateur ──
    if (cpStatusUnsub) cpStatusUnsub();
    cpStatusUnsub = cpDb.collection('users').doc(otherId).onSnapshot(doc => {
      const d      = doc.data();
      const online = d?.online || false;
      const dot    = document.getElementById('cp-chat-online-dot');
      if (dot) {
        dot.style.display = 'block';
        dot.className = 'cp-status-dot ' + (online ? 'cp-dot-online' : 'cp-dot-offline');
      }
      if (statusEl) {
        statusEl.textContent = online
          ? 'En ligne'
          : (d?.lastSeen?.toDate ? 'Vu ' + cpTimeAgo(d.lastSeen.toDate()) : 'Hors ligne');
      }
    });

    // ── Indicateur de frappe ──
    if (cpTypingUnsub) cpTypingUnsub();
    cpTypingUnsub = cpDb.collection('conversations').doc(convId).onSnapshot(doc => {
      const d        = doc.data();
      const isTyping = d?.typing?.[otherId] || false;
      const bar      = document.getElementById('cp-typing-bar');
      const nameTyp  = document.getElementById('cp-typing-name');
      if (nameTyp) nameTyp.textContent = otherName.split(' ')[0];
      if (bar)    bar.style.display = isTyping ? 'flex' : 'none';
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RETOUR À LA LISTE
  // ══════════════════════════════════════════════════════════════════════════
  window.cpBackToList = function () {
    if (cpMsgUnsub)    { cpMsgUnsub();    cpMsgUnsub    = null; }
    if (cpStatusUnsub) { cpStatusUnsub(); cpStatusUnsub = null; }
    if (cpTypingUnsub) { cpTypingUnsub(); cpTypingUnsub = null; }

    // Arrêter l'indicateur de frappe
    if (cpConvId && cpUser) {
      cpDb.collection('conversations').doc(cpConvId)
        .update({ [`typing.${cpUser.uid}`]: false }).catch(() => {});
    }

    cpConvId = null; cpOtherId = null; cpOtherName = null;

    const chatView = document.getElementById('cp-view-chat');
    const listView = document.getElementById('cp-view-list');
    const typingBar = document.getElementById('cp-typing-bar');
    if (chatView)  chatView.style.display  = 'none';
    if (listView)  listView.style.display  = 'flex';
    if (typingBar) typingBar.style.display = 'none';

    cpRenderConvs(cpAllConvs);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDU DES MESSAGES
  // ══════════════════════════════════════════════════════════════════════════
  function cpRenderMessages(docs) {
    const el = document.getElementById('cp-messages');
    if (!el) return;
    if (!docs.length) {
      el.innerHTML = '<div class="cp-empty">Dites bonjour 👋</div>';
      return;
    }

    let html = '';
    let prevDate = null;

    docs.forEach(d => {
      const m    = d.data();
      const own  = m.senderId === cpUser.uid;
      const date = m.createdAt?.toDate ? m.createdAt.toDate() : null;
      const time = date
        ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '';

      // Séparateur de date
      if (date) {
        const dayStr = date.toDateString();
        if (dayStr !== prevDate) {
          html += `<div class="cp-day-sep"><span>${cpDayLabel(date)}</span></div>`;
          prevDate = dayStr;
        }
      }

      html += `<div class="cp-msg ${own ? 'own' : 'other'}">
        <div class="cp-bubble">${cpEsc(m.text)}</div>
        <div class="cp-msg-time">${time}</div>
      </div>`;
    });

    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INDICATEUR DE FRAPPE
  // ══════════════════════════════════════════════════════════════════════════
  window.cpOnTyping = function () {
    if (!cpConvId || !cpUser) return;
    cpDb.collection('conversations').doc(cpConvId)
      .update({ [`typing.${cpUser.uid}`]: true }).catch(() => {});
    clearTimeout(cpTypingTimeout);
    cpTypingTimeout = setTimeout(() => {
      cpDb.collection('conversations').doc(cpConvId)
        .update({ [`typing.${cpUser.uid}`]: false }).catch(() => {});
    }, 2000);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  ENVOYER UN MESSAGE
  // ══════════════════════════════════════════════════════════════════════════
  window.cpSend = async function () {
    const input = document.getElementById('cp-msg-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !cpConvId || !cpUser) return;

    input.value = '';
    input.style.height = 'auto';
    clearTimeout(cpTypingTimeout);

    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Arrêter l'indicateur de frappe
    cpDb.collection('conversations').doc(cpConvId)
      .update({ [`typing.${cpUser.uid}`]: false }).catch(() => {});

    // Ajouter le message
    await cpDb.collection('conversations').doc(cpConvId)
      .collection('messages').add({ text, senderId: cpUser.uid, createdAt: now });

    // Mettre à jour la conversation
    await cpDb.collection('conversations').doc(cpConvId).update({
      lastMessage:    text,
      lastMessageAt:  now,
      [`unread.${cpOtherId}`]: firebase.firestore.FieldValue.increment(1)
    });
  };

  window.cpHandleKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.cpSend();
    }
  };

  window.cpAutoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 72) + 'px';
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  CONTEXT MENU — clic droit sur une conversation
  // ══════════════════════════════════════════════════════════════════════════
  let cpCtxConvId = null;

  window.cpCtxMenu = function (e, convId) {
    e.preventDefault();
    cpCtxConvId = convId;
    const m = document.getElementById('cp-ctx-menu');
    if (!m) return;
    m.style.left = Math.min(e.clientX, window.innerWidth  - 200) + 'px';
    m.style.top  = Math.min(e.clientY, window.innerHeight -  80) + 'px';
    m.classList.add('open');
  };

  window.cpDeleteConv = async function () {
    const m = document.getElementById('cp-ctx-menu');
    if (m) m.classList.remove('open');
    if (!cpCtxConvId) return;

    // Si c'est la conv ouverte, revenir à la liste
    if (cpCtxConvId === cpConvId) window.cpBackToList();

    // Supprimer les messages puis la conversation
    const msgs  = await cpDb.collection('conversations').doc(cpCtxConvId)
      .collection('messages').get();
    const batch = cpDb.batch();
    msgs.forEach(d => batch.delete(d.ref));
    batch.delete(cpDb.collection('conversations').doc(cpCtxConvId));
    await batch.commit();

    cpCtxConvId = null;
  };

  // Fermer le context-menu si clic ailleurs
  document.addEventListener('click', () => {
    const m = document.getElementById('cp-ctx-menu');
    if (m) m.classList.remove('open');
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  OPTIONS ⋮ dans le chat actif
  // ══════════════════════════════════════════════════════════════════════════
  window.cpShowOptions = function (e) {
    e.stopPropagation();
    if (!cpConvId) return;
    cpCtxConvId = cpConvId;
    const m    = document.getElementById('cp-ctx-menu');
    if (!m) return;
    const rect = e.currentTarget.getBoundingClientRect();
    m.style.left = (rect.right - 195) + 'px';
    m.style.top  = (rect.bottom  +  4) + 'px';
    m.classList.add('open');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  NOUVEAU DM — panneau liste utilisateurs
  // ══════════════════════════════════════════════════════════════════════════
  window.cpToggleUserPanel = function () {
    const p = document.getElementById('cp-user-panel');
    if (!p) return;
    const opening = !p.classList.contains('open');
    p.classList.toggle('open');
    if (opening) {
      const searchEl = document.getElementById('cp-user-search');
      if (searchEl) searchEl.value = '';
      cpLoadUsers();
    }
  };

  async function cpLoadUsers() {
    const snap = await cpDb.collection('users').get();
    cpAllUsers = [];
    snap.forEach(d => {
      if (d.id !== cpUser.uid) cpAllUsers.push({ id: d.id, ...d.data() });
    });
    cpRenderUsers(cpAllUsers);
  }

  window.cpFilterUsers = function (q) {
    cpRenderUsers(cpAllUsers.filter(u =>
      (u.displayName || '').toLowerCase().includes(q.toLowerCase()) ||
      (u.email       || '').toLowerCase().includes(q.toLowerCase())
    ));
  };

  function cpRenderUsers(users) {
    const el = document.getElementById('cp-user-list');
    if (!el) return;
    if (!users.length) {
      el.innerHTML = '<div class="cp-empty">Aucun utilisateur</div>';
      return;
    }
    // Trier : online d'abord
    users.sort((a, b) => (cpOnlineMap[b.id] ? 1 : 0) - (cpOnlineMap[a.id] ? 1 : 0));

    el.innerHTML = users.map(u => {
      const initials = (u.displayName || u.email || '?')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const online = cpOnlineMap[u.id] || false;
      return `<div class="cp-user-item"
          onclick="cpStartDM('${u.id}','${(u.displayName || u.email).replace(/'/g, "&apos;")}')">
        <div style="position:relative;flex-shrink:0;">
          <div class="cp-avatar" style="width:30px;height:30px;font-size:.7rem">${initials}</div>
          <div class="cp-status-dot ${online ? 'cp-dot-online' : 'cp-dot-offline'}"
               style="width:8px;height:8px;border-color:#0a1223"></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="cp-user-name">${cpEsc(u.displayName || '')}</div>
          <div class="cp-user-email">
            ${online
              ? '<span style="color:#22c55e;font-size:.7rem">● En ligne</span>'
              : cpEsc(u.email || '')}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  window.cpStartDM = async function (otherId, otherName) {
    const convId = cpConvKey(cpUser.uid, otherId);
    const ref    = cpDb.collection('conversations').doc(convId);
    const snap   = await ref.get();

    if (!snap.exists) {
      const displayName = cpUser.displayName || cpUser.email.split('@')[0];
      await ref.set({
        participants:  [cpUser.uid, otherId],
        otherNames:    { [cpUser.uid]: displayName, [otherId]: otherName },
        lastMessage:   '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unread:        { [cpUser.uid]: 0, [otherId]: 0 },
        typing:        { [cpUser.uid]: false, [otherId]: false }
      });
    }

    const panel = document.getElementById('cp-user-panel');
    if (panel) panel.classList.remove('open');
    window.cpOpenConv(convId, otherId, otherName);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  UTILITAIRES
  // ══════════════════════════════════════════════════════════════════════════
  function cpEsc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function cpTimeAgo(d) {
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60)    return 'maintenant';
    if (s < 3600)  return Math.floor(s / 60) + 'min';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function cpDayLabel(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    if (d >= today) return "Aujourd'hui";
    if (d >= yest)  return "Hier";
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DÉMARRAGE
  // ══════════════════════════════════════════════════════════════════════════
  cpInit();
  cpWaitForAuth();

})();
