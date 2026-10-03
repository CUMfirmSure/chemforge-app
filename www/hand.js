/* ChemForge hand mode v2: selfie camera, up to TWO hands. MediaPipe Hands runs on-device (model bundled, works offline).
   One hand: pointer (move, pinch to grab, pan/orbit). Two hands: hold + stretch bonds, pinch-zoom. Tap a tile to arm an element, then pinch to place it. */
(()=>{
const S={on:false,busy:false,raf:0,maxHands:2,slow:0,ms:0,fps:0,lastR:0,ready:false,fails:0,stream:null,hands:null,video:null,ov:null,box:null,tag:null,cur:[],armT:0};
const mkF=()=>({t:null,x:0,dx:0,min:1.4,beta:12});
const mkSlot=id=>({f:{x:mkF(),y:mkF()},id,on:false,pinch:false,first:true,x:0,y:0,seen:0,mode:null,tile:null,atom:null,dx:0,dy:0,snap:null,wasP:false});
const H=[mkSlot(77),mkSlot(78)];let armed=null;
const G=2.2; // reach gain: hand travel needed = 1/G of the frame
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const D=(a,b,w=1,h=1)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);
const LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const label=a=>a.e||TP[a.t][0];
function calc(lm,vw,vh){const i=lm[8],t=lm[4],size=D(lm[0],lm[9],vw,vh)||1;return{ratio:D(i,t,vw,vh)/size,x:clamp(.5+((1-(i.x+t.x)/2)-.5)*G,0,1),y:clamp(.5+((i.y+t.y)/2-.5)*G,0,1)}}
const alpha=(te,fc)=>1/(1+(1/(2*Math.PI*fc))/te);
function euro(s,x,t){if(s.t==null){s.x=x;s.dx=0;s.t=t;return x}const te=Math.max(.001,(t-s.t)/1000);s.t=t;const dx=(x-s.x)/te,ad=alpha(te,1);s.dx=ad*dx+(1-ad)*s.dx;s.x=alpha(te,s.min+s.beta*Math.abs(s.dx))*x+(1-alpha(te,s.min+s.beta*Math.abs(s.dx)))*s.x;return s.x}
function update(h,c,t){if(h.first){h.f.x.t=h.f.y.t=null;h.first=false}h.f.x.min=h.f.y.min=h.pinch?.9:1.4;h.x=euro(h.f.x,c.x,t)*innerWidth;h.y=euro(h.f.y,c.y,t)*innerHeight;
 const was=h.pinch;if(!h.pinch&&c.ratio<.30)h.pinch=true;else if(h.pinch&&c.ratio>.45)h.pinch=false;return was===h.pinch?null:h.pinch?'down':'up'}
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
function press(h){h.mode=null;h.dx=h.x;h.dy=h.y;const t=document.elementFromPoint(h.x,h.y);if(!t)return;
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
// ---- hand identity: keep each physical hand in the same slot between frames
function assign(dets){const now=performance.now(),P=[];dets.forEach((d,i)=>H.forEach((h,j)=>P.push({i,j,d:h.on&&now-h.seen<700?Math.hypot(d.tx-h.x,d.ty-h.y):h.on?1e5:2e5})));
 P.sort((a,b)=>a.d-b.d);const di=new Set(),hj=new Set(),out=[];P.forEach(p=>{if(di.has(p.i)||hj.has(p.j))return;di.add(p.i);hj.add(p.j);out.push([H[p.j],dets[p.i]])});return out}
function onResults(r){if(!S.on)return;if(!S.ready){S.ready=true;toast('Hand tracking ready. Pinch to grab. Use both hands to stretch bonds.',1)}S.fails=0;
 const L=r.multiHandLandmarks||[],now=performance.now();if(S.lastR)S.fps=S.fps*.8+(1000/Math.max(1,now-S.lastR))*.2;S.lastR=now;const vw=S.video&&S.video.videoWidth||640,vh=S.video&&S.video.videoHeight||480;paint(L);
 const dets=L.map(lm=>{const c=calc(lm,vw,vh);c.tx=c.x*innerWidth;c.ty=c.y*innerHeight;return c}),used=new Set();
 assign(dets).forEach(([h,c])=>{used.add(h);h.on=true;h.seen=now;const ev=update(h,c,now);if(ev=='down')press(h);else if(ev=='up')release(h);else move(h)});
 H.forEach(h=>{if(used.has(h))return;if(h.pinch&&now-h.seen>350){h.pinch=false;release(h)}if(h.on&&now-h.seen>700){h.on=false;h.first=true}});cursors()}
// ---- UI
function mk(tag,css){const e=document.createElement(tag);e.style.cssText=css;document.body.appendChild(e);return e}
function ui(){S.box=mk('div','position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 72px);width:150px;height:112px;border-radius:12px;overflow:hidden;border:1px solid #22d3ee;background:#000;z-index:55;pointer-events:none;box-shadow:0 8px 24px #0009');
 S.video=document.createElement('video');S.video.playsInline=true;S.video.muted=true;S.video.style.cssText='width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:.85';S.box.appendChild(S.video);
 S.ov=document.createElement('canvas');S.ov.width=150;S.ov.height=112;S.ov.style.cssText='position:absolute;inset:0;width:100%;height:100%';S.box.appendChild(S.ov);
 S.tag=document.createElement('div');S.tag.style.cssText='position:absolute;left:5px;bottom:4px;font:600 9px system-ui;letter-spacing:.08em;color:#fff;background:#0009;padding:2px 6px;border-radius:4px';S.tag.textContent='SHOW HAND';S.box.appendChild(S.tag);
 S.cur=['#22d3ee','#e879f9'].map(c=>mk('div',`position:fixed;left:0;top:0;width:30px;height:30px;border-radius:50%;border:2px solid ${c};z-index:60;pointer-events:none;opacity:0;box-shadow:0 0 12px ${c}88;font:700 11px/26px system-ui;text-align:center;color:#fff`))}
function paint(L){if(!S.ov)return;const g=S.ov.getContext('2d'),w=S.ov.width,h=S.ov.height;g.clearRect(0,0,w,h);g.save();g.setLineDash([4,3]);g.strokeStyle='#f59e0bbb';g.lineWidth=1;g.strokeRect((.5-.5/G)*w,(.5-.5/G)*h,w/G,h/G);g.restore();g.lineWidth=1.5;
 L.forEach(lm=>{const pin=calc(lm,640,480).ratio<.38;g.strokeStyle='#22d3eecc';LINKS.forEach(([a,b])=>{g.beginPath();g.moveTo((1-lm[a].x)*w,lm[a].y*h);g.lineTo((1-lm[b].x)*w,lm[b].y*h);g.stroke()});
  [4,8].forEach(k=>{g.beginPath();g.arc((1-lm[k].x)*w,lm[k].y*h,3.5,0,7);g.fillStyle=pin?'#f59e0b':'#fff';g.fill()})})}
function cursors(){if(!S.box)return;H.forEach((h,i)=>{const c=S.cur[i];c.style.opacity=h.on?1:0;c.style.transform=`translate(${h.x-15}px,${h.y-15}px)`;c.style.background=h.pinch?(i?'rgba(232,121,249,.5)':'rgba(245,158,11,.55)'):'transparent';c.textContent=armed?(armed.e||TP[armed.t][0].slice(0,2)):''});
 const n=H.filter(h=>h.on).length,p=H.filter(h=>h.pinch).length;S.tag.textContent=(armed?'PLACE '+label(armed):p==2?'2 HANDS':p?'PINCH':n?'HAND':'SHOW HAND')+(S.fps>1?' '+Math.round(S.fps)+'fps':'');
 const now=performance.now();if(now-S.armT>400){S.armT=now;document.querySelectorAll('#tray button').forEach(b=>b.classList.toggle('arm',!!armed&&(armed.e?b.dataset.e===armed.e:b.dataset.t===String(armed.t))))}}
// ---- camera + model
const next=()=>{const v=S.video;if(!S.on||!v)return;if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(loop);else S.raf=requestAnimationFrame(loop)};
async function loop(){if(!S.on)return;const v=S.video;
 if(v.readyState>=2&&!S.busy&&!document.hidden&&v.currentTime!==S.lastT){S.busy=true;S.lastT=v.currentTime;const t0=performance.now();
  try{await S.hands.send({image:v})}catch(e){if(++S.fails>8){toast('Hand model stopped: '+(e.message||'error'));stop();return}}
  S.ms=S.ms*.85+(performance.now()-t0)*.15;
  if(S.ms>75&&S.maxHands===2){if(++S.slow>25){S.maxHands=1;S.hands.setOptions({maxNumHands:1});toast('Phone is struggling, so I switched to one-hand tracking for speed. Toggle Hand off and on to try two hands again.')}}else if(S.ms<=75)S.slow=0;
  S.busy=false}
 next()}
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.appendChild(s)})}
async function start(){if(S.on)return;if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Camera is not available on this device or page.');return}
 toast('Starting camera and hand model...',1);
 try{if(!window.Hands)await loadScript('mediapipe/hands/hands.js');
  S.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:480},height:{ideal:360},frameRate:{ideal:30,max:30}},audio:false});
  ui();S.hands=new window.Hands({locateFile:f=>'mediapipe/hands/'+f});S.hands.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.5});S.hands.onResults(onResults);
  S.video.srcObject=S.stream;await S.video.play();await S.hands.initialize()}
 catch(e){toast('Hand mode could not start: '+(e.name=='NotAllowedError'?'camera permission denied.':(e.message||e.name)));cleanup();return}
 S.on=true;S.ready=false;S.maxHands=2;S.slow=0;S.ms=0;S.fps=0;S.lastR=0;S.lastT=-1;H.forEach(h=>{h.first=true;h.on=false});window.HM=true;if(typeof resize==='function')resize();$('trayw').classList.remove('min');next()}
function cleanup(){cancelAnimationFrame(S.raf);H.forEach(h=>{if(h.pinch){h.pinch=false;release(h)}h.on=false;h.mode=null});armed=null;
 document.querySelectorAll('#tray button.arm').forEach(b=>b.classList.remove('arm'));if(S.stream)S.stream.getTracks().forEach(t=>t.stop());
 [S.box,...S.cur].forEach(e=>e&&e.remove());S.stream=S.box=null;S.cur=[];S.on=false;window.HM=false;if(typeof resize==='function')resize()}
function stop(){cleanup();if(S.hands){try{S.hands.close()}catch(e){}S.hands=null}}
async function toggle(){S.on?stop():await start()}
window.HandMode={toggle,start,stop,_S:S,_H:H,_calc:calc,_update:update,_press:press,_move:move,_release:release,_onResults:onResults,_hold:hold,_holdMove:holdMove,_holdEnd:holdEnd,_place:place,_arm:k=>{armed=k},_armed:()=>armed};
})();
