/* ChemForge Lab: a separate reaction chamber with its own canvas and loop (zero cost while the Build tab is open).
   Chemistry: collision theory, p = Z * exp(-Ea/RT) (time compressed ~1e10x so you can watch it), reaction enthalpy from mean bond energies
   (broken bonds minus formed bonds), heat released/absorbed warms/cools nearby molecules. Values are estimates, labelled as such. */
(()=>{
const R_=8.314e-3,ZC=1e10,TAMB=298,TMAX=3500,TMIN=150,CAP=90,VK=20;
const S={on:false,run:true,tool:'flame',mols:[],fx:[],log:[],held:null,hover:null,last:0,raf:0,W:0,H:0,cv:null,cx:null,ext:0,sp:[],nrx:0,statT:0,fireT:-9,time:0,xt:0,bg:'#0b0f17',bgT:0,pend:[]};
const rnd=Math.random;
const PRE=[['O₂','O=O'],['N₂','N#N'],['H₂','[H][H]'],['CO₂','O=C=O'],['H₂O','O'],['H₂O₂','OO'],['Cl₂','ClCl'],['Br₂','BrBr'],['CH₄','C'],['C₂H₆','CC'],['C₂H₄','C=C'],['C₂H₂','C#C'],['C₃H₈','CCC'],['C₂H₅OH','CCO'],['NH₃','N']].map(([name,smi])=>({name,smi}));
S.sp=PRE.slice();
// ---------- graphs and molecules
const G=smi=>{const{at,bd}=parse(smi);return{n:at.map(a=>({e:a.e,c:a.c||0})),b:bd.map(b=>[b.a-1,b.b-1,b.o])}};
const cp=g=>({n:g.n.map(a=>({...a})),b:g.b.map(b=>b.slice())});
const GO={CO:{n:[{e:'C',c:-1},{e:'O',c:1}],b:[[0,1,3]]}};
const P={};const PG=k=>P[k]||(P[k]={CO2:()=>G('O=C=O'),H2O:()=>G('O'),N2:()=>G('N#N'),SO2:()=>G('O=S=O'),CO:()=>cp(GO.CO),O2:()=>G('O=O'),HF:()=>G('F'),HCl:()=>G('Cl'),HBr:()=>G('Br'),HI:()=>G('I')}[k]());
const PGc=k=>cp(PG(k));
function lay(g,p0){const n=g.n.length,adj=new Set();g.b.forEach(([i,j])=>{adj.add(i+','+j);adj.add(j+','+i)});
 const p=p0&&p0.length==n?p0.map(q=>q.slice()):g.n.map((_,i)=>[Math.cos(i*2.4)*(9+i*3),Math.sin(i*2.4)*(9+i*3)]);
 for(let it=0;it<140;it++){const f=p.map(()=>[0,0]);
  g.b.forEach(([i,j,o])=>{const dx=p[j][0]-p[i][0],dy=p[j][1]-p[i][1],d=Math.hypot(dx,dy)||1,k=(d-15*[1,.87,.78][o-1])*.3;f[i][0]+=k*dx/d;f[i][1]+=k*dy/d;f[j][0]-=k*dx/d;f[j][1]-=k*dy/d});
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(adj.has(i+','+j))continue;const dx=p[j][0]-p[i][0],dy=p[j][1]-p[i][1],d=Math.hypot(dx,dy)||1;if(d<30){const k=(30-d)*.12;f[i][0]-=k*dx/d;f[i][1]-=k*dy/d;f[j][0]+=k*dx/d;f[j][1]+=k*dy/d}}
  p.forEach((q,i)=>{q[0]+=f[i][0]*.5;q[1]+=f[i][1]*.5})}
 const cx=p.reduce((s,q)=>s+q[0],0)/n,cy=p.reduce((s,q)=>s+q[1],0)/n;return p.map(q=>[q[0]-cx,q[1]-cy])}
const formula=c=>{const k=Object.keys(c).sort(),o=c.C?['C',...(c.H?['H']:[]),...k.filter(x=>x!='C'&&x!='H')]:k;return o.map(x=>x+(c[x]>1?c[x]:'')).join('')};
function mol(g,x,y,T,p0){const p=lay(g,p0),cnt={};g.n.forEach(a=>cnt[a.e]=(cnt[a.e]||0)+1);const mass=g.n.reduce((s,a)=>s+MASS[a.e],0),n=g.n.length;
 const m={g,p,cnt,mass,n,x,y,vx:0,vy:0,a:rnd()*6.283,w:(rnd()-.5)*3,T,cd:0,C:n==1?12.5:n==2?25:35,r:Math.max(...p.map(q=>Math.hypot(q[0],q[1])))+8,
  f:clamp(Math.sqrt(-2*Math.log(1-rnd()))*.8,.3,2.2),fm:formula(cnt),wx:new Float32Array(n),wy:new Float32Array(n)};
 m.sig=m.fm+'|'+g.b.map(b=>[g.n[b[0]].e,g.n[b[1]].e].sort().join('')+b[2]).sort().join(',');
 const ang=rnd()*6.283,s=VK*Math.sqrt(T/mass)*m.f;m.vx=Math.cos(ang)*s;m.vy=Math.sin(ang)*s;return m}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const eq=(m,o)=>{const a=Object.keys(m.cnt),b=Object.keys(o);return a.length==b.length&&b.every(k=>m.cnt[k]===o[k])};
const isO2=m=>m.n==2&&eq(m,{O:2});
const isX2=m=>{if(m.n!=2||m.g.b.length!=1||m.g.b[0][2]!=1)return null;const a=m.g.n[0].e,b=m.g.n[1].e;return a==b&&['H','F','Cl','Br','I'].includes(a)?a:null};
const isProd=m=>eq(m,{C:1,O:2})||eq(m,{H:2,O:1})||eq(m,{N:2})||eq(m,{S:1,O:2})||(m.n==2&&m.cnt.H===1&&['F','Cl','Br','I'].some(x=>m.cnt[x]===1));
const bd_=(a,b,o)=>bde(a,b,o)[0];
const E=g=>{const c={};g.n.forEach(a=>c[a.e]=(c[a.e]||0)+1);if(g.n.length==3&&c.C==1&&c.O==2&&g.b.every(b=>b[2]==2))return 1598; // C=O in CO2 is ~799, not the 745 average
 return g.b.reduce((s,[i,j,o])=>s+bd_(g.n[i].e,g.n[j].e,o),0)};
const sumE=a=>a.reduce((s,g)=>s+E(g),0);
const near=(m,pred,r,ex)=>S.mols.filter(q=>q!==m&&!(ex&&ex.includes(q))&&pred(q)&&Math.hypot(q.x-m.x,q.y-m.y)<r).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y));
// ---------- reaction classes (each returns {ea,dH,ins,outs:[{g,p0}],kind} or null)
const OK=new Set(['C','H','N','O','S','F','Cl','Br','I']);
function eaComb(F){const hb=F.g.b.filter(([i,j])=>F.g.n[i].e=='H'||F.g.n[j].e=='H');if(!hb.length)return 150;const w=Math.min(...hb.map(([i,j,o])=>bd_(F.g.n[i].e,F.g.n[j].e,o)));return Math.max(60,w-205+10)} // H-abstraction by O2: BDE(R-H) - BDE(HOO-H ~205) + small barrier
function comb(F,O){if(!isO2(O)||isO2(F)||isProd(F))return null;const c=F.cnt;for(const k in c)if(!OK.has(k))return null;
 const C=c.C||0,H=c.H||0,N=c.N||0,Ox=c.O||0,Sx=c.S||0,X=(c.F||0)+(c.Cl||0)+(c.Br||0)+(c.I||0),hp=H-X;if(hp<0||C+H+N+Sx===0)return null;
 const plan=(nu,co)=>{if(nu<=0)return null;for(const mm of [1,2,4])if(Math.abs(mm*nu-Math.round(mm*nu))<1e-9&&(mm*hp)%2===0&&(mm*N)%2===0)return{mm,need:Math.round(mm*nu),co};return null};
 let pl=plan(C+hp/4+Sx-Ox/2,false);const full=pl;let alt=C>0?plan(C/2+hp/4+Sx-Ox/2,true):null;if(!pl&&!alt)return null;
 const tryP=q=>{if(!q)return null;const fu=[F,...near(F,m=>m.sig===F.sig,150,[F])].slice(0,q.mm);if(fu.length<q.mm)return null;const ox=[O,...near(F,m=>isO2(m)&&m!==O,150,[O])].slice(0,q.need);if(ox.length<q.need)return null;return{q,fu,ox}};
 const R=tryP(full)||tryP(alt);if(!R)return null;const{q,fu,ox}=R,mm=q.mm,outs=[],push=(k,n)=>{for(let i=0;i<n;i++)outs.push({g:PGc(k)})};
 push(q.co?'CO':'CO2',mm*C);push('H2O',mm*hp/2);push('N2',mm*N/2);push('SO2',mm*Sx);['F','Cl','Br','I'].forEach(x=>push('H'+x,mm*(c[x]||0)));
 const ins=[...fu,...ox];const dH=sumE(ins.map(m=>m.g))-sumE(outs.map(o=>o.g));return{ea:eaComb(F),dH,ins,outs,kind:q.co?'incomplete combustion':'combustion'}}
