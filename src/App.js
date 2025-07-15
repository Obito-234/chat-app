import './App.css';
import React, { useState, useRef, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, arrayUnion, updateDoc, getDoc, deleteDoc, where, setDoc, deleteField, getDocs } from "firebase/firestore";

function NewChatModal({ open, onClose, user, onCreated }) {
  const [tab, setTab] = useState("personal");
  const [chatName, setChatName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [copied, setCopied] = useState(false);

  const descWarning = /^(desc(r)?iption)$/i.test(desc.trim());

  const handleCreate = async () => {
    setLoading(true);
    try {
      let name = chatName;
      let description = desc;
      if (tab === "personal") {
        name = chatName || (user.displayName + " & ...");
      }
      const docRef = await addDoc(collection(db, "conversations"), {
        name,
        description,
        type: tab,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        createdBy: user.uid,
        members: [user.uid],
        initials: name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2),
      });
      setCreatedId(docRef.id);
      setChatName("");
      setDesc("");
      if (onCreated) onCreated(docRef.id);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdId) return;
    await navigator.clipboard.writeText(window.location.origin + "/join/" + createdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleClose = () => {
    setCreatedId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-title">Create New Chat</span>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        {createdId ? (
          <>
            <div className="modal-label">Chat Created!</div>
            <div style={{ margin: "16px 0 8px 0", wordBreak: "break-all", background: "#18191a", color: "#4f8cff", borderRadius: 8, padding: 10, fontSize: 14 }}>
              {window.location.origin + "/join/" + createdId}
            </div>
            <button className="modal-create-btn" onClick={handleCopy} style={{ marginBottom: 12 }}>
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button className="modal-create-btn" onClick={handleClose}>OK</button>
          </>
        ) : (
          <>
            <div className="modal-tabs">
              <button
                className={"modal-tab" + (tab === "personal" ? " active" : "")}
                onClick={() => setTab("personal")}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M15 19v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
                Personal
              </button>
              <button
                className={"modal-tab" + (tab === "group" ? " active" : "")}
                onClick={() => setTab("group")}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5"/></svg>
                Group
              </button>
            </div>
            {tab === "group" && (
              <>
                <div className="modal-label">Chat Name</div>
                <input
                  className="modal-input"
                  placeholder="Enter chat name..."
                  value={chatName}
                  onChange={e => setChatName(e.target.value)}
                />
                <div className="modal-label">Description (Optional)</div>
                <textarea
                  className="modal-input modal-textarea"
                  placeholder="What's this chat about?"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
                {descWarning && <div style={{ color: '#e53e3e', marginTop: 4, fontSize: 14 }}>Please enter a meaningful description.</div>}
              </>
            )}
            {tab === "personal" && (
              <>
                <div className="modal-label">Description (Optional)</div>
                <textarea
                  className="modal-input modal-textarea"
                  placeholder="What's this chat about?"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
                {descWarning && <div style={{ color: '#e53e3e', marginTop: 4, fontSize: 14 }}>Please enter a meaningful description.</div>}
              </>
            )}
            <div className="modal-actions">
              <button className="modal-create-btn" onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create Chat"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function JoinLinkModal({ open, onClose, user, setSelectedId }) {
  const [link, setLink] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setError("");
    setJoining(true);
    let id = link.trim();
    // Accept full URL or just ID
    if (id.includes("/")) id = id.split("/").pop();
    try {
      const docRef = doc(db, "conversations", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Chat not found");
      const data = docSnap.data();
      if (data.type === "personal" && Array.isArray(data.members) && data.members.length >= 2 && !data.members.includes(user.uid)) {
        throw new Error("This personal chat already has two members.");
      }
      // Add user to members if not already present
      if (!data.members.includes(user.uid)) {
        await updateDoc(docRef, { members: arrayUnion(user.uid) });
      }
      setSelectedId(id);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to join chat");
    } finally {
      setJoining(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 360, maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Join Chat via Link</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-label">Paste invite link</div>
        <input
          className="modal-input"
          placeholder="Paste chat link or ID here..."
          value={link}
          onChange={e => setLink(e.target.value)}
        />
        {error && <div style={{ color: '#e53e3e', margin: '8px 0 0 0', fontSize: 14 }}>{error}</div>}
        <div className="modal-actions">
          <button className="modal-create-btn" onClick={handleJoin} disabled={joining}>{joining ? "Joining..." : "Join"}</button>
        </div>
      </div>
    </div>
  );
}

function DeleteChatModal({ open, onClose, onDelete }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 340, maxWidth: 400, textAlign: 'center' }}>
        <div className="modal-header">
          <span className="modal-title">Delete Chat</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ margin: '24px 0', fontSize: 17 }}>
          Are you sure you want to delete this chat?<br />
          <span style={{ color: '#e53e3e', fontWeight: 500 }}>This cannot be undone.</span>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center', gap: 16 }}>
          <button className="modal-create-btn" style={{ background: '#393a3b' }} onClick={onClose}>Cancel</button>
          <button className="modal-create-btn" style={{ background: '#e53e3e' }} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user, conversations, selectedId, onSelect, theme, onThemeToggle, onSignOut, onNewChat, onJoinLink, userProfiles }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !avatarRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="sidebar">
      <div className="sidebar-header sidebar-topbar">
        <span className="sidebar-title">Messages</span>
        <div style={{ position: "relative" }}>
          <img
            ref={avatarRef}
            src={user.photoURL}
            alt="avatar"
            className="sidebar-avatar"
            onClick={() => setDropdownOpen((v) => !v)}
            style={{ cursor: "pointer", width: 38, height: 38, borderRadius: "50%" }}
          />
          {dropdownOpen && (
            <div className="avatar-dropdown" ref={dropdownRef}>
              <button className="dropdown-item" onClick={onNewChat}>
                <span className="sidebar-action-icon" style={{ marginRight: 8 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M19 2v6M22 5h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
                New Chat
              </button>
              <button className="dropdown-item" onClick={onJoinLink}>
                <span className="sidebar-action-icon" style={{ marginRight: 8 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4f8cff"/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
                Join via Link
              </button>
              <div className="avatar-dropdown-divider" />
              <button className="dropdown-item" onClick={onThemeToggle}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button className="dropdown-item" onClick={onSignOut}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
      <input className="search-bar" placeholder="Search conversations..." style={{ marginTop: 12 }} />
      <div className="conversation-list sidebar-hide-mobile">
        {conversations.map((conv) => {
          let displayName = conv.name;
          if (conv.type === "personal" && Array.isArray(conv.members) && conv.members.length === 2) {
            const otherUid = conv.members.find(uid => uid !== user.uid);
            if (userProfiles && userProfiles[otherUid] && userProfiles[otherUid].displayName) {
              displayName = userProfiles[otherUid].displayName;
            } else if (conv.lastMessageSender && conv.lastMessageSender !== user.displayName) {
              displayName = conv.lastMessageSender;
            } else {
              displayName = otherUid || "Unknown";
            }
          }
          return (
            <div
              key={conv.id}
              className={
                "conversation" + (selectedId === conv.id ? " selected" : "")
              }
              onClick={() => onSelect(conv.id)}
            >
              <div className="avatar-circle">
                {conv.initials}
                {conv.online && <span className="online-dot" />}
              </div>
              <div className="conversation-info">
                <div className="conversation-top">
                  <span className="conversation-name">{displayName}</span>
                  <span className="conversation-time">
                  </span>
                </div>
                <div className="conversation-bottom">
                  <span className="conversation-last">
                    {conv.lastMessageSender ? (
                      <b>{conv.lastMessageSender}:</b>
                    ) : null} {conv.lastMessage || <i>No messages yet</i>}
                  </span>
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AUTO_CLEAR_OPTIONS = [
  { value: "none", label: "None" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "1m", label: "1 Month" },
];

function ClearMessagesModal({ open, onClose, onClear }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 340, maxWidth: 400, textAlign: 'center' }}>
        <div className="modal-header">
          <span className="modal-title">Clear All Messages</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ margin: '24px 0', fontSize: 17 }}>
          Are you sure you want to clear all messages in this chat?<br />
          <span style={{ color: '#e53e3e', fontWeight: 500 }}>This cannot be undone.</span>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center', gap: 16 }}>
          <button className="modal-create-btn" style={{ background: '#393a3b' }} onClick={onClose}>Cancel</button>
          <button className="modal-create-btn" style={{ background: '#e53e3e' }} onClick={onClear}>Clear All</button>
        </div>
      </div>
    </div>
  );
}

function GroupMembersModal({ open, onClose, members, userProfiles }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 340, maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Group Members</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ margin: '16px 0 0 0' }}>
          {members.map(uid => {
            const profile = userProfiles[uid];
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {profile && profile.photoURL ? (
                  <img src={profile.photoURL} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f8cff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
                    {profile && profile.displayName ? profile.displayName[0] : '?'}
                  </div>
                )}
                <span style={{ fontWeight: 500, fontSize: 16 }}>
                  {profile && profile.displayName ? profile.displayName : uid}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MainChat({ selectedConversation, user, userProfiles }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [autoClear, setAutoClear] = useState("none");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef();
  const [showGroupMembers, setShowGroupMembers] = useState(false);

  // Fetch autoClear setting from Firestore
  useEffect(() => {
    if (!selectedConversation) return;
    setAutoClear(selectedConversation.autoClear || "none");
  }, [selectedConversation]);

  function getAutoClearMs(val) {
    if (val === "24h") return 24 * 60 * 60 * 1000;
    if (val === "7d") return 7 * 24 * 60 * 60 * 1000;
    if (val === "1m") return 30 * 24 * 60 * 60 * 1000;
    return null;
  }

  // Auto-clear old messages
  async function autoClearMessages() {
    if (!selectedConversation || autoClear === "none") return;
    const ms = getAutoClearMs(autoClear);
    if (!ms) return;
    const cutoff = Date.now() - ms;
    const qMsgs = query(
      collection(db, "conversations", selectedConversation.id, "messages"),
      orderBy("createdAt")
    );
    const snap = await getDocs(qMsgs);
    const batch = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.createdAt && data.createdAt.toMillis && data.createdAt.toMillis() < cutoff) {
        batch.push(deleteDoc(doc(db, "conversations", selectedConversation.id, "messages", docSnap.id)));
      }
    });
    await Promise.all(batch);
  }

  // Run auto-clear on chat load and after sending
  useEffect(() => {
    autoClearMessages();
  }, [selectedConversation, autoClear]);

  useEffect(() => {
    if (!selectedConversation) return;
    const q = query(
      collection(db, "conversations", selectedConversation.id, "messages"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [selectedConversation]);

  // Typing indicator: listen for typing users
  useEffect(() => {
    if (!selectedConversation) return;
    const typingRef = collection(db, "conversations", selectedConversation.id, "typing");
    const unsub = onSnapshot(typingRef, (snap) => {
      const others = snap.docs
        .map(doc => doc.data())
        .filter(d => d.uid !== user.uid);
      setTypingUsers(others);
    });
    return () => unsub();
  }, [selectedConversation, user.uid]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!selectedConversation) return;
    setDoc(doc(db, "conversations", selectedConversation.id, "typing", user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      timestamp: Date.now(),
    });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      deleteDoc(doc(db, "conversations", selectedConversation.id, "typing", user.uid));
    }, 1500);
  };

  const clearTyping = () => {
    if (!selectedConversation) return;
    deleteDoc(doc(db, "conversations", selectedConversation.id, "typing", user.uid));
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await addDoc(collection(db, "conversations", selectedConversation.id, "messages"), {
      text: newMessage,
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    });
    // Update lastMessageAt and lastMessage in conversation
    await updateDoc(doc(db, "conversations", selectedConversation.id), {
      lastMessageAt: serverTimestamp(),
      lastMessage: newMessage,
      lastMessageSender: user.displayName,
    });
    setNewMessage("");
    clearTyping();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + "/join/" + selectedConversation.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "conversations", selectedConversation.id));
    window.location.reload(); 
  };

  // Get other user's profile for personal chat
  let otherUserProfile = null;
  if (selectedConversation && selectedConversation.type === "personal" && Array.isArray(selectedConversation.members) && selectedConversation.members.length === 2) {
    const otherUid = selectedConversation.members.find(uid => uid !== user.uid);
    if (userProfiles && userProfiles[otherUid]) {
      otherUserProfile = userProfiles[otherUid];
    }
  }

  // Update autoClear in Firestore
  const handleAutoClearChange = async (e) => {
    const val = e.target.value;
    setAutoClear(val);
    await updateDoc(doc(db, "conversations", selectedConversation.id), { autoClear: val });
  };

  // Clear all messages now
  const handleClearAllMessages = async () => {
    const qMsgs = query(collection(db, "conversations", selectedConversation.id, "messages"));
    const snap = await getDocs(qMsgs);
    const batch = [];
    snap.forEach(docSnap => {
      batch.push(deleteDoc(doc(db, "conversations", selectedConversation.id, "messages", docSnap.id)));
    });
    await Promise.all(batch);
    setShowClearModal(false);
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!selectedConversation) {
    return (
      <div className="mainchat-welcome">
        <div className="mainchat-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#4F8CFF"/><path d="M7 13.5L17 7L13.5 17L11 13.5L7 13.5Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </div>
        <div className="mainchat-title">Welcome to Chat</div>
        <div className="mainchat-desc">Select a conversation to start messaging</div>
      </div>
    );
  }

  return (
    <div className="mainchat-chatui">
      <DeleteChatModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
      />
      <ClearMessagesModal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        onClear={handleClearAllMessages}
      />
      <GroupMembersModal
        open={showGroupMembers}
        onClose={() => setShowGroupMembers(false)}
        members={selectedConversation.type === 'group' ? selectedConversation.members : []}
        userProfiles={userProfiles}
      />
      <div className="chat-header" style={{ display: 'flex', alignItems: 'center' }}>
        {selectedConversation.type === "personal" && otherUserProfile && (
          <div className="chat-header-avatar" style={{ marginRight: 16 }}>
            {otherUserProfile.photoURL ? (
              <img src={otherUserProfile.photoURL} alt="avatar" style={{ width: 38, height: 38, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#4f8cff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>
                {otherUserProfile.displayName ? otherUserProfile.displayName[0] : "?"}
              </div>
            )}
          </div>
        )}
        {selectedConversation.type === "group" && (
          <div className="chat-header-avatar" style={{ marginRight: 16, width: 38, height: 38, borderRadius: '50%', background: '#4f8cff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setShowGroupMembers(true)}
            aria-label="View group members"
            title="View group members"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}><circle cx="12" cy="12" r="12" fill="#2563eb"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="1.5"/></svg>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 13, lineHeight: 1, marginTop: 2 }}>{selectedConversation.initials || ''}</span>
          </div>
        )}
        <span className="chat-title">{selectedConversation.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="chat-header-btn" onClick={handleCopyLink} title="Copy chat link">
            {copied ? (
              <span style={{ color: '#4f8cff', fontWeight: 600 }}>Copied!</span>
            ) : (
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4f8cff"/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            )}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="chat-header-btn" onClick={() => setMenuOpen(v => !v)} title="More actions">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#393a3b"/><circle cx="12" cy="8" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><circle cx="12" cy="16" r="1.5" fill="#fff"/></svg>
            </button>
            {menuOpen && (
              <div className="chat-header-menu" ref={menuRef}>
                <div className="chat-header-menu-item" style={{ padding: 0, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 14, color: '#b0b3b8', margin: '0 0 4px 12px' }}>Auto-clear</label>
                  <select value={autoClear} onChange={handleAutoClearChange} className="chat-header-dropdown" style={{ width: 'calc(100% - 24px)', margin: '0 12px 8px 12px' }}>
                    {AUTO_CLEAR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <button className="chat-header-menu-item" onClick={() => { setShowClearModal(true); setMenuOpen(false); }}>Clear Messages Now</button>
                <button className="chat-header-menu-item" onClick={() => { setShowDeleteModal(true); setMenuOpen(false); }} style={{ color: '#e53e3e' }}>Delete Chat</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#b0b3b8', fontSize: 18, marginTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 1s' }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: 'bounce 1.2s infinite alternate' }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: 20, color: '#4f8cff', marginBottom: 6 }}>No messages yet</div>
            <div style={{ fontSize: 16 }}>Say <span style={{ color: '#4f8cff', fontWeight: 500 }}>'hello'</span> and start the conversation!</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                "chat-message-row" + (msg.uid === user.uid ? " self" : "")
              }
            >
              <div className="chat-avatar">
                {msg.photoURL ? (
                  <img src={msg.photoURL} alt="avatar" />
                ) : (
                  <div className="chat-avatar-fallback">
                    {msg.displayName ? msg.displayName[0] : "?"}
                  </div>
                )}
              </div>
              <div className="chat-bubble-wrap">
                <div className="chat-message-meta">
                  <span className="chat-message-name">{msg.displayName}</span>
                </div>
                <div className="chat-bubble">{msg.text}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ margin: '8px 0 0 60px', color: '#4f8cff', fontSize: 15, fontWeight: 500 }}>
            {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>
      <form className="chat-inputbar" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={handleTyping}
          onBlur={clearTyping}
        />
        <button className="chat-send-btn" type="submit">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#4F8CFF"/><path d="M7 13.5L17 7L13.5 17L11 13.5L7 13.5Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </button>
      </form>
    </div>
  );
}

function SignInPage() {
  const handleSignIn = async () => {
    await signInWithPopup(auth, provider);
  };
  return (
    <div className="signin">
      <div className="signin-card">
        <div style={{ marginBottom: 18 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#4F8CFF"/><path d="M7 13.5L17 7L13.5 17L11 13.5L7 13.5Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </div>
        <div className="signin-title">Welcome to Mintalk</div>
        <div className="signin-desc">Sign in with Google to start chatting in real time.</div>
        <button className="signin-btn" onClick={handleSignIn}>Sign in with Google</button>
      </div>
    </div>
  );
}

function MobileTopBar({ user, onAvatarClick, searchValue, onSearchChange }) {
  return (
    <div className="mobile-topbar">
      <div className="mobile-topbar-row">
        <span className="sidebar-title">Messages</span>
        <div style={{ position: "relative" }}>
          <img
            src={user.photoURL}
            alt="avatar"
            className="sidebar-avatar"
            onClick={onAvatarClick}
            style={{ cursor: "pointer", width: 38, height: 38, borderRadius: "50%" }}
          />
        </div>
      </div>
      <input
        className="search-bar mobile-search-bar"
        placeholder="Search conversations..."
        value={searchValue}
        onChange={onSearchChange}
      />
    </div>
  );
}

function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showJoinLink, setShowJoinLink] = useState(false);
  const [userProfiles, setUserProfiles] = useState({}); // uid -> profile
  const [searchValue, setSearchValue] = useState("");
  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // detect mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.className = theme === "dark" ? "theme-dark" : "theme-light";
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
    }, { merge: true });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    async function fetchProfiles() {
      if (!user) return;
      const neededUids = new Set();
      conversations.forEach(conv => {
        if (conv.type === "personal" && Array.isArray(conv.members) && conv.members.length === 2) {
          const otherUid = conv.members.find(uid => uid !== user.uid);
          if (otherUid && !userProfiles[otherUid]) neededUids.add(otherUid);
        }
      });
      for (let uid of neededUids) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          setUserProfiles(prev => ({ ...prev, [uid]: userDoc.data() }));
        }
      }
    }
    fetchProfiles();
  }, [conversations, user]);

  const handleThemeToggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const handleSignOut = () => signOut(auth);

  if (!user) return <SignInPage />;

  return (
    <>
      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} user={user} onCreated={setSelectedId} />
      <JoinLinkModal open={showJoinLink} onClose={() => setShowJoinLink(false)} user={user} setSelectedId={setSelectedId} />
      <div className="chat-layout">
        {!isMobile && (
          <Sidebar
            user={user}
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onSignOut={handleSignOut}
            onNewChat={() => setShowNewChat(true)}
            onJoinLink={() => setShowJoinLink(true)}
            userProfiles={userProfiles}
          />
        )}
        {isMobile && (
          <MobileTopBar
            user={user}
            onAvatarClick={() => {}}
            searchValue={searchValue}
            onSearchChange={e => setSearchValue(e.target.value)}
          />
        )}
        <div className="mainchat">
          <MainChat selectedConversation={selectedConversation} user={user} userProfiles={userProfiles} />
        </div>
      </div>
    </>
  );
}

export default App;
