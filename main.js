// main.js
// Caverna da Luz — HTML5 Canvas implementation
// Autor: gerado por ChatGPT — adaptar conforme necessário

/* === Configurações principais === */
const CANVAS_W = 1000, CANVAS_H = 700;
const CRYSTAL_COUNT = 3;
const PLAYER_SPEED = 160; // px/s
const LANTERN_MAX = 10.0; // seconds
const LANTERN_DRAIN = 1.2; // per sec
const LANTERN_RECHARGE = 0.8; // per sec when off

/* === Setup canvas/context === */
const canvas = document.getElementById('game-canvas');
canvas.width = CANVAS_W; canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d', { alpha: false });

/* === UI refs === */
const overlay = document.getElementById('overlay-menu');
const btnStart = document.getElementById('btn-start');
const btnHelp = document.getElementById('btn-help');
const btnCredits = document.getElementById('btn-credits');
const help = document.getElementById('help');
const credits = document.getElementById('credits');
const hudScore = document.getElementById('score');
const hudTimer = document.getElementById('timer');
const hudBattery = document.getElementById('battery');
const msgBox = document.getElementById('message');

btnHelp.addEventListener('click', ()=>{ help.classList.toggle('hidden'); credits.classList.add('hidden');});
btnCredits.addEventListener('click', ()=>{ credits.classList.toggle('hidden'); help.classList.add('hidden');});
btnStart.addEventListener('click', ()=> startGame());

/* === Game state === */
let lastTime = 0;
let keys = {};
let running = false;
let startTimestamp = 0;
let elapsed = 0;

/* Simple scene: ground plane with obstacles/pits */
const scene = {
  width: CANVAS_W, height: CANVAS_H,
  pits: [ {x:150,y:480,w:220,h:120}, {x:680,y:120,w:260,h:160} ],
  obstacles: [ {x:420,y:300,w:60,h:160} ]
};

/* Player object with hierarchy (body + lantern) */
const player = {
  x: CANVAS_W/2, y: CANVAS_H/2,
  w: 34, h: 42,
  vx:0, vy:0,
  battery: LANTERN_MAX,
  lanternOn: true,
  parent: null,
  children: { lantern: {} }
};

/* Crystals */
let crystals = [];

/* Input handling */
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') togglePause(); if (e.key.toLowerCase()==='l'){ player.lanternOn = !player.lanternOn; }});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

/* Start/reset */
function startGame(){
  overlay.classList.add('hidden');
  msgBox.classList.add('hidden');
  crystals = [];
  spawnCrystals(CRYSTAL_COUNT);
  player.x = CANVAS_W/2; player.y = CANVAS_H/2;
  player.vx = 0; player.vy = 0;
  player.battery = LANTERN_MAX;
  player.lanternOn = true;
  running = true;
  startTimestamp = performance.now();
  lastTime = startTimestamp;
  elapsed = 0;
  requestAnimationFrame(loop);
}

/* Pause */
function togglePause(){
  running = !running;
  if(!running) {
    msgBox.textContent = 'PAUSADO';
    msgBox.classList.remove('hidden');
  } else {
    msgBox.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

/* Spawn crystals in safe positions */
function spawnCrystals(n){
  for(let i=0;i<n;i++){
    let p;
    let attempts = 0;
    do {
      p = {
        x: 120 + Math.random()*(CANVAS_W-240),
        y: 120 + Math.random()*(CANVAS_H-240),
        r: 14,
        picked:false
      };
      attempts++;
    } while((overlapsPit(p) || dist(p.x,p.y, player.x, player.y)<100) && attempts<50);
    crystals.push(p);
  }
  updateHUD();
}

/* Helpers */
function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1,y2-y1); }
function overlapsPit(obj){
  for(const pit of scene.pits){
    if(obj.x > pit.x && obj.x < pit.x + pit.w && obj.y > pit.y && obj.y < pit.y + pit.h) return true;
  }
  return false;
}