const EAD={F:15,Cl:35,Br:60,I:120,H:180};
function addn(Pm,X){const x=isX2(X);if(!x||isX2(Pm)||Pm.n<2)return null;const cand=Pm.g.b.filter(([i,j,o])=>o>=2&&Pm.g.n[i].e=='C'&&Pm.g.n[j].e=='C');if(!cand.length)return null;
 const[i,j,o]=cand[(rnd()*cand.length)|0],g=cp(Pm.g);g.b=g.b.map(b=>b[0]==i&&b[1]==j?[i,j,o-1]:b);const k=g.n.length;g.n.push({e:x,c:0},{e:x,c:0});g.b.push([i,k,1],[j,k+1,1]);
 const dH=bd_('C','C',o)-bd_('C','C',o-1)+bd_(x,x,1)-2*bd_('C',x,1);if(dH>10)return null;
 const p0=Pm.p.concat([[rnd()*16-8,rnd()*16-8],[rnd()*16-8,rnd()*16-8]]);return{ea:EAD[x],dH,ins:[Pm,X],outs:[{g,p0}],kind:'addition across '+(o==2?'C=C':'C≡C')}}
const EAH={F:20,Cl:100,Br:170,I:170};
function h2x2(A,B){const a=isX2(A),b=isX2(B);if(!a||!b||a==b||(a!='H'&&b!='H'))return null;const x=a=='H'?b:a;const dH=bd_('H','H',1)+bd_(x,x,1)-2*bd_('H',x,1);
 return{ea:EAH[x],dH,ins:[A,B],outs:[{g:PGc('H'+x)},{g:PGc('H'+x)}],kind:'H₂ + '+x+'₂ → 2 H'+x}}
