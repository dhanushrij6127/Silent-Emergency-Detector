// --- 1. FIREBASE CONFIGURATION ---
// PASTE YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase and Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. GLOBAL VARIABLES ---
let countdownSeconds = 2 * 60; 
let timeLeft = countdownSeconds;
let isEmergency = false;
let timerInterval;

const timerDisplay = document.getElementById('timer');
const statusCard = document.getElementById('status-card');
const statusText = document.getElementById('status-text');
const logList = document.getElementById('log-list');

// --- 3. FIRESTORE SYNC LOGIC ---

// Sends the emergency status to the cloud
async function notifyFirebase(reason) {
    try {
        await db.collection("emergencies").add({
            isEmergency: true,
            reason: reason,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            patientName: "Narayanaswamy"
        });
        console.log("Emergency successfully logged in Firestore");
    } catch (error) {
        console.error("Error writing to Firestore: ", error);
    }
}

// Listens for new emergency entries (Real-time update for Caregiver)
db.collection("emergencies")
    .orderBy("timestamp", "desc")
    .limit(1)
    .onSnapshot((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // If a new emergency is found in the cloud, trigger UI
            if (data.isEmergency && !isEmergency) {
                triggerEmergencyUI(data.reason);
            }
        });
    });

// --- 4. NAVIGATION & TIMER LOGIC ---

function showPage(pageId) {
    document.getElementById('page-monitor').classList.toggle('hidden', pageId !== 'monitor');
    document.getElementById('page-dashboard').classList.toggle('hidden', pageId !== 'dashboard');
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            triggerEmergencyByTimeout();
        }
    }, 1000);
}

function updateDisplay() {
    let mins = Math.floor(timeLeft / 60);
    let secs = timeLeft % 60;
    timerDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function resetTimer() {
    if (isEmergency) return;

    if (timeLeft < countdownSeconds - 5) {
        addLog("User active: Timer reset.");
    }

    timeLeft = countdownSeconds;
    statusCard.className = "status-card safe";
    statusText.innerText = "SYSTEM ACTIVE";
    document.getElementById('dash-status-label').innerText = "Normal";
    updateDisplay();
}

// --- 5. EMERGENCY TRIGGER LOGIC ---

// Triggered when user clicks "I NEED HELP"
function triggerEmergency() {
    const msg = "Patient manually requested help.";
    notifyFirebase(msg); // Alert Cloud
    triggerEmergencyUI(msg); // Update Local UI
}

// Triggered when timer hits zero
function triggerEmergencyByTimeout() {
    const msg = "No activity for past 2 minutes.";
    notifyFirebase(msg); // Alert Cloud
    triggerEmergencyUI(msg); // Update Local UI
}

// Handles visual and audio updates
function triggerEmergencyUI(msg) {
    clearInterval(timerInterval);
    isEmergency = true;

    statusCard.className = "status-card emergency";
    statusText.innerText = "THE PATIENT IS IN EMERGENCY";
    
    const dashLabel = document.getElementById('dash-status-label');
    dashLabel.innerText = "THE PATIENT IS IN EMERGENCY";
    dashLabel.style.color = "red";
    dashLabel.style.fontWeight = "bold";

    addLog(msg);

    const speech = new SpeechSynthesisUtterance(
        "The patient is in emergency. Alerting caregivers."
    );
    window.speechSynthesis.speak(speech);
}

function addLog(msg) {
    const li = document.createElement('li');
    li.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logList.prepend(li);
}

// --- 6. PASSIVE MONITORING ---
window.addEventListener('mousemove', resetTimer);
window.addEventListener('keydown', resetTimer);
window.addEventListener('touchstart', resetTimer);

// Initialize
updateDisplay();
startTimer();


