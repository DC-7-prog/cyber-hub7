/* ============================
   Config: toggle to disable heavy effects if needed
   ============================ */
let ENABLE_HEAVY = true; // set false to disable circuit, parallax, sound, liquify visuals
let ENABLE_SOUND = true;   // set false to disable all sound fx

/* ---------- helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------- sound synthesis (web audio) ---------- */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let masterGain = null;
function initAudio(){
  if(!audioCtx){
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioCtx.destination);
  }
}

/* neon hum: low subtle pad */
function playNeonHum(duration=1.2){
  if(!ENABLE_SOUND) return;
  initAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = 110;
  g.gain.value = 0.001;
  o.connect(g); g.connect(masterGain);
  o.start();
  // fade in and out
  g.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.4);
  g.gain.linearRampToValueAtTime(0.0005, audioCtx.currentTime + duration);
  setTimeout(()=>{ o.stop(); }, duration*1000+300);
}

/* click sound */
function playClick(){
  if(!ENABLE_SOUND) return;
  initAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 800;
  o.connect(g); g.connect(masterGain);
  g.gain.value = 0.0015;
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.09);
  setTimeout(()=>o.stop(), 120);
}

/* glitch spark: short noise burst */
function playGlitch(){
  if(!ENABLE_SOUND) return;
  initAudio();
  const bufferSize = audioCtx.sampleRate * 0.07;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/bufferSize*6);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const g = audioCtx.createGain();
  g.gain.value = 0.5;
  src.connect(g); g.connect(masterGain);
  src.start();
}

/* ---------- circuit board animated background (canvas) ---------- */
const circuit = document.getElementById('circuit');
const cctx = circuit.getContext && circuit.getContext('2d');

function resizeCircuit(){
  circuit.width = innerWidth;
  circuit.height = innerHeight;
}
if(cctx && ENABLE_HEAVY){
  resizeCircuit();
  window.addEventListener('resize', resizeCircuit);
  // generate horizontal neon lines and nodes
  const lines = [];
  for(let i=0;i<60;i++){
    lines.push({
      y: Math.random()*circuit.height,
      speed: (Math.random()*0.4+0.05),
      hue: 180 + Math.random()*120,
      nodes: Array.from({length: Math.floor(3+Math.random()*6)}, ()=>({x:Math.random()*circuit.width, tw:Math.random()*200+100}))
    });
  }

  function drawCircuit(){
    cctx.clearRect(0,0,circuit.width,circuit.height);
    lines.forEach(line=>{
      line.y += line.speed;
      if(line.y > circuit.height+20) line.y = -20;
      // draw main glowing line
      cctx.beginPath();
      cctx.moveTo(0, line.y);
      for(let i=0;i<line.nodes.length;i++){
        const n = line.nodes[i];
        const nx = (i/(line.nodes.length-1))*circuit.width;
        const ny = line.y + Math.sin((Date.now()+n.tw)/800 + i)*12;
        cctx.lineTo(nx, ny);
      }
      cctx.strokeStyle = `hsla(${line.hue}, 90%, 60%, 0.08)`;
      cctx.lineWidth = 2.4;
      cctx.shadowBlur = 18;
      cctx.shadowColor = `hsla(${line.hue},90%,60%,0.7)`;
      cctx.stroke();

      // nodes
      line.nodes.forEach((n,i)=>{
        const nx = (i/(line.nodes.length-1))*circuit.width;
        const ny = line.y + Math.sin((Date.now()+n.tw)/800 + i)*12;
        cctx.beginPath();
        cctx.fillStyle = `hsla(${line.hue},90%,70%,0.9)`;
        cctx.shadowBlur = 14;
        cctx.shadowColor = `hsla(${line.hue},90%,70%,0.8)`;
        cctx.arc(nx, ny, 3.2, 0, Math.PI*2);
        cctx.fill();
      });
    });
    requestAnimationFrame(drawCircuit);
  }
  drawCircuit();
}

