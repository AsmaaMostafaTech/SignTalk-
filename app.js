// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const detectedWordElement = document.getElementById('detected-word');
const speakButton = document.getElementById('speak-btn');
const startListeningButton = document.getElementById('start-listening');
const transcriptElement = document.getElementById('transcript');
const placeholderImage = document.getElementById('placeholder-image');
let isCameraActive = false;

// Speech Synthesis
const synth = window.speechSynthesis;
let recognition;

// Speech control variables
let lastSpokenWord = '';
let isSpeaking = false;

// Gesture to Arabic word mapping
const GESTURES = {
    'hello': 'مرحباً',
    'thanks': 'شكراً',
    'yes': 'نعم',
    'no': 'لا',
    'help': 'مساعدة'
};

// Mobile menu toggle
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
}

// Smooth scrolling for anchor links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize the application
async function init() {
    try {
        setupMobileMenu();
        setupSmoothScrolling();
        // Don't start camera automatically, wait for user to click the toggle
        await loadHandpose();
        setupSpeechRecognition();
        setupEventListeners();
        
        // Initialize camera toggle button
        const cameraToggle = document.querySelector('.camera-toggle');
        if (cameraToggle) {
            cameraToggle.addEventListener('click', toggleCamera);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        showError('حدث خطأ أثناء تهيئة التطبيق. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
}

// Set up the camera
async function setupCamera() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            },
            audio: false
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                video.style.display = 'block';
                if (placeholderImage) {
                    placeholderImage.style.display = 'none';
                }
                isCameraActive = true;
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        showError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن لاستخدام الكاميرا.');
        throw error;
    }
}

// Load the HandPose model
async function loadHandpose() {
    try {
        const model = await handpose.load();
        window.handposeModel = model;
        console.log('HandPose model loaded');
    } catch (error) {
        console.error('Error loading HandPose model:', error);
        throw new Error('فشل تحميل نموذج التعرف على اليدين. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.');
    }
}

// Set up speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.error('Speech Recognition API not supported in this browser');
        startListeningButton.disabled = true;
        startListeningButton.textContent = 'التعرف على الصوت غير مدعوم في هذا المتصفح';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        transcriptElement.textContent = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        transcriptElement.textContent = 'حدث خطأ في التعرف على الصوت. يرجى المحاولة مرة أخرى.';
    };

    recognition.onspeechend = () => {
        startListeningButton.innerHTML = '<span class="icon">🎤</span><span>اضغط للتحدث</span>';
        startListeningButton.classList.remove('listening');
    };
}

// Detect hands and gestures
async function detectHands() {
    if (!window.handposeModel) return;

    const predictions = await window.handposeModel.estimateHands(video);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw hand landmarks
    if (predictions.length > 0) {
        const result = predictions[0];
        drawHandLandmarks(result.landmarks);
        
        // Simple gesture detection (this is a placeholder - you'll need to implement actual gesture detection)
        const detectedGesture = detectGesture(result.landmarks);
        if (detectedGesture) {
            updateDetectedWord(detectedGesture);
        }
    }
    
    requestAnimationFrame(detectHands);
}

