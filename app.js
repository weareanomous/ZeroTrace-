import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  get,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm";

// Your Firebase config - replace with yours
const firebaseConfig = {
  apiKey: "AIzaSyAk6IgJSIZyM-5zOwtOYy4UilWunuCG_Eo",
  authDomain: "host-a-web.firebaseapp.com",
  databaseURL: "https://host-a-web-default-rtdb.firebaseio.com",
  projectId: "host-a-web",
  storageBucket: "host-a-web.firebasestorage.app",
  messagingSenderId: "434120927937",
  appId: "1:434120927937:web:ea87b3779833dd64ba4240"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const secretKey = "SuperSecureKey123"; // Change for production!

// UI refs
const authDiv = document.getElementById("auth");
const mainDiv = document.getElementById("main");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const friendEmailInput = document.getElementById("friendEmail");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendsListEl = document.getElementById("friendsList");
const chatArea = document.getElementById("chatArea");
const chatFriendName = document.getElementById("chatFriendName");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const closeChatBtn = document.getElementById("closeChatBtn");

let currentUser = null;
let currentChatId = null;
let currentChatFriend = null;

// Encryption helpers
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}
function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "[Encrypted]";
  }
}

// Auth handlers
loginBtn.onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }
  signInWithEmailAndPassword(auth, email, password)
    .catch(e => alert(e.message));
};

signupBtn.onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }
  createUserWithEmailAndPassword(auth, email, password)
    .then(({ user }) => {
      // Create user profile in DB
      set(ref(db, `users/${user.uid}`), {
        email: user.email,
      });
      alert("Account created! Please login.");
      emailInput.value = "";
      passwordInput.value = "";
    })
    .catch(e => alert(e.message));
};

logoutBtn.onclick = () => {
  signOut(auth);
  chatArea.style.display = "none";
  friendsListEl.innerHTML = "";
  friendEmailInput.value = "";
  messageInput.value = "";
  currentChatId = null;
  currentChatFriend = null;
};

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authDiv.style.display = "none";
    mainDiv.style.display = "block";
    loadFriends();
  } else {
    currentUser = null;
    authDiv.style.display = "block";
    mainDiv.style.display = "none";
    chatArea.style.display = "none";
    friendsListEl.innerHTML = "";
    friendEmailInput.value = "";
    messageInput.value = "";
  }
});

async function loadFriends() {
  const friendsRef = ref(db, `friends/${currentUser.uid}`);
  onValue(friendsRef, async snapshot => {
    const data = snapshot.val() || {};
    friendsListEl.innerHTML = "";
    for (const friendUid in data) {
      const userSnap = await get(ref(db, `users/${friendUid}`));
      const friendEmail = userSnap.val()?.email || "Unknown";
      const li = document.createElement("li");
      li.textContent = friendEmail;
      li.style.cursor = "pointer";
      li.onclick = () => openChat(friendUid, friendEmail);
      friendsListEl.appendChild(li);
    }
  });
}

addFriendBtn.onclick = async () => {
  const friendEmail = friendEmailInput.value.trim().toLowerCase();
  if (!friendEmail) {
    alert("Enter friend's email");
    return;
  }
  if (friendEmail === currentUser.email.toLowerCase()) {
    alert("You can't add yourself!");
    return;
  }
  const usersRef = ref(db, 'users');
  const q = query(usersRef, orderByChild('email'), equalTo(friendEmail));
  const querySnap = await get(q);
  if (!querySnap.exists()) {
    alert("User not found");
    return;
  }
  const friendUid = Object.keys(querySnap.val())[0];
  await set(ref(db, `friends/${currentUser.uid}/${friendUid}`), true);
  await set(ref(db, `friends/${friendUid}/${currentUser.uid}`), true);
  friendEmailInput.value = "";
  alert("Friend added!");
};

function getChatId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
}

function openChat(friendUid, friendEmail) {
  currentChatId = getChatId(currentUser.uid, friendUid);
  currentChatFriend = friendEmail;
  chatFriendName.textContent = friendEmail;
  chatArea.style.display = "block";
  messagesDiv.innerHTML = "";
  listenMessages(currentChatId);
}

closeChatBtn.onclick = () => {
  currentChatId = null;
  currentChatFriend = null;
  chatArea.style.display = "none";
  messagesDiv.innerHTML = "";
  messageInput.value = "";
};

function listenMessages(chatId) {
  const chatRef = ref(db, `chats/${chatId}`);
  onValue(chatRef, snapshot => {
    const msgs = snapshot.val() || {};
    messagesDiv.innerHTML = "";
    for (const msgId in msgs) {
      const { user, message } = msgs[msgId];
      const decryptedMsg = decrypt(message);
      const senderClass = (user === currentUser.email) ? "msg-you" : "msg-friend";
      const p = document.createElement("p");
      p.className = senderClass;
      p.innerHTML = `<strong>${user === currentUser.email ? "You" : currentChatFriend}:</strong> ${decryptedMsg}`;
      messagesDiv.appendChild(p);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendMsgBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if (!msg || !currentChatId) return;
  const encryptedMsg = encrypt(msg);
  const chatRef = ref(db, `chats/${currentChatId}`);
  push(chatRef, {
    user: currentUser.email,
    message: encryptedMsg,
    timestamp: Date.now()
  });
  messageInput.value = "";
};