/* ---------- parallax 3D based on mouse move ---------- */
const parallaxRoot = document.getElementById('parallax');
window.addEventListener('mousemove', (e)=>{
  if(!ENABLE_HEAVY) return;
  const cx = innerWidth/2, cy = innerHeight/2;
  const dx = (e.clientX - cx)/cx; // -1..1
  const dy = (e.clientY - cy)/cy;
  // small rotation + translate to logo and main container
  const logo = document.querySelector('.logo-wrap');
  const main = document.querySelector('.container');
  if(logo) logo.style.transform = `translate3d(${dx*8}px, ${dy*6}px, 0) rotate3d(${dy}, ${-dx}, 0, ${dx*2}deg)`;
  if(main) main.style.transform = `translate3d(${dx*12}px, ${dy*10}px, 0)`;
});

/* ---------- logo wave animation pulse + neon hum on hover ---------- */
const logoSvg = document.getElementById('neonLogo');
if(logoSvg){
  logoSvg.addEventListener('mouseenter', ()=>{ if(ENABLE_SOUND) playNeonHum(1.5); });
  // simple stroke-dash animation
  const wave = document.getElementById('wave');
  if(wave){
    let off = 0;
    function animateWave(){
      off += 1.6;
      wave.style.strokeDasharray = '12 8';
      wave.style.strokeDashoffset = off;
      requestAnimationFrame(animateWave);
    }
    animateWave();
  }
}

/* ---------- button interactions: click sound + open url + small liquify pulse ---------- */
const cards = $$('.card');
cards.forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    const url = btn.dataset.url;
    // little anim pulse
    btn.animate([{transform:'scale(1)'},{transform:'scale(0.92)'},{transform:'scale(1)'}], {duration:260, easing:'cubic-bezier(.2,.9,.2,1)'});
    if(ENABLE_SOUND) { playClick(); setTimeout(playGlitch, 80); }
    // open new tab after tiny delay for sound to be perceived
    setTimeout(()=> { window.open(url, '_blank'); }, 130);
  });
});

/* ---------- effects toggle and mute control ---------- */
const toggleEffects = document.getElementById('toggleEffects');
const muteBtn = document.getElementById('muteBtn');
toggleEffects.addEventListener('click', ()=>{
  ENABLE_HEAVY = !ENABLE_HEAVY;
  toggleEffects.textContent = `Effects: ${ENABLE_HEAVY ? 'ON' : 'OFF'}`;
  // simple enable/disable: hide circuit canvas when off, reset transforms
  circuit.style.display = ENABLE_HEAVY ? 'block' : 'none';
  document.querySelectorAll('.logo-wrap, .container').forEach(el=> el.style.transform = '');
});
muteBtn.addEventListener('click', ()=>{
  ENABLE_SOUND = !ENABLE_SOUND;
  muteBtn.textContent = ENABLE_SOUND ? '🔊' : '🔇';
  if(!ENABLE_SOUND && audioCtx) masterGain.gain.value = 0; // silence quick
  if(ENABLE_SOUND && masterGain) masterGain.gain.value = 0.6;
});

/* ---------- start subtle ambient hum after page loaded ---------- */
window.addEventListener('load', ()=>{
  // gentle initial hum (very low volume)
  setTimeout(()=>{ if(ENABLE_SOUND) playNeonHum(2.6); }, 600);
  // start typewriter animation by adding a class fallback (CSS handles the typing)
  document.querySelectorAll('.typewriter').forEach(el=>{
    // re-trigger by resetting width (in case)
    el.style.width = '0';
    setTimeout(()=> el.style.width = '100%', 60);
  });
});

/* ---------- performance note: if heavy disabled, stop canvas loops gracefully ---------- */
if(!ENABLE_HEAVY){
  if(cctx) cctx.clearRect(0,0,circuit.width,circuit.height);
  // remove motion transforms
  document.querySelectorAll('.logo-wrap, .container').forEach(el=> el.style.transform = '');
}