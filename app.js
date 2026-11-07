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
 const S={shape:'yuan',pts:true,lns:true,mdl:true},wp=i=>P[i].getWorldPosition(new T.Vector3());
 const hit=[];P.forEach((p,i)=>{const h=new T.Mesh(new T.SphereGeometry(.22/3*(i>=2&&i<=3||i>=6&&i<=7?3:1)),new T.MeshBasicMaterial({visible:false}));h.userData.pt=i;p.add(h);hit.push(h);
  p.traverse(o=>{if(o.isMesh&&o!==h)o.material=new T.MeshBasicMaterial({color:0xff5050})})});
 const lines=[[0,1,4,5],[3,1,2],[9,8,6,5,7,10,11]].map(ix=>({ix,m:ix.slice(1).map(()=>new T.Mesh(new T.CylinderGeometry(.03,.03,1,6),new T.MeshBasicMaterial({color:0x66ccff})))}));
 lines.forEach(l=>l.m.forEach(m=>g.add(m)));
 const up=new T.Vector3(0,-1,0),pairs={0:[0,1],1:[1,4],5:[4,5],6:[6,8],8:[8,9],7:[7,10],10:[10,11]};
 const mats=new T.MeshStandardMaterial({color:0xd8d2c6,roughness:.7,transparent:true,opacity:.85,side:T.DoubleSide});
 M.forEach(m=>m&&m.traverse(o=>{if(o.isMesh)o.material=mats}));
 const PL=[['Head',0xff6b59],['Chest',0xffc759],['Abdomen',0x8ce84a],['Hip',0x40e8e0],['Knee',0x648cf7],['Foot',0xc787f7]],planes=[];
 const tex=new T.TextureLoader().load('kuang.png');tex.colorSpace=T.SRGBColorSpace;
 g.traverse(o=>{const k=/^Kuang([1-6])$/.exec(o.name);
  if(k&&o.parent&&o.parent.name==='Kuang'){const i=k[1]-1,mat=new T.MeshBasicMaterial({map:tex,color:PL[i][1],transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false});
   o.children.forEach(c=>{if(c.isMesh)c.material=mat});planes[i]={node:o,mat}}
  if(/^Kuang[1-6] \(1\)$/.test(o.name))o.visible=false});
 const plb=$('pl');plb.innerHTML='';PL.forEach(([n,c],i)=>{const b=document.createElement('button');b.textContent=n;b.className='on';b.style.borderColor='#'+c.toString(16).padStart(6,'0');b.onclick=()=>{const p=planes[i];if(!p)return;p.node.visible=!p.node.visible;b.classList.toggle('on',p.node.visible)};plb.append(b)});
 $('po').oninput=()=>planes.forEach(p=>p&&(p.mat.opacity=+$('po').value));$('po').value=.6;

 function update(){
  M.forEach((m,i)=>{if(!m)return;m.visible=S.mdl;const pi=P[i]?i:null;m.position.copy(wp(i));
   const pr=pairs[i];if(pr){const d=wp(pr[1]).sub(wp(pr[0])).normalize();m.quaternion.setFromUnitVectors(up,d)}
   m.children.forEach(c=>{c.visible=c.name.endsWith(S.shape==='yuan'?'_yuan':'_fang')||!/_(yuan|fang)$/.test(c.name)})});
  P.forEach(p=>p.traverse(o=>{if(o.isMesh&&!o.userData.pt)o.visible=S.pts}));
  lines.forEach(l=>l.m.forEach((m,k)=>{m.visible=S.lns;const a=wp(l.ix[k]),b=wp(l.ix[k+1]);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,a.distanceTo(b),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}))}
 let drag=null,pl=new T.Plane(),pt=new T.Vector3(),v2=new T.Vector2();
 const ndc=e=>{const b=r.domElement.getBoundingClientRect();v2.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(v2,cam)};
 const down=e=>{if(!stick||e.target!==r.domElement)return;ndc(e);const h=ray.intersectObjects(hit,false)[0];if(!h)return;drag=h.object.userData.pt;ctl.enabled=false;
  pl.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new T.Vector3()),wp(drag));r.domElement.setPointerCapture(e.pointerId)};
 const move=e=>{if(drag==null)return;ndc(e);if(!ray.ray.intersectPlane(pl,pt))return;const p=P[drag];
  if(drag===2||drag===3||drag===6||drag===7){const par=p.parent,c=par.getWorldPosition(new T.Vector3()),d=pt.clone().sub(c);if(d.lengthSq()<1e-4)return;
   const q=new T.Quaternion().setFromUnitVectors(rest[drag][0].clone().normalize(),d.normalize());
   const pq=par.parent.getWorldQuaternion(new T.Quaternion());par.quaternion.copy(pq.invert().multiply(q))}
  else p.position.copy(p.parent.worldToLocal(pt.clone()))};
 const up_=()=>{drag=null;ctl.enabled=true};
 const E=r.domElement;E.addEventListener('pointerdown',down);E.addEventListener('pointermove',move);E.addEventListener('pointerup',up_);
 const tg=(id,k)=>$(id).onclick=()=>{S[k]=!S[k];$(id).classList.toggle('on',S[k])};tg('pts','pts');tg('lns','lns');tg('mdl','mdl');
 $('shape').onclick=()=>{S.shape=S.shape==='yuan'?'fang':'yuan';$('shape').textContent=S.shape==='yuan'?'Cylinder':'Block'};
 $('rst').onclick=()=>P.forEach((p,i)=>{p.position.copy(rest[i][0]);p.quaternion.copy(rest[i][1])});
 $('shape').textContent='Cylinder';
 return{update,dispose(){E.removeEventListener('pointerdown',down);E.removeEventListener('pointermove',move);E.removeEventListener('pointerup',up_)}}}
