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

// ====== DOM Elements ======
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileName = document.getElementById("profileName");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const video = document.getElementById("video");
const toggleChat = document.getElementById("toggleChat");
const viewerCountEl = document.getElementById("viewerCount");

let hls;

// ====== Authentication ======
loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};
logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
  if(user){
    currentUser = user;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    profileName.classList.remove("hidden");
    profileName.innerText = user.displayName;
    chatInput.disabled = false;
    sendBtn.disabled = false;
  } else {
    currentUser = null;
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    profileName.classList.add("hidden");
    chatInput.disabled = true;
    sendBtn.disabled = true;
  }
});

// ====== Chat ======
sendBtn.onclick = async () => {
  if(!currentUser){
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
    return;
  }
  if(!chatInput.value.trim()) return;

  await db.collection("artifacts").doc("liveApp").collection("public").doc("data").collection("chat").add({
    name: currentUser.displayName,
    message: chatInput.value,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  chatInput.value = "";
};

db.collection("artifacts").doc("liveApp").collection("public").doc("data").collection("chat")
  .orderBy("timestamp")
  .onSnapshot(snapshot => {
    chatBox.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.classList.add("flex", "items-start", "gap-2", "p-2", "rounded", "bg-gray-700");

      // Avatar
      const avatar = document.createElement("div");
      avatar.classList.add("avatar");
      avatar.innerText = msg.name.split(" ").map(n => n[0]).join("").toUpperCase();

      // Message content
      const content = document.createElement("div");
      content.classList.add("flex-1");

      const header = document.createElement("div");
      header.classList.add("flex", "items-center", "justify-between", "text-sm", "text-gray-300");

      const name = document.createElement("span");
      name.classList.add("font-semibold", "text-white");
      name.innerText = msg.name;

      const time = document.createElement("span");
      time.classList.add("text-xs", "text-gray-400");
      time.innerText = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";

      header.appendChild(name);
      header.appendChild(time);

      const text = document.createElement("div");
      text.classList.add("text-white", "break-words");
      text.innerText = msg.message;

      content.appendChild(header);
      content.appendChild(text);

      div.appendChild(avatar);
      div.appendChild(content);

      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });

// ====== HLS Video Player ======
function playStream(source){
  if(Hls.isSupported()){
    if(hls) hls.destroy();
    hls = new Hls();
    hls.loadSource(`/stream/${source}`);
    hls.attachMedia(video);
  } else if(video.canPlayType("application/vnd.apple.mpegurl")){
    video.src = `/stream/${source}`;
  }
}

function changeQuality(source){ playStream(source); }
playStream("master_2000.m3u8"); // default 720p

// ====== Viewer Count via WebSocket ======
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  if(data.viewers !== undefined){
    viewerCountEl.innerText = `Viewers Online: ${data.viewers}`;
  }
};

// ====== Mobile Chat Toggle ======
toggleChat.onclick = () => {
  document.querySelector("aside").classList.toggle("-translate-y-full");
};
