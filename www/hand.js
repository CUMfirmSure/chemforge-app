/* ChemForge hand mode v3: selfie camera, up to TWO hands, on-device. Engine: MediaPipe Tasks HandLandmarker (GPU, preferred) with the older MediaPipe Hands as automatic fallback.
   One hand: pointer (move, pinch to grab, pan/orbit). Two hands: hold + stretch bonds, pinch-zoom. Tap a tile to arm an element, then pinch to place it. */
(()=>{
const S={on:false,busy:false,busyT:0,armed:false,raf:0,every:1,fc:0,fast:0,slow:0,ms:0,fps:0,lastR:0,lastRes:0,stall:0,ready:false,fails:0,stream:null,eng:null,video:null,ov:null,box:null,tag:null,cur:[],armT:0,tg:[],tgT:0,wd:0,tk:0,tkT:0,hotEl:[null,null],starting:false};
const mkF=()=>({t:null,x:0,dx:0,min:1.4,beta:12});
const mkSlot=id=>({f:{x:mkF(),y:mkF()},id,on:false,pinch:false,first:true,x:0,y:0,seen:0,mode:null,tile:null,atom:null,dx:0,dy:0,snap:null,wasP:false});
const H=[mkSlot(77),mkSlot(78)];let armed=null;
const G=2.2; // reach gain: hand travel needed = 1/G of the frame
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const D=(a,b,w=1,h=1)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);
const LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const label=a=>a.e||TP[a.t][0];
function calc(lm,vw,vh){const i=lm[8],t=lm[4],size=D(lm[0],lm[9],vw,vh)||1,mg=.015;return{rx:1-(i.x+t.x)/2,ry:(i.y+t.y)/2,tipsOut:[i,t].some(p=>p.x<mg||p.x>1-mg||p.y<mg||p.y>1-mg),ratio:D(i,t,vw,vh)/size,x:clamp(.5+((1-(i.x+t.x)/2)-.5)*G,0,1),y:clamp(.5+((i.y+t.y)/2-.5)*G,0,1)}}
const alpha=(te,fc)=>1/(1+(1/(2*Math.PI*fc))/te);
function euro(s,x,t){if(s.t==null){s.x=x;s.dx=0;s.t=t;return x}const te=Math.max(.001,(t-s.t)/1000);s.t=t;const dx=(x-s.x)/te,ad=alpha(te,1);s.dx=ad*dx+(1-ad)*s.dx;s.x=alpha(te,s.min+s.beta*Math.abs(s.dx))*x+(1-alpha(te,s.min+s.beta*Math.abs(s.dx)))*s.x;return s.x}
const GR=3.4,GRACE=1800;
function update(h,c,t){const fresh=h.first;if(fresh){h.f.x.t=h.f.y.t=null;h.first=false}
 if(h.lost){h.lost=false;if(h.pinch&&h.anc){h.anc={sx:h.x,sy:h.y,rx:c.rx,ry:c.ry};h.f.x.t=h.f.y.t=null}} // hand came back: continue from where it was, no jump
 if(c.tipsOut&&h.pinch)return null; // fingertips are outside the camera frame: keep holding, ignore the unreliable reading
 let nx=c.x,ny=c.y;if(h.pinch&&h.anc){nx=clamp((h.anc.sx+(c.rx-h.anc.rx)*GR*innerWidth)/innerWidth,0,1);ny=clamp((h.anc.sy+(c.ry-h.anc.ry)*GR*innerHeight)/innerHeight,0,1)}
 h.f.x.min=h.f.y.min=h.pinch?.9:1.4;h.tx=euro(h.f.x,nx,t)*innerWidth;h.ty=euro(h.f.y,ny,t)*innerHeight;if(fresh){h.x=h.tx;h.y=h.ty}
 const was=h.pinch;if(!h.pinch&&c.ratio<.30)h.pinch=true;else if(h.pinch&&c.ratio>.45)h.pinch=false;
 if(h.pinch&&!was)h.anc={sx:h.x,sy:h.y,rx:c.rx,ry:c.ry};else if(!h.pinch)h.anc=null;
 return was===h.pinch?null:h.pinch?'down':'up'}
function fire(type,t,h){try{t.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:h.x,clientY:h.y,pointerId:h.id,pointerType:'pen',isPrimary:h.id==77,button:0,buttons:type=='pointerup'?0:1,view:window}))}catch(e){}}
const cvT=()=>window.LABON?document.getElementById('lab'):cv;
const isCv=t=>t===cv||(t&&(t.id==='cv'||t.id==='lab'));
function W2(x,y){const r=cv.getBoundingClientRect();project();return wp(x-r.left,y-r.top)}
function place(wx,wy){if(!armed)return;if(armed.e)dropAtom(armed.e,wx,wy);else tpl(TP[armed.t][1],wx,wy);vib(10)}
// ---- direct atom hold (used by the second hand so both hands can pull atoms at once)
function hold(h,A){h.atom=A;h.wasP=!!A.p;A.p=true;h.snap=snap();sel=A.id;refresh()}
function holdMove(h){const a=h.atom;if(!a||!atoms.includes(a))return;const[wx,wy]=W2(h.x,h.y),w=unproj(wx,wy,a._z);a.x=w[0];a.y=w[1];a.z=w[2];
 bonds.filter(b=>b.a==a.id||b.b==a.id).forEach(b=>{const e=bondE(b),o=A_(b.a==a.id?b.b:b.a);if(e.dr>0&&e.fr>=1&&o&&o.p){if(h.snap){undo.push(h.snap);if(undo.length>80)undo.shift();redo=[];h.snap=null}const sd=drag;drag=null;breakBond(b,e);drag=sd}});wake()}