function subst(Sb,X){const x=isX2(X);if(!x||x=='H'||isX2(Sb)||!Sb.cnt.C)return null;const g=Sb.g;
 const el=g.b.filter(([i,j,o])=>{const c=g.n[i].e=='C'&&g.n[j].e=='H'?i:g.n[j].e=='C'&&g.n[i].e=='H'?j:-1;return c>=0&&g.b.every(b=>(b[0]!=c&&b[1]!=c)||b[2]==1)});if(!el.length)return null;
 const[i,j]=el[(rnd()*el.length)|0],h=g.n[i].e=='H'?i:j,c=h==i?j:i,dH=bd_('C','H',1)+bd_(x,x,1)-bd_('C',x,1)-bd_('H',x,1);if(dH>10)return null;
 const map=[];let k=0;g.n.forEach((_,t)=>{map[t]=t==h?-1:k++});const ng={n:g.n.filter((_,t)=>t!=h).map(a=>({...a})),b:g.b.filter(b=>b[0]!=h&&b[1]!=h).map(b=>[map[b[0]],map[b[1]],b[2]])};
 ng.n.push({e:x,c:0});ng.b.push([map[c],ng.n.length-1,1]);const p0=Sb.p.filter((_,t)=>t!=h).concat([[Sb.p[h][0],Sb.p[h][1]]]);
 return{ea:.5*bd_(x,x,1),dH,ins:[Sb,X],outs:[{g:ng,p0},{g:PGc('H'+x)}],kind:'substitution (C–H → C–'+x+')'}}
