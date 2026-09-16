const cameraFeed = document.querySelector('#cameraFeed');
const motionCanvas = document.querySelector('#motionCanvas');
const cameraPlaceholder = document.querySelector('#cameraPlaceholder');
const cameraFrame = document.querySelector('.camera-frame');
const startButton = document.querySelector('#startButton');
const cameraStatus = document.querySelector('#cameraStatus');
const livePill = document.querySelector('#livePill');
const gestureValue = document.querySelector('#gestureValue');
const signalBars = document.querySelector('#signalBars');
const signalPercent = document.querySelector('#signalPercent');
const signalText = document.querySelector('#signalText');
const matchMessage = document.querySelector('#matchMessage');
const userChoice = document.querySelector('#userChoice');
const botChoice = document.querySelector('#botChoice');
const userScore = document.querySelector('#userScore');
const botScore = document.querySelector('#botScore');
const roundNumber = document.querySelector('#roundNumber');
const toast = document.querySelector('#toast');
const lumaQuote = document.querySelector('#lumaQuote');
const lumaSays = document.querySelector('#lumaSays');
const connectionLabel = document.querySelector('#connectionLabel');
const soundToggle = document.querySelector('#soundToggle');
const lumaIntro = document.querySelector('#lumaIntro');
const playWithLuma = document.querySelector('#playWithLuma');
const meetLater = document.querySelector('#meetLater');

const moves = { rock: { icon: '●', label: 'Rock' }, paper: { icon: '▤', label: 'Paper' }, scissors: { icon: '✣', label: 'Scissors' } };
const gestureMoves = ['scissors', 'rock', 'paper'];
const quotes = [
  'I’ll go easy on you.<br>Probably.',
  'That was a brave<br>little gesture.',
  'Your energy is<br>delightfully chaotic.',
  'Again? I like<br>your confidence.'
];
let stream;
let previousFrame;
let motionLoop;
let lastGestureAt = 0;
let scores = { user: 0, bot: 0, round: 1 };
let audioOn = true;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function chooseBotMove() {
  const options = Object.keys(moves);
  return options[Math.floor(Math.random() * options.length)];
}

function getWinner(user, bot) {
  if (user === bot) return 'tie';
  if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) return 'user';
  return 'bot';
}

function playRound(userMove, source = 'button') {
  const botMove = chooseBotMove();
  const winner = getWinner(userMove, botMove);
  const userInfo = moves[userMove];
  const botInfo = moves[botMove];
  userChoice.textContent = userInfo.icon;
  botChoice.textContent = botInfo.icon;
  lumaSays.textContent = source === 'camera' ? `I saw your ${userInfo.label} gesture. I choose ${botInfo.label}!` : `I choose ${botInfo.label}!`;
  document.querySelectorAll('.move-button').forEach(button => button.classList.toggle('selected', button.dataset.move === userMove));
  if (winner === 'user') { scores.user += 1; matchMessage.textContent = `${userInfo.label} beats ${botInfo.label}. You read her perfectly.`; }
  else if (winner === 'bot') { scores.bot += 1; matchMessage.textContent = `${botInfo.label} beats ${userInfo.label}. Luma saw that coming.`; }
  else matchMessage.textContent = `A ${userInfo.label.toLowerCase()} standoff. Great minds move alike.`;
  scores.round += 1;
  userScore.textContent = String(scores.user).padStart(2, '0');
  botScore.textContent = String(scores.bot).padStart(2, '0');
  roundNumber.textContent = String(scores.round).padStart(2, '0');
  lumaQuote.innerHTML = quotes[(scores.round - 2) % quotes.length];
  if (source === 'camera') showToast(`Luma sensed ${userInfo.label.toLowerCase()}`);
  if (audioOn && 'speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${source === 'camera' ? `I saw your ${userInfo.label} gesture. ` : ''}I choose ${botInfo.label}. ${winner === 'user' ? 'Nice move.' : winner === 'bot' ? 'My point.' : 'A tie.'}`)); }
}

document.querySelectorAll('.move-button').forEach(button => button.addEventListener('click', () => playRound(button.dataset.move)));

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { showToast('Camera access needs HTTPS or localhost. Buttons are ready.'); cameraStatus.textContent = 'Use localhost for camera'; return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    cameraFeed.srcObject = stream;
    cameraFrame.classList.add('active');
    cameraPlaceholder.setAttribute('aria-hidden', 'true');
    livePill.classList.add('active');
    livePill.innerHTML = '<span></span> LIVE';
    cameraStatus.textContent = 'Camera connected';
    connectionLabel.textContent = 'LUMA IS WATCHING';
    signalText.textContent = 'ACTIVE';
    signalBars.classList.add('active');
    startButton.innerHTML = '<span class="play-symbol">■</span> Camera live';
    startButton.disabled = true;
    startButton.style.opacity = '.6';
    motionLoop = window.requestAnimationFrame(readMotion);
  } catch (error) {
    cameraStatus.textContent = error.name === 'NotAllowedError' ? 'Permission declined' : 'Camera unavailable';
    showToast('Camera stayed private. You can still play with the buttons.');
  }
}

