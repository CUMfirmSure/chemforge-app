/* ChemForge Lab v2: reaction vessels (test tube, round flask, conical flask, dish, beaker), elements and compounds, heat / cool / extinguish.
   Chemistry: collision theory, p = Z*exp(-Ea/RT) (time compressed ~1e10x so you can watch it). Reaction enthalpies come from standard enthalpies of formation
   for the curated inorganic reactions and from mean bond energies for organic / general reactions. Activation energies are typical values; all are labelled as estimates.
   Simplification: every substance is drawn as particles; solids (metals, salts, oxides) settle under gravity, gases fly freely. Own canvas and loop: zero cost in Build. */
(()=>{
const R_=8.314e-3,ZC=1e10,TAMB=298,TMAX=3500,TMIN=150,VK=20;
const S={on:false,run:true,tool:'flame',mols:[],fx:[],log:[],held:null,hover:null,last:0,raf:0,W:0,H:0,cv:null,cx:null,ext:0,user:[],nrx:0,statT:0,fireT:-9,time:0,xt:0,bg:'#0b0f17',bgT:0,pend:[],ves:'tube',lid:true,tab:'el',esc:0,V:null,ro:null};
const rnd=Math.random,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sub_=s=>typeof sub==='function'?sub(s):s;
// ---------- graphs
const G=smi=>{const{at,bd}=parse(smi);return{n:at.map(a=>({e:a.e,c:a.c||0})),b:bd.map(b=>[b.a-1,b.b-1,b.o])}};
const cp=g=>({n:g.n.map(a=>({...a})),b:g.b.map(b=>b.slice())});
const cntOf=g=>{const c={};g.n.forEach(a=>c[a.e]=(c[a.e]||0)+1);return c};
const ck=c=>Object.keys(c).sort().map(k=>k+(c[k]>1?c[k]:'')).join('');
const formula=c=>{const k=Object.keys(c).sort(),o=c.C?['C',...(c.H?['H']:[]),...k.filter(x=>x!='C'&&x!='H')]:k;return o.map(x=>x+(c[x]>1?c[x]:'')).join('')};
// ---------- species catalogue (hf = standard enthalpy of formation, kJ/mol)
const SPC={},BY={};
function addSp(id,name,gb,hf,cat,o){const key=ck(cntOf(gb()));SPC[key]=Object.assign({id,key,name,gb,hf,cat},o||{});BY[id]=key}
const ATOM=e=>()=>({n:[{e,c:0}],b:[]});
const SALT=(M,zc,nM,X,za,nX)=>()=>{const n=[],b=[],seen=new Set();for(let i=0;i<nM;i++)n.push({e:M,c:zc});for(let j=0;j<nX;j++)n.push({e:X,c:za});
 const link=(i,j)=>{const k=i+','+j;if(!seen.has(k)){seen.add(k);b.push([i,nM+j,1,'i'])}};for(let i=0;i<nM;i++)link(i,i%nX);for(let j=0;j<nX;j++)link(j%nM,j);return{n,b}};
const HYD=(M,z)=>()=>{const n=[{e:M,c:z}],b=[];for(let k=0;k<z;k++){const o=n.length;n.push({e:'O',c:-1},{e:'H',c:0});b.push([0,o,1,'i'],[o,o+1,1])}return{n,b}};
['Li','Na','K','Mg','Ca','Al','Zn','Fe','Cu'].forEach(e=>addSp(e,e,ATOM(e),0,'el',{metal:1,solid:1,tray:1}));
[['H2','H₂','[H][H]',0],['O2','O₂','O=O',0],['N2','N₂','N#N',0],['F2','F₂','FF',0],['Cl2','Cl₂','ClCl',0],['Br2','Br₂','BrBr',30.9]].forEach(([i,n,s,h])=>addSp(i,n,()=>G(s),h,'el',{tray:1}));
[['H2O','H₂O','O',-241.8,1],['NH3','NH₃','N',-45.9,1],['HCl','HCl','Cl',-92.3,1],['CO2','CO₂','O=C=O',-393.5,1],['CH4','CH₄','C',-74.6,1],['C2H4','C₂H₄','C=C',52.4,1],['C2H6','C₂H₆','CC',-84,1],['C2H5OH','C₂H₅OH','CCO',-234.8,1],['H2O2','H₂O₂','OO',-136.3,1],['HF','HF','F',-273.3,0]].forEach(([i,n,s,h,t])=>addSp(i,n,()=>G(s),h,'cmp',{tray:t}));
addSp('NO','NO',()=>({n:[{e:'N',c:0},{e:'O',c:0}],b:[[0,1,2]]}),90.3,'cmp');
[['NaCl','NaCl','Na',1,1,'Cl',-1,1,-411.2,1],['KCl','KCl','K',1,1,'Cl',-1,1,-436.7],['LiCl','LiCl','Li',1,1,'Cl',-1,1,-408.6],['MgCl2','MgCl₂','Mg',2,1,'Cl',-1,2,-641.3],['CaCl2','CaCl₂','Ca',2,1,'Cl',-1,2,-795.4],['AlCl3','AlCl₃','Al',3,1,'Cl',-1,3,-704.2],['ZnCl2','ZnCl₂','Zn',2,1,'Cl',-1,2,-415.1],['FeCl3','FeCl₃','Fe',3,1,'Cl',-1,3,-399.5],['CuCl2','CuCl₂','Cu',2,1,'Cl',-1,2,-220.1],
 ['Na2O','Na₂O','Na',1,2,'O',-2,1,-414.2],['K2O','K₂O','K',1,2,'O',-2,1,-361.5],['Li2O','Li₂O','Li',1,2,'O',-2,1,-597.9],['MgO','MgO','Mg',2,1,'O',-2,1,-601.6],['CaO','CaO','Ca',2,1,'O',-2,1,-635.1,1],['ZnO','ZnO','Zn',2,1,'O',-2,1,-348.3],['CuO','CuO','Cu',2,1,'O',-2,1,-157.3,1],['Al2O3','Al₂O₃','Al',3,2,'O',-2,3,-1675.7],['Fe2O3','Fe₂O₃','Fe',3,2,'O',-2,3,-824.2,1]]
 .forEach(([i,n,M,zc,nM,X,za,nX,h,t])=>addSp(i,n,SALT(M,zc,nM,X,za,nX),h,'cmp',{ionic:1,solid:1,tray:t}));
[['NaOH','NaOH','Na',1,-425.6,1],['KOH','KOH','K',1,-424.6],['LiOH','LiOH','Li',1,-484.9],['MgOH2','Mg(OH)₂','Mg',2,-924.5],['CaOH2','Ca(OH)₂','Ca',2,-985.2]].forEach(([i,n,M,z,h,t])=>addSp(i,n,HYD(M,z),h,'cmp',{ionic:1,solid:1,tray:t}));
addSp('NH4Cl','NH₄Cl',()=>({n:[{e:'N',c:1},{e:'H',c:0},{e:'H',c:0},{e:'H',c:0},{e:'H',c:0},{e:'Cl',c:-1}],b:[[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1,'i']]}),-314.4,'cmp',{ionic:1,solid:1});
// ---------- curated inorganic reactions (enthalpy = sum hf(products) - sum hf(reactants))
const TR=[];
function RX(re,pr,ea,note){const f=o=>Object.entries(o).reduce((s,[i,c])=>{if(!BY[i])throw new Error('unknown species '+i);return s+c*SPC[BY[i]].hf},0);
 TR.push({re:Object.fromEntries(Object.entries(re).map(([i,c])=>[BY[i],c])),pr:Object.entries(pr).map(([i,c])=>[BY[i],c]),ea,dH:f(pr)-f(re),note})}
const MET={Li:{z:1,cl:'LiCl',ox:'Li2O',oh:'LiOH',a:[12,25,30]},Na:{z:1,cl:'NaCl',ox:'Na2O',oh:'NaOH',a:[10,15,20]},K:{z:1,cl:'KCl',ox:'K2O',oh:'KOH',a:[8,10,10]},Mg:{z:2,cl:'MgCl2',ox:'MgO',oh:'MgOH2',a:[35,120,130]},Ca:{z:2,cl:'CaCl2',ox:'CaO',oh:'CaOH2',a:[25,90,50]},
 Al:{z:3,cl:'AlCl3',ox:'Al2O3',a:[45,180]},Zn:{z:2,cl:'ZnCl2',ox:'ZnO',a:[45,160]},Fe:{z:3,cl:'FeCl3',ox:'Fe2O3',a:[60,140]},Cu:{z:2,cl:'CuCl2',ox:'CuO',a:[60,150]}};
Object.entries(MET).forEach(([M,o])=>{const z=o.z;
 RX(z==2?{[M]:1,Cl2:1}:{[M]:2,Cl2:z==1?1:3},{[o.cl]:z==2?1:2},o.a[0],M+' + Cl₂');
 RX(z==2?{[M]:2,O2:1}:{[M]:4,O2:z==1?1:3},{[o.ox]:2},o.a[1],M+' + O₂');
 if(o.oh)RX(z==1?{[M]:2,H2O:2}:{[M]:1,H2O:2},{[o.oh]:z==1?2:1,H2:1},o.a[2],M+' + H₂O vapour')});
RX({NH3:1,HCl:1},{NH4Cl:1},5,'NH₃ + HCl');RX({N2:1,O2:1},{NO:2},450,'thermal NO formation');RX({Al:2,Fe2O3:1},{Al2O3:1,Fe:2},200,'thermite');RX({CuO:1,H2:1},{Cu:1,H2O:1},80,'CuO reduction');
// ---------- molecules
const A_=MASS;
function lay(g,p0){const n=g.n.length,adj=new Set();g.b.forEach(([i,j])=>{adj.add(i+','+j);adj.add(j+','+i)});
 const p=p0&&p0.length==n?p0.map(q=>q.slice()):g.n.map((_,i)=>[Math.cos(i*2.4)*(9+i*3),Math.sin(i*2.4)*(9+i*3)]);
 for(let it=0;it<140;it++){const f=p.map(()=>[0,0]);
  g.b.forEach(([i,j,o])=>{const dx=p[j][0]-p[i][0],dy=p[j][1]-p[i][1],d=Math.hypot(dx,dy)||1,k=(d-15*[1,.87,.78][o-1])*.3;f[i][0]+=k*dx/d;f[i][1]+=k*dy/d;f[j][0]-=k*dx/d;f[j][1]-=k*dy/d});
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(adj.has(i+','+j))continue;const dx=p[j][0]-p[i][0],dy=p[j][1]-p[i][1],d=Math.hypot(dx,dy)||1;if(d<30){const k=(30-d)*.12;f[i][0]-=k*dx/d;f[i][1]-=k*dy/d;f[j][0]+=k*dx/d;f[j][1]+=k*dy/d}}
  p.forEach((q,i)=>{q[0]+=f[i][0]*.5;q[1]+=f[i][1]*.5})}
 const cx=p.reduce((s,q)=>s+q[0],0)/n,cy=p.reduce((s,q)=>s+q[1],0)/n;return p.map(q=>[q[0]-cx,q[1]-cy])}
function mol(g,x,y,T,p0){const p=lay(g,p0),cnt=cntOf(g),key=ck(cnt),sp=SPC[key],n=g.n.length,mass=g.n.reduce((s,a)=>s+MASS[a.e],0);
 const m={g,p,cnt,key,mass,n,x,y,vx:0,vy:0,a:rnd()*6.283,w:(rnd()-.5)*3,T,cd:0,solid:!!(sp&&sp.solid),C:sp&&sp.metal?25:sp&&sp.ionic?60:n==1?12.5:n==2?33:55,
  r:Math.max(...p.map(q=>Math.hypot(q[0],q[1])))+(n==1?11:8),f:clamp(Math.sqrt(-2*Math.log(1-rnd()))*.8,.3,2.2),fm:formula(cnt),name:sp?sp.name:sub_(formula(cnt)),wx:new Float32Array(n),wy:new Float32Array(n)};
 m.sig=m.fm+'|'+g.b.map(b=>[g.n[b[0]].e,g.n[b[1]].e].sort().join('')+b[2]).sort().join(',');
 const ang=rnd()*6.283,s=VK*Math.sqrt(T/mass)*m.f*(m.solid?.3:1);m.vx=Math.cos(ang)*s;m.vy=Math.sin(ang)*s;return m}
const eq=(m,o)=>{const a=Object.keys(m.cnt),b=Object.keys(o);return a.length==b.length&&b.every(k=>m.cnt[k]===o[k])};
const isO2=m=>m.n==2&&eq(m,{O:2});
const isX2=m=>{if(m.n!=2||m.g.b.length!=1||m.g.b[0][2]!=1)return null;const a=m.g.n[0].e,b=m.g.n[1].e;return a==b&&['H','F','Cl','Br','I'].includes(a)?a:null};
const isProd=m=>eq(m,{C:1,O:2})||eq(m,{H:2,O:1})||eq(m,{N:2})||eq(m,{S:1,O:2})||(m.n==2&&m.cnt.H===1&&['F','Cl','Br','I'].some(x=>m.cnt[x]===1));
const bd_=(a,b,o)=>bde(a,b,o)[0];
const E=g=>{const c=cntOf(g);if(g.n.length==3&&c.C==1&&c.O==2&&g.b.every(b=>b[2]==2))return 1598;return g.b.reduce((s,[i,j,o])=>s+bd_(g.n[i].e,g.n[j].e,o),0)};
const sumE=a=>a.reduce((s,g)=>s+E(g),0);
const near=(m,pred,r,ex)=>S.mols.filter(q=>q!==m&&!(ex&&ex.includes(q))&&pred(q)&&Math.hypot(q.x-m.x,q.y-m.y)<r).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y));
// ---------- reaction classes: each returns {ea,dH,ins,outs:[{g,p0}],kind} or null
function tbl(A,B){for(const r of TR){const need=r.re,ka=A.key,kb=B.key;if(!(ka in need)||!(kb in need))continue;if(ka===kb&&need[ka]<2)continue;
  const ins=[A,B],have={};ins.forEach(m=>have[m.key]=(have[m.key]||0)+1);let ok=true;
  for(const k in need){const want=need[k]-(have[k]||0);if(want>0){const more=near(A,m=>m.key===k,150,ins);if(more.length<want){ok=false;break}ins.push(...more.slice(0,want))}}
  if(!ok)continue;const outs=[];r.pr.forEach(([k,c])=>{for(let i=0;i<c;i++)outs.push({g:SPC[k].gb()})});return{ea:r.ea,dH:r.dH,ins,outs,kind:r.note}}return null}
