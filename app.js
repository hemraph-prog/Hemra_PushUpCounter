const startButton = document.getElementById('startButton');
const video = document.getElementById('webcam');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const counterValue = document.getElementById('counterValue');
const stateLabel = document.getElementById('stateLabel');

const poseConnections = [
  [11, 12], [11, 13], [13, 15], [15, 17],
  [12, 14], [14, 16], [16, 18],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [31, 33], [33, 35],
  [24, 26], [26, 28], [28, 30], [30, 32], [32, 34], [34, 36],
  [23, 24], [25, 26], [27, 28], [29, 30], [31, 32], [33, 34], [35, 36]
];

let poseLandmarker = null;
let repCount = 0;
let previousState = 'up';
let isRunning = false;

function setStatus(message) {
  stateLabel.textContent = message;
}

function computeAngle(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: b.x - c.x, y: b.y - c.y };

  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);

  if (mag === 0) {
    return 180;
  }

  const angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));
  return (angle * 180) / Math.PI;
}

function detectPushupState(landmarks) {
  const leftElbow = computeAngle(landmarks[11], landmarks[13], landmarks[15]);
  const rightElbow = computeAngle(landmarks[12], landmarks[14], landmarks[16]);
  const leftWristBelowShoulder = landmarks[15].y > landmarks[11].y;
  const rightWristBelowShoulder = landmarks[16].y > landmarks[12].y;

  const elbowsBend = leftElbow < 100 && rightElbow < 100;
  const armsExtended = leftElbow > 145 && rightElbow > 145;

  if (elbowsBend && (leftWristBelowShoulder || rightWristBelowShoulder)) {
    return 'down';
  }

  if (armsExtended) {
    return 'up';
  }

  return previousState || 'up';
}

function drawPose(landmarks) {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(video, 0, 0, width, height);

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#22c55e';
  ctx.fillStyle = '#f8fafc';

  poseConnections.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (start && end) {
      const x1 = start.x * width;
      const y1 = start.y * height;
      const x2 = end.x * width;
      const y2 = end.y * height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });

  landmarks.forEach((point) => {
    const x = point.x * width;
    const y = point.y * height;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateRepState(landmarks) {
  const currentState = detectPushupState(landmarks);

  if (previousState === 'up' && currentState === 'down') {
    setStatus('Down');
  } else if (previousState === 'down' && currentState === 'up') {
    repCount += 1;
    counterValue.textContent = String(repCount);
    setStatus('Up');
  } else {
    setStatus(currentState === 'down' ? 'Down' : 'Up');
  }

  previousState = currentState;
}

async function setupPoseLandmarker() {
  if (poseLandmarker) {
    return;
  }

  const { FilesetResolver, PoseLandmarker } = window;
  if (!FilesetResolver || !PoseLandmarker) {
    throw new Error('MediaPipe files were not loaded.');
  }

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

function renderLoop() {
  if (!isRunning) {
    return;
  }

  if (video.readyState >= 2 && poseLandmarker) {
    const result = poseLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      drawPose(landmarks);
      updateRepState(landmarks);
    } else {
      ctx.clearRect(0, 0, canvas.width || 640, canvas.height || 480);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width || 640, canvas.height || 480);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No pose detected', (canvas.width || 640) / 2, (canvas.height || 480) / 2);
      setStatus('Waiting');
    }
  }

  requestAnimationFrame(renderLoop);
}

async function startCamera() {
  if (isRunning) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('Camera unavailable');
    return;
  }

  try {
    startButton.disabled = true;
    startButton.textContent = 'Starting...';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    await setupPoseLandmarker();

    isRunning = true;
    startButton.textContent = 'Camera live';
    setStatus('Ready');

    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    setStatus('Camera error');
    startButton.disabled = false;
    startButton.textContent = 'Start camera';
  }
}

startButton.addEventListener('click', startCamera);
counterValue.textContent = String(repCount);
setStatus('Waiting');