// Draw hand landmarks on canvas
function drawHandLandmarks(landmarks) {
    // Set baby blue color for landmarks
    ctx.fillStyle = '#89CFF0';
    
    for (let i = 0; i < landmarks.length; i++) {
        const [x, y] = landmarks[i];
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Draw connections between landmarks
    ctx.strokeStyle = '#6BAED6';
    ctx.lineWidth = 2;
    
    // Palm
    drawLine(landmarks[0], landmarks[1]);
    drawLine(landmarks[0], landmarks[5]);
    drawLine(landmarks[0], landmarks[9]);
    drawLine(landmarks[0], landmarks[13]);
    drawLine(landmarks[0], landmarks[17]);
    
    // Thumb
    drawLine(landmarks[1], landmarks[2]);
    drawLine(landmarks[2], landmarks[3]);
    drawLine(landmarks[3], landmarks[4]);
    
    // Index finger
    drawLine(landmarks[5], landmarks[6]);
    drawLine(landmarks[6], landmarks[7]);
    drawLine(landmarks[7], landmarks[8]);
    
    // Middle finger
    drawLine(landmarks[9], landmarks[10]);
    drawLine(landmarks[10], landmarks[11]);
    drawLine(landmarks[11], landmarks[12]);
    
    // Ring finger
    drawLine(landmarks[13], landmarks[14]);
    drawLine(landmarks[14], landmarks[15]);
    drawLine(landmarks[15], landmarks[16]);
    
    // Pinky
    drawLine(landmarks[17], landmarks[18]);
    drawLine(landmarks[18], landmarks[19]);
    drawLine(landmarks[19], landmarks[20]);
}

// Helper function to draw a line between two points
function drawLine(start, end) {
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
}

// Detect different hand gestures based on finger positions
function detectGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return null; // Need at least 21 landmarks for a complete hand
    
    // Get the y-coordinates of finger tips and their corresponding base joints
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // Get base joints
    const thumbBase = landmarks[1];
    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const ringBase = landmarks[13];
    const pinkyBase = landmarks[17];
    
    // Calculate distances between finger tips and wrist
    const dist = (p1, p2) => Math.sqrt(
        Math.pow(p1[0] - p2[0], 2) + 
        Math.pow(p1[1] - p2[1], 2)
    );
    
    // Check for 'hello' - all fingers extended
    if (checkIfHandOpen(landmarks)) {
        return 'hello';
    }
    
    // Check for 'thanks' - thumb touching middle finger
    const thumbToMiddleDist = dist(thumbTip, middleTip);
    const thumbToMiddleBaseDist = dist(thumbTip, middleBase);
    if (thumbToMiddleDist < thumbToMiddleBaseDist * 0.3) {
        return 'thanks';
    }
    
    // Check for 'yes' - thumb and index finger touching (OK sign)
    const thumbToIndexDist = dist(thumbTip, indexTip);
    const thumbToIndexBaseDist = dist(thumbTip, indexBase);
    if (thumbToIndexDist < thumbToIndexBaseDist * 0.3) {
        // Check if other fingers are closed
        const middleExtended = dist(middleTip, wrist) > dist(middleBase, wrist) * 1.2;
        const ringExtended = dist(ringTip, wrist) > dist(ringBase, wrist) * 1.2;
        const pinkyExtended = dist(pinkyTip, wrist) > dist(pinkyBase, wrist) * 1.2;
        
        if (!middleExtended && !ringExtended && !pinkyExtended) {
            return 'yes';
        }
    }
    
    // Check for 'no' - index finger extended, others closed
    const indexExtended = dist(indexTip, wrist) > dist(indexBase, wrist) * 1.3;
    const middleClosed = dist(middleTip, wrist) < dist(middleBase, wrist) * 1.1;
    const ringClosed = dist(ringTip, wrist) < dist(ringBase, wrist) * 1.1;
    const pinkyClosed = dist(pinkyTip, wrist) < dist(pinkyBase, wrist) * 1.1;
    const thumbClosed = dist(thumbTip, wrist) < dist(thumbBase, wrist) * 1.1;
    
    if (indexExtended && middleClosed && ringClosed && pinkyClosed && thumbClosed) {
        return 'no';
    }
    
    // Check for 'help' - thumb and pinky extended, others closed
    const thumbExtended = dist(thumbTip, wrist) > dist(thumbBase, wrist) * 1.3;
    const pinkyExtended = dist(pinkyTip, wrist) > dist(pinkyBase, wrist) * 1.3;
    const indexClosed = dist(indexTip, wrist) < dist(indexBase, wrist) * 1.1;
    const middleRingClosed = dist(middleTip, wrist) < dist(middleBase, wrist) * 1.1 && 
                           dist(ringTip, wrist) < dist(ringBase, wrist) * 1.1;
    
    if (thumbExtended && pinkyExtended && indexClosed && middleRingClosed) {
        return 'help';
    }
    
    return null;
}