const OK=new Set(['C','H','N','O','S','F','Cl','Br','I']);
function eaComb(F){const hb=F.g.b.filter(([i,j])=>F.g.n[i].e=='H'||F.g.n[j].e=='H');if(!hb.length)return 150;const w=Math.min(...hb.map(([i,j,o])=>bd_(F.g.n[i].e,F.g.n[j].e,o)));return Math.max(60,w-205+10)}
const PGc=k=>({CO2:()=>G('O=C=O'),H2O:()=>G('O'),N2:()=>G('N#N'),SO2:()=>G('O=S=O'),CO:()=>({n:[{e:'C',c:-1},{e:'O',c:1}],b:[[0,1,3]]}),O2:()=>G('O=O'),HF:()=>G('F'),HCl:()=>G('Cl'),HBr:()=>G('Br'),HI:()=>G('I')}[k]());
function comb(F,O){if(!isO2(O)||isO2(F)||isProd(F))return null;const c=F.cnt;for(const k in c)if(!OK.has(k))return null;
 const C=c.C||0,H=c.H||0,N=c.N||0,Ox=c.O||0,Sx=c.S||0,X=(c.F||0)+(c.Cl||0)+(c.Br||0)+(c.I||0),hp=H-X;if(hp<0||C+H+N+Sx===0)return null;
 const plan=(nu,co)=>{if(nu<=0)return null;for(const mm of [1,2,4])if(Math.abs(mm*nu-Math.round(mm*nu))<1e-9&&(mm*hp)%2===0&&(mm*N)%2===0)return{mm,need:Math.round(mm*nu),co};return null};
 const full=plan(C+hp/4+Sx-Ox/2,false),alt=C>0?plan(C/2+hp/4+Sx-Ox/2,true):null;if(!full&&!alt)return null;
 const tryP=q=>{if(!q)return null;const fu=[F,...near(F,m=>m.sig===F.sig,150,[F])].slice(0,q.mm);if(fu.length<q.mm)return null;const ox=[O,...near(F,m=>isO2(m)&&m!==O,150,[O])].slice(0,q.need);if(ox.length<q.need)return null;return{q,fu,ox}};
 const R=tryP(full)||tryP(alt);if(!R)return null;const{q,fu,ox}=R,mm=q.mm,outs=[],push=(k,n)=>{for(let i=0;i<n;i++)outs.push({g:PGc(k)})};
 push(q.co?'CO':'CO2',mm*C);push('H2O',mm*hp/2);push('N2',mm*N/2);push('SO2',mm*Sx);['F','Cl','Br','I'].forEach(x=>push('H'+x,mm*(c[x]||0)));
 const ins=[...fu,...ox];return{ea:eaComb(F),dH:sumE(ins.map(m=>m.g))-sumE(outs.map(o=>o.g)),ins,outs,kind:q.co?'incomplete combustion':'combustion'}}