/* Game loop */
function loop(now){
  if(!running) return;
  const dt = Math.min(0.05, (now - lastTime)/1000); // clamp dt
  lastTime = now;
  elapsed = (now - startTimestamp)/1000;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* Update simulation */
function update(dt){
  // Input -> movement (top-down)
  let moveX = 0, moveY = 0;
  if(keys['w'] || keys['arrowup']) moveY -= 1;
  if(keys['s'] || keys['arrowdown']) moveY += 1;
  if(keys['a'] || keys['arrowleft']) moveX -= 1;
  if(keys['d'] || keys['arrowright']) moveX += 1;
  const len = Math.hypot(moveX, moveY) || 1;
  player.vx = (moveX/len) * PLAYER_SPEED;
  player.vy = (moveY/len) * PLAYER_SPEED;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Keep inside bounds
  player.x = Math.max(20, Math.min(CANVAS_W-20, player.x));
  player.y = Math.max(20, Math.min(CANVAS_H-20, player.y));

  // Lantern battery
  if(player.lanternOn){
    player.battery = Math.max(0, player.battery - LANTERN_DRAIN * dt);
    if(player.battery <= 0){ player.lanternOn = false; }
  } else {
    // recharge slowly if off and not full
    player.battery = Math.min(LANTERN_MAX, player.battery + LANTERN_RECHARGE * dt);
  }

  // Crystal collection
  for(const c of crystals){
    if(!c.picked && dist(c.x, c.y, player.x, player.y) < (c.r + Math.max(player.w, player.h)/2)){
      c.picked = true;
      // emit sound or particle (optional)
      updateHUD();
    }
  }

  // Check victory
  const collected = crystals.filter(c=>c.picked).length;
  if(collected >= CRYSTAL_COUNT){
    running = false;
    showMessage(`VOCÊ VENCEU! Tempo: ${formatTime(elapsed)}`);
    return;
  }

  // Check fall into pit -> defeat
  for(const pit of scene.pits){
    if(player.x > pit.x && player.x < pit.x + pit.w && player.y > pit.y && player.y < pit.y + pit.h){
      running = false;
      showMessage('Você caiu! Derrota.');
      return;
    }
  }

  updateHUD();
}

/* Update HUD elements */
function updateHUD(){
  const collected = crystals.filter(c=>c.picked).length;
  hudScore.textContent = `Cristais: ${collected} / ${CRYSTAL_COUNT}`;
  hudTimer.textContent = formatTime(elapsed);
  hudBattery.textContent = `Lanterna: ${Math.round(player.battery / LANTERN_MAX * 100)}%`;
}

/* Format time mm:ss.ms */
function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60);
  const ms = Math.floor((sec - Math.floor(sec))*100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

/* Show center message */
function showMessage(txt){
  msgBox.textContent = txt;
  msgBox.classList.remove('hidden');
  setTimeout(()=>{ msgBox.classList.add('hidden'); overlay.classList.remove('hidden'); }, 3000);
}

/* === Rendering === */
function render(){
  // Clear base
  ctx.fillStyle = '#06080b';
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // Draw directional ambient light (simple gradient)
  const g = ctx.createLinearGradient(0,0, canvas.width, canvas.height);
  g.addColorStop(0, '#0b1220');
  g.addColorStop(1, '#071018');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // Draw floor grid / subtle
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffffff';
  for(let x=0;x<canvas.width;x+=40){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  for(let y=0;y<canvas.height;y+=40){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
  }
  ctx.restore();

  // Draw pits (dark regions)
  for(const pit of scene.pits){
    ctx.fillStyle = '#031018';
    ctx.fillRect(pit.x, pit.y, pit.w, pit.h);
    // soft edge
    const rad = Math.max(pit.w, pit.h);
    const grad = ctx.createRadialGradient(pit.x + pit.w/2, pit.y + pit.h/2, 10, pit.x + pit.w/2, pit.y + pit.h/2, rad);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(pit.x - rad/2, pit.y - rad/2, pit.w + rad, pit.h + rad);
  }

  // Draw obstacles
  for(const ob of scene.obstacles){
    ctx.fillStyle = '#4b5258';
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
  }

  // Draw crystals (emissive)
  for(const c of crystals){
    if(c.picked) continue;
    // glow
    const g2 = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 28);
    g2.addColorStop(0, 'rgba(120,220,255,0.95)');
    g2.addColorStop(1, 'rgba(40,120,160,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(c.x, c.y, 28, 0, Math.PI*2); ctx.fill();

    // crystal shape (diamond)
    ctx.fillStyle = '#8fe7ff';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y-12);
    ctx.lineTo(c.x+10,c.y);
    ctx.lineTo(c.x, c.y+12);
    ctx.lineTo(c.x-10,c.y);
    ctx.closePath();
    ctx.fill();

    // bright center
    ctx.fillStyle = '#e8ffff';
    ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI*2); ctx.fill();
  }

  // Draw player shadow (simple)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 20, player.w*0.8, player.h*0.5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Draw player (hierarchical body + head)
  // Body
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = '#c3c9d1';
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
  // head
  ctx.fillStyle = '#9aa2aa';
  ctx.fillRect(-player.w/4, -player.h - 6, player.w/2, player.h/2);
  ctx.restore();

  // Lantern / spotlight effect (rendered as additive radial gradient)
  if(player.lanternOn){
    const spotRadius = 180 * (player.battery / LANTERN_MAX) + 40;
    // darkness overlay
    ctx.save();
    // dim whole scene a bit
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // spotlight (clear area) using composite 'destination-out' to cut hole
    const grad = ctx.createRadialGradient(player.x, player.y, 20, player.x, player.y, spotRadius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(player.x, player.y, spotRadius, 0, Math.PI*2); ctx.fill();

    // additive glow for the spotlight center
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, spotRadius);
    glow.addColorStop(0, 'rgba(180,220,255,0.35)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(player.x, player.y, spotRadius, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  } else {
    // If lantern off, dim screen more
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  // Optionally draw a subtle overlay simulating directional light (like sunlight)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0, canvas.width, 60); // small top highlight
  ctx.restore();
}

/* Start with overlay visible */
overlay.classList.remove('hidden');
msgBox.classList.add('hidden');

/* Expose for debug */
window._GAME = { startGame, player, crystals, scene };
