const scenes = Array.from(document.querySelectorAll(".scene"));
const dots = Array.from(document.querySelectorAll(".dot"));
const memoryCards = Array.from(document.querySelectorAll(".memory-card"));
const memoryDots = Array.from(document.querySelectorAll(".memory-dot"));
const notice = document.querySelector("#chipNotice");
const chipFeedback = document.querySelector("#chipFeedback");
const chipFeedbackTitle = document.querySelector("#chipFeedbackTitle");
const chipFeedbackBody = document.querySelector("#chipFeedbackBody");
const chipFeedbackImage = document.querySelector("#chipFeedbackImage");
const chipFeedbackConfirm = document.querySelector("#chipFeedbackConfirm");
const restart = document.querySelector("#restart");
const phone = document.querySelector(".phone");
const scanButton = document.querySelector("#scanButton");
const releaseWhale = document.querySelector("#releaseWhale");
const fogCanvas = document.querySelector("#fogCanvas");
const ctx = fogCanvas.getContext("2d");

let sceneIndex = 0;
let memoryIndex = 0;
let memoryComplete = false;
let swipeStartX = 0;
let saltTimer = null;
let erasedPixels = 0;
let pollutionComplete = false;
let finaleCount = 0;
let activeChip = null;
let audioContext = null;
let scratchTick = 0;
let riverAlertTimer = null;
let pendingFeedbackAction = null;