function h2o2(A,B){const t=m=>eq(m,{H:2,O:2});if(!t(A)||!t(B))return null;const outs=[{g:PGc('H2O')},{g:PGc('H2O')},{g:PGc('O2')}];return{ea:100,dH:sumE([A.g,B.g])-sumE(outs.map(o=>o.g)),ins:[A,B],outs,kind:'peroxide decomposition'}}
function candidates(A,B){return [comb(A,B),comb(B,A),addn(A,B),addn(B,A),h2x2(A,B),subst(A,B),subst(B,A),h2o2(A,B)].filter(Boolean)}
const sub_=s=>typeof sub==='function'?sub(s):s;
function eqn(rx){const cnt=ms=>{const o={};ms.forEach(m=>{const f=sub_(m.fm||formula(m.cnt||{}));o[f]=(o[f]||0)+1});return Object.entries(o).map(([k,v])=>(v>1?v+' ':'')+k).join(' + ')};
 return cnt(rx.ins)+' → '+cnt(rx.outs.map(o=>({fm:formula(o.g.n.reduce((c,a)=>(c[a.e]=(c[a.e]||0)+1,c),{}))})))}
function exec(rx,x,y,Tb){if(!rx.ins.every(m=>S.mols.includes(m)))return false;rx.ins.forEach(m=>S.mols.splice(S.mols.indexOf(m),1));
 const outs=rx.outs.map(o=>mol(o.g,x+(rnd()-.5)*34,y+(rnd()-.5)*34,Tb,o.p0));
 const zone=[...outs,...S.mols.filter(m=>Math.hypot(m.x-x,m.y-y)<110)],dT=-rx.dH*1000/zone.reduce((s,m)=>s+m.C,0);
 outs.forEach(m=>S.mols.push(m));zone.forEach(m=>m.T=clamp(m.T+dT,TMIN,TMAX));
 S.nrx++;S.log.unshift({t:S.time,txt:eqn(rx),dH:rx.dH,kind:rx.kind,ea:rx.ea});if(S.log.length>6)S.log.pop();
 S.fx.push({k:'r',x,y,l:.5,m:.5,c:rx.dH<0?'255,160,40':'80,170,255'});
 if(rx.dH<-150){S.fireT=S.time;for(let i=0;i<8&&S.fx.length<180;i++)S.fx.push({k:'f',x:x+(rnd()-.5)*30,y:y+(rnd()-.5)*20,vx:(rnd()-.5)*40,vy:-40-rnd()*70,l:.7,m:.7})}
 return true}
function tryReact(A,B){if(A.cd>S.time||B.cd>S.time)return;const cs=candidates(A,B);if(!cs.length)return;const rx=cs[0],T=(A.T+B.T)/2,p=Math.min(1,ZC*Math.exp(-rx.ea/(R_*T)))*.6;A.cd=B.cd=S.time+.12;
 if(rnd()<p)S.pend.push({rx,x:(A.x+B.x)/2,y:(A.y+B.y)/2,T})}
