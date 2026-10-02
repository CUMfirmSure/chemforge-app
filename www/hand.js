/* ChemForge hand mode: selfie camera -> pointer events. MediaPipe Hands runs on-device; model files are bundled (no network). */
(()=>{
const S={on:false,pinch:false,tgt:null,x:0,y:0,seen:0,busy:false,raf:0,first:true,ready:false,fails:0,stream:null,hands:null,video:null,ov:null,cur:null,box:null,tag:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const D=(a,b,w=1,h=1)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);
const LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
// landmarks -> pinch ratio (thumb-index gap / palm size) and normalised cursor (mirrored, with edge margin so the whole screen is reachable)
function calc(lm,vw,vh){const i=lm[8],t=lm[4],size=D(lm[0],lm[9],vw,vh)||1;return{ratio:D(i,t,vw,vh)/size,x:clamp(((1-(i.x+t.x)/2)-.12)/.76,0,1),y:clamp(((i.y+t.y)/2-.08)/.8,0,1)}}
// smoothing + pinch with hysteresis (close below .30, open above .45) -> 'down' | 'up' | null
function update(c){const tx=c.x*innerWidth,ty=c.y*innerHeight;if(S.first){S.x=tx;S.y=ty;S.first=false}else{const a=S.pinch?.5:.35;S.x+=(tx-S.x)*a;S.y+=(ty-S.y)*a}
 const was=S.pinch;if(!S.pinch&&c.ratio<.30)S.pinch=true;else if(S.pinch&&c.ratio>.45)S.pinch=false;return was===S.pinch?null:S.pinch?'down':'up'}
function fire(type,t,x,y){try{t.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:77,pointerType:'mouse',isPrimary:true,button:0,buttons:type=='pointerup'?0:1,view:window}))}catch(e){}}
function down(){S.tgt=null;const t=document.elementFromPoint(S.x,S.y);if(!t)return;const tile=t.closest('[data-e],[data-t]');
 if(tile){S.tgt=tile;fire('pointerdown',tile,S.x,S.y)}else if(t.id=='cv'){S.tgt=t;fire('pointerdown',t,S.x,S.y)}else{const b=t.closest('button,.hd');if(b)b.click()}}
function move(){if(S.tgt){fire('pointermove',S.tgt,S.x,S.y);return}const t=document.elementFromPoint(S.x,S.y);if(t&&t.id=='cv')fire('pointermove',t,S.x,S.y)}
function up(){if(S.tgt)fire('pointerup',S.tgt,S.x,S.y);S.tgt=null}
function mk(tag,css){const e=document.createElement(tag);e.style.cssText=css;document.body.appendChild(e);return e}
function ui(){S.box=mk('div','position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 72px);width:132px;height:99px;border-radius:12px;overflow:hidden;border:1px solid #22d3ee;background:#000;z-index:55;pointer-events:none;box-shadow:0 8px 24px #0009');
 S.video=document.createElement('video');S.video.playsInline=true;S.video.muted=true;S.video.style.cssText='width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:.85';S.box.appendChild(S.video);
 S.ov=document.createElement('canvas');S.ov.width=132;S.ov.height=99;S.ov.style.cssText='position:absolute;inset:0;width:100%;height:100%';S.box.appendChild(S.ov);
 S.tag=document.createElement('div');S.tag.style.cssText='position:absolute;left:5px;bottom:4px;font:600 9px system-ui;letter-spacing:.08em;color:#fff;background:#0009;padding:2px 6px;border-radius:4px';S.tag.textContent='HAND';S.box.appendChild(S.tag);
 S.cur=mk('div','position:fixed;left:0;top:0;width:30px;height:30px;border-radius:50%;border:2px solid #22d3ee;z-index:60;pointer-events:none;opacity:.3;box-shadow:0 0 12px #22d3ee88')}
function paint(lm){const g=S.ov.getContext('2d'),w=S.ov.width,h=S.ov.height;g.clearRect(0,0,w,h);if(!lm)return;g.lineWidth=1.5;g.strokeStyle='#22d3eecc';
 LINKS.forEach(([a,b])=>{g.beginPath();g.moveTo((1-lm[a].x)*w,lm[a].y*h);g.lineTo((1-lm[b].x)*w,lm[b].y*h);g.stroke()});
 [4,8].forEach(k=>{g.beginPath();g.arc((1-lm[k].x)*w,lm[k].y*h,3.5,0,7);g.fillStyle=S.pinch?'#f59e0b':'#fff';g.fill()})}
function cursor(show){S.cur.style.opacity=show?1:.25;S.cur.style.transform=`translate(${S.x-15}px,${S.y-15}px)`;S.cur.style.background=S.pinch?'rgba(245,158,11,.55)':'transparent';S.cur.style.borderColor=S.pinch?'#f59e0b':'#22d3ee';S.tag.textContent=S.pinch?'PINCH':'HAND'}
function onResults(r){if(!S.on)return;if(!S.ready){S.ready=true;toast('Hand tracking ready. Pinch thumb and index to grab.',1)}S.fails=0;
 const L=r.multiHandLandmarks&&r.multiHandLandmarks[0];paint(L);
 if(!L){if(S.pinch&&performance.now()-S.seen>350){S.pinch=false;up()}cursor(false);return}
 S.seen=performance.now();const ev=update(calc(L,S.video.videoWidth||640,S.video.videoHeight||480));cursor(true);
 if(ev=='down')down();else if(ev=='up')up();else move()}
async function loop(){if(!S.on)return;const v=S.video;if(v.readyState>=2&&!S.busy){S.busy=true;try{await S.hands.send({image:v})}catch(e){if(++S.fails>8){toast('Hand model stopped: '+(e.message||'error'));stop()}}S.busy=false}S.raf=requestAnimationFrame(loop)}
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.appendChild(s)})}
async function start(){if(S.on)return;if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Camera is not available on this device or page.');return}
 toast('Starting camera and hand model...',1);
 try{if(!window.Hands)await loadScript('mediapipe/hands/hands.js');
  S.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
  ui();S.hands=new window.Hands({locateFile:f=>'mediapipe/hands/'+f});S.hands.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.5});S.hands.onResults(onResults);
  S.video.srcObject=S.stream;await S.video.play();await S.hands.initialize()}
 catch(e){toast('Hand mode could not start: '+(e.name=='NotAllowedError'?'camera permission denied.':(e.message||e.name)));cleanup();return}
 S.on=true;S.first=true;S.ready=false;window.HM=true;$('trayw').classList.remove('min');loop()}
function cleanup(){cancelAnimationFrame(S.raf);if(S.pinch){S.pinch=false;up()}if(S.stream)S.stream.getTracks().forEach(t=>t.stop());[S.box,S.cur].forEach(e=>e&&e.remove());S.stream=S.box=S.cur=null;S.on=false;window.HM=false}
function stop(){cleanup();if(S.hands){try{S.hands.close()}catch(e){}S.hands=null}}
async function toggle(){S.on?stop():await start()}
window.HandMode={toggle,start,stop,_calc:calc,_update:update,_down:down,_up:up,_move:move,_S:S};
})();
