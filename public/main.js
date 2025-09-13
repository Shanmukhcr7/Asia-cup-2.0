// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlUX0Hse-jy9RJc-iOTRhwg7a7IYIBdtc",
  authDomain: "molten-snowfall-393219.firebaseapp.com",
  projectId: "molten-snowfall-393219",
  storageBucket: "molten-snowfall-393219.appspot.com",
  messagingSenderId: "189522276669",
  appId: "1:189522276669:web:981533b5f99be303721554"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ====== Auth ======
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileName = document.getElementById("profileName");

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
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.onclick = async () => {
  if(!chatInput.value.trim() || !currentUser) return;
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
    div.classList.add("chat-message");

    // Avatar from initials
    const avatar = document.createElement("div");
    avatar.classList.add("chat-avatar");
    avatar.innerText = msg.name.charAt(0).toUpperCase();

    // Content
    const content = document.createElement("div");
    content.classList.add("chat-content");
    const name = document.createElement("div");
    name.classList.add("chat-name");
    name.innerText = msg.name;
    const time = document.createElement("span");
    time.classList.add("chat-time");
    if(msg.timestamp) time.innerText = new Date(msg.timestamp.seconds*1000).toLocaleTimeString();
    const message = document.createElement("div");
    message.innerText = msg.message;

    name.appendChild(time);
    content.appendChild(name);
    content.appendChild(message);

    div.appendChild(avatar);
    div.appendChild(content);
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

// ====== Video Player ======
const video = document.getElementById("video");
let hls;
let autoQuality = "master_2000.m3u8"; // default

function playStream(source){
  if(Hls.isSupported()){
    if(hls) hls.destroy();
    hls = new Hls({
      autoStartLoad: true,
      capLevelToPlayerSize: true
    });
    hls.loadSource(`/stream/${source}`);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function(){
      // Auto select quality based on bandwidth
      hls.startLevel = -1;
    });
  } else if(video.canPlayType("application/vnd.apple.mpegurl")){
    video.src = `/stream/${source}`;
  }
}

function changeQuality(source){
  autoQuality = source;
  playStream(source);
}

// Auto-detect network speed
if(navigator.connection){
  const speed = navigator.connection.downlink;
  if(speed < 1.5) autoQuality = "master_664.m3u8";
  else if(speed < 3) autoQuality = "master_900.m3u8";
  else if(speed < 5) autoQuality = "master_2000.m3u8";
  else autoQuality = "master_3500.m3u8";
}
playStream(autoQuality);

// Volume control / Mute button
const muteBtn = document.getElementById("muteBtn");
muteBtn.onclick = () => {
  video.muted = !video.muted;
  muteBtn.innerText = video.muted ? "🔇 Unmute" : "🔊 Mute";
};

// ====== Viewer Count via WS ======
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if(data.viewers !== undefined) document.getElementById("viewerCount").innerText = `Viewers Online: ${data.viewers}`;
};

// ====== Mobile Menu ======
document.getElementById("menuBtn").onclick = () => document.getElementById("menu").classList.toggle("hidden");