const EAD={F:15,Cl:35,Br:60,I:120,H:180};
function addn(Pm,X){const x=isX2(X);if(!x||isX2(Pm)||Pm.n<2)return null;const cand=Pm.g.b.filter(([i,j,o])=>o>=2&&Pm.g.n[i].e=='C'&&Pm.g.n[j].e=='C');if(!cand.length)return null;
 const[i,j,o]=cand[(rnd()*cand.length)|0],g=cp(Pm.g);g.b=g.b.map(b=>b[0]==i&&b[1]==j?[i,j,o-1]:b);const k=g.n.length;g.n.push({e:x,c:0},{e:x,c:0});g.b.push([i,k,1],[j,k+1,1]);
 const dH=bd_('C','C',o)-bd_('C','C',o-1)+bd_(x,x,1)-2*bd_('C',x,1);if(dH>10)return null;
 return{ea:EAD[x],dH,ins:[Pm,X],outs:[{g,p0:Pm.p.concat([[rnd()*16-8,rnd()*16-8],[rnd()*16-8,rnd()*16-8]])}],kind:'addition across '+(o==2?'C=C':'C≡C')}}
const EAH={F:20,Cl:100,Br:170,I:170};
function h2x2(A,B){const a=isX2(A),b=isX2(B);if(!a||!b||a==b||(a!='H'&&b!='H'))return null;const x=a=='H'?b:a;return{ea:EAH[x],dH:bd_('H','H',1)+bd_(x,x,1)-2*bd_('H',x,1),ins:[A,B],outs:[{g:PGc('H'+x)},{g:PGc('H'+x)}],kind:'H₂ + '+x+'₂'}}
function subst(Sb,X){const x=isX2(X);if(!x||x=='H'||isX2(Sb)||!Sb.cnt.C)return null;const g=Sb.g;
 const el=g.b.filter(([i,j])=>{const c=g.n[i].e=='C'&&g.n[j].e=='H'?i:g.n[j].e=='C'&&g.n[i].e=='H'?j:-1;return c>=0&&g.b.every(b=>(b[0]!=c&&b[1]!=c)||b[2]==1)});if(!el.length)return null;
 const[i,j]=el[(rnd()*el.length)|0],h=g.n[i].e=='H'?i:j,c=h==i?j:i,dH=bd_('C','H',1)+bd_(x,x,1)-bd_('C',x,1)-bd_('H',x,1);if(dH>10)return null;
 const map=[];let k=0;g.n.forEach((_,t)=>{map[t]=t==h?-1:k++});const ng={n:g.n.filter((_,t)=>t!=h).map(a=>({...a})),b:g.b.filter(b=>b[0]!=h&&b[1]!=h).map(b=>[map[b[0]],map[b[1]],b[2]])};
 ng.n.push({e:x,c:0});ng.b.push([map[c],ng.n.length-1,1]);const p0=Sb.p.filter((_,t)=>t!=h).concat([[Sb.p[h][0],Sb.p[h][1]]]);
 return{ea:.5*bd_(x,x,1),dH,ins:[Sb,X],outs:[{g:ng,p0},{g:PGc('H'+x)}],kind:'substitution (C–H → C–'+x+')'}}