// ---------- simulation
function place(m){const c=Math.cos(m.a),s=Math.sin(m.a);for(let i=0;i<m.n;i++){m.wx[i]=m.x+m.p[i][0]*c-m.p[i][1]*s;m.wy[i]=m.y+m.p[i][0]*s+m.p[i][1]*c}}
function update(dt){S.time+=dt;const M=S.mols,W=S.W,H=S.H,pad=6;S.pend.length=0;
 const h=S.held;
 if(h){const R=S.tool=='ext'?80:62;
  M.forEach(m=>{const d=Math.hypot(m.x-h.x,m.y-h.y);if(d>R)return;const f=1-d/R;
   if(S.tool=='flame')m.T=Math.min(TMAX,m.T+3000*dt*f*f+400*dt);
   else if(S.tool=='ice')m.T=Math.max(180,m.T-2200*dt*f-200*dt);
   else m.T+=(TAMB-m.T)*Math.min(1,7*dt*(.4+f))});
  if(S.tool=='flame'&&rnd()<.6&&S.fx.length<180)S.fx.push({k:'f',x:h.x+(rnd()-.5)*18,y:h.y+8,vx:(rnd()-.5)*30,vy:-60-rnd()*60,l:.55,m:.55});
  if(S.tool=='ice'&&rnd()<.4&&S.fx.length<180)S.fx.push({k:'i',x:h.x+(rnd()-.5)*40,y:h.y+(rnd()-.5)*30,vx:(rnd()-.5)*20,vy:20+rnd()*30,l:.7,m:.7});
  if(S.tool=='ext'){for(let i=0;i<2&&S.fx.length<180;i++)S.fx.push({k:'s',x:h.x,y:h.y,vx:(rnd()-.5)*220,vy:(rnd()-.5)*220,l:.6,m:.6});
   S.xt-=dt;if(S.xt<=0&&S.ext<28&&M.length<CAP){S.xt=.14;S.ext++;const q=mol(G('O=C=O'),h.x+(rnd()-.5)*30,h.y+(rnd()-.5)*30,260);M.push(q)}}}
 M.forEach(m=>{m.T+=(TAMB-m.T)*.25*dt;m.T=clamp(m.T,TMIN,TMAX);
  const tv=Math.min(380,VK*Math.sqrt(m.T/m.mass)*m.f),sp=Math.hypot(m.vx,m.vy)||1,k=1+(tv/sp-1)*Math.min(1,dt*1.6);m.vx*=k;m.vy*=k;
  m.x+=m.vx*dt;m.y+=m.vy*dt;m.a+=m.w*dt;
  if(m.x<pad+m.r){m.x=pad+m.r;m.vx=Math.abs(m.vx)}if(m.x>W-pad-m.r){m.x=W-pad-m.r;m.vx=-Math.abs(m.vx)}
  if(m.y<pad+m.r){m.y=pad+m.r;m.vy=Math.abs(m.vy)}if(m.y>H-pad-m.r){m.y=H-pad-m.r;m.vy=-Math.abs(m.vy)}});
 for(let i=0;i<M.length;i++)for(let j=i+1;j<M.length;j++){const A=M[i],B=M[j],dx=B.x-A.x,dy=B.y-A.y,lim=A.r+B.r;if(dx>lim||dx<-lim||dy>lim||dy<-lim)continue;const d=Math.hypot(dx,dy);if(d>=lim||d<.01)continue;
  const nx=dx/d,ny=dy/d,rv=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;
  if(rv<0){const imp=-2*rv/(1/A.mass+1/B.mass);A.vx-=imp*nx/A.mass;A.vy-=imp*ny/A.mass;B.vx+=imp*nx/B.mass;B.vy+=imp*ny/B.mass;const mT=(A.T+B.T)/2;A.T+=(mT-A.T)*.4;B.T+=(mT-B.T)*.4;tryReact(A,B)}
  const ov=(lim-d)/2;A.x-=nx*ov;A.y-=ny*ov;B.x+=nx*ov;B.y+=ny*ov}
 S.pend.forEach(p=>exec(p.rx,p.x,p.y,p.T));
 for(let i=S.fx.length-1;i>=0;i--){const f=S.fx[i];f.l-=dt;if(f.l<=0){S.fx.splice(i,1);continue}f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt}}
