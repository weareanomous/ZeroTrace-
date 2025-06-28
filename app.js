// app.js
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
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAk6IgJSIZyM-5zOwtOYy4UilWunuCG_Eo",
  authDomain: "host-a-web.firebaseapp.com",
  databaseURL: "https://host-a-web-default-rtdb.firebaseio.com",
  projectId: "host-a-web",
  storageBucket: "host-a-web.firebasestorage.app",
  messagingSenderId: "434120927937",
  appId: "1:434120927937:web:ea87b3779833dd64ba4240"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const secretKey = "SuperSecureKey123"; // Change this for better security per user/session

// DOM elements
const authDiv = document.getElementById("auth");
const chatDiv = document.getElementById("chat");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message");

// Encrypt message
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}

// Decrypt message
function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "[Encrypted]";
  }
}

// Login function
window.login = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    alert("Enter email and password");
    return;
  }
  signInWithEmailAndPassword(auth, email, password)
    .catch(e => alert(e.message));
};

// Signup function
window.signup = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    alert("Enter email and password");
    return;
  }
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("Account created! Please login."))
    .catch(e => alert(e.message));
};

// Logout function
window.logout = () => {
  signOut(auth)
    .catch(e => alert(e.message));
};

// Send message function
window.sendMessage = () => {
  const msg = messageInput.value.trim();
  if (!msg) return;
  const user = auth.currentUser.email;
  const encryptedMsg = encrypt(msg);
  push(ref(db, "messages"), { user, message: encryptedMsg });
  messageInput.value = "";
};

// Listen for new messages and update UI
function listenMessages() {
  const messagesRef = ref(db, "messages");
  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val() || {};
    messagesDiv.innerHTML = "";
    for (const key in data) {
      const msgObj = data[key];
      const decrypted = decrypt(msgObj.message);
      const user = msgObj.user === auth.currentUser.email ? "You" : msgObj.user;
      const p = document.createElement("p");
      p.innerHTML = `<strong>${user}:</strong> ${decrypted}`;
      messagesDiv.appendChild(p);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Monitor auth state to toggle UI
onAuthStateChanged(auth, user => {
  if (user) {
    authDiv.style.display = "none";
    chatDiv.style.display = "block";
    listenMessages();
  } else {
    authDiv.style.display = "block";
    chatDiv.style.display = "none";
  }
});