function h2o2(A,B){const t=m=>eq(m,{H:2,O:2});if(!t(A)||!t(B))return null;const outs=[{g:PGc('H2O')},{g:PGc('H2O')},{g:PGc('O2')}];return{ea:100,dH:sumE([A.g,B.g])-sumE(outs.map(o=>o.g)),ins:[A,B],outs,kind:'peroxide decomposition'}}
const candidates=(A,B)=>[tbl(A,B),comb(A,B),comb(B,A),addn(A,B),addn(B,A),h2x2(A,B),subst(A,B),subst(B,A),h2o2(A,B)].filter(Boolean);
const nameOfG=g=>{const c=cntOf(g),sp=SPC[ck(c)];return sp?sp.name:sub_(formula(c))};
function eqn(rx){const cnt=ns=>{const o={};ns.forEach(f=>o[f]=(o[f]||0)+1);return Object.entries(o).map(([k,v])=>(v>1?v+' ':'')+k).join(' + ')};return cnt(rx.ins.map(m=>m.name))+' → '+cnt(rx.outs.map(o=>nameOfG(o.g)))}
function exec(rx,x,y,Tb){if(!rx.ins.every(m=>S.mols.includes(m)))return false;rx.ins.forEach(m=>S.mols.splice(S.mols.indexOf(m),1));
 const outs=rx.outs.map(o=>mol(o.g,x+(rnd()-.5)*34,y+(rnd()-.5)*34,Tb,o.p0));
 const zone=[...outs,...S.mols.filter(m=>Math.hypot(m.x-x,m.y-y)<130)],dT=-rx.dH*1000*.6/zone.reduce((s,m)=>s+m.C,0); // 60% stays in the gas, the rest warms the glass
 outs.forEach(m=>{S.mols.push(m);if(S.V&&S.V.sdf(m.x,m.y)>-m.r)wall(m)});zone.forEach(m=>m.T=clamp(m.T+dT,TMIN,TMAX));
 S.nrx++;S.log.unshift({t:S.time,txt:eqn(rx),dH:rx.dH,kind:rx.kind,ea:rx.ea});if(S.log.length>6)S.log.pop();
 S.fx.push({k:'r',x,y,l:.5,m:.5,c:rx.dH<0?'255,160,40':'80,170,255'});
 if(rx.dH<-150){S.fireT=S.time;for(let i=0;i<8&&S.fx.length<180;i++)S.fx.push({k:'f',x:x+(rnd()-.5)*30,y:y+(rnd()-.5)*20,vx:(rnd()-.5)*40,vy:-40-rnd()*70,l:.7,m:.7})}
 return true}
function tryReact(A,B){if(A.cd>S.time||B.cd>S.time)return;const cs=candidates(A,B);if(!cs.length)return;const rx=cs[0],T=(A.T+B.T)/2,p=Math.min(1,ZC*Math.exp(-rx.ea/(R_*T)))*.6;A.cd=B.cd=S.time+.12;
 if(rnd()<p)S.pend.push({rx,x:(A.x+B.x)/2,y:(A.y+B.y)/2,T})}
// ---------- vessels as signed distance functions (negative inside)
const sdBox=(x,y,cx,cy,hw,hh)=>{const dx=Math.abs(x-cx)-hw,dy=Math.abs(y-cy)-hh;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)};
const sdCir=(x,y,cx,cy,r)=>Math.hypot(x-cx,y-cy)-r;
function polySdf(pts){const c=[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length];
 const E_=pts.map((a,i)=>{const b=pts[(i+1)%pts.length],ex=b[0]-a[0],ey=b[1]-a[1],l=Math.hypot(ex,ey);let nx=ey/l,ny=-ex/l;if(nx*(c[0]-a[0])+ny*(c[1]-a[1])>0){nx=-nx;ny=-ny}return[a[0],a[1],nx,ny]});
 return(x,y)=>{let m=-1e9;for(const e of E_){const d=(x-e[0])*e[2]+(y-e[1])*e[3];if(d>m)m=d}return m}}