function holdEnd(h){const a=h.atom;h.atom=null;if(!a||!atoms.includes(a))return;a.p=h.wasP;const[wx,wy]=W2(h.x,h.y),t=nearAtom(wx,wy,40,a.id);
 if(t){const ex=bondOf(a.id,t.id);if(!(ex&&ex.o==ord))tryBond(a.id,t.id,ord)}else save();wake();refresh()}
// ---- press / drag / release routing
function press(h){h.mode=null;h.dx=h.x;h.dy=h.y;const t=h.hot||document.elementFromPoint(h.x,h.y);if(!t)return;
 const tile=t.closest&&t.closest('[data-e],[data-t]');if(tile){h.mode='tile';h.tile=tile;return}
 if(isCv(t)){if(window.LABON){h.mode='canvas';fire('pointerdown',cvT(),h);return}const[wx,wy]=W2(h.x,h.y);if(armed){place(wx,wy);h.mode='done';return}
  const A=nearAtom(wx,wy,34),o=H.find(q=>q!==h&&q.pinch&&q.mode&&q.mode!=='done'),oh=!!o&&(o.mode==='atom'||(o.mode==='canvas'&&!!drag));
  if(A&&oh){h.mode='atom';hold(h,A);return}if(!A&&oh)return;h.mode='canvas';fire('pointerdown',cvT(),h);return}
 const b=t.closest&&t.closest('button,.hd');if(b)b.click()}
function move(h){switch(h.mode){
 case 'canvas':fire('pointermove',cvT(),h);break;
 case 'tray':fire('pointermove',h.tile,h);break;
 case 'tile':if(Math.hypot(h.x-h.dx,h.y-h.dy)>26&&!td){h.mode='tray';fire('pointerdown',h.tile,{id:h.id,x:h.dx,y:h.dy});fire('pointermove',h.tile,h)}break;
 case 'atom':holdMove(h);break;
 default:if(!h.pinch&&(tool==='erase'||window.LABON)){const t=document.elementFromPoint(h.x,h.y);if(isCv(t))fire('pointermove',cvT(),h)}}}
function release(h){const m=h.mode;h.mode=null;
 if(m==='canvas')fire('pointerup',cvT(),h);else if(m==='tray')fire('pointerup',h.tile,h);else if(m==='atom')holdEnd(h);
 else if(m==='tile'){const d=h.tile.dataset,k=d.e!=null?{e:d.e}:{t:+d.t};armed=armed&&armed.e===k.e&&armed.t===k.t?null:k;
  toast(armed?'Placing '+label(armed)+'. Pinch empty space to place it, or an atom to bond to it. Pinch the same tile again to stop.':'Placing off.',1);vib(10)}}