// ---------- drawing (1x resolution, no per-atom gradients: stays light on phones)
function tcol(T){const t=clamp((T-600)/1900,0,1);return `rgba(255,${Math.round(110+140*t)},${Math.round(30+170*t*t)},${.15+.4*t})`}
function draw(){const cx=S.cx,W=S.W,H=S.H;cx.setTransform(1,0,0,1,0,0);
 if(S.time-S.bgT>.5){S.bgT=S.time;S.bg=getComputedStyle(document.documentElement).getPropertyValue('--bg')||'#0b0f17'}
 cx.fillStyle=S.bg;cx.fillRect(0,0,W,H);cx.strokeStyle='rgba(120,140,180,.35)';cx.lineWidth=2;cx.strokeRect(3,3,W-6,H-6);
 const M=S.mols;M.forEach(m=>{if(m.T>650){cx.fillStyle=tcol(m.T);cx.beginPath();cx.arc(m.x,m.y,m.r*1.5,0,7);cx.fill()}place(m)});
 cx.lineCap='round';M.forEach(m=>{const cold=m.T<250;cx.strokeStyle=cold?'#9fd8ff':'#cfd6e4';cx.lineWidth=2.2;
  m.g.b.forEach(([i,j,o])=>{const dx=m.wx[j]-m.wx[i],dy=m.wy[j]-m.wy[i],d=Math.hypot(dx,dy)||1,nx=-dy/d*1.8,ny=dx/d*1.8;for(let k=0;k<o;k++){const s=k-(o-1)/2;cx.beginPath();cx.moveTo(m.wx[i]+nx*s,m.wy[i]+ny*s);cx.lineTo(m.wx[j]+nx*s,m.wy[j]+ny*s);cx.stroke()}});
  for(let i=0;i<m.n;i++){const e=m.g.n[i].e;cx.fillStyle=EL[e][3];cx.beginPath();cx.arc(m.wx[i],m.wy[i],4.2+(EL[e][1]-30)*.03,0,7);cx.fill();cx.strokeStyle='rgba(0,0,0,.45)';cx.lineWidth=.8;cx.stroke()}
  if(cold){cx.strokeStyle='rgba(160,220,255,.7)';cx.lineWidth=1;cx.beginPath();cx.arc(m.x,m.y,m.r,0,7);cx.stroke()}});
 S.fx.forEach(f=>{const a=Math.max(0,f.l/f.m);
  if(f.k=='r'){cx.strokeStyle=`rgba(${f.c},${a})`;cx.lineWidth=3*a+1;cx.beginPath();cx.arc(f.x,f.y,(1-a)*46+6,0,7);cx.stroke()}
  else if(f.k=='f'){cx.fillStyle=`rgba(255,${Math.round(90+150*a)},40,${a*.8})`;cx.beginPath();cx.arc(f.x,f.y,3+5*a,0,7);cx.fill()}
  else if(f.k=='i'){cx.fillStyle=`rgba(170,225,255,${a*.8})`;cx.fillRect(f.x-1.5,f.y-1.5,3,3)}
  else{cx.fillStyle=`rgba(245,248,255,${a*.7})`;cx.beginPath();cx.arc(f.x,f.y,3+6*(1-a),0,7);cx.fill()}});
 const q=S.held||S.hover;if(q){const x=q.x,y=q.y,t=S.time;
  if(S.tool=='flame'){[[26,'rgba(255,90,20,.85)'],[18,'rgba(255,170,30,.9)'],[10,'rgba(255,240,170,.95)']].forEach(([r,c])=>{const s=1+.1*Math.sin(t*30+r);cx.fillStyle=c;cx.beginPath();cx.moveTo(x,y-r*1.6*s);cx.quadraticCurveTo(x+r*1.1,y-r*.2,x+r*.6,y+r*.6);cx.quadraticCurveTo(x,y+r*1,x-r*.6,y+r*.6);cx.quadraticCurveTo(x-r*1.1,y-r*.2,x,y-r*1.6*s);cx.fill()})}
  else if(S.tool=='ice'){cx.fillStyle='rgba(150,220,255,.5)';cx.strokeStyle='#e8f6ff';cx.lineWidth=1.5;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;cx.lineTo(x+Math.cos(a)*24,y+Math.sin(a)*24)}cx.closePath();cx.fill();cx.stroke();cx.beginPath();for(let i=0;i<3;i++){const a=i*Math.PI/3;cx.moveTo(x+Math.cos(a)*24,y+Math.sin(a)*24);cx.lineTo(x-Math.cos(a)*24,y-Math.sin(a)*24)}cx.stroke()}
  else{cx.fillStyle='#e5484d';cx.fillRect(x-9,y-4,18,26);cx.fillStyle='#b9323a';cx.fillRect(x-4,y-12,8,9);cx.strokeStyle='#cfd6e4';cx.lineWidth=3;cx.beginPath();cx.moveTo(x+4,y-9);cx.lineTo(x+16,y-14);cx.stroke()}}}
