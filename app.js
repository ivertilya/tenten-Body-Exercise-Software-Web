import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const MODES=[
 {lv:2,t:'Stick Figure & Space',cn:'火柴人与空间',ready:false},
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
let sc,cam,ctl,dl,persp=true,cur,geoms={},grp,sel=null,ray=new T.Raycaster(),blocks=false;
function geom(id){if(geoms[id])return geoms[id];const m=meshes[id];if(!m)return null;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.v,3));g.setIndex(m.i);g.computeVertexNormals();return geoms[id]=g}
function build(lv){const nodes=scenes[lv],by={};const root=new T.Group();
 for(const n of nodes){const o=new T.Object3D();o.name=n.name;o.visible=n.on;o.position.set(-n.p[0],n.p[1],n.p[2]);o.quaternion.set(n.q[0],-n.q[1],-n.q[2],n.q[3]);o.scale.set(...n.s);by[n.id]=o;o.userData=n;
  const g=n.mesh&&geom(n.mesh);if(g){const c=n.col||[.8,.8,.8,1];o.add(new T.Mesh(g,new T.MeshStandardMaterial({color:new T.Color(c[0],c[1],c[2]),roughness:.8,side:T.DoubleSide})))}}
 for(const n of nodes){const o=by[n.id];(by[n.par]||root).add(o)}
 return root}
function open(m){cur=m;$('menu').style.display='none';$('view').style.display='block';$('bar').style.display='flex';$('title').textContent=m.t;
 sc=new T.Scene();sc.background=new T.Color(0x3a3f47);
 if(m.stub){const c=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({color:0xcccccc}));sc.add(c);$('note').textContent='This mode is an unfinished placeholder in the original app.';$('note').style.display='block'}
 else{const g=build(m.lv);grp=g;sc.add(g);sel=null;blocks=false;showBlocks();$('note').style.display='none'}
 $('pp').style.display=m.lv===1?'flex':'none';syncSliders();
 sc.add(new T.AmbientLight(0xffffff,.55));dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(3,5,6);sc.add(dl);
 persp=true;mkcam();resize()}
function mkcam(){const a=innerWidth/innerHeight;cam=persp?new T.PerspectiveCamera(60,a,.1,100):new T.OrthographicCamera(-5*a,5*a,5,-5,.1,100);cam.position.set(0,0,10);
 if(ctl)ctl.dispose();ctl=new OrbitControls(cam,r.domElement);ctl.enableDamping=true;ctl.target.set(0,0,0);ctl.update();$('persp').classList.toggle('on',persp)}
function resize(){r.setSize(innerWidth,innerHeight);if(cam){const a=innerWidth/innerHeight;if(persp)cam.aspect=a;else{cam.left=-5*a;cam.right=5*a}cam.updateProjectionMatrix()}}
addEventListener('resize',resize);
$('back').onclick=()=>{$('pp').style.display='none';$('menu').style.display='grid';$('view').style.display='none';$('bar').style.display='none';$('note').style.display='none';cur=null};
$('persp').onclick=()=>{persp=!persp;mkcam();resize()};
$('light').onclick=()=>{dl.position.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4)};
$('reset').onclick=()=>{mkcam()};
r.setAnimationLoop(()=>{if(cur){ctl.update();r.render(sc,cam)}});

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