// ---- magnetic menus: the cursor is drawn toward nearby buttons/tiles, and a pinch within reach presses the highlighted one
function refreshTargets(){S.tg=[...document.querySelectorAll('#bar .tb,#bar .vt button,#qd .tb,#tray button,#tabs button,#info .hd,.tc')].map(e=>({e,r:e.getBoundingClientRect()})).filter(o=>o.r.width>4&&o.r.height>4)}
function magnet(h){if(h.pinch||h.mode){h.hot=null;return}let best=null,bd=1e9;S.tg.forEach(o=>{const r=o.r,dx=Math.max(r.left-h.x,0,h.x-r.right),dy=Math.max(r.top-h.y,0,h.y-r.bottom),d=Math.hypot(dx,dy);if(d<bd){bd=d;best=o}});
 if(best&&bd<38){h.hot=best.e;h.x+=((best.r.left+best.r.right)/2-h.x)*.12;h.y+=((best.r.top+best.r.bottom)/2-h.y)*.12}else h.hot=null}
// ---- hand identity: keep each physical hand in the same slot between frames
function assign(dets){const now=performance.now(),P=[];dets.forEach((d,i)=>H.forEach((h,j)=>P.push({i,j,d:h.on&&now-h.seen<700?Math.hypot(d.tx-h.x,d.ty-h.y):h.on&&h.pinch?5e4:h.on?1e5:2e5})));
 P.sort((a,b)=>a.d-b.d);const di=new Set(),hj=new Set(),out=[];P.forEach(p=>{if(di.has(p.i)||hj.has(p.j))return;di.add(p.i);hj.add(p.j);out.push([H[p.j],dets[p.i]])});return out}
function onResults(r){if(!S.on)return;if(!S.ready){S.ready=true;toast('Hand tracking ready ('+(S.eng?S.eng.name:'')+'). Pinch to grab; use both hands to stretch.',1)}S.fails=0;
 const L=r.multiHandLandmarks||[],now=performance.now();S.lastRes=now;if(S.lastR)S.fps=S.fps*.8+(1000/Math.max(1,now-S.lastR))*.2;S.lastR=now;const vw=S.video&&S.video.videoWidth||640,vh=S.video&&S.video.videoHeight||480;paint(L);
 const dets=L.map(lm=>{const c=calc(lm,vw,vh);c.tx=c.x*innerWidth;c.ty=c.y*innerHeight;return c}),used=new Set();
 assign(dets).forEach(([h,c])=>{used.add(h);h.on=true;h.seen=now;const ev=update(h,c,now);if(ev=='down')press(h);else if(ev=='up')release(h)});
 H.forEach(h=>{if(used.has(h))return;if(h.pinch){h.lost=true;if(now-h.seen>GRACE){h.pinch=false;h.anc=null;h.lost=false;release(h);h.on=false;h.first=true}}else if(h.on&&now-h.seen>700){h.on=false;h.first=true}})}
// ---- UI
function mk(tag,css){const e=document.createElement(tag);e.style.cssText=css;document.body.appendChild(e);return e}
function ui(){S.box=mk('div','position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 72px);width:150px;height:112px;border-radius:12px;overflow:hidden;border:1px solid #22d3ee;background:#000;z-index:55;pointer-events:none;box-shadow:0 8px 24px #0009');
 S.video=document.createElement('video');S.video.playsInline=true;S.video.muted=true;S.video.style.cssText='width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:.85';S.box.appendChild(S.video);
 S.ov=document.createElement('canvas');S.ov.width=150;S.ov.height=112;S.ov.style.cssText='position:absolute;inset:0;width:100%;height:100%';S.box.appendChild(S.ov);
 S.tag=document.createElement('div');S.tag.style.cssText='position:absolute;left:5px;bottom:4px;font:600 9px system-ui;letter-spacing:.08em;color:#fff;background:#0009;padding:2px 6px;border-radius:4px';S.tag.textContent='SHOW HAND';S.box.appendChild(S.tag);
 S.cur=['#22d3ee','#e879f9'].map(c=>mk('div',`position:fixed;left:0;top:0;width:30px;height:30px;border-radius:50%;border:2px solid ${c};z-index:60;pointer-events:none;opacity:0;box-shadow:0 0 12px ${c}88;font:700 11px/26px system-ui;text-align:center;color:#fff`))}
