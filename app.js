import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const MODES=[
 {lv:2,t:'Stick Figure & Space',cn:'火柴人与空间',ready:true},
 {lv:1,t:'Major Forms & Proportions',cn:'大体块与比例',ready:true},
 {lv:3,t:'Loomis & Head',cn:'卢米斯与脑瓜',ready:false},
 {lv:5,t:'Block Figure & Pose',cn:'方块人与动态',ready:false},
 {lv:4,t:'Muscles & Skeleton',cn:'肌肉群与骨骼',ready:true,stub:true},
 {lv:6,t:'Light, Shadow & Material',cn:'光与影与材质',ready:true,stub:true}];
const $=id=>document.getElementById(id);
const [scenes,meshes]=await Promise.all([fetch('scenes.json').then(r=>r.json()),fetch('meshes.json').then(r=>r.json())]);
const menu=$('menu');menu.innerHTML='<h1>Body Practice</h1>';
for(const m of MODES){const d=document.createElement('div');d.className='card';d.innerHTML=m.t+(m.ready?'':'<small>coming soon</small>');if(m.ready)d.onclick=()=>open(m);else d.style.opacity=.45;menu.append(d)}
const r=new T.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));$('view').append(r.domElement);
let stick=null,sc,cam,ctl,dl,persp=true,cur,geoms={},grp,sel=null,ray=new T.Raycaster(),blocks=false;
function geom(id){if(geoms[id])return geoms[id];if(id==='10210')return geoms[id]=new T.PlaneGeometry(1,1);const m=meshes[id];if(!m)return null;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.v,3));g.setIndex(m.i);g.computeVertexNormals();return geoms[id]=g}
function build(lv){const nodes=scenes[lv],by={};const root=new T.Group();
 for(const n of nodes){const o=new T.Object3D();o.name=n.name;o.visible=n.on;o.position.set(-n.p[0],n.p[1],n.p[2]);o.quaternion.set(n.q[0],-n.q[1],-n.q[2],n.q[3]);o.scale.set(...n.s);by[n.id]=o;o.userData=n;
  const g=n.mesh&&geom(n.mesh);if(g){const c=n.col||[.8,.8,.8,1];o.add(new T.Mesh(g,new T.MeshStandardMaterial({color:new T.Color(c[0],c[1],c[2]),roughness:.8,side:T.DoubleSide})))}}
 for(const n of nodes){const o=by[n.id];(by[n.par]||root).add(o)}
 return root}
function open(m){if(stick)stick.dispose();cur=m;$('menu').style.display='none';$('view').style.display='block';$('bar').style.display='flex';$('title').textContent=m.t;
 sc=new T.Scene();sc.background=new T.Color(0x3a3f47);
 if(m.stub){const c=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({color:0xcccccc}));sc.add(c);$('note').textContent='This mode is an unfinished placeholder in the original app.';$('note').style.display='block'}
 else{const g=build(m.lv);grp=g;sc.add(g);sel=null;blocks=false;showBlocks();$('note').style.display='none'}
 $('pp').style.display=m.lv===1?'flex':'none';$('sp').style.display=m.lv===2?'flex':'none';stick=m.lv===2&&!m.stub?stickInit(grp):null;syncSliders();
 sc.add(new T.AmbientLight(0xffffff,.55));dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(3,5,6);sc.add(dl);
 persp=true;mkcam();resize()}
function mkcam(){const a=innerWidth/innerHeight;cam=persp?new T.PerspectiveCamera(60,a,.1,100):new T.OrthographicCamera(-5*a,5*a,5,-5,.1,100);cam.position.set(0,0,10);
 if(ctl)ctl.dispose();ctl=new OrbitControls(cam,r.domElement);ctl.enableDamping=true;ctl.target.set(0,0,0);ctl.update();$('persp').classList.toggle('on',persp)}
