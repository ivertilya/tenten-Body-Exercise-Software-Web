import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const MODES=[
 {lv:2,t:'Stick Figure & Space',cn:'火柴人与空间',ready:true},
 {lv:1,t:'Major Forms & Proportions',cn:'大体块与比例',ready:true},
 {lv:3,t:'Loomis & Head',cn:'卢米斯与脑瓜',ready:true},
 {lv:5,t:'Block Figure & Pose',cn:'方块人与动态',ready:true}];
const $=id=>document.getElementById(id);
const kids=o=>o.children.filter(c=>!c.isMesh);
const [scenes,meshes]=await Promise.all([fetch('scenes.json').then(r=>r.json()),fetch('meshes.json').then(r=>r.json())]);
const menu=$('menu');menu.innerHTML='<h1>Body Practice</h1>';
for(const m of MODES){const d=document.createElement('div');d.className='card';d.innerHTML=m.t+(m.ready?'':'<small>coming soon</small>');if(m.ready)d.onclick=()=>open(m);else d.style.opacity=.45;menu.append(d)}
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(devicePixelRatio,2));$('view').append(r.domElement);
let pose=null,forms=null,head=null,stick=null,sc,cam,ctl,dl,persp=true,cur,geoms={},grp,sel=null,ray=new T.Raycaster(),blocks=false;
function geom(id,useN){const key=id+(useN?'n':'');if(geoms[key])return geoms[key];if(id==='10210')return geoms[key]=new T.PlaneGeometry(1,1);const m=meshes[id];if(!m)return null;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.v,3));g.setIndex(m.i);if(m.uv)g.setAttribute('uv',new T.Float32BufferAttribute(m.uv,2));if(useN&&m.n)g.setAttribute('normal',new T.Float32BufferAttribute(m.n,3));else g.computeVertexNormals();return geoms[key]=g}
const texs={},loader=new T.TextureLoader();const tex=id=>{if(!id)return null;if(texs[id])return texs[id];const t=loader.load('tex/'+id+'.png',undefined,undefined,()=>loader.load(id+'.png',r=>{t.image=r.image;t.needsUpdate=true}));return texs[id]=t};
const HV=`varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const HF=`uniform sampler2D map;uniform float hasMap,op,lit,ka;uniform vec3 color,L;varying vec2 vUv;varying vec3 vN;void main(){vec4 t=hasMap>.5?texture2D(map,vUv):vec4(1.);vec3 c=mix(color,color*t.rgb,op);float a=ka>.5?t.a:1.;if(ka>.5)c=color*t.rgb;float d=max(dot(normalize(vN),L),0.);float s=mix(1.,.35+.65*d,lit);gl_FragColor=vec4(c*s,a);}`;
const hmats=[];
function headMat(n){const c=n.mc||[1,1,1];const m=new T.ShaderMaterial({uniforms:{map:{value:tex(n.tx)},hasMap:{value:n.tx?1:0},color:{value:new T.Color(c[0],c[1],c[2])},op:{value:1},lit:{value:0},ka:{value:n.k==='kuang'?1:0},L:{value:new T.Vector3(0,0,1)}},vertexShader:HV,fragmentShader:HF,transparent:n.k==='kuang',depthWrite:n.k!=='kuang',side:T.DoubleSide});hmats.push(m);return m}
function build(lv){const nodes=scenes[lv].slice().sort((p,q)=>(p.ord||0)-(q.ord||0)),by={};hmats.length=0;const root=new T.Group();
 for(const n of nodes){const o=new T.Object3D();o.name=n.name;o.visible=n.on;o.position.set(-n.p[0],n.p[1],n.p[2]);o.quaternion.set(n.q[0],-n.q[1],-n.q[2],n.q[3]);o.scale.set(...n.s);by[n.id]=o;o.userData=n;
  const g=n.mesh&&geom(n.mesh,lv===3);if(g){const c=n.col||(lv===5&&n.mc?[...n.mc,1]:[.8,.8,.8,1]);o.add(new T.Mesh(g,lv===3&&n.k?headMat(n):new T.MeshStandardMaterial({color:new T.Color(c[0],c[1],c[2]),roughness:.8,side:T.DoubleSide})))}}
 for(const n of nodes){const o=by[n.id];(by[n.par]||root).add(o)}
 return root}
function open(m){if(stick)stick.dispose();cur=m;$('menu').style.display='none';$('view').style.display='block';$('bar').style.display='flex';$('title').textContent=m.t;
 sc=new T.Scene();sc.background=new T.Color(0x3a3f47);
 if(m.stub){const c=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({color:0xcccccc}));sc.add(c);$('note').textContent='This mode is an unfinished placeholder in the original app.';$('note').style.display='block'}
 else{const g=build(m.lv);grp=g;sc.add(g);$('note').style.display='none'}
 $('pp').style.display=m.lv===1?'flex':'none';$('sp').style.display=m.lv===2?'flex':'none';stick=m.lv===2&&!m.stub?stickInit(grp):null;$('hp').style.display=m.lv===3?'flex':'none';head=m.lv===3?headInit(grp):null;if(forms)forms.dispose();forms=m.lv===1?formsInit(grp):null;$('bp').style.display=m.lv===5?'flex':'none';if(pose)pose.dispose();pose=m.lv===5?poseInit(grp):null;
 sc.add(new T.AmbientLight(0xffffff,.55));dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(-3,5,-6);sc.add(dl);
 persp=true;mkcam();resize()}
let prevFov=60;function mkcam(){prevFov=60;$('pov').value=60;$('povn').value=60;$('povl').style.display=persp?'flex':'none';const a=innerWidth/innerHeight;cam=persp?new T.PerspectiveCamera(60,a,.02,300):new T.OrthographicCamera(-5*a,5*a,5,-5,.1,100);cam.position.set(0,0,-10);
 if(ctl)ctl.dispose();ctl=new OrbitControls(cam,r.domElement);ctl.enableDamping=true;ctl.target.set(0,0,0);ctl.update();$('persp').classList.toggle('on',persp)}
function resize(){r.setSize(innerWidth,innerHeight);if(cam){const a=innerWidth/innerHeight;if(persp)cam.aspect=a;else{cam.left=-5*a;cam.right=5*a}cam.updateProjectionMatrix()}}
addEventListener('resize',resize);
$('back').onclick=()=>{if(pose)pose.dispose();pose=null;$('bp').style.display='none';if(forms)forms.dispose();forms=null;$('hp').style.display='none';head=null;$('pp').style.display='none';$('sp').style.display='none';if(stick)stick.dispose();stick=null;if(ctl)ctl.enabled=true;$('menu').style.display='grid';$('view').style.display='none';$('bar').style.display='none';$('note').style.display='none';cur=null};
$('persp').onclick=()=>{persp=!persp;mkcam();resize()};
$('light').onclick=()=>{dl.position.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4)};
$('reset').onclick=()=>{mkcam()};
r.setAnimationLoop(()=>{if(cur){if(stick)stick.update();if(head)head.update();if(forms)forms.update();ctl.update();r.render(sc,cam)}});

// --- Major Forms & Proportions ---
const PARTS=/^(Tou0|Xiong1|DabiL2|XiaobiL3|DabiR5|XiaobiR6|Tun8|DatuiL9|XiaotuiL10|DatuiR11|XiaotuiR12)$/;
const TWIN={DabiL2:'DabiR5',DabiR5:'DabiL2',XiaobiL3:'XiaobiR6',XiaobiR6:'XiaobiL3',DatuiL9:'DatuiR11',DatuiR11:'DatuiL9',XiaotuiL10:'XiaotuiR12',XiaotuiR12:'XiaotuiL10'};
function formsInit(g){
 const R=g.getObjectByName('Renti'),Tk=g.getObjectByName('Tikuai'),Md=g.getObjectByName('Model');
 const B={},real=new Set();R.traverse(o=>{if(PARTS.test(o.name)&&o.userData.mesh){B[o.name]=o;real.add(o)}});
 const Xi=B.Xiong1,Tu=B.Tun8,att=[[B.Xiong1,Tu,0],[B.Tou0,Xi,0],[B.DabiL2,Xi,1],[B.DabiR5,Xi,2],[B.DatuiL9,Tu,1],[B.DatuiR11,Tu,2]];
 const w=new T.Vector3();
 function bodyPos(){att.forEach(([n,p,i])=>{const a=p&&kids(p)[i];if(!n||!a)return;a.getWorldPosition(w);n.position.copy(n.parent.worldToLocal(w.clone()))})}
 let sel=null,tw=null,mode=1,bl=false;
 const mark=(o,on)=>o&&o.children.forEach(m=>{if(m.isMesh&&m.material.emissive)m.material.emissive.setHex(on?0x884400:0)});
 const sync=()=>{$('fw').value=sel?sel.scale.x/2:.5;$('fh').value=sel?sel.scale.y/2:.5;$('fw').disabled=$('fh').disabled=!sel;$('fhint').textContent=sel?'Selected: '+sel.name+(tw?' + '+tw.name:''):'Tap a body part to select it'};
 const setMode=k=>{mode=k;mark(sel,false);mark(tw,false);sel=tw=null;sync();R.visible=k===1;Tk.visible=k===2;$('qs').style.display=k===1?'flex':'none';$('jb').style.display=k===2?'flex':'none';$('b1').classList.toggle('on',k===1);$('b2').classList.toggle('on',k===2)};
 $('b1').onclick=()=>setMode(1);$('b2').onclick=()=>setMode(2);
 // ruler lines (BL): horizontal marks at the heights of point0..5, from 0.7n to 4n
 const P=[];R.traverse(o=>{const m=/^point(\d)$/.exec(o.name);if(m)P[+m[1]]=o});
 const segs=[];for(let i=0;i<7;i++){const m=new T.Mesh(new T.CylinderGeometry(.015,.015,1,6),new T.MeshBasicMaterial({color:0x66ccff}));m.visible=false;g.add(m);segs.push(m)}
 const Y=i=>P[i]?P[i].getWorldPosition(new T.Vector3()).y:0;
 function put(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,a.distanceTo(b),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}
 function rulers(){const n=Md?Md.scale.x:1,v=(x,y)=>new T.Vector3(-x*n,y,0);let k=0;
  if(P[0]&&P[5]){const a=Y(0),b=Y(5);put(segs[k++],v(.7,a),v(4,a));put(segs[k++],v(4,a),v(4,b));put(segs[k++],v(4,b),v(.7,b))}
  for(let i=1;i<=4;i++)if(P[i]){const y=Y(i);put(segs[k++],v(.7,y),v(4,y))}
  segs.forEach((m,i)=>m.visible=bl&&i<k)}
 $('bl').onclick=()=>{bl=!bl;$('bl').classList.toggle('on',bl)};
 // width: x=z=2v ; height: y=2v ; the symmetric twin follows (original DoButtonEvent)
 $('fw').oninput=()=>{const s=2*$('fw').value;[sel,tw].forEach(o=>o&&(o.scale.x=o.scale.z=s))};
 $('fh').oninput=()=>{const s=2*$('fh').value;[sel,tw].forEach(o=>o&&(o.scale.y=s))};
 $('fz').onclick=()=>{R.traverse(o=>{if(o.userData.s)o.scale.set(...o.userData.s)});sync()};
 // local mode: step view of Xiong / Tun blocks (idx = floor(v*3)), random tilt of Tou / Tun, zero
 const stepv=()=>{const i=Math.min(3,Math.floor($('fs').value*3));[kids(Tk)[1],kids(Tk)[2]].forEach(gr=>gr&&kids(gr).forEach((c,k)=>{if(k<4)c.visible=k===i}))};
 $('fs').oninput=stepv;
 const rnd=(a,b)=>(a+Math.random()*(b-a))*Math.PI/180;
 $('fr').onclick=()=>[kids(Tk)[0],kids(Tk)[2]].forEach(o=>{o.rotation.order='YXZ';o.rotation.set(rnd(-30,30),rnd(-60,60),rnd(-30,30))});
 $('fj').onclick=()=>[kids(Tk)[0],kids(Tk)[2]].forEach(o=>o.rotation.set(0,0,0));
 // tap to select a body part (original uses Ctrl+click)
 const E=r.domElement;let dn=null;const down=e=>dn=[e.clientX,e.clientY];
 const up=e=>{if(!dn||e.target!==E)return;const moved=Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>6;dn=null;if(moved||mode!==1)return;
  const b=E.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),cam);
  const hit=ray.intersectObject(R,true).find(h=>h.object.isMesh);mark(sel,false);mark(tw,false);sel=tw=null;
  if(hit){let o=hit.object.parent;while(o&&!real.has(o))o=o.parent;if(o){sel=o;const t=TWIN[o.name];tw=t?B[t]:null;mark(sel,true);mark(tw,true)}}sync()};
 E.addEventListener('pointerdown',down);E.addEventListener('pointerup',up);
 setMode(1);$('bl').classList.remove('on');$('fs').value=0;stepv();
 return{update(){bodyPos();rulers()},dispose(){E.removeEventListener('pointerdown',down);E.removeEventListener('pointerup',up)}}}
// --- Stick Figure & Space ---
function stickInit(g){
 const P=[],M=[];g.traverse(o=>{let m;if(m=/^P(\d+)$/.exec(o.name))P[+m[1]]=o;if(m=/^(\d\d)[A-Z]/.exec(o.name))M[+m[1]]=o});
 const rest=P.map(p=>[p.position.clone(),p.quaternion.clone()]);
 const S={mode:0,move:0,plane:0,op:'op'},wp=i=>P[i].getWorldPosition(new T.Vector3());
 const GR=[[0],[1,2,3],[4],[5,6,7],[8,10],[9,11]],DR=[[0],[1],[4],[5],[8,10],[9,11]].map(a=>new Set(a));
 const COL=['#ff6b59','#ffc759','#8ce84a','#40e8e0','#648cf7','#c787f7'],NAMES=['Head','Chest','Abdomen','Hip','Knee','Foot'];
 const SC=[[0],[1],[],[5],[],[6,7]],SCN={0:'Head',1:'Chest',5:'Hip',6:'Left leg',7:'Right leg'},sv={};
 const hit=[];P.forEach((p,i)=>{const h=new T.Mesh(new T.SphereGeometry(.22/3*(i>=2&&i<=3||i>=6&&i<=7?3:1)),new T.MeshBasicMaterial({visible:false}));h.userData.pt=i;p.add(h);hit.push(h);
  p.traverse(o=>{if(o.isMesh&&o!==h)o.material=new T.MeshBasicMaterial({color:0xff5050})})});
 const lines=[[0,1,4,5],[3,1,2],[9,8,6,5,7,10,11]].map(ix=>({ix,m:ix.slice(1).map(()=>new T.Mesh(new T.CylinderGeometry(.03,.03,1,6),new T.MeshBasicMaterial({color:0x66ccff})))}));
 lines.forEach(l=>l.m.forEach(m=>g.add(m)));
 const mats=new T.MeshStandardMaterial({color:0xd8d2c6,roughness:.7,transparent:true,opacity:.85,side:T.DoubleSide});
 M.forEach(m=>m&&m.traverse(o=>{if(o.isMesh)o.material=mats}));
 const PLc=[0xff6b59,0xffc759,0x8ce84a,0x40e8e0,0x648cf7,0xc787f7],planes=[],tex=new T.TextureLoader().load('kuang.png');tex.colorSpace=T.SRGBColorSpace;
 g.traverse(o=>{const k=/^Kuang([1-6])$/.exec(o.name);
  if(k&&o.parent&&o.parent.name==='Kuang'){const mat=new T.MeshBasicMaterial({map:tex,color:PLc[k[1]-1],transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false});o.children.forEach(c=>{if(c.isMesh)c.material=mat});planes.push(mat)}
  if(/^Kuang[1-6] \(1\)$/.test(o.name))o.visible=false});
 // models start hidden (DX); mode 1 = cylinders, 2 = blocks
 const up=new T.Vector3(0,-1,0),pairs={0:[0,1],1:[1,4],5:[4,5],6:[6,8],8:[8,9],7:[7,10],10:[10,11]};
 function update(){
  M.forEach((m,i)=>{if(!m)return;m.visible=S.mode>0;m.position.copy(wp(i));
   const pr=pairs[i];if(pr)m.quaternion.setFromUnitVectors(up,wp(pr[1]).sub(wp(pr[0])).normalize());
   m.children.forEach(c=>{c.visible=!/_(yuan|fang)$/.test(c.name)||c.name.endsWith(S.mode===2?'_fang':'_yuan')})});
  lines.forEach(l=>l.m.forEach((m,k)=>{const a=wp(l.ix[k]),b=wp(l.ix[k+1]);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,a.distanceTo(b),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}));
  draw()}

 // --- radial movement: bone lengths are kept, the point swings on a sphere around its parent joint ---
 const PAR={0:1,1:4,4:5,8:6,9:8,10:7,11:10},DESC={0:[0],1:[1,0,2,3],4:[4,1,0,2,3],8:[8,9],9:[9],10:[10,11],11:[11]};
 const setW=(i,v)=>{P[i].parent.updateWorldMatrix(true,false);P[i].position.copy(P[i].parent.worldToLocal(v.clone()))};
 function radial(i,target){const W=P.map((_,k)=>wp(k)),set=new Map(),Q=new T.Quaternion();
  if(i===5){const d=target.clone().sub(W[5]);for(let k=0;k<12;k++)set.set(k,W[k].clone().add(d))}
  else if(i===2||i===3||i===6||i===7){const c=i<4?W[1]:W[5],o=i<4?(i===2?3:2):(i===6?7:6);
   Q.setFromUnitVectors(W[i].clone().sub(c).normalize(),target.clone().sub(c).normalize());
   [i,o].sort((x,y)=>x-y).forEach(k=>set.set(k,c.clone().add(W[k].clone().sub(c).applyQuaternion(Q))));
   if(i>=6)[[6,[8,9]],[7,[10,11]]].forEach(([h,ls])=>{const d=set.get(h).clone().sub(W[h]);ls.forEach(k=>set.set(k,W[k].clone().add(d)))})}
  else{const p=PAR[i];if(p==null)return;const c=W[p];Q.setFromUnitVectors(W[i].clone().sub(c).normalize(),target.clone().sub(c).normalize());
   DESC[i].forEach(k=>set.set(k,c.clone().add(W[k].clone().sub(c).applyQuaternion(Q))))}
  set.forEach((v,k)=>setW(k,v))}
 function radialPad(i,x,z){const W=wp(i);if(i===5){radial(5,new T.Vector3(x,W.y,z));return}
  const p=i===2||i===3?1:i===6||i===7?5:PAR[i],c=wp(p),L=W.distanceTo(c);let dx=x-c.x,dz=z-c.z;const h=Math.hypot(dx,dz);if(h>L*.999){dx*=L*.999/h;dz*=L*.999/h}
  const dy=Math.sqrt(Math.max(L*L-dx*dx-dz*dz,0)),sg=(W.y-c.y)<-1e-3?-1:1;radial(i,new T.Vector3(c.x+dx,c.y+sg*dy,c.z+dz))}
 // --- top-view pads (x,z): 400px = 3 units, original DoDrag mapping ---
 const NS='http://www.w3.org/2000/svg',U=400/3,pad=$('pad'),minis=$('minis');
 const pos=i=>{const w=wp(i);return[-w.x*U,-w.z*U]};      // svg coords (y down)
 const dots=[],mdots=[];
 function mk(svg,list,drag){const o={};list.forEach(i=>{const c=document.createElementNS(NS,'circle');c.setAttribute('r',drag&&DR[S.plane].has(i)?14:8);c.dataset.i=i;svg.append(c);o[i]=c});return o}
 function frame(svg){svg.innerHTML='<rect x="-200" y="-200" width="400" height="400" fill="none" stroke="#7a8499" stroke-width="2"/><line x1="-200" x2="200" y1="0" y2="0" stroke="#555"/><line y1="-200" y2="200" x1="0" x2="0" stroke="#555"/><line x1="-200" y1="-200" x2="200" y2="200" stroke="#444"/><line x1="200" y1="-200" x2="-200" y2="200" stroke="#444"/>'}
 function buildPad(){frame(pad);dots.length=0;GR[S.plane].forEach(i=>{const c=document.createElementNS(NS,'circle');const d=S.move===2||DR[S.plane].has(i);c.setAttribute('r',d?14:8);c.setAttribute('fill',d?COL[S.plane]:'#999');c.dataset.i=i;if(d)c.dataset.d=1;pad.append(c);dots[i]=c})}
 const mhits=[];function buildMinis(){minis.innerHTML='';GR.forEach((gr,pi)=>{const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','-250 -250 500 500');frame(s);gr.forEach(i=>{const c=document.createElementNS(NS,'circle');c.setAttribute('r',14);c.setAttribute('fill',COL[pi]);c.style.pointerEvents='none';s.append(c);mdots[i]=c;
   if(S.move===2||DR[pi].has(i)){const h=document.createElementNS(NS,'circle');h.setAttribute('r',40);h.setAttribute('fill','transparent');h.dataset.i=i;h.dataset.d=1;s.append(h);mhits[i]=h}else mhits[i]=null});attach(s);minis.append(s)})}
 function draw(){if(S.op==='op'){for(const i in dots){const[x,y]=pos(+i);dots[i].setAttribute('cx',x);dots[i].setAttribute('cy',y)}}else for(const i in mdots){const[x,y]=pos(+i);mdots[i].setAttribute('cx',x);mdots[i].setAttribute('cy',y);const h=mhits[i];if(h){h.setAttribute('cx',x);h.setAttribute('cy',y)}}}
 function attach(svg){let dp=null;const sp=e=>{const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;return q.matrixTransform(svg.getScreenCTM().inverse())};
  svg.addEventListener('pointerdown',e=>{if(e.target.dataset&&e.target.dataset.d){dp=+e.target.dataset.i;svg.setPointerCapture(e.pointerId)}});
  svg.addEventListener('pointermove',e=>{if(dp==null)return;const q=sp(e),x=Math.max(-200,Math.min(200,q.x)),z=Math.max(-200,Math.min(200,q.y));if(S.move===2)radialPad(dp,-x/U,-z/U);else{P[dp].position.x=-x/U;P[dp].position.z=-z/U}});
  const end=()=>dp=null;svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end)}
 attach(pad);
 // --- twist scrollbars: (v-0.5)*360 deg about vertical (original DoModelRot) ---
 const ch=m=>m?m.children.filter(c=>!c.userData.pt&&c.isObject3D&&!c.name.startsWith('P')):[];
 function twist(k,v){const a=(v-.5)*2*Math.PI;
  ch(M[k]).forEach(c=>c.rotation.y=a);
  if(k===1)P[1].rotation.y=a;if(k===5)P[5].rotation.y=a;
  if(k===6){ch(M[8]).forEach(c=>c.rotation.y=a);if(M[9])M[9].rotation.y=a}
  if(k===7){ch(M[10]).forEach(c=>c.rotation.y=a);if(M[11])M[11].rotation.y=a}}
 function buildSc(){const d=$('sc');d.innerHTML='';SC[S.plane].forEach(k=>{const l=document.createElement('label');l.textContent=SCN[k];const r=document.createElement('input');r.type='range';r.min=0;r.max=1;r.step=.005;r.value=sv[k]??.5;r.oninput=()=>{sv[k]=+r.value;twist(k,+r.value)};l.append(r);d.append(l)})}
 function setPlane(i){S.plane=i;[...$('pbtn').children].forEach((b,k)=>b.classList.toggle('on',k===i));buildPad();buildSc()}
 $('pbtn').innerHTML='';NAMES.forEach((n,i)=>{const b=document.createElement('button');b.textContent=n;b.style.borderColor=COL[i];b.style.borderWidth='3px';b.onclick=()=>setPlane(i);$('pbtn').append(b)});
 buildMinis();setPlane(0);
 // --- buttons ---
 const setMode=k=>{S.mode=k;[0,1,2].forEach(j=>$('m'+j).classList.toggle('on',j===k))};[0,1,2].forEach(k=>$('m'+k).onclick=()=>setMode(k));setMode(0);
 const setOp=o=>{S.op=o;$('op').style.display=o==='op'?'block':'none';$('sh').style.display=o==='op'?'none':'block';$('bop').classList.toggle('on',o==='op');$('bsh').classList.toggle('on',o!=='op')};
 $('bop').onclick=()=>setOp('op');$('bsh').onclick=()=>setOp('sh');setOp('op');
 $('po').oninput=()=>planes.forEach(m=>m.opacity=$('po').value*.6);$('po').value=1;planes.forEach(m=>m.opacity=.6);
 const setMove=k=>{S.move=k;[0,1,2].forEach(j=>$('mv'+j).classList.toggle('on',j===k));buildPad();buildMinis()};[0,1,2].forEach(k=>$('mv'+k).onclick=()=>setMove(k));setMove(0);
 $('rst').onclick=()=>{P.forEach((p,i)=>{p.position.copy(rest[i][0]);p.quaternion.copy(rest[i][1])});
  M.forEach(m=>{if(!m)return;ch(m).forEach(c=>c.rotation.set(0,0,0));if([9,11].includes(M.indexOf(m)))m.rotation.set(0,0,0)});
  for(const k in sv)delete sv[k];buildSc()};
 // optional free 3D drag (extra, not in original)
 const E=r.domElement;let drag=null,pl=new T.Plane(),pt=new T.Vector3(),v2=new T.Vector2();
 const ndc=e=>{const b=E.getBoundingClientRect();v2.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(v2,cam)};
 const down=e=>{if(S.move<1||e.target!==E)return;ndc(e);const h=ray.intersectObjects(hit,false)[0];if(!h)return;drag=h.object.userData.pt;ctl.enabled=false;pl.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new T.Vector3()),wp(drag));E.setPointerCapture(e.pointerId)};
 const move=e=>{if(drag==null)return;ndc(e);if(!ray.ray.intersectPlane(pl,pt))return;if(S.move===2)radial(drag,pt.clone());else{const p=P[drag];p.position.copy(p.parent.worldToLocal(pt.clone()))}};
 const up_=()=>{drag=null;ctl.enabled=true};
 E.addEventListener('pointerdown',down);E.addEventListener('pointermove',move);E.addEventListener('pointerup',up_);
 return{update,dispose(){E.removeEventListener('pointerdown',down);E.removeEventListener('pointermove',move);E.removeEventListener('pointerup',up_)}}}

// --- Loomis & Head ---
const HM=['Loomis Head','Basic Frame','Basic Male Head','Basic Female Head','Volume Understanding','Feature Blocks','Block Light & Shadow'];
function headInit(g){
 const tou=g.getObjectByName('Tou'),G=kids(tou),TB=[4,7,6,6,6,8,0],st=[0,0,0,0,0,0,0,0];let ti=0,zb=false,lit=0,v=0;
 const mt=[];tou.traverse(o=>{if(o.isMesh&&o.material.uniforms)mt.push(o.material)});
 const show=()=>G.forEach((gr,k)=>{if(k===7){gr.visible=zb;kids(gr).forEach((c,j)=>c.visible=j===st[7]);return}gr.visible=k===ti;if(k===ti)kids(gr).forEach((c,j)=>c.visible=j===st[k])});
 function steps(val){v=val;for(let k=0;k<7;k++)st[k]=Math.floor(val*TB[k]);st[7]=val<.8?0:1;show()}
 function mode(k){if(k===0){zb=false;$('hzb').classList.remove('on');$('hs').value=1;steps(1)}ti=k;$('hmode').textContent=HM[k]+' ▾';$('hlist').style.display='none';show()}
 const hl=$('hlist');hl.innerHTML='';HM.forEach((n,k)=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>mode(k);hl.append(b)});hl.style.display='none';
 $('hmode').onclick=()=>hl.style.display=hl.style.display==='none'?'flex':'none';
 $('hs').oninput=()=>steps(+$('hs').value);
 $('hzb').onclick=()=>{zb=!zb;$('hzb').classList.toggle('on',zb);show()};
 $('hma').onclick=()=>{lit=lit?0:1;$('hma').classList.toggle('on',!!lit);mt.forEach(m=>m.uniforms.lit.value=lit)};
 $('hop').oninput=()=>mt.forEach(m=>m.uniforms.op.value=+$('hop').value);
 $('hzb').classList.remove('on');$('hma').classList.remove('on');$('hs').value=0;$('hop').value=1;$('hmode').textContent=HM[0]+' ▾';
 steps(0);const L=new T.Vector3();
 return{update(){L.copy(dl.position).normalize();mt.forEach(m=>m.uniforms.L.value.copy(L))}}}

// --- Block Figure & Pose ---
const WL=[['Empty hand',11],['Greatsword',0],['Tachi',1],['Short blade',2],['Small shield',3],['Lance',4],['Large shield',5],['Longbow',6],['Arrows',7],['Spear',8],['Pistol',9],['Machine gun',10]];
function poseInit(g){
 const R=g.getObjectByName('Renti'),Z=g.getObjectByName('Zuobiao'),Md=g.getObjectByName('Model'),L=g.getObjectByName('lightboll');if(L)L.visible=false;
 const P={};R.traverse(o=>{if(/^(pengu|datui[LR]|xigai[LR]|xiaotui[LR]|jiao[LR]|fu|xiong|bozi|tou|jian[LR]|shangbi[LR]|xiaobi[LR]|shou[LR])$/.test(o.name))P[o.name]=o});
 const rings=Z.children,RC=[0xff4040,0x40ff40,0x4080ff];Z.visible=false;
 rings.forEach((rg,i)=>rg.traverse(o=>{if(o.isMesh)o.material=new T.MeshBasicMaterial({color:RC[i],depthTest:false,transparent:true,opacity:.9})}));
 rings.forEach(rg=>rg.traverse(o=>{if(o.isMesh)o.renderOrder=10}));
 let sel=null,twin=null,zhou=3,last=null,dn=null,hand=null;const wp={shouL:11,shouR:11};
 const mark=(o,on)=>o&&o.children.forEach(m=>{if(m.isMesh&&m.material.emissive)m.material.emissive.setHex(on?0x553300:0)});
 const sv=new T.Vector3(),sq=new T.Quaternion(),ss=new T.Vector3();
 function select(p){mark(sel,false);sel=twin=null;if(!p){Z.visible=false;Md.add(Z);return}
  sel=p;twin=['xiaotuiL','xiaotuiR','xiong'].includes(p.name)?p.parent:null;mark(sel,true);
  p.add(Z);Z.position.set(0,0,0);Z.quaternion.identity();p.updateWorldMatrix(true,false);p.matrixWorld.decompose(sv,sq,ss);Z.scale.set(4/ss.x,4/ss.y,4/ss.z);Z.visible=true;
  const f=/^(xiaotui|xiaobi)[LR]$/.test(p.name)?[1,0,0]:/^jiao[LR]$/.test(p.name)?[1,0,1]:[1,1,1];rings.forEach((rg,i)=>rg.visible=!!f[i])}
 const E=r.domElement,ndc=e=>{const b=E.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),cam)};
 const ax=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)],sg=[1,-1,-1],qd=new T.Quaternion();
 const rot=(o,i,deg)=>{if(o)o.quaternion.multiply(qd.setFromAxisAngle(ax[i],sg[i]*deg*Math.PI/180))};

 // ring picking by screen distance (rings are thin, a finger is not): nearest ring line within 34 px wins
 const RI=rings.map(rg=>{let m;rg.traverse(o=>{if(o.isMesh&&!m)m=o});const pos=m.geometry.attributes.position,bb=new T.Box3().setFromBufferAttribute(pos),sz=bb.getSize(new T.Vector3()),c=bb.getCenter(new T.Vector3()).toArray();
  const n=sz.x<=sz.y&&sz.x<=sz.z?0:sz.y<=sz.z?1:2,a=(n+1)%3,b=(n+2)%3;let lo=1e9,hi=0;for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getComponent(i,a)-c[a],pos.getComponent(i,b)-c[b]);if(r<lo)lo=r;if(r>hi)hi=r}return{m,a,b,c,r:(lo+hi)/2}});
 const sd=(px,py,x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l)):0;return Math.hypot(px-x1-t*dx,py-y1-t*dy)};
 const pv=new T.Vector3();
 function pickRing(e){const rc=E.getBoundingClientRect(),px=e.clientX-rc.left,py=e.clientY-rc.top;let best=-1,bd=34;
  rings.forEach((rg,k)=>{if(!rg.visible||!Z.visible)return;const{m,a,b,c,r}=RI[k];m.updateWorldMatrix(true,false);let pr=null;
   for(let s=0;s<=48;s++){const t=s/48*Math.PI*2,p=[c[0],c[1],c[2]];p[a]+=Math.cos(t)*r;p[b]+=Math.sin(t)*r;pv.set(p[0],p[1],p[2]).applyMatrix4(m.matrixWorld).project(cam);
    const x=(pv.x+1)/2*rc.width,y=(1-pv.y)/2*rc.height;if(pr){const d=sd(px,py,pr[0],pr[1],x,y);if(d<bd){bd=d;best=k}}pr=[x,y]}});return best}
 const hi=(k,on)=>rings[k].traverse(o=>{if(o.isMesh)o.material.color.setHex(on?0xffffff:RC[k])});
 const down=e=>{if(e.target!==E)return;dn=[e.clientX,e.clientY];last=[e.clientX,e.clientY];zhou=3;
  if(sel){const k=pickRing(e);if(k>=0){zhou=k;ctl.enabled=false;E.setPointerCapture(e.pointerId);hi(k,true)}}};
 const move=e=>{if(zhou>2)return;const d=-((e.clientX-last[0])+(e.clientY-last[1]))*1.0;last=[e.clientX,e.clientY];rot(sel,zhou,d);rot(twin,zhou,d)};
 const up=e=>{if(e.target!==E&&zhou>2)return;const was=zhou;if(was<3)hi(was,false);zhou=3;ctl.enabled=true;if(was<3||!dn)return;
  if(Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>6)return;ndc(e);const h=ray.intersectObject(R,true).find(x=>x.object.isMesh&&x.object.visible);
  let o=h&&h.object.parent;while(o&&!P[o.name])o=o.parent;select(o||null)};
 E.addEventListener('pointerdown',down);E.addEventListener('pointermove',move);E.addEventListener('pointerup',up);
 // resets
 $('bjb').onclick=()=>{if(sel)sel.quaternion.identity();if(twin)twin.quaternion.identity()};
 $('bqj').onclick=()=>{select(null);R.traverse(o=>{if(o!==R)o.quaternion.identity()})};
 // weapons
 const wl=$('bwl');wl.innerHTML='';WL.forEach(([n,a])=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>{setW(hand,a);wl.style.display='none'};wl.append(b)});wl.style.display='none';
 const setW=(nm,a)=>{const s=P[nm];if(!s)return;const c=wp[nm];if(c!==11&&kids(s)[c])kids(s)[c].visible=false;if(a!==11&&kids(s)[a])kids(s)[a].visible=true;wp[nm]=a};
 $('bls').onclick=()=>{hand='shouL';wl.style.display=wl.style.display==='grid'&&hand==='shouL'?'none':'grid'};
 $('brs').onclick=()=>{hand='shouR';wl.style.display='grid'};
 // saved poses (12 slots, localStorage)
 let del=false;const key=i=>'bp_slot_'+i;
 const snap=()=>({q:Object.fromEntries(Object.entries(P).map(([k,o])=>[k,o.quaternion.toArray()])),w:{...wp}});
 const apply=s=>{for(const k in s.q)P[k].quaternion.fromArray(s.q[k]);for(const k in s.w){const c=wp[k];if(c!==11&&kids(P[k])[c])kids(P[k])[c].visible=false;wp[k]=11;setW(k,s.w[k])}};
 const thumb=()=>{const c=document.createElement('canvas');c.width=c.height=96;const s=Math.min(E.width,E.height);c.getContext('2d').drawImage(E,(E.width-s)/2,(E.height-s)/2,s,s,0,0,96,96);return c.toDataURL('image/jpeg',.6)};
 const ld=i=>{try{return JSON.parse(localStorage.getItem(key(i)))}catch(e){return null}};
 function slots(){const d=$('bslots');d.innerHTML='';for(let i=0;i<12;i++){const b=document.createElement('button'),s=ld(i);b.textContent=s?'':'Click to save';if(s)b.style.backgroundImage='url('+s.t+')';
  b.onclick=()=>{const cur=ld(i);try{if(del){localStorage.removeItem(key(i))}else if(cur){apply(cur.p)}else{select(null);localStorage.setItem(key(i),JSON.stringify({p:snap(),t:thumb()}))}}catch(e){}slots()};d.append(b)}}
 $('bsv').onclick=()=>{select(null);const d=$('bsl');d.style.display=d.style.display==='none'?'block':'none';slots()};
 $('bdel').onclick=()=>{del=!del;$('bdel').classList.toggle('on',del)};del=false;$('bdel').classList.remove('on');$('bsl').style.display='none';
 return{dispose(){E.removeEventListener('pointerdown',down);E.removeEventListener('pointermove',move);E.removeEventListener('pointerup',up);ctl.enabled=true}}}

// POV (field of view) with dolly compensation so the subject keeps its size
function setPov(f){if(!persp||!cam||!ctl||!(f>0))return;f=Math.max(15,Math.min(170,Math.round(f)));$('pov').value=$('povn').value=f;const dir=cam.position.clone().sub(ctl.target),d=dir.length()*Math.tan(prevFov*Math.PI/360)/Math.tan(f*Math.PI/360);
 cam.fov=f;cam.position.copy(ctl.target).add(dir.normalize().multiplyScalar(d));cam.updateProjectionMatrix();ctl.update();prevFov=f}
$('pov').oninput=()=>setPov(+$('pov').value);
$('povn').onchange=()=>setPov(parseFloat($('povn').value)||prevFov);
$('povn').onkeydown=e=>{if(e.key==='Enter'){setPov(parseFloat($('povn').value)||prevFov);e.target.blur()}};

document.addEventListener('contextmenu',e=>{if(e.target.tagName!=='INPUT')e.preventDefault()});
document.addEventListener('selectstart',e=>{if(e.target.tagName!=='INPUT')e.preventDefault()});