function paint(L){if(!S.ov)return;const g=S.ov.getContext('2d'),w=S.ov.width,h=S.ov.height;g.clearRect(0,0,w,h);g.lineWidth=1.5;
 L.forEach(lm=>{const pin=calc(lm,640,480).ratio<.38;g.strokeStyle='#22d3eecc';LINKS.forEach(([a,b])=>{g.beginPath();g.moveTo((1-lm[a].x)*w,lm[a].y*h);g.lineTo((1-lm[b].x)*w,lm[b].y*h);g.stroke()});
  [4,8].forEach(k=>{g.beginPath();g.arc((1-lm[k].x)*w,lm[k].y*h,3.5,0,7);g.fillStyle=pin?'#f59e0b':'#fff';g.fill()})})}
function cursors(){if(!S.box)return;H.forEach((h,i)=>{const c=S.cur[i];c.style.opacity=h.on?(h.lost?.45:1):0;c.style.transform=`translate(${h.x-15}px,${h.y-15}px)`;c.style.background=h.pinch?(i?'rgba(232,121,249,.5)':'rgba(245,158,11,.55)'):'transparent';c.textContent=armed?(armed.e||TP[armed.t][0].slice(0,2)):''});
 H.forEach((h,i)=>{if(S.hotEl[i]!==h.hot){if(S.hotEl[i])S.hotEl[i].classList.remove('hot');if(h.hot)h.hot.classList.add('hot');S.hotEl[i]=h.hot||null}});
 const n=H.filter(h=>h.on).length,p=H.filter(h=>h.pinch).length;S.tag.textContent=(H.some(h=>h.pinch&&h.lost)?'HOLDING':armed?'PLACE '+label(armed):p==2?'2 HANDS':p?'PINCH':n?'HAND':'SHOW HAND')+(S.fps>1?' '+Math.round(S.fps)+'fps':'');
 const now=performance.now();if(now-S.armT>400){S.armT=now;document.querySelectorAll('#tray button').forEach(b=>b.classList.toggle('arm',!!armed&&(armed.e?b.dataset.e===armed.e:b.dataset.t===String(armed.t))))}}
// ---- camera + model
const next=()=>{if(!S.on||!S.video||S.armed)return;S.armed=true;const v=S.video;if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(loop);else S.raf=requestAnimationFrame(loop)};
async function loop(){S.armed=false;if(!S.on)return;const v=S.video;
 if(v.readyState>=2&&!S.busy&&!document.hidden&&v.currentTime!==S.lastT){S.lastT=v.currentTime;if(++S.fc%S.every){next();return}
  S.busy=true;const t0=S.busyT=performance.now();
  try{await S.eng.step(v);S.fails=0}catch(e){if(++S.fails>6){S.busy=false;restart();return}}
  S.ms=S.ms*.85+(performance.now()-t0)*.15;
  if(S.ms>75&&S.every<3){if(++S.slow>25){S.every++;S.slow=0}}else if(S.ms<=40&&S.every>1){if(++S.fast>120){S.every--;S.fast=0}}else if(S.ms<=75)S.slow=0;
  S.busy=false}
 next()}
// glide loop at display rate: smooths the cursor between detections and sends drag moves every frame
function stepCursors(dt){const k=1-Math.exp(-dt*24);H.forEach(h=>{if(!h.on||h.tx==null)return;const ox=h.x,oy=h.y;h.x+=(h.tx-h.x)*k;h.y+=(h.ty-h.y)*k;magnet(h);if(Math.abs(h.x-ox)+Math.abs(h.y-oy)>.2)move(h)});cursors()}
function tick(t){if(!S.on)return;S.tk=requestAnimationFrame(tick);const dt=Math.min(.05,(t-S.tkT)/1000||.016);S.tkT=t;stepCursors(dt);if(t-S.tgT>400){S.tgT=t;refreshTargets()}}
// watchdog: if results stop (camera paused, model hung, app resumed) re-arm, then restart everything
function watchdog(){if(!S.on)return;const now=performance.now(),v=S.video;if(S.busy&&now-S.busyT>4000)S.busy=false;
 if(v&&v.paused&&!document.hidden)v.play().catch(()=>{});const tr=S.stream&&S.stream.getVideoTracks()[0];if(tr&&tr.readyState==='ended'){restart();return}
 if(now-S.lastRes>2500&&!document.hidden){if(++S.stall>=3){restart();return}S.armed=false;next()}else S.stall=0}