// Check if hand is open (simplified example)
function checkIfHandOpen(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    // Indices of finger tips and their corresponding base joints
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerBases = [2, 6, 10, 14, 18];
    
    // Calculate distance between two points
    const dist = (p1, p2) => Math.sqrt(
        Math.pow(p1[0] - p2[0], 2) + 
        Math.pow(p1[1] - p2[1], 2)
    );
    
    let extendedFingers = 0;
    
    for (let i = 1; i < 5; i++) { // Skip thumb (i=0) for simplicity
        const tipY = landmarks[fingerTips[i]][1];
        const baseY = landmarks[fingerBases[i]][1];
        
        if (tipY < baseY) { // If tip is above base (assuming hand is upright)
            extendedFingers++;
        }
    }
    
    return extendedFingers >= 4; // At least 4 fingers extended
}

// Update the detected word display and speak it immediately
function updateDetectedWord(gesture) {
    if (GESTURES[gesture]) {
        const word = GESTURES[gesture];
        
        // Update display immediately
        detectedWordElement.textContent = word;
        detectedWordElement.style.visibility = 'visible';
        detectedWordElement.style.opacity = '1';
        
        // Speak immediately if it's a new word or not currently speaking
        if (synth && word !== lastSpokenWord) {
            // Cancel any ongoing speech
            synth.cancel();
            
            // Create and speak the utterance
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.9;
            
            // Update tracking variables
            lastSpokenWord = word;
            isSpeaking = true;
            
            // Reset speaking flag when done
            utterance.onend = () => {
                isSpeaking = false;
            };
            
            // Speak the word
            synth.speak(utterance);
        }
    } else {
        detectedWordElement.style.opacity = '0';
        setTimeout(() => {
            detectedWordElement.style.visibility = 'hidden';
        }, 300);
    }
}

// Speak the detected word
function speakWord() {
    const word = speakButton.dataset.word;
    if (!word) return;
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    
    synth.speak(utterance);
}

// Start/stop voice recognition
function toggleVoiceRecognition() {
    if (recognition) {
        if (startListeningButton.classList.contains('listening')) {
            recognition.stop();
        } else {
            recognition.start();
            startListeningButton.innerHTML = '<span class="icon">🎤</span><span>جاري الاستماع...</span>';
            startListeningButton.classList.add('listening');
            transcriptElement.textContent = 'جاري الاستماع...';
        }
    }
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error';
    errorElement.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(errorElement, container.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

// Toggle camera on/off
async function toggleCamera() {
    try {
        if (!isCameraActive) {
            await setupCamera();
            detectHands();
            // Update button icon
            const cameraIcon = document.querySelector('.camera-toggle i');
            if (cameraIcon) {
                cameraIcon.className = 'fas fa-video-slash';
            }
        } else {
            // Stop all video tracks
            if (video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }
            
            // Show placeholder image
            if (placeholderImage) {
                placeholderImage.style.display = 'block';
                video.style.display = 'none';
            }
            
            // Update button icon
            const cameraIcon = document.querySelector('.camera-toggle i');
            if (cameraIcon) {
                cameraIcon.className = 'fas fa-video';
            }
            
            isCameraActive = false;
        }
    } catch (error) {
        console.error('Error toggling camera:', error);
        showError('حدث خطأ أثناء تشغيل/إيقاف الكاميرا');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Speak button
    if (speakButton) {
        speakButton.addEventListener('click', speakWord);
    }
    
    // Start/stop listening button
    if (startListeningButton) {
        startListeningButton.addEventListener('click', toggleVoiceRecognition);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Adjust canvas size
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
    });
}

// Initialize the app when the page loads
window.addEventListener('load', init);
