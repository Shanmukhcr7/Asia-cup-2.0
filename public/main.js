// ====== Firebase Setup ======
const firebaseConfig = {
  apiKey: "AIzaSyBlUX0Hse-jy9RJc-iOTRhwg7a7IYIBdtc",
  authDomain: "molten-snowfall-393219.firebaseapp.com",
  projectId: "molten-snowfall-393219",
  storageBucket: "molten-snowfall-393219.firebasestorage.app",
  messagingSenderId: "189522276669",
  appId: "1:189522276669:web:981533b5f99be303721554"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let chatUnsubscribe = null;

// ====== Elements ======
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileName = document.getElementById("profileName");

// ====== Auth Handling ======
async function initAuth() {
  try {
    // Try Google sign-in first if a token exists
    if (window.__initial_auth_token) {
      const credential = firebase.auth.GoogleAuthProvider.credential(window.__initial_auth_token);
      await auth.signInWithCredential(credential);
    } else {
      // Otherwise, sign in anonymously
      await auth.signInAnonymously();
    }
  } catch (error) {
    console.error("Auth error:", error);
  }
}

// Google Sign-in button
loginBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("Google Sign-in failed:", error);
  }
};

// Logout button
logoutBtn.onclick = async () => {
  await auth.signOut();
};

// Listen to auth state changes
auth.onAuthStateChanged(user => {
  currentUser = user;

  if (currentUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    profileName.classList.remove("hidden");
    profileName.innerText = currentUser.displayName || "Anonymous";

    chatInput.disabled = false;
    sendBtn.disabled = false;

    // Subscribe to chat
    subscribeToChat();
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    profileName.classList.add("hidden");
    profileName.innerText = "";

    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Unsubscribe from chat
    if (chatUnsubscribe) chatUnsubscribe();
  }
});

// ====== Chat Handling ======
sendBtn.onclick = async () => {
  const message = chatInput.value.trim();
  if (!message || !currentUser) return;

  try {
    await db.collection("artifacts")
      .doc("liveApp")
      .collection("public")
      .doc("data")
      .collection("chat")
      .add({
        name: currentUser.displayName || "Anonymous",
        message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    chatInput.value = "";
  } catch (error) {
    console.error("Failed to send message:", error);
    alert("Unable to send message. Please try again.");
  }
};

// Subscribe to chat updates
function subscribeToChat() {
  if (chatUnsubscribe) chatUnsubscribe(); // unsubscribe previous

  try {
    chatUnsubscribe = db.collection("artifacts")
      .doc("liveApp")
      .collection("public")
      .doc("data")
      .collection("chat")
      .orderBy("timestamp")
      .onSnapshot(snapshot => {
        chatBox.innerHTML = "";
        snapshot.forEach(doc => {
          const msg = doc.data();
          const div = document.createElement("div");
          div.className = "p-2 rounded bg-gray-700";
          const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : "";
          div.innerHTML = `<strong>${msg.name}</strong> [${time}]: ${msg.message}`;
          chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
      }, error => {
        console.error("Firestore listen error:", error);
        const div = document.createElement("div");
        div.className = "p-2 rounded bg-red-700";
        div.innerText = "⚠️ Unable to connect to chat. Retrying...";
        chatBox.appendChild(div);
      });
  } catch (error) {
    console.error("Failed to subscribe chat:", error);
  }
}

// ====== Video Player ======
const video = document.getElementById("video");
let hls;

function playStream(source) {
  if (Hls.isSupported()) {
    if (hls) hls.destroy();
    hls = new Hls();
    hls.loadSource(`/stream/${source}`);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = `/stream/${source}`;
  }
}

// Default quality 720p
playStream("master_2000.m3u8");

function changeQuality(source) {
  playStream(source);
}

// ====== Viewer Count via WebSocket ======
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.viewers !== undefined) {
    document.getElementById("viewerCount").innerText = `Viewers Online: ${data.viewers}`;
  }
};

// ====== Initialize ======
initAuth();