// ---------- stats card (updated 4x per second, not per frame)
function stat(){const M=S.mols,el=document.getElementById('info');if(!el)return;if(!M.length){el.innerHTML='<div class="nm"><b>Reaction lab</b></div><div class="nm"><small>Add reagents below, then use Flame, Ice or the Extinguisher.</small></div>';return}
 const Ts=M.map(m=>m.T),mx=Math.max(...Ts),av=Ts.reduce((a,b)=>a+b,0)/Ts.length,fire=S.time-S.fireT<1.2,sp={};M.forEach(m=>{const k=m.sig;sp[k]=sp[k]||{f:m.fm,n:0};sp[k].n++});
 const list=Object.values(sp).sort((a,b)=>b.n-a.n).slice(0,8).map(s=>sub_(s.f)+' ×'+s.n).join('  ·  ');
 const col=mx>1200?'#e5484d':mx>600?'#e0a050':mx<250?'#4f9dff':'#30a46c';
 el.innerHTML=`<div class="hd" style="cursor:default"><b style="color:${col}">${Math.round(mx)} K</b><small>peak · avg ${Math.round(av)} K (${Math.round(av-273)} °C)</small>${fire?'<span class="chip" style="background:#e5484d">FIRE</span>':''}</div>
 <div style="height:6px;border-radius:3px;margin:6px 0;background:linear-gradient(90deg,#4f9dff,#30a46c 25%,#e0a050 55%,#e5484d 80%,#fff)"><div style="height:6px;width:${clamp((mx-150)/33.5,0,100)}%;border-right:2px solid #fff"></div></div>
 <div class="nm"><small>Molecules</small> ${list}</div>`+S.log.slice(0,3).map(l=>`<div class="nm"><small>${l.dH<0?'exo':'endo'}</small> ${l.txt}<br><small>ΔH ≈ ${l.dH>0?'+':'−'}${Math.round(Math.abs(l.dH))} kJ/mol (est.), Ea ≈ ${Math.round(l.ea)}</small></div>`).join('')}
// ---------- lifecycle and UI hooks
function size(){const r=document.getElementById('cvw').getBoundingClientRect();S.cv.width=S.W=Math.max(100,r.width|0);S.cv.height=S.H=Math.max(100,r.height|0)}
function loop(t){if(!S.on)return;S.raf=requestAnimationFrame(loop);const dt=Math.min(.033,(t-S.last)/1000||.016);S.last=t;if(document.hidden)return;
 if(S.run)update(dt);draw();if(S.time-S.statT>.25||!S.run&&S.time-S.statT>.5){S.statT=S.time;stat()}S.time+=0}