function readMotion() {
  if (!cameraFeed.videoWidth) { motionLoop = window.requestAnimationFrame(readMotion); return; }
  const context = motionCanvas.getContext('2d', { willReadFrequently: true });
  const width = 96; const height = 64;
  motionCanvas.width = width; motionCanvas.height = height;
  context.drawImage(cameraFeed, 0, 0, width, height);
  const current = context.getImageData(0, 0, width, height).data;
  if (previousFrame) {
    let total = 0; let left = 0; let right = 0;
    for (let index = 0; index < current.length; index += 4) {
      const change = Math.abs(current[index] - previousFrame[index]) + Math.abs(current[index + 1] - previousFrame[index + 1]) + Math.abs(current[index + 2] - previousFrame[index + 2]);
      if (change > 45) { total += change; const pixel = index / 4; if (pixel % width < width / 3) left += change; else if (pixel % width > width * 2 / 3) right += change; }
    }
    const intensity = Math.min(100, Math.round(total / 500));
    signalPercent.textContent = `${String(intensity).padStart(2, '0')}%`;
    if (intensity > 8) {
      const direction = left > right * 1.25 ? 'LEFT' : right > left * 1.25 ? 'RIGHT' : 'CENTER';
      const detectedMove = gestureMoves[['LEFT', 'CENTER', 'RIGHT'].indexOf(direction)];
      gestureValue.textContent = `${direction} → ${moves[detectedMove].label.toUpperCase()}`;
      const now = Date.now();
      if (now - lastGestureAt > 1700 && intensity > 18) { lastGestureAt = now; playRound(detectedMove, 'camera'); }
    } else gestureValue.textContent = 'Scanning...';
  }
  previousFrame = current;
  motionLoop = window.requestAnimationFrame(readMotion);
}

startButton.addEventListener('click', startCamera);
document.querySelector('#howButton').addEventListener('click', () => {
  document.querySelector('#gameGuide').scrollIntoView({ behavior: 'smooth' });
  showToast('Luma chooses the other move. Beat it to win the round.');
});
function enterArena() {
  lumaIntro.classList.add('hidden');
  window.setTimeout(() => lumaIntro.remove(), 500);
}
playWithLuma.addEventListener('click', enterArena);
meetLater.addEventListener('click', enterArena);
soundToggle.addEventListener('click', () => {
  audioOn = !audioOn;
  soundToggle.innerHTML = audioOn ? '<span class="sound-icon">◖</span>' : '<span style="color:var(--muted)">×</span>';
  showToast(audioOn ? 'Luma voice on' : 'Luma voice off');
});
window.addEventListener('beforeunload', () => { if (stream) stream.getTracks().forEach(track => track.stop()); if (motionLoop) cancelAnimationFrame(motionLoop); });