function resize(){r.setSize(innerWidth,innerHeight);if(cam){const a=innerWidth/innerHeight;if(persp)cam.aspect=a;else{cam.left=-5*a;cam.right=5*a}cam.updateProjectionMatrix()}}
addEventListener('resize',resize);
$('back').onclick=()=>{$('pp').style.display='none';$('sp').style.display='none';if(stick)stick.dispose();stick=null;if(ctl)ctl.enabled=true;$('menu').style.display='grid';$('view').style.display='none';$('bar').style.display='none';$('note').style.display='none';cur=null};
$('persp').onclick=()=>{persp=!persp;mkcam();resize()};
$('light').onclick=()=>{dl.position.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4)};
$('reset').onclick=()=>{mkcam()};
r.setAnimationLoop(()=>{if(cur){if(stick)stick.update();ctl.update();r.render(sc,cam)}});

// --- Major Forms & Proportions controls ---
const find=n=>{let f;grp&&grp.traverse(o=>{if(!f&&o.name===n)f=o});return f};
function showBlocks(){const a=find('Renti'),b=find('Tikuai');if(a)a.visible=!blocks;if(b)b.visible=blocks;$('blocks').classList.toggle('on',blocks)}
function mark(o,on){o&&o.traverse(m=>{if(m.isMesh&&m.parent===o)m.material.emissive.setHex(on?0x553300:0)})}
function syncSliders(){if(sel){$('sw').value=sel.scale.x/2;$('sh').value=sel.scale.y/2}else{$('sw').value=.5;$('sh').value=.5}}
function pick(e){if(!grp||!cur||cur.lv!==1||e.target!==r.domElement)return;const b=r.domElement.getBoundingClientRect();
 ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),cam);
 const hit=ray.intersectObjects(grp.children.filter(c=>c.visible),true).find(h=>h.object.isMesh);
 mark(sel,false);sel=hit?hit.object.parent:null;mark(sel,true);syncSliders()}
let dn=null;r.domElement.addEventListener('pointerdown',e=>dn=[e.clientX,e.clientY]);
r.domElement.addEventListener('pointerup',e=>{if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])<6)pick(e);dn=null});
const setS=()=>{if(sel){sel.scale.x=2*$('sw').value;sel.scale.y=2*$('sh').value}};
$('sw').oninput=setS;$('sh').oninput=setS;
$('blocks').onclick=()=>{mark(sel,false);sel=null;blocks=!blocks;showBlocks();syncSliders()};
$('zero').onclick=()=>{grp.traverse(o=>{if(o.userData.s&&o.userData.mesh){o.scale.set(...o.userData.s)}});syncSliders()};
$('rand').onclick=()=>{grp.traverse(o=>{if(o.userData.mesh&&o.parent&&o.visible){o.scale.x=.6+Math.random()*1.0;o.scale.y=.6+Math.random()*1.0}});syncSliders()};

