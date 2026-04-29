(function () {
  'use strict';

  // ── CONFIGURATION ──
  const CP_CONFIG = {
    apiKey: "AIzaSyDW2PiF8hImM5BP_Bu6WdEWIj2JmBnnhCc",
    authDomain: "messenger-dm-9c709.firebaseapp.com",
    projectId: "messenger-dm-9c709",
    storageBucket: "messenger-dm-9c709.firebasestorage.app",
    messagingSenderId: "147694824892",
    appId: "1:147694824892:web:2c800cca1ff4c2b111cfb9"
  };

  let cpDb = null, cpUser = null, cpReady = false;
  let _cpConvUnsub = null, _cpMsgUnsub = null, _cpTypingUnsub = null;
  let _cpActiveConvId = null, _cpActiveOtherUid = null;
  let _cpConvCache = [];  // cached conversation list for filtering
  let _cpTypingTimeout = null;
  let _cpOnlineUnsub = null;

  // ══════════════════════════════════════════════════════════════
  //  INIT FIREBASE
  //  Attend que le SDK Firebase ET window.currentUser soient prêts
  //  avant d'initialiser le chat (évite le conflit SDK v10/v9)
  // ══════════════════════════════════════════════════════════════
  function cpInit() {
    // Attendre que firebase global ET l'utilisateur soient prêts
    if (typeof firebase === 'undefined' || !window.currentUser) {
      setTimeout(cpInit, 500);
      return;
    }
    if (cpReady) return; // déjà initialisé
    try {
      const app = firebase.apps.find(function (a) { return a.name === 'chat-widget'; })
        || firebase.initializeApp(CP_CONFIG, 'chat-widget');
      cpDb = app.firestore();
      cpUser = window.currentUser;
      cpReady = true;
      console.log('[chat] Firestore connecté avec succès');
      _cpSetupUser();
      _cpLoadConversations();
      _cpSetupHeaderAvatar();
      _cpTrackOnline();
    } catch (e) {
      console.error('[chat] Erreur init:', e);
      // Retry after a delay in case SDK wasn't fully ready
      setTimeout(cpInit, 1000);
    }
  }

  function _cpSetupUser() {
    cpDb.collection('users').doc(cpUser.uid).set({
      displayName: cpUser.displayName || cpUser.email.split('@')[0],
      email: cpUser.email,
      photoURL: cpUser.photoURL || '',
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  function _cpSetupHeaderAvatar() {
    var el = document.getElementById('cp-me-avatar');
    if (el) el.textContent = _cpInitials(cpUser.displayName || cpUser.email);
  }

  // ── Online/Offline tracking ──
  function _cpTrackOnline() {
    window.addEventListener('beforeunload', function () {
      if (cpDb && cpUser) {
        cpDb.collection('users').doc(cpUser.uid).update({
          online: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    // Heartbeat every 2min
    setInterval(function () {
      if (cpDb && cpUser) {
        cpDb.collection('users').doc(cpUser.uid).update({
          online: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }, 120000);
  }

  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════
  function _cpInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function _cpConvId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  }

  function _cpEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _cpTimeLabel(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (_cpSameDay(d, now)) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (_cpYesterday(d, now)) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function _cpFullTime(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function _cpSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function _cpYesterday(d, now) {
    var y = new Date(now); y.setDate(y.getDate() - 1);
    return _cpSameDay(d, y);
  }

  function _cpDayLabel(ts) {
    if (!ts) return '';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var now = new Date();
    if (_cpSameDay(d, now)) return "Aujourd'hui";
    if (_cpYesterday(d, now)) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ══════════════════════════════════════════════════════════════
  //  TOGGLE / NAVIGATION
  // ══════════════════════════════════════════════════════════════
  window.cpToggle = function () {
    var p = document.getElementById('chat-popup');
    if (!p) return;
    var opening = !p.classList.contains('open');
    p.classList.toggle('open');
    if (opening && !cpReady) cpInit();
  };

  window.cpBackToList = function () {
    // Cleanup active chat listeners
    if (_cpMsgUnsub) { _cpMsgUnsub(); _cpMsgUnsub = null; }
    if (_cpTypingUnsub) { _cpTypingUnsub(); _cpTypingUnsub = null; }
    if (_cpOnlineUnsub) { _cpOnlineUnsub(); _cpOnlineUnsub = null; }
    _cpActiveConvId = null;
    _cpActiveOtherUid = null;
    document.getElementById('cp-view-list').style.display = 'flex';
    document.getElementById('cp-view-chat').style.display = 'none';
    // Close context menu
    var ctx = document.getElementById('cp-ctx-menu');
    if (ctx) ctx.classList.remove('open');
  };

  // ══════════════════════════════════════════════════════════════
  //  CONVERSATION LIST (real-time)
  // ══════════════════════════════════════════════════════════════
  function _cpLoadConversations() {
    if (_cpConvUnsub) _cpConvUnsub();
    _cpConvUnsub = cpDb.collection('conversations')
      .where('participants', 'array-contains', cpUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(function (snap) {
        _cpConvCache = [];
        snap.forEach(function (doc) {
          _cpConvCache.push({ id: doc.id, ...doc.data() });
        });
        _cpRenderConvList(_cpConvCache);
        _cpUpdateFabBadge();
      }, function (err) {
        console.error('[chat] Conv listener error:', err);
        var el = document.getElementById('cp-conv-list');
        if (el) el.innerHTML = '<div class="cp-empty">Erreur de chargement</div>';
      });
  }

  function _cpRenderConvList(convs) {
    var el = document.getElementById('cp-conv-list');
    if (!el) return;
    if (!convs.length) {
      el.innerHTML = '<div class="cp-empty">Aucune conversation.<br>Cliquez sur + pour démarrer.</div>';
      return;
    }
    var html = '';
    convs.forEach(function (c) {
      var otherUid = c.participants.find(function (p) { return p !== cpUser.uid; });
      var names = c.participantNames || {};
      var name = names[otherUid] || 'Utilisateur';
      var initials = _cpInitials(name);
      var preview = c.lastMessage ? (c.lastSenderId === cpUser.uid ? 'Vous : ' : '') + c.lastMessage : 'Pas encore de message';
      if (preview.length > 40) preview = preview.substring(0, 40) + '…';
      var time = _cpTimeLabel(c.lastMessageAt);
      var unreadKey = 'unread_' + cpUser.uid;
      var unread = c[unreadKey] || 0;
      var unreadHtml = unread > 0 ? '<span class="cp-unread-badge">' + unread + '</span>' : '';
      var previewCls = unread > 0 ? 'cp-conv-preview cp-preview-bold' : 'cp-conv-preview';

      html += '<div class="cp-conv-item" onclick="cpOpenConv(\'' + _cpEsc(c.id) + '\',\'' + _cpEsc(otherUid) + '\',\'' + _cpEsc(name) + '\')" data-name="' + _cpEsc(name.toLowerCase()) + '">'
        + '<div class="cp-conv-avatar-wrap"><div class="cp-avatar">' + _cpEsc(initials) + '</div>'
        + '<div class="cp-conv-online-dot cp-status-dot" id="cp-conv-dot-' + otherUid + '" style="display:none"></div></div>'
        + '<div class="cp-conv-info"><div class="cp-conv-name">' + _cpEsc(name) + '</div>'
        + '<div class="' + previewCls + '">' + _cpEsc(preview) + '</div></div>'
        + '<div class="cp-conv-meta"><span class="cp-conv-time">' + _cpEsc(time) + '</span>' + unreadHtml + '</div></div>';
    });
    el.innerHTML = html;
    // Check online status for each conv partner
    convs.forEach(function (c) {
      var otherUid = c.participants.find(function (p) { return p !== cpUser.uid; });
      if (otherUid) _cpCheckOnline(otherUid, 'cp-conv-dot-' + otherUid);
    });
  }

  function _cpCheckOnline(uid, dotElId) {
    cpDb.collection('users').doc(uid).get().then(function (doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var dot = document.getElementById(dotElId);
      if (dot && data.online) {
        dot.style.display = 'block';
        dot.classList.add('cp-dot-online');
      }
    }).catch(function () { });
  }

  function _cpUpdateFabBadge() {
    var total = 0;
    _cpConvCache.forEach(function (c) {
      total += (c['unread_' + cpUser.uid] || 0);
    });
    var badge = document.getElementById('chat-fab-badge');
    if (badge) {
      if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  START DM / OPEN CONVERSATION
  // ══════════════════════════════════════════════════════════════
  window.cpStartDM = function (email, name, uid) {
    if (!cpUser || !cpDb) return;
    var convId = _cpConvId(cpUser.uid, uid);
    var names = {};
    names[cpUser.uid] = cpUser.displayName || cpUser.email.split('@')[0];
    names[uid] = name;

    // Create or update conversation doc
    cpDb.collection('conversations').doc(convId).set({
      participants: [cpUser.uid, uid],
      participantNames: names,
      lastMessage: '',
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSenderId: ''
    }, { merge: true }).then(function () {
      // Close user panel
      var panel = document.getElementById('cp-user-panel');
      if (panel) panel.classList.remove('open');
      // Open the conversation
      cpOpenConv(convId, uid, name);
    }).catch(function (e) {
      console.error('[chat] Error creating conv:', e);
    });
  };

  window.cpOpenConv = function (convId, otherUid, otherName) {
    _cpActiveConvId = convId;
    _cpActiveOtherUid = otherUid;

    // Switch view
    document.getElementById('cp-view-list').style.display = 'none';
    document.getElementById('cp-view-chat').style.display = 'flex';

    // Set header
    document.getElementById('cp-chat-name').textContent = otherName || 'Utilisateur';
    document.getElementById('cp-chat-avatar').textContent = _cpInitials(otherName);
    document.getElementById('cp-chat-status').textContent = '';

    // Clear messages
    document.getElementById('cp-messages').innerHTML = '<div class="cp-empty">Chargement…</div>';
    document.getElementById('cp-msg-input').value = '';

    // Mark as read
    var upd = {};
    upd['unread_' + cpUser.uid] = 0;
    cpDb.collection('conversations').doc(convId).update(upd).catch(function () { });

    // Listen to online status of the other user
    if (_cpOnlineUnsub) _cpOnlineUnsub();
    _cpOnlineUnsub = cpDb.collection('users').doc(otherUid).onSnapshot(function (doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var statusEl = document.getElementById('cp-chat-status');
      var dotEl = document.getElementById('cp-chat-online-dot');
      if (data.online) {
        if (statusEl) statusEl.textContent = 'En ligne';
        if (dotEl) { dotEl.style.display = 'block'; dotEl.className = 'cp-status-dot cp-dot-online'; }
      } else {
        var ago = data.lastSeen ? _cpTimeLabel(data.lastSeen) : '';
        if (statusEl) statusEl.textContent = ago ? 'Vu ' + ago : 'Hors ligne';
        if (dotEl) { dotEl.style.display = 'block'; dotEl.className = 'cp-status-dot cp-dot-offline'; }
      }
    });

    // Listen to messages
    if (_cpMsgUnsub) _cpMsgUnsub();
    _cpMsgUnsub = cpDb.collection('conversations').doc(convId)
      .collection('messages').orderBy('createdAt', 'asc')
      .onSnapshot(function (snap) {
        _cpRenderMessages(snap);
        // Reset unread when viewing
        var upd2 = {};
        upd2['unread_' + cpUser.uid] = 0;
        cpDb.collection('conversations').doc(convId).update(upd2).catch(function () { });
      });

    // Listen to typing indicator
    if (_cpTypingUnsub) _cpTypingUnsub();
    _cpTypingUnsub = cpDb.collection('conversations').doc(convId)
      .collection('typing').doc(otherUid)
      .onSnapshot(function (doc) {
        var bar = document.getElementById('cp-typing-bar');
        var nameEl = document.getElementById('cp-typing-name');
        if (!doc.exists || !bar) return;
        var data = doc.data();
        var isTyping = data.isTyping && data.timestamp &&
          (Date.now() - (data.timestamp.toDate ? data.timestamp.toDate().getTime() : 0)) < 10000;
        bar.style.display = isTyping ? 'flex' : 'none';
        if (nameEl && isTyping) nameEl.textContent = otherName ? otherName.split(' ')[0] : '';
      });

    // Focus input
    setTimeout(function () {
      var inp = document.getElementById('cp-msg-input');
      if (inp) inp.focus();
    }, 200);
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER MESSAGES
  // ══════════════════════════════════════════════════════════════
  function _cpRenderMessages(snap) {
    var el = document.getElementById('cp-messages');
    if (!el) return;
    if (snap.empty) {
      el.innerHTML = '<div class="cp-empty">Aucun message.<br>Envoyez le premier ! 👋</div>';
      return;
    }
    var html = '';
    var lastDay = '';
    snap.forEach(function (doc) {
      var m = doc.data();
      if (!m.createdAt) return;
      var day = _cpDayLabel(m.createdAt);
      if (day !== lastDay) {
        html += '<div class="cp-day-sep"><span>' + _cpEsc(day) + '</span></div>';
        lastDay = day;
      }
      var isOwn = m.senderId === cpUser.uid;
      var cls = isOwn ? 'cp-msg own' : 'cp-msg other';
      var time = _cpFullTime(m.createdAt);
      html += '<div class="' + cls + '">'
        + '<div class="cp-bubble">' + _cpEsc(m.text) + '</div>'
        + '<span class="cp-msg-time">' + _cpEsc(time) + '</span></div>';
    });
    el.innerHTML = html;
    // Scroll to bottom
    el.scrollTop = el.scrollHeight;
  }

  // ══════════════════════════════════════════════════════════════
  //  SEND MESSAGE
  // ══════════════════════════════════════════════════════════════
  window.cpSend = function () {
    if (!cpDb || !_cpActiveConvId || !cpUser) return;
    var input = document.getElementById('cp-msg-input');
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';

    var senderName = cpUser.displayName || cpUser.email.split('@')[0];

    // Add message
    cpDb.collection('conversations').doc(_cpActiveConvId)
      .collection('messages').add({
        text: text,
        senderId: cpUser.uid,
        senderName: senderName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    // Update conversation metadata + increment other user's unread
    var convUpd = {
      lastMessage: text.length > 60 ? text.substring(0, 60) + '…' : text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSenderId: cpUser.uid
    };
    if (_cpActiveOtherUid) {
      convUpd['unread_' + _cpActiveOtherUid] = firebase.firestore.FieldValue.increment(1);
    }
    cpDb.collection('conversations').doc(_cpActiveConvId).update(convUpd);

    // Clear typing indicator
    cpDb.collection('conversations').doc(_cpActiveConvId)
      .collection('typing').doc(cpUser.uid).set({ isTyping: false });

    input.focus();
  };

  // ══════════════════════════════════════════════════════════════
  //  INPUT HANDLERS
  // ══════════════════════════════════════════════════════════════
  window.cpHandleKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      cpSend();
    }
  };

  window.cpAutoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 72) + 'px';
  };

  window.cpOnTyping = function () {
    if (!cpDb || !_cpActiveConvId || !cpUser) return;
    cpDb.collection('conversations').doc(_cpActiveConvId)
      .collection('typing').doc(cpUser.uid).set({
        isTyping: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    // Clear after 3s of inactivity
    if (_cpTypingTimeout) clearTimeout(_cpTypingTimeout);
    _cpTypingTimeout = setTimeout(function () {
      if (cpDb && _cpActiveConvId) {
        cpDb.collection('conversations').doc(_cpActiveConvId)
          .collection('typing').doc(cpUser.uid).set({ isTyping: false });
      }
    }, 3000);
  };

  // ══════════════════════════════════════════════════════════════
  //  USER LIST (for new DM)
  // ══════════════════════════════════════════════════════════════
  window.cpToggleUserPanel = function () {
    if (!cpDb || !cpReady) {
      // Trigger init and show loading state
      cpInit();
      var el = document.getElementById('cp-user-list');
      if (el) el.innerHTML = '<div class="cp-empty">Connexion en cours…</div>';
      var p = document.getElementById('cp-user-panel');
      if (p) p.classList.add('open');
      // Retry loading users once ready
      setTimeout(function () {
        if (cpDb && cpReady) cpLoadUsers();
      }, 2000);
      return;
    }
    var p = document.getElementById('cp-user-panel');
    if (!p) return;
    var opening = !p.classList.contains('open');
    p.classList.toggle('open');
    if (opening) cpLoadUsers();
  };

  var _cpUsersCache = [];

  async function cpLoadUsers() {
    var el = document.getElementById('cp-user-list');
    if (el) el.innerHTML = '<div class="cp-empty">Chargement…</div>';
    try {
      var snap = await cpDb.collection('users').get();
      _cpUsersCache = [];
      snap.forEach(function (doc) {
        if (doc.id !== cpUser.uid) {
          _cpUsersCache.push({ uid: doc.id, ...doc.data() });
        }
      });
      _cpRenderUserList(_cpUsersCache);
    } catch (e) {
      console.error('[chat] User load error:', e);
      if (el) el.innerHTML = '<div class="cp-empty">Erreur de chargement</div>';
    }
  }

  function _cpRenderUserList(users) {
    var el = document.getElementById('cp-user-list');
    if (!el) return;
    if (!users.length) {
      el.innerHTML = '<div class="cp-empty">Aucun contact</div>';
      return;
    }
    var html = '';
    users.forEach(function (u) {
      var name = u.displayName || u.email || 'Utilisateur';
      var initials = _cpInitials(name);
      var onlineDot = u.online ? '<div class="cp-status-dot cp-dot-online" style="position:absolute;bottom:0;right:0"></div>' : '';
      html += '<div class="cp-user-item" onclick="cpStartDM(\'' + _cpEsc(u.email) + '\',\'' + _cpEsc(name) + '\',\'' + _cpEsc(u.uid) + '\')">'
        + '<div style="position:relative;flex-shrink:0"><div class="cp-avatar" style="width:30px;height:30px;font-size:.68rem">' + _cpEsc(initials) + '</div>' + onlineDot + '</div>'
        + '<div><div class="cp-user-name">' + _cpEsc(name) + '</div>'
        + '<div class="cp-user-email">' + _cpEsc(u.email) + '</div></div></div>';
    });
    el.innerHTML = html;
  }

  window.cpFilterUsers = function (q) {
    q = (q || '').toLowerCase();
    var filtered = _cpUsersCache.filter(function (u) {
      return (u.displayName || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q);
    });
    _cpRenderUserList(filtered);
  };

  // ══════════════════════════════════════════════════════════════
  //  FILTER CONVERSATIONS
  // ══════════════════════════════════════════════════════════════
  window.cpFilterConvs = function (q) {
    q = (q || '').toLowerCase();
    if (!q) { _cpRenderConvList(_cpConvCache); return; }
    var filtered = _cpConvCache.filter(function (c) {
      var names = c.participantNames || {};
      var otherUid = c.participants.find(function (p) { return p !== cpUser.uid; });
      var name = (names[otherUid] || '').toLowerCase();
      return name.includes(q) || (c.lastMessage || '').toLowerCase().includes(q);
    });
    _cpRenderConvList(filtered);
  };

  // ══════════════════════════════════════════════════════════════
  //  CONTEXT MENU / DELETE
  // ══════════════════════════════════════════════════════════════
  window.cpShowOptions = function (e) {
    e.stopPropagation();
    var menu = document.getElementById('cp-ctx-menu');
    if (!menu) return;
    menu.style.top = e.clientY + 'px';
    menu.style.left = (e.clientX - 180) + 'px';
    menu.classList.toggle('open');
    // Close on next click anywhere
    setTimeout(function () {
      document.addEventListener('click', function _h() {
        menu.classList.remove('open');
        document.removeEventListener('click', _h);
      }, { once: true });
    }, 50);
  };

  window.cpDeleteConv = function () {
    if (!cpDb || !_cpActiveConvId) return;
    var menu = document.getElementById('cp-ctx-menu');
    if (menu) menu.classList.remove('open');

    if (!confirm('Supprimer cette conversation ? Cette action est irréversible.')) return;

    // Delete all messages first, then the conversation doc
    cpDb.collection('conversations').doc(_cpActiveConvId)
      .collection('messages').get().then(function (snap) {
        var batch = cpDb.batch();
        snap.forEach(function (doc) { batch.delete(doc.ref); });
        return batch.commit();
      }).then(function () {
        // Delete typing docs
        return cpDb.collection('conversations').doc(_cpActiveConvId)
          .collection('typing').get();
      }).then(function (snap) {
        var batch = cpDb.batch();
        snap.forEach(function (doc) { batch.delete(doc.ref); });
        return batch.commit();
      }).then(function () {
        return cpDb.collection('conversations').doc(_cpActiveConvId).delete();
      }).then(function () {
        cpBackToList();
      }).catch(function (e) {
        console.error('[chat] Delete error:', e);
      });
  };

  // ══════════════════════════════════════════════════════════════
  //  LAUNCH
  // ══════════════════════════════════════════════════════════════
  cpInit();

})();