function makeV(type,W,H,lid){const cx=W/2,ext=lid?0:500;let sdf,path,top,bottom,x0,x1,name;
 if(type==='tube'){name='Test tube';const hw=Math.min(W*.2,70),y0=H*.1,yc=H*.9-hw,t=y0-ext;top=y0;bottom=yc+hw;x0=cx-hw;x1=cx+hw;
  sdf=(x,y)=>Math.min(sdBox(x,y,cx,(yc+t)/2,hw,(yc-t)/2),sdCir(x,y,cx,yc,hw));
  path=g=>{g.moveTo(cx-hw,y0);g.lineTo(cx-hw,yc);g.arc(cx,yc,hw,Math.PI,0,true);g.lineTo(cx+hw,y0)}}
 else if(type==='flask'){name='Round flask';const R=Math.min(W*.42,H*.27),cy0=H*.6,nw=Math.min(R*.3,40),yT=H*.08,jy=cy0-Math.sqrt(R*R-nw*nw),t=yT-ext,th=Math.asin(nw/R);top=yT;bottom=cy0+R;x0=cx-nw;x1=cx+nw;
  sdf=(x,y)=>Math.min(sdCir(x,y,cx,cy0,R),sdBox(x,y,cx,(t+jy+8)/2,nw,(jy+8-t)/2));
  path=g=>{g.moveTo(cx-nw,yT);g.lineTo(cx-nw,jy);g.arc(cx,cy0,R,-Math.PI/2-th,-Math.PI/2+th-2*Math.PI,true);g.lineTo(cx+nw,yT)}}
 else if(type==='conical'){name='Conical flask';const yT=H*.08,y1=H*.4,y2=H*.9,hn=Math.min(W*.1,42),hb=Math.min(W*.42,170),t=yT-ext;top=yT;bottom=y2;x0=cx-hn;x1=cx+hn;
  const body=polySdf([[cx-hn,y1],[cx+hn,y1],[cx+hb,y2],[cx-hb,y2]]);
  sdf=(x,y)=>Math.min(body(x,y),sdBox(x,y,cx,(t+y1+6)/2,hn,(y1+6-t)/2));
  path=g=>{g.moveTo(cx-hn,yT);g.lineTo(cx-hn,y1);g.lineTo(cx-hb,y2);g.lineTo(cx+hb,y2);g.lineTo(cx+hn,y1);g.lineTo(cx+hn,yT)}}
 else if(type==='dish'){name='Petri dish';const hw=Math.min(W*.46,190),hh=Math.min(H*.09,52),cy=H*.72,t=cy-hh-ext;top=cy-hh;bottom=cy+hh;x0=cx-hw;x1=cx+hw;
  sdf=(x,y)=>sdBox(x,y,cx,(t+cy+hh)/2,hw,(cy+hh-t)/2);path=g=>{g.moveTo(cx-hw,cy-hh);g.lineTo(cx-hw,cy+hh);g.lineTo(cx+hw,cy+hh);g.lineTo(cx+hw,cy-hh)}}
 else{name='Beaker';const hw=Math.min(W*.37,135),y0=H*.16,y1=H*.9,t=y0-ext;top=y0;bottom=y1;x0=cx-hw;x1=cx+hw;
  sdf=(x,y)=>sdBox(x,y,cx,(t+y1)/2,hw,(y1-t)/2);path=g=>{g.moveTo(cx-hw,y0);g.lineTo(cx-hw,y1);g.lineTo(cx+hw,y1);g.lineTo(cx+hw,y0)}}
 const V={type,name,sdf,path,top,bottom,x0,x1};
 V.rand=(r,low)=>{const lo=low?top+(bottom-top)*.55:top+r;for(let k=0;k<80;k++){const x=r+rnd()*(W-2*r),y=lo+rnd()*Math.max(1,bottom-lo);if(sdf(x,y)<-r)return[x,y]}return[cx,Math.max(top+r,bottom-r)]};
 let n=0;for(let x=6;x<W;x+=12)for(let y=top;y<bottom;y+=12)if(sdf(x,y)<-13)n++;V.cap=clamp(Math.floor(n*144/(Math.PI*14*14*1.7)),6,80);return V}
function wall(m){const V=S.V;for(let it=0;it<3;it++){const d=V.sdf(m.x,m.y)+m.r;if(d<=0)break;const e=1.5,gx=V.sdf(m.x+e,m.y)-V.sdf(m.x-e,m.y),gy=V.sdf(m.x,m.y+e)-V.sdf(m.x,m.y-e),l=Math.hypot(gx,gy)||1,nx=gx/l,ny=gy/l;
  m.x-=nx*Math.min(d,30);m.y-=ny*Math.min(d,30);const vn=m.vx*nx+m.vy*ny;if(vn>0){m.vx-=2*vn*nx;m.vy-=2*vn*ny}}}
// ---------- simulation
function update(dt){S.time+=dt;const M=S.mols,V=S.V;if(!V)return;S.pend.length=0;const h=S.held;
 if(h){const R=S.tool=='ext'?80:62;
  M.forEach(m=>{const d=Math.hypot(m.x-h.x,m.y-h.y);if(d>R)return;const f=1-d/R;
   if(S.tool=='flame')m.T=Math.min(TMAX,m.T+3000*dt*f*f+400*dt);else if(S.tool=='ice')m.T=Math.max(180,m.T-2200*dt*f-200*dt);else m.T+=(TAMB-m.T)*Math.min(1,7*dt*(.4+f))});
  if(S.tool=='flame'&&rnd()<.6&&S.fx.length<180)S.fx.push({k:'f',x:h.x+(rnd()-.5)*18,y:h.y+8,vx:(rnd()-.5)*30,vy:-60-rnd()*60,l:.55,m:.55});
  if(S.tool=='ice'&&rnd()<.4&&S.fx.length<180)S.fx.push({k:'i',x:h.x+(rnd()-.5)*40,y:h.y+(rnd()-.5)*30,vx:(rnd()-.5)*20,vy:20+rnd()*30,l:.7,m:.7});
  if(S.tool=='ext'){for(let i=0;i<2&&S.fx.length<180;i++)S.fx.push({k:'s',x:h.x,y:h.y,vx:(rnd()-.5)*220,vy:(rnd()-.5)*220,l:.6,m:.6});
   S.xt-=dt;if(S.xt<=0&&S.ext<28&&M.length<V.cap+28&&V.sdf(h.x,h.y)<-14){S.xt=.14;S.ext++;M.push(mol(G('O=C=O'),h.x+(rnd()-.5)*20,h.y+(rnd()-.5)*20,260))}}}
 for(let k=M.length-1;k>=0;k--){const m=M[k];m.T+=(TAMB-m.T)*.25*dt;m.T=clamp(m.T,TMIN,TMAX);
  const tv=Math.min(380,VK*Math.sqrt(m.T/m.mass)*m.f*(m.solid?.3:1)),sp=Math.hypot(m.vx,m.vy)||1,kk=1+(tv/sp-1)*Math.min(1,dt*1.6);m.vx*=kk;m.vy*=kk;if(m.solid)m.vy+=420*dt;
  m.x+=m.vx*dt;m.y+=m.vy*dt;m.a+=m.w*dt;wall(m);
  if(!S.lid&&!m.solid&&m.y<V.top-6){if(m.vy<0&&rnd()<.03*Math.sqrt(30/m.mass)){M.splice(k,1);S.esc++;if(S.fx.length<180)S.fx.push({k:'s',x:m.x,y:V.top,vx:0,vy:-60,l:.5,m:.5})}else{m.y=V.top-6;m.vy=Math.abs(m.vy)}}}
 for(let i=0;i<M.length;i++)for(let j=i+1;j<M.length;j++){const A=M[i],B=M[j],dx=B.x-A.x,dy=B.y-A.y,lim=A.r+B.r;if(dx>lim||dx<-lim||dy>lim||dy<-lim)continue;const d=Math.hypot(dx,dy);if(d>=lim||d<.01)continue;
  const nx=dx/d,ny=dy/d,rv=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;
  if(rv<0){const imp=-2*rv/(1/A.mass+1/B.mass);A.vx-=imp*nx/A.mass;A.vy-=imp*ny/A.mass;B.vx+=imp*nx/B.mass;B.vy+=imp*ny/B.mass;const mT=(A.T+B.T)/2;A.T+=(mT-A.T)*.4;B.T+=(mT-B.T)*.4;tryReact(A,B)}
  const ov=(lim-d)/2;A.x-=nx*ov;A.y-=ny*ov;B.x+=nx*ov;B.y+=ny*ov}
 S.pend.forEach(p=>exec(p.rx,p.x,p.y,p.T));
 for(let i=S.fx.length-1;i>=0;i--){const f=S.fx[i];f.l-=dt;if(f.l<=0){S.fx.splice(i,1);continue}f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt}}
