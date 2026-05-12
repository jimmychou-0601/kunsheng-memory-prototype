const scenes = Array.from(document.querySelectorAll(".scene"));
const dots = Array.from(document.querySelectorAll(".dot"));
const memoryCards = Array.from(document.querySelectorAll(".memory-card"));
const memoryDots = Array.from(document.querySelectorAll(".memory-dot"));
const notice = document.querySelector("#chipNotice");
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

function showScene(index) {
  sceneIndex = index;
  scenes.forEach((scene, current) => scene.classList.toggle("active", current === index));
  dots.forEach((dot, current) => dot.classList.toggle("active", current === index));

  if (scenes[index].dataset.scene === "pollution") {
    requestAnimationFrame(drawFog);
  }
}

function flashChip(text) {
  notice.textContent = text;
  notice.hidden = false;
  window.setTimeout(() => {
    notice.hidden = true;
  }, 950);
}

function nextScene(delay = 0) {
  window.setTimeout(() => {
    if (sceneIndex < scenes.length - 1) {
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
  if (riverScene.classList.contains("river-found")) return;

  riverScene.classList.add("river-found");
  document.querySelector("[data-meter='bearing']").textContent = "溪口";
  document.querySelector("[data-meter='distance']").textContent = "近";
  document.querySelector("[data-meter='signal']").textContent = "晶片";
  scanButton.textContent = "已定位";
  scanButton.disabled = true;
  vibrate([25, 30, 45]);
  flashChip("發現第一片晶片");
  nextScene(1200);
});

function showMemory(index) {
  memoryIndex = Math.max(0, Math.min(index, memoryCards.length - 1));
  memoryCards.forEach((card, current) => card.classList.toggle("active", current === memoryIndex));
  memoryDots.forEach((dot, current) => dot.classList.toggle("active", current === memoryIndex));

  if (memoryIndex === memoryCards.length - 1 && !memoryComplete) {
    memoryComplete = true;
    flashChip("解鎖第二片晶片位置");
    nextScene(1100);
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
  }

  if (distance > 44) {
    showMemory(memoryIndex - 1);
    vibrate(18);
  }
});

const saltScene = document.querySelector("[data-scene='salt']");
saltScene.addEventListener("pointerdown", () => {
  if (!saltScene.classList.contains("active")) return;

  saltTimer = window.setTimeout(() => {
    saltScene.classList.add("salt-lit");
    vibrate([30, 40, 30]);
    flashChip("取得第二片晶片");
    nextScene(1400);
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
  if (erasedPixels > 34 && !pollutionComplete) {
    pollutionComplete = true;
    vibrate([35, 30, 35]);
    flashChip("取得第三片晶片");
    nextScene(800);
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

window.addEventListener("pointerup", (event) => {
  if (!activeChip || event.pointerId !== activeChip.pointerId) return;

  const chipRect = activeChip.element.getBoundingClientRect();
  const targetRect = document.querySelector(".chip-target").getBoundingClientRect();
  const chipX = chipRect.left + chipRect.width / 2;
  const chipY = chipRect.top + chipRect.height / 2;
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;
  const distance = Math.hypot(chipX - targetX, chipY - targetY);

  if (distance < 92) {
    activeChip.element.classList.add("locked");
    activeChip.element.style.left = `${targetRect.left - phone.getBoundingClientRect().left + 40 + finaleCount * 16}px`;
    activeChip.element.style.top = `${targetRect.top - phone.getBoundingClientRect().top + 40 + finaleCount * 10}px`;
    finaleCount += 1;
    vibrate(30);
  }

  if (finaleCount === 3) {
    document.querySelector("[data-scene='finale']").classList.add("finale-complete");
    releaseWhale.hidden = false;
    document.querySelector("[data-scene='finale'] .gesture").textContent = "點擊釋放鯨魚";
    vibrate([60, 40, 80]);
  }

  activeChip = null;
});

releaseWhale.addEventListener("click", () => {
  const finaleScene = document.querySelector("[data-scene='finale']");
  finaleScene.classList.add("whale-released");
  releaseWhale.hidden = true;
  document.querySelector("[data-scene='finale'] .gesture").textContent = "互動完成";
  vibrate([40, 50, 90]);
});

restart.addEventListener("click", () => {
  memoryIndex = 0;
  memoryComplete = false;
  erasedPixels = 0;
  pollutionComplete = false;
  finaleCount = 0;
  activeChip = null;

  const riverScene = document.querySelector("[data-scene='river']");
  riverScene.classList.remove("river-found");
  document.querySelector("[data-meter='bearing']").textContent = "--";
  document.querySelector("[data-meter='distance']").textContent = "--";
  document.querySelector("[data-meter='signal']").textContent = "搜尋";
  scanButton.textContent = "掃描";
  scanButton.disabled = false;

  showMemory(0);
  saltScene.classList.remove("salt-lit");

  const finaleScene = document.querySelector("[data-scene='finale']");
  finaleScene.classList.remove("finale-complete", "whale-released");
  releaseWhale.hidden = true;
  document.querySelector("[data-scene='finale'] .gesture").textContent = "把晶片拖進中央光環";

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