const pos=e=>{const r=S.cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
function add(i,n){const s=S.sp[i];if(!s)return;s.g=s.g||G(s.smi);for(let k=0;k<n;k++){if(S.mols.length>=CAP){toast('Chamber is full ('+CAP+' molecules). Reset or react some away.');return}S.mols.push(mol(cp(s.g),40+rnd()*(S.W-80),40+rnd()*(S.H-80),TAMB,s.p0))}}
function fromBuild(){const cs=comps();let added=0;cs.forEach(c=>{const ids=c.map(a=>a.id),idx=new Map(ids.map((id,i)=>[id,i])),bs=bonds.filter(b=>idx.has(b.a)&&idx.has(b.b)),L0=bs.length?bs.reduce((s,b)=>s+Math.hypot(A_(b.a).x-A_(b.b).x,A_(b.a).y-A_(b.b).y),0)/bs.length:40,k=15/(L0||40);
  const g={n:c.map(a=>({e:a.e,c:a.c||0})),b:bs.map(b=>[idx.get(b.a),idx.get(b.b),b.o])},p0=c.map(a=>[a.x*k,a.y*k]),m=mol(g,0,0,TAMB,p0);
  let sp=S.sp.find(s=>s.user&&s.sig===m.sig);if(!sp){sp={name:sub_(m.fm),g,p0:m.p,user:1,sig:m.sig};S.sp.push(sp)}added++;add(S.sp.indexOf(sp),6)});
 trayUI();toast(added?added+' molecule'+(added>1?'s':'')+' from your canvas added (6 copies each). Add reagents such as O₂ or Br₂, then heat.':'Nothing on the canvas to send.',1)}
function trayUI(){document.getElementById('tabs').innerHTML='<div style="padding:7px 6px 2px;font-size:11px;color:var(--m);font-weight:600;letter-spacing:.06em">ADD TO CHAMBER (TAP = 4 MOLECULES)</div>';
 document.getElementById('tray').innerHTML=S.sp.map((s,i)=>`<button data-lab="${i}" style="--c:${s.user?'#22d3ee':'#7a8cff'};width:auto;min-width:52px;padding:0 9px"><small>${s.user?'yours':'reagent'}</small><b>${s.name}</b></button>`).join('')}
function open(){if(S.on)return;S.on=true;window.LABON=true;S.cv=document.getElementById('lab');S.cx=S.cv.getContext('2d');document.body.classList.add('lab');size();S.ro=new ResizeObserver(size);S.ro.observe(document.getElementById('cvw'));
 const c=S.cv;c.onpointerdown=e=>{try{c.setPointerCapture(e.pointerId)}catch(_){}S.held=pos(e)};c.onpointermove=e=>{const p=pos(e);S.hover=p;if(S.held)S.held=p};c.onpointerup=c.onpointercancel=e=>{S.held=null};c.onpointerleave=e=>{if(e.pointerType!=='mouse')S.hover=null};
 document.getElementById('tray').onclick=e=>{const b=e.target.closest('[data-lab]');if(b)add(+b.dataset.lab,4)};
 build();trayUI();stat();S.last=performance.now();S.raf=requestAnimationFrame(loop)}
function close(){if(!S.on)return;S.on=false;window.LABON=false;cancelAnimationFrame(S.raf);if(S.ro)S.ro.disconnect();document.body.classList.remove('lab');document.getElementById('tray').onclick=null;S.held=null;
 build();trayBuild();refresh();wake();resize()}
function reset(){S.mols.length=0;S.fx.length=0;S.log.length=0;S.ext=0;S.nrx=0;S.fireT=-9;S.time=0;stat()}
window.Lab={open,close,reset,fromBuild,add,tool:k=>{S.tool=k;build()},cur:()=>S.tool,toggleRun:()=>{S.run=!S.run;build()},running:()=>S.run,tray:trayUI,
 _t:{S,mol,G,update,candidates,tryReact,exec,E,sumE,eqn,comb,addn,h2x2,subst,h2o2,PGc,formula}};
})();