// ---------- drawing (1x resolution, flat colours: light on phones)
function place(m){const c=Math.cos(m.a),s=Math.sin(m.a);for(let i=0;i<m.n;i++){m.wx[i]=m.x+m.p[i][0]*c-m.p[i][1]*s;m.wy[i]=m.y+m.p[i][0]*s+m.p[i][1]*c}}
function tcol(T){const t=clamp((T-600)/1900,0,1);return `rgba(255,${Math.round(110+140*t)},${Math.round(30+170*t*t)},${.15+.4*t})`}
function glass(front){const cx=S.cx,V=S.V;cx.beginPath();V.path(cx);
 if(!front){cx.fillStyle='rgba(150,200,255,.07)';cx.fill();return}
 cx.strokeStyle='rgba(190,225,255,.8)';cx.lineWidth=4;cx.lineJoin='round';cx.lineCap='round';cx.stroke();cx.strokeStyle='rgba(255,255,255,.25)';cx.lineWidth=1.5;cx.stroke();
 if(S.lid){cx.fillStyle='#8a5a3b';const w=V.x1-V.x0;cx.fillRect(V.x0-5,V.top-14,w+10,14)}}
function draw(){const cx=S.cx,W=S.W,H=S.H;cx.setTransform(1,0,0,1,0,0);
 if(S.time-S.bgT>.5||!S.bgT){S.bgT=S.time||.01;S.bg=(getComputedStyle(document.documentElement).getPropertyValue('--bg')||'#0b0f17').trim()}
 cx.fillStyle=S.bg;cx.fillRect(0,0,W,H);if(!S.V)return;glass(false);
 const M=S.mols;M.forEach(m=>{if(m.T>650){cx.fillStyle=tcol(m.T);cx.beginPath();cx.arc(m.x,m.y,m.r*1.5,0,7);cx.fill()}place(m)});
 cx.lineCap='round';M.forEach(m=>{const cold=m.T<250;cx.strokeStyle=cold?'#9fd8ff':'#cfd6e4';cx.lineWidth=2.2;
  m.g.b.forEach(([i,j,o,t])=>{if(t==='i'){cx.setLineDash([3,3]);cx.lineWidth=1.4}const dx=m.wx[j]-m.wx[i],dy=m.wy[j]-m.wy[i],d=Math.hypot(dx,dy)||1,nx=-dy/d*1.8,ny=dx/d*1.8;for(let k=0;k<o;k++){const s=k-(o-1)/2;cx.beginPath();cx.moveTo(m.wx[i]+nx*s,m.wy[i]+ny*s);cx.lineTo(m.wx[j]+nx*s,m.wy[j]+ny*s);cx.stroke()}if(t==='i'){cx.setLineDash([]);cx.lineWidth=2.2}});
  for(let i=0;i<m.n;i++){const e=m.g.n[i].e;cx.fillStyle=EL[e][3];cx.beginPath();cx.arc(m.wx[i],m.wy[i],4.2+(EL[e][1]-30)*.03,0,7);cx.fill();cx.strokeStyle='rgba(0,0,0,.45)';cx.lineWidth=.8;cx.stroke()}
  if(cold){cx.strokeStyle='rgba(160,220,255,.7)';cx.lineWidth=1;cx.beginPath();cx.arc(m.x,m.y,m.r,0,7);cx.stroke()}});
 glass(true);
 S.fx.forEach(f=>{const a=Math.max(0,f.l/f.m);
  if(f.k=='r'){cx.strokeStyle=`rgba(${f.c},${a})`;cx.lineWidth=3*a+1;cx.beginPath();cx.arc(f.x,f.y,(1-a)*46+6,0,7);cx.stroke()}
  else if(f.k=='f'){cx.fillStyle=`rgba(255,${Math.round(90+150*a)},40,${a*.8})`;cx.beginPath();cx.arc(f.x,f.y,3+5*a,0,7);cx.fill()}
  else if(f.k=='i'){cx.fillStyle=`rgba(170,225,255,${a*.8})`;cx.fillRect(f.x-1.5,f.y-1.5,3,3)}
  else{cx.fillStyle=`rgba(245,248,255,${a*.7})`;cx.beginPath();cx.arc(f.x,f.y,3+6*(1-a),0,7);cx.fill()}});
 const q=S.held||S.hover;if(q){const x=q.x,y=q.y,t=S.time;
  if(S.tool=='flame'){[[26,'rgba(255,90,20,.85)'],[18,'rgba(255,170,30,.9)'],[10,'rgba(255,240,170,.95)']].forEach(([r,c])=>{const s=1+.1*Math.sin(t*30+r);cx.fillStyle=c;cx.beginPath();cx.moveTo(x,y-r*1.6*s);cx.quadraticCurveTo(x+r*1.1,y-r*.2,x+r*.6,y+r*.6);cx.quadraticCurveTo(x,y+r*1,x-r*.6,y+r*.6);cx.quadraticCurveTo(x-r*1.1,y-r*.2,x,y-r*1.6*s);cx.fill()})}
  else if(S.tool=='ice'){cx.fillStyle='rgba(150,220,255,.5)';cx.strokeStyle='#e8f6ff';cx.lineWidth=1.5;cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;cx.lineTo(x+Math.cos(a)*24,y+Math.sin(a)*24)}cx.closePath();cx.fill();cx.stroke();cx.beginPath();for(let i=0;i<3;i++){const a=i*Math.PI/3;cx.moveTo(x+Math.cos(a)*24,y+Math.sin(a)*24);cx.lineTo(x-Math.cos(a)*24,y-Math.sin(a)*24)}cx.stroke()}
  else{cx.fillStyle='#e5484d';cx.fillRect(x-9,y-4,18,26);cx.fillStyle='#b9323a';cx.fillRect(x-4,y-12,8,9);cx.strokeStyle='#cfd6e4';cx.lineWidth=3;cx.beginPath();cx.moveTo(x+4,y-9);cx.lineTo(x+16,y-14);cx.stroke()}}}