const puzzleSlots = {
  1: { x: 22, y: 18 },
  2: { x: 89, y: 18 },
  3: { x: 156, y: 18 },
};

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration, options = {}) {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const volume = options.volume ?? 0.16;

  oscillator.type = options.type || "sine";
  oscillator.frequency.setValueAtTime(frequency, now);

  if (options.to) {
    oscillator.frequency.exponentialRampToValueAtTime(options.to, now + duration);
  }

  filter.type = options.filterType || "lowpass";
  filter.frequency.setValueAtTime(options.filter ?? 1800, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playNoise(duration, options = {}) {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
  const samples = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = buffer;
  filter.type = options.filterType || "bandpass";
  filter.frequency.setValueAtTime(options.filter ?? 900, now);
  filter.Q.setValueAtTime(options.q ?? 2.4, now);
  gain.gain.setValueAtTime(options.volume ?? 0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
}

function playSound(name) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && name === "scratch") return;

  if (name === "alert") {
    playTone(720, 0.12, { type: "square", volume: 0.1, filter: 2200 });
    window.setTimeout(() => playTone(480, 0.16, { type: "square", volume: 0.11, filter: 1800 }), 140);
    window.setTimeout(() => playNoise(0.18, { volume: 0.045, filter: 1600, q: 5 }), 40);
    return;
  }

  if (name === "transition") {
    playTone(220, 0.34, { to: 520, type: "triangle", volume: 0.08, filter: 1400 });
    return;
  }

  if (name === "swipe") {
    playNoise(0.11, { volume: 0.035, filter: 1300, q: 3 });
    playTone(540, 0.09, { to: 760, type: "sine", volume: 0.035 });
    return;
  }

  if (name === "chip") {
    playTone(620, 0.08, { type: "triangle", volume: 0.1 });
    window.setTimeout(() => playTone(930, 0.14, { type: "sine", volume: 0.09 }), 80);
    return;
  }

  if (name === "lamp") {
    playTone(260, 0.34, { to: 780, type: "triangle", volume: 0.11, filter: 1800 });
    window.setTimeout(() => playTone(1040, 0.22, { type: "sine", volume: 0.06 }), 190);
    return;
  }

  if (name === "scratch") {
    playNoise(0.06, { volume: 0.026, filter: 740, q: 6 });
    return;
  }

  if (name === "lock") {
    playTone(180, 0.06, { type: "square", volume: 0.08, filter: 700 });
    window.setTimeout(() => playTone(420, 0.08, { type: "triangle", volume: 0.07 }), 55);
    return;
  }

  if (name === "reject") {
    playTone(320, 0.12, { to: 140, type: "square", volume: 0.1, filter: 900 });
    window.setTimeout(() => playTone(220, 0.1, { to: 100, type: "square", volume: 0.08, filter: 600 }), 120);
    window.setTimeout(() => playNoise(0.12, { volume: 0.04, filter: 500, q: 4 }), 60);
    return;
  }

  if (name === "complete") {
    playTone(360, 0.16, { type: "triangle", volume: 0.09 });
    window.setTimeout(() => playTone(540, 0.18, { type: "triangle", volume: 0.09 }), 120);
    window.setTimeout(() => playTone(810, 0.28, { type: "sine", volume: 0.08 }), 260);
    return;
  }

  if (name === "release") {
    playTone(92, 0.8, { to: 220, type: "sine", volume: 0.13, filter: 900 });
    window.setTimeout(() => playNoise(0.62, { volume: 0.045, filter: 520, q: 1.1 }), 120);
    return;
  }

  if (name === "reset") {
    playTone(320, 0.08, { type: "triangle", volume: 0.07 });
  }
}

function showScene(index) {
  sceneIndex = index;
  scenes.forEach((scene, current) => scene.classList.toggle("active", current === index));
  dots.forEach((dot, current) => dot.classList.toggle("active", current === index));

  if (scenes[index].dataset.scene === "river") {
    scheduleRiverAlert();
  } else {
    window.clearTimeout(riverAlertTimer);
  }

  if (scenes[index].dataset.scene === "pollution") {
    requestAnimationFrame(drawFog);
  }
}

function scheduleRiverAlert() {
  const riverScene = document.querySelector("[data-scene='river']");
  window.clearTimeout(riverAlertTimer);

  if (riverScene.classList.contains("river-found") || riverScene.classList.contains("river-silenced")) return;

  scanButton.disabled = true;
  scanButton.textContent = "待機";
  riverAlertTimer = window.setTimeout(() => {
    riverScene.classList.add("river-found");
    document.querySelector("[data-meter='bearing']").textContent = "WO-A";
    document.querySelector("[data-meter='distance']").textContent = "31.5";
    document.querySelector("[data-meter='signal']").textContent = "異常";
    document.querySelector(".scan-alert").textContent = "ALERT";
    scanButton.textContent = "關閉";
    scanButton.disabled = false;
    vibrate([25, 30, 45]);
  }, 900);
}

function flashChip(text) {
  notice.textContent = text;
  notice.hidden = false;
  window.setTimeout(() => {
    notice.hidden = true;
  }, 950);
}

function showChipFeedback(title, body, imageSrc, onConfirm) {
  chipFeedbackTitle.textContent = title;
  chipFeedbackBody.textContent = body;
  chipFeedbackImage.src = imageSrc;
  chipFeedbackImage.alt = title;
  pendingFeedbackAction = onConfirm;
  chipFeedback.hidden = false;
  chipFeedbackConfirm.focus({ preventScroll: true });
}

chipFeedbackConfirm.addEventListener("click", () => {
  const action = pendingFeedbackAction;
  pendingFeedbackAction = null;
  chipFeedback.hidden = true;

  if (action) {
    action();
  }
});

function nextScene(delay = 0) {
  window.setTimeout(() => {
    if (sceneIndex < scenes.length - 1) {
      playSound("transition");
      showScene(sceneIndex + 1);
    }
  }, delay);
}

function vibrate(pattern = 45) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

scanButton.addEventListener("click", () => {
  const riverScene = document.querySelector("[data-scene='river']");
  if (!riverScene.classList.contains("river-found") || riverScene.classList.contains("river-silenced")) return;

  getAudioContext();
  riverScene.classList.add("river-silenced");
  document.querySelector("[data-meter='signal']").textContent = "已關閉";
  document.querySelector(".scan-alert").textContent = "關閉";
  scanButton.textContent = "已關閉";
  scanButton.disabled = true;
  vibrate([18, 35, 18]);
  playSound("lock");
  flashChip("警報已關閉");
  nextScene(900);
});

function showMemory(index) {
  memoryIndex = Math.max(0, Math.min(index, memoryCards.length - 1));
  memoryCards.forEach((card, current) => card.classList.toggle("active", current === memoryIndex));
  memoryDots.forEach((dot, current) => dot.classList.toggle("active", current === memoryIndex));

  if (memoryIndex === memoryCards.length - 1 && !memoryComplete) {
    memoryComplete = true;
    playSound("chip");
    showChipFeedback(
      "取得第一片晶片",
      "記憶投影完成，第一段鯤鯓片段已被保存。",
      "./Pic/碎片一.png",
      () => nextScene(250)
    );
  }
}

const memoryScene = document.querySelector("[data-scene='memory']");
memoryScene.addEventListener("pointerdown", (event) => {
  if (!memoryScene.classList.contains("active")) return;
  swipeStartX = event.clientX;
});

memoryScene.addEventListener("pointerup", (event) => {
  if (!memoryScene.classList.contains("active")) return;

  const distance = event.clientX - swipeStartX;
  if (distance < -44) {
    showMemory(memoryIndex + 1);
    vibrate(18);
    playSound("swipe");
  }

  if (distance > 44) {
    showMemory(memoryIndex - 1);
    vibrate(18);
    playSound("swipe");
  }
});

const saltScene = document.querySelector("[data-scene='salt']");
saltScene.addEventListener("pointerdown", () => {
  if (!saltScene.classList.contains("active")) return;

  playTone(180, 0.08, { type: "sine", volume: 0.035 });
  saltTimer = window.setTimeout(() => {
    saltScene.classList.add("salt-lit");
    vibrate([30, 40, 30]);
    playSound("lamp");
    showChipFeedback(
      "取得第二片晶片",
      "蚵殼燈點亮後，鹽田的記憶被重新接回。",
      "./Pic/碎片二.png",
      () => nextScene(250)
    );
  }, 850);
});

saltScene.addEventListener("pointerup", () => {
  window.clearTimeout(saltTimer);
});

saltScene.addEventListener("pointerleave", () => {
  window.clearTimeout(saltTimer);
});

function drawFog() {
  const rect = fogCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  fogCanvas.width = Math.floor(rect.width * scale);
  fogCanvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const gradient = ctx.createRadialGradient(rect.width / 2, rect.height * 0.42, 40, rect.width / 2, rect.height * 0.42, rect.width * 0.75);
  gradient.addColorStop(0, "rgba(20, 18, 17, 0.96)");
  gradient.addColorStop(0.48, "rgba(10, 9, 9, 0.9)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.98)");

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);

  for (let i = 0; i < 70; i += 1) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.035})`;
    ctx.arc(Math.random() * rect.width, Math.random() * rect.height, 14 + Math.random() * 46, 0, Math.PI * 2);
    ctx.fill();
  }

  erasedPixels = 0;
}

function eraseFog(event) {
  const pollutionScene = document.querySelector("[data-scene='pollution']");
  if (!pollutionScene.classList.contains("active")) return;

  const rect = fogCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();

  erasedPixels += 1;
  scratchTick += 1;
  if (scratchTick % 5 === 0) {
    playSound("scratch");
  }

  if (erasedPixels > 34 && !pollutionComplete) {
    pollutionComplete = true;
    vibrate([35, 30, 35]);
    playSound("chip");
    showChipFeedback(
      "取得第三片晶片",
      "污染核心已清除，最後一段海洋記憶回到手中。",
      "./Pic/碎片三.png",
      () => nextScene(250)
    );
  }
}

fogCanvas.addEventListener("pointerdown", (event) => {
  fogCanvas.setPointerCapture(event.pointerId);
  eraseFog(event);
});

fogCanvas.addEventListener("pointermove", (event) => {
  if (event.buttons === 1 || event.pointerType === "touch") {
    eraseFog(event);
  }
});

window.addEventListener("resize", () => {
  if (scenes[sceneIndex].dataset.scene === "pollution") {
    drawFog();
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("pointerdown", (event) => {
    if (chip.classList.contains("locked")) return;

    activeChip = {
      element: chip,
      pointerId: event.pointerId,
      offsetX: event.clientX - chip.getBoundingClientRect().left,
      offsetY: event.clientY - chip.getBoundingClientRect().top,
    };
    chip.setPointerCapture(event.pointerId);
  });
});

window.addEventListener("pointermove", (event) => {
  if (!activeChip) return;

  const rect = phone.getBoundingClientRect();
  activeChip.element.style.left = `${event.clientX - rect.left - activeChip.offsetX}px`;
  activeChip.element.style.top = `${event.clientY - rect.top - activeChip.offsetY}px`;
});

function bounceChipBack(chipElement) {
  chipElement.classList.add("chip-reject");
  vibrate([40, 30, 60]);
  playSound("reject");

  chipElement.addEventListener("animationend", function onEnd() {
    chipElement.removeEventListener("animationend", onEnd);
    chipElement.classList.remove("chip-reject");
    chipElement.style.left = "";
    chipElement.style.top = "";
  });
}

window.addEventListener("pointerup", (event) => {
  if (!activeChip || event.pointerId !== activeChip.pointerId) return;

  const chipEl = activeChip.element;
  const chipRect = chipEl.getBoundingClientRect();
  const targetRect = document.querySelector(".chip-target").getBoundingClientRect();
  const chipX = chipRect.left + chipRect.width / 2;
  const chipY = chipRect.top + chipRect.height / 2;
  const chipNumber = chipEl.dataset.chip;

  // Check distance to each slot
  let nearSlotNumber = null;
  let nearSlotDistance = Infinity;
  for (const [slotNum, slot] of Object.entries(puzzleSlots)) {
    const slotX = targetRect.left + slot.x + chipRect.width / 2;
    const slotY = targetRect.top + slot.y + chipRect.height / 2;
    const dist = Math.hypot(chipX - slotX, chipY - slotY);
    if (dist < 78 && dist < nearSlotDistance) {
      nearSlotNumber = slotNum;
      nearSlotDistance = dist;
    }
  }

  if (nearSlotNumber !== null) {
    if (nearSlotNumber === chipNumber) {
      // Correct slot — lock it in
      const slot = puzzleSlots[chipNumber];
      const phoneRect = phone.getBoundingClientRect();
      chipEl.classList.add("locked");
      chipEl.style.left = `${targetRect.left - phoneRect.left + slot.x}px`;
      chipEl.style.top = `${targetRect.top - phoneRect.top + slot.y}px`;
      finaleCount += 1;
      vibrate(30);
      playSound("lock");
    } else {
      // Wrong slot — bounce back!
      bounceChipBack(chipEl);
    }
  } else {
    // Dropped nowhere near any slot — just bounce back
    bounceChipBack(chipEl);
  }

  if (finaleCount === 3) {
    document.querySelector("[data-scene='finale']").classList.add("finale-complete");
    releaseWhale.hidden = false;
    document.querySelector("[data-scene='finale'] .gesture").textContent = "點擊釋放鯨魚";
    vibrate([60, 40, 80]);
    playSound("complete");
  }

  activeChip = null;
});

releaseWhale.addEventListener("click", () => {
  const finaleScene = document.querySelector("[data-scene='finale']");
  finaleScene.classList.add("whale-released");
  releaseWhale.hidden = true;
  document.querySelector("[data-scene='finale'] .gesture").textContent = "互動完成";
  vibrate([40, 50, 90]);
  playSound("release");
});

restart.addEventListener("click", () => {
  playSound("reset");
  memoryIndex = 0;
  memoryComplete = false;
  erasedPixels = 0;
  pollutionComplete = false;
  finaleCount = 0;
  activeChip = null;
  pendingFeedbackAction = null;
  notice.hidden = true;
  chipFeedback.hidden = true;

  const riverScene = document.querySelector("[data-scene='river']");
  riverScene.classList.remove("river-found", "river-silenced");
  document.querySelector("[data-meter='bearing']").textContent = "--";
  document.querySelector("[data-meter='distance']").textContent = "--";
  document.querySelector("[data-meter='signal']").textContent = "正常";
  document.querySelector(".scan-alert").textContent = "正常";
  scanButton.textContent = "待機";
  scanButton.disabled = true;

  showMemory(0);
  saltScene.classList.remove("salt-lit");

  const finaleScene = document.querySelector("[data-scene='finale']");
  finaleScene.classList.remove("finale-complete", "whale-released");
  releaseWhale.hidden = true;
  document.querySelector("[data-scene='finale'] .gesture").textContent = "把晶片拖到對應拼圖位置";

  document.querySelector(".chip-one").style.left = "";
  document.querySelector(".chip-one").style.top = "";
  document.querySelector(".chip-two").style.left = "";
  document.querySelector(".chip-two").style.top = "";
  document.querySelector(".chip-three").style.left = "";
  document.querySelector(".chip-three").style.top = "";
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("locked"));

  showScene(0);
});

showScene(0);