async function restart(){if(S.restarting)return;S.restarting=true;toast('Hand tracking paused, restarting it...');cleanup();S.restarting=false;await start()}
async function initEngine(){
 try{const r=await fetch('mediapipe/tasks/hand_landmarker.task');if(r.ok){const buf=new Uint8Array(await r.arrayBuffer());if(buf.length>1e6){
   if(!window.Vision)await loadScript('mediapipe/tasks/vision_bundle.js');
   const fs=await Vision.FilesetResolver.forVisionTasks('mediapipe/tasks/wasm');
   const mkL=d=>Vision.HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetBuffer:buf,delegate:d},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
   let lm,d='GPU';try{lm=await mkL('GPU')}catch(e){d='CPU';lm=await mkL('CPU')}
   let last=0;return{name:'MediaPipe Tasks, '+d,step:async v=>{const ts=Math.max(last+1,performance.now());last=ts;onResults({multiHandLandmarks:lm.detectForVideo(v,ts).landmarks||[]})},close:()=>{try{lm.close()}catch(e){}}}}}}
 catch(e){console.warn('Tasks engine unavailable, using the older engine',e)}
 if(!window.Hands)await loadScript('mediapipe/hands/hands.js');
 const hs=new window.Hands({locateFile:f=>'mediapipe/hands/'+f});hs.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.5});hs.onResults(onResults);await hs.initialize();
 return{name:'MediaPipe Hands, legacy',step:async v=>{await Promise.race([hs.send({image:v}),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),3000))])},close:()=>{try{hs.close()}catch(e){}}}}
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.appendChild(s)})}
async function start(){if(S.on||S.starting)return;if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Camera is not available on this device or page.');return}
 S.starting=true;toast('Starting camera and hand model...',1);
 try{S.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:480},height:{ideal:360},frameRate:{ideal:30,max:30}},audio:false});
  ui();S.video.srcObject=S.stream;await S.video.play();S.eng=await initEngine()}
 catch(e){toast('Hand mode could not start: '+(e.name=='NotAllowedError'?'camera permission denied.':(e.message||e.name)));cleanup();S.starting=false;return}
 S.starting=false;S.on=true;S.ready=false;S.every=1;S.fc=0;S.fast=0;S.slow=0;S.ms=0;S.fps=0;S.lastR=0;S.lastT=-1;S.lastRes=performance.now();S.stall=0;S.fails=0;S.armed=false;
 H.forEach(h=>{h.first=true;h.on=false;h.tx=null});window.HM=true;if(typeof resize==='function')resize();$('trayw').classList.remove('min');
 S.wd=setInterval(watchdog,1000);S.tkT=performance.now();S.tk=requestAnimationFrame(tick);next()}
function cleanup(){clearInterval(S.wd);cancelAnimationFrame(S.tk);cancelAnimationFrame(S.raf);H.forEach(h=>{if(h.pinch){h.pinch=false;release(h)}h.on=false;h.mode=null;h.hot=null});armed=null;
 document.querySelectorAll('#tray button.arm,.hot').forEach(b=>{b.classList.remove('arm');b.classList.remove('hot')});if(S.stream)S.stream.getTracks().forEach(t=>t.stop());
 [S.box,...S.cur].forEach(e=>e&&e.remove());S.stream=S.box=null;S.cur=[];S.on=false;window.HM=false;if(S.eng){try{S.eng.close()}catch(e){}S.eng=null}if(typeof resize==='function')resize()}
function stop(){cleanup()}
async function toggle(){S.on?stop():await start()}
if(document.addEventListener)document.addEventListener('visibilitychange',()=>{if(S.on&&!document.hidden){S.armed=false;next()}});
window.HandMode={toggle,start,stop,_watchdog:watchdog,_step:stepCursors,_S:S,_H:H,_calc:calc,_update:update,_press:press,_move:move,_release:release,_onResults:onResults,_hold:hold,_holdMove:holdMove,_holdEnd:holdEnd,_place:place,_arm:k=>{armed=k},_armed:()=>armed};
})();
