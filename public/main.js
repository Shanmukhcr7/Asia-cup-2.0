// ===== Firebase Setup =====
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

// ===== Google Auth / Anonymous Fallback =====
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
    profileName.textContent = user.displayName;
    chatInput.disabled = false;
    sendBtn.disabled = false;
  } else {
    currentUser = null;
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    profileName.classList.add("hidden");
    chatInput.disabled = true;
    sendBtn.disabled = true;
    auth.signInAnonymously().catch(console.error);
  }
});

// ===== Chat =====
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.onclick = async () => {
  if(!chatInput.value.trim() || !currentUser) return;
  await db.collection("artifacts")
          .doc("__app_id")
          .collection("public")
          .doc("data")
          .collection("chat")
          .add({
            name: currentUser.displayName || "Anonymous",
            message: chatInput.value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
  chatInput.value = "";
};

db.collection("artifacts")
  .doc("__app_id")
  .collection("public")
  .doc("data")
  .collection("chat")
  .orderBy("timestamp")
  .onSnapshot(snapshot => {
    chatBox.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.classList.add("p-2", "rounded", "bg-gray-700");
      div.innerHTML = `<strong>${msg.name}:</strong> ${msg.message}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });

// ===== Video Player =====
const video = document.getElementById("video");
let hls;

function playStream(source){
  errorOverlay.style.display = "none";
  if(Hls.isSupported()){
    if(hls) hls.destroy();
    hls = new Hls();
    hls.loadSource(`/stream/${source}`);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR,(event,data)=>{
      if(data.fatal) errorOverlay.style.display = "block";
    });
  } else if(video.canPlayType("application/vnd.apple.mpegurl")){
    video.src = `/stream/${source}`;
    video.onerror = ()=>{errorOverlay.style.display="block";}
  }
}

// Default 720p
playStream("master_2000.m3u8");
function changeQuality(source){ playStream(source); }

// ===== WebSocket Viewer Count =====
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);
ws.onmessage = (event)=>{
  const data = JSON.parse(event.data);
  if(data.viewers !== undefined){
    document.getElementById("viewerCount").innerText = `Viewers Online: ${data.viewers}`;
  }
};

// ===== Mobile menu =====
document.getElementById("menuBtn").onclick = () => {
  document.getElementById("menu").classList.toggle("hidden");
};