// ---------- info card (4 times a second, not per frame)
function stat(){const M=S.mols,el=document.getElementById('info');if(!el)return;const vn=S.V?S.V.name+(S.lid?' (lid on)':' (open)'):'';
 if(!M.length){el.innerHTML=`<div class="nm"><b>Reaction lab</b> <small>${vn}</small></div><div class="nm"><small>Pick a vessel, add elements and compounds below (or open Ideas), then heat with Flame, cool with Ice, or put a fire out with the Extinguisher.</small></div>`;return}
 const Ts=M.map(m=>m.T),mx=Math.max(...Ts),av=Ts.reduce((a,b)=>a+b,0)/Ts.length,fire=S.time-S.fireT<1.2,sp={};M.forEach(m=>{const k=m.sig;sp[k]=sp[k]||{f:m.name,n:0};sp[k].n++});
 const list=Object.values(sp).sort((a,b)=>b.n-a.n).slice(0,9).map(s=>s.f+' ×'+s.n).join('  ·  ');
 const col=mx>1200?'#e5484d':mx>600?'#e0a050':mx<250?'#4f9dff':'#30a46c';
 el.innerHTML=`<div class="hd" style="cursor:default"><b style="color:${col}">${Math.round(mx)} K</b><small>peak · avg ${Math.round(av)} K (${Math.round(av-273)} °C)</small>${fire?'<span class="chip" style="background:#e5484d">FIRE</span>':''}</div>
 <div style="height:6px;border-radius:3px;margin:6px 0;background:linear-gradient(90deg,#4f9dff,#30a46c 25%,#e0a050 55%,#e5484d 80%,#fff)"><div style="height:6px;width:${clamp((mx-150)/33.5,0,100)}%;border-right:2px solid #fff"></div></div>
 <div class="nm"><small>${S.V?S.V.name:''}</small> ${S.lid?'lid on':'open'}${S.esc?' · '+S.esc+' escaped':''}</div><div class="nm"><small>Contents</small> ${list}</div>`
 +S.log.slice(0,3).map(l=>`<div class="nm"><small>${l.dH<0?'exo':'endo'}</small> ${l.txt}<br><small>${l.kind} · ΔH ≈ ${l.dH>0?'+':'−'}${Math.round(Math.abs(l.dH))} kJ/mol (est.), Ea ≈ ${Math.round(l.ea)}</small></div>`).join('')}
// ---------- lifecycle and UI hooks
function vessel(){S.V=makeV(S.ves,S.W,S.H,S.lid);S.mols.forEach(m=>{if(S.V.sdf(m.x,m.y)>-m.r){const p=S.V.rand(m.r,m.solid);m.x=p[0];m.y=p[1]}})}
function size(){const r=document.getElementById('cvw').getBoundingClientRect();S.cv.width=S.W=Math.max(100,r.width|0);S.cv.height=S.H=Math.max(100,r.height|0);vessel()}
function loop(t){if(!S.on)return;S.raf=requestAnimationFrame(loop);const dt=Math.min(.033,(t-S.last)/1000||.016);S.last=t;if(document.hidden)return;
 if(S.run)update(dt);draw();if(S.time-S.statT>.25||!S.run&&performance.now()-(S.statW||0)>500){S.statT=S.time;S.statW=performance.now();stat()}}