// --- Stick Figure & Space ---
function stickInit(g){
 const P=[],M=[];g.traverse(o=>{let m;if(m=/^P(\d+)$/.exec(o.name))P[+m[1]]=o;if(m=/^(\d\d)[A-Z]/.exec(o.name))M[+m[1]]=o});
 const rest=P.map(p=>[p.position.clone(),p.quaternion.clone()]);
 const S={mode:0,free:false,plane:0,op:'op'},wp=i=>P[i].getWorldPosition(new T.Vector3());
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
 // --- top-view pads (x,z): 400px = 3 units, original DoDrag mapping ---
 const NS='http://www.w3.org/2000/svg',U=400/3,pad=$('pad'),minis=$('minis');
 const pos=i=>{const w=wp(i);return[-w.x*U,-w.z*U]};      // svg coords (y down)
 const dots=[],mdots=[];
 function mk(svg,list,drag){const o={};list.forEach(i=>{const c=document.createElementNS(NS,'circle');c.setAttribute('r',drag&&DR[S.plane].has(i)?14:8);c.dataset.i=i;svg.append(c);o[i]=c});return o}
 function frame(svg){svg.innerHTML='<line x1="-200" x2="200" y1="0" y2="0" stroke="#555"/><line y1="-200" y2="200" x1="0" x2="0" stroke="#555"/><line x1="-200" y1="-200" x2="200" y2="200" stroke="#444"/><line x1="200" y1="-200" x2="-200" y2="200" stroke="#444"/>'}
 function buildPad(){frame(pad);dots.length=0;GR[S.plane].forEach(i=>{const c=document.createElementNS(NS,'circle');const d=DR[S.plane].has(i);c.setAttribute('r',d?14:8);c.setAttribute('fill',d?COL[S.plane]:'#999');c.dataset.i=i;if(d)c.dataset.d=1;pad.append(c);dots[i]=c})}
 function buildMinis(){minis.innerHTML='';GR.forEach((gr,pi)=>{const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','-200 -200 400 400');frame(s);gr.forEach(i=>{const c=document.createElementNS(NS,'circle');c.setAttribute('r',12);c.setAttribute('fill',COL[pi]);s.append(c);mdots[i]=c});minis.append(s)})}
 function draw(){if(S.op==='op'){for(const i in dots){const[x,y]=pos(+i);dots[i].setAttribute('cx',x);dots[i].setAttribute('cy',y)}}else for(const i in mdots){const[x,y]=pos(+i);mdots[i].setAttribute('cx',x);mdots[i].setAttribute('cy',y)}}
 let dp=null;const sp=e=>{const q=pad.createSVGPoint();q.x=e.clientX;q.y=e.clientY;return q.matrixTransform(pad.getScreenCTM().inverse())};
 pad.addEventListener('pointerdown',e=>{if(e.target.dataset.d){dp=+e.target.dataset.i;pad.setPointerCapture(e.pointerId)}});
 pad.addEventListener('pointermove',e=>{if(dp==null)return;const q=sp(e),x=Math.max(-200,Math.min(200,q.x)),z=Math.max(-200,Math.min(200,q.y));P[dp].position.x=-x/U;P[dp].position.z=-z/U});
 pad.addEventListener('pointerup',()=>dp=null);
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
 $('free').classList.remove('on');$('free').onclick=()=>{S.free=!S.free;$('free').classList.toggle('on',S.free)};
 $('rst').onclick=()=>{P.forEach((p,i)=>{p.position.copy(rest[i][0]);p.quaternion.copy(rest[i][1])});
  M.forEach(m=>{if(!m)return;ch(m).forEach(c=>c.rotation.set(0,0,0));if([9,11].includes(M.indexOf(m)))m.rotation.set(0,0,0)});
  for(const k in sv)delete sv[k];buildSc()};
 // optional free 3D drag (extra, not in original)
 const E=r.domElement;let drag=null,pl=new T.Plane(),pt=new T.Vector3(),v2=new T.Vector2();
 const ndc=e=>{const b=E.getBoundingClientRect();v2.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(v2,cam)};
 const down=e=>{if(!S.free||e.target!==E)return;ndc(e);const h=ray.intersectObjects(hit,false)[0];if(!h)return;drag=h.object.userData.pt;ctl.enabled=false;pl.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new T.Vector3()),wp(drag));E.setPointerCapture(e.pointerId)};
 const move=e=>{if(drag==null)return;ndc(e);if(!ray.ray.intersectPlane(pl,pt))return;const p=P[drag];p.position.copy(p.parent.worldToLocal(pt.clone()))};
 const up_=()=>{drag=null;ctl.enabled=true};
 E.addEventListener('pointerdown',down);E.addEventListener('pointermove',move);E.addEventListener('pointerup',up_);
 return{update,dispose(){E.removeEventListener('pointerdown',down);E.removeEventListener('pointermove',move);E.removeEventListener('pointerup',up_)}}}