const pos=e=>{const r=S.cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
function add(key,n){let g,p0,solid=false;if(String(key).startsWith('u:')){const u=S.user[+key.slice(2)];if(!u)return;g=u.g;p0=u.p0}else{const sp=SPC[key];if(!sp)return;g=sp.gb();solid=!!sp.solid}
 for(let k=0;k<n;k++){if(S.mols.length>=S.V.cap){toast(`This ${S.V.name.toLowerCase()} is full (${S.V.cap} particles). Reset, or pick a larger vessel.`);return}const m=mol(cp(g),0,0,TAMB,p0);let pt;for(let t=0;t<25;t++){pt=S.V.rand(m.r,solid);if(!S.mols.some(q=>Math.hypot(q.x-pt[0],q.y-pt[1])<q.r+m.r+3))break}m.x=pt[0];m.y=pt[1];S.mols.push(m)}}
function fromBuild(){const cs=comps();let added=0;cs.forEach(c=>{const ids=c.map(a=>a.id),idx=new Map(ids.map((id,i)=>[id,i])),bs=bonds.filter(b=>idx.has(b.a)&&idx.has(b.b)),L0=bs.length?bs.reduce((s,b)=>s+Math.hypot(A_b(b.a).x-A_b(b.b).x,A_b(b.a).y-A_b(b.b).y),0)/bs.length:40,k=15/(L0||40);
  const g={n:c.map(a=>({e:a.e,c:a.c||0})),b:bs.map(b=>[idx.get(b.a),idx.get(b.b),b.o])},p0=c.map(a=>[a.x*k,a.y*k]),m=mol(g,0,0,TAMB,p0);
  let i=S.user.findIndex(s=>s.sig===m.sig);if(i<0){S.user.push({name:m.name,g,p0:m.p,sig:m.sig});i=S.user.length-1}added++;add('u:'+i,6)});
 S.tab='usr';trayUI();toast(added?added+' molecule'+(added>1?'s':'')+' from your canvas added (6 copies each). Add reagents such as O₂ or Br₂, then heat.':'Nothing on the canvas to send.',1)}
const A_b=id=>atoms.find(a=>a.id==id);
function trayUI(){const tabs=[['el','Elements'],['cmp','Compounds'],['usr','Yours']];
 document.getElementById('tabs').innerHTML=tabs.map(([k,l])=>`<button class="${S.tab==k?'on':''}" style="min-height:34px" onclick="Lab.tab('${k}')">${l}</button>`).join('');
 const chip=(key,nm,c,tag)=>`<button data-lab="${key}" style="--c:${c};width:auto;min-width:52px;padding:0 9px"><small>${tag}</small><b>${nm}</b></button>`;
 document.getElementById('tray').innerHTML=S.tab=='usr'?(S.user.length?S.user.map((u,i)=>chip('u:'+i,u.name,'#22d3ee','yours')).join(''):'<div style="padding:14px;color:var(--m);font-size:12px">Build a molecule, then press From Build.</div>')
  :Object.values(SPC).filter(s=>s.cat==S.tab&&s.tray).map(s=>chip(s.key,s.name,s.metal?EL[s.id][3]:'#7a8cff',s.metal?'metal':s.solid?'solid':'gas')).join('')}
const SC=[
 {t:'Sodium + chlorine',d:'Spontaneous and very exothermic: 2Na + Cl₂ → 2NaCl',v:'tube',lid:true,items:[['Na',8],['Cl2',4]],hint:'Spontaneous. Watch the temperature jump and the salt settle.'},
 {t:'Potassium + water vapour',d:'Spontaneous: 2K + 2H₂O → 2KOH + H₂',v:'flask',lid:true,items:[['K',6],['H2O',6]],hint:'Spontaneous. Add O₂ and hold Flame to burn the hydrogen it releases.'},
 {t:'Hydrogen + fluorine',d:'Explosive even when cold: H₂ + F₂ → 2HF',v:'tube',lid:true,items:[['H2',6],['F2',6]],hint:'Spontaneous and violent.'},
 {t:'Ammonia + hydrogen chloride',d:'White smoke: NH₃ + HCl → NH₄Cl',v:'conical',lid:true,items:[['NH3',8],['HCl',8]],hint:'Spontaneous at room temperature.'},
 {t:'Ethene + bromine',d:'Addition across C=C at room temperature',v:'tube',lid:true,items:[['C2H4',6],['Br2',6]],hint:'Spontaneous: dibromoethane forms.'},
 {t:'Magnesium burning',d:'Needs ignition: 2Mg + O₂ → 2MgO',v:'dish',lid:false,items:[['Mg',8],['O2',4]],hint:'Hold Flame on the dish. It burns very hot.'},
 {t:'Methane combustion',d:'Burn it, then put it out',v:'flask',lid:true,items:[['CH4',4],['O2',8],['N2',6]],hint:'Hold Flame to ignite. Use the Extinguisher to stop the fire.'},
 {t:'Thermite',d:'2Al + Fe₂O₃ → Al₂O₃ + 2Fe, needs intense heat',v:'beaker',lid:false,items:[['Al',8],['Fe2O3',4]],hint:'Hold Flame on the powder for a while to ignite it.'}];
function reset(){S.mols.length=0;S.fx.length=0;S.log.length=0;S.ext=0;S.nrx=0;S.esc=0;S.fireT=-9;S.time=0;stat()}
function scenario(i){const s=SC[i];reset();S.ves=s.v;S.lid=s.lid;if(S.W)vessel();s.items.forEach(([id,n])=>add(BY[id],n));build();trayUI();stat();toast(s.hint,1)}
function ideas(){let o=document.getElementById('ideas');if(o){o.remove();return}o=document.createElement('div');o.id='ideas';o.style.cssText='position:fixed;inset:0;z-index:35;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px';
 o.innerHTML='<div style="background:var(--p);border:1px solid var(--line);border-radius:14px;max-width:440px;width:100%;max-height:86dvh;overflow:auto;padding:12px"><b style="font-size:15px">Reaction ideas</b><div style="color:var(--m);margin:4px 0 8px;font-size:12px">Tap one to set up the vessel and reagents. Reactions with Ea below about 60 kJ/mol happen by themselves at room temperature.</div>'+SC.map((s,i)=>`<button data-sc="${i}" style="width:100%;text-align:left;margin:4px 0;padding:10px 12px;min-height:56px;display:block"><b>${s.t}</b><br><small style="color:var(--m)">${s.d}</small></button>`).join('')+'</div>';
 o.onclick=e=>{const b=e.target.closest('[data-sc]');if(b){scenario(+b.dataset.sc);o.remove()}else if(e.target===o)o.remove()};document.body.appendChild(o)}
function open(){if(S.on)return;S.on=true;window.LABON=true;S.cv=document.getElementById('lab');S.cx=S.cv.getContext('2d');document.body.classList.add('lab');size();S.ro=new ResizeObserver(size);S.ro.observe(document.getElementById('cvw'));
 const c=S.cv;c.onpointerdown=e=>{try{c.setPointerCapture(e.pointerId)}catch(_){}S.held=pos(e)};c.onpointermove=e=>{const p=pos(e);S.hover=p;if(S.held)S.held=p};c.onpointerup=c.onpointercancel=e=>{S.held=null};c.onpointerleave=e=>{if(e.pointerType!=='mouse')S.hover=null};
 document.getElementById('tray').onclick=e=>{const b=e.target.closest('[data-lab]');if(b)add(b.dataset.lab,4)};
 build();trayUI();stat();S.last=performance.now();S.raf=requestAnimationFrame(loop)}
function close(){if(!S.on)return;S.on=false;window.LABON=false;cancelAnimationFrame(S.raf);if(S.ro)S.ro.disconnect();document.body.classList.remove('lab');document.getElementById('tray').onclick=null;S.held=null;const o=document.getElementById('ideas');if(o)o.remove();
 build();trayBuild();refresh();wake();resize()}
window.Lab={open,close,reset,fromBuild,add,tool:k=>{S.tool=k;build()},cur:()=>S.tool,toggleRun:()=>{S.run=!S.run;build()},running:()=>S.run,tray:trayUI,tab:k=>{S.tab=k;trayUI()},
 setVessel:k=>{S.ves=k;if(S.W)vessel();build();stat()},vessel:()=>S.ves,toggleLid:()=>{S.lid=!S.lid;if(S.W)vessel();build();stat()},lid:()=>S.lid,ideas,
 _t:{S,mol,G,update,candidates,tryReact,exec,E,sumE,eqn,comb,addn,h2x2,subst,h2o2,tbl,TR,SPC,BY,makeV,wall,vessel,add,scenario,SC,PGc,formula,ck}};
})();
