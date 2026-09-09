import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export type ViewState={mode:'overview'|'walk';room:string;x:number;z:number;yaw:number;night:boolean};
export type ApartmentController={goTo:(room:string)=>void;overview:()=>void;toggleNight:()=>void;reset:()=>void;hold:(key:string,value:boolean)=>void;lockPointer:()=>void;dispose:()=>void};
export type Obstacle={minX:number;maxX:number;minZ:number;maxZ:number};
export const spots:Record<string,{x:number;z:number;yaw:number}>={living:{x:-1.1,z:5.15,yaw:.22},bedroom:{x:1.5,z:2.1,yaw:Math.PI},closet:{x:1.5,z:-.75,yaw:-Math.PI/2},entry:{x:-1.55,z:-4.7,yaw:Math.PI},wash:{x:.15,z:-4.15,yaw:.4},bath:{x:1.65,z:-4,yaw:-.35},toilet:{x:1.6,z:-2.55,yaw:-Math.PI/2},balcony:{x:-.6,z:6.7,yaw:Math.PI}};
export function collides(x:number,z:number,obstacles:Obstacle[],radius=.18){
 if(x < -2.9+radius || x > 2.9-radius || z < -5.9+radius || z > 7.32-radius)return true;
 return obstacles.some(b=>{const dx=x-Math.max(b.minX,Math.min(x,b.maxX)),dz=z-Math.max(b.minZ,Math.min(z,b.maxZ));return dx*dx+dz*dz<radius*radius});
}
export function roomAt(x:number,z:number){if(z>6)return 'balcony';if(z<-3.6){if(x>1)return 'bath';if(x>-.8)return 'wash';return 'entry'}if(z<-1.8){if(x>1)return 'toilet';return 'entry'}if(x>.85)return z<.2?'closet':'bedroom';return 'living'}
export function createApartment(host:HTMLDivElement,onChange:(s:ViewState)=>void):ApartmentController{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece7');
 const camera=new THREE.PerspectiveCamera(48,1,.05,180);camera.rotation.order='YXZ';
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D空間。ドラッグで見回し、WASDまたは矢印キーで歩きます。');host.appendChild(renderer.domElement);
 const root=new THREE.Group();scene.add(root);const obstacles:Obstacle[]=[];const textures:THREE.Texture[]=[];
 const state:ViewState={mode:'overview',room:'living',...spots.living,night:false};
 const walls=new THREE.Group();root.add(walls);const outer=new THREE.Group();root.add(outer);const ceiling=new THREE.Group();root.add(ceiling);ceiling.visible=false;
 const mat=(color:string,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const white=mat('#f0eee5'),plaster=mat('#dddcd2'),trim=mat('#eeeee4'),wood=mat('#bca17b'),oak=mat('#c8ac80'),dark=mat('#383d37'),fabric=mat('#e0dacc'),metal=mat('#919892',.24,.7),tile=mat('#b8bcb8');
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material=white,solid=false,parent:THREE.Group=root){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  if(solid&&y-h/2<1.75&&y+h/2>.08)obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return mesh;
 }
 function wall(x:number,z:number,w:number,d:number,external=false){box(x,1.3,z,w,2.6,d,plaster,true,external?outer:walls);box(x,.055,z,w+.013,.11,d+.013,trim,false,external?outer:walls)}
 function wallX(x1:number,x2:number,z:number){wall((x1+x2)/2,z,x2-x1,.12)}
 function wallZ(x:number,z1:number,z2:number){wall(x,(z1+z2)/2,.12,z2-z1)}
 function floor(x:number,z:number,w:number,d:number,m:THREE.Material){box(x,-.065,z,w,.13,d,m)}
 // Deterministic oak planks: no remote asset dependencies.
 const texCanvas=document.createElement('canvas');texCanvas.width=512;texCanvas.height=1024;const ctx=texCanvas.getContext('2d')!;
 let seed=27;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 ctx.fillStyle='#c6af88';ctx.fillRect(0,0,512,1024);
 for(let col=0;col<8;col++){for(let row=-1;row<5;row++){const start=row*256+(col%3)*83;const v=Math.floor(random()*16);ctx.fillStyle=`rgb(${193+v},${164+v},${118+v})`;ctx.fillRect(col*64,start,63,255);for(let n=0;n<32;n++){ctx.strokeStyle=`rgba(94,64,27,${random()*.085})`;ctx.beginPath();const xx=col*64+random()*63;ctx.moveTo(xx,start);ctx.bezierCurveTo(xx+random()*6,start+70,xx-3,start+190,xx+random()*4,start+256);ctx.stroke()}}}
 const floorTex=new THREE.CanvasTexture(texCanvas);floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(3,3);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(floorTex);
 const floorMat=new THREE.MeshStandardMaterial({map:floorTex,roughness:.72,color:'#ede1c9'});
 floor(0,0,6,12,floorMat);floor(0,6.7,6,1.4,tile);floor(-1.9,-5.3,2.2,1.4,tile);floor(.1,-4.8,1.8,2.4,tile);floor(2,-4.8,2,2.4,tile);
 box(0,-.21,.7,6.25,.24,13.65,mat('#bfc4b9'));box(0,-.4,.7,6.45,.12,13.85,mat('#d6dbd1'));
 wall(-3,0,.16,12,true);wall(3,0,.16,12,true);wall(0,-6,6,.16,true);
 wallX(-3,-.2,-1.8);wallX(.72,3,-1.8);box(.26,2.4,-1.8,.92,.4,.12,plaster,false,walls);
 wallZ(.85,-1.8,-1.38);wallZ(.85,-.38,.2);wallZ(.85,.2,.82);wallZ(.85,1.82,6);box(.85,2.4,1.32,.12,.4,1,plaster,false,walls);box(.85,2.4,-.88,.12,.4,1,plaster,false,walls);wallX(.85,3,.2);
 wallZ(-.8,-6,-3.6);wallX(-.8,-.55,-3.6);wallX(.4,3,-3.6);box(-.075,2.4,-3.6,.95,.4,.12,plaster,false,walls);
 wallZ(1,-6,-4.6);box(1,2.4,-4.1,.12,.4,1,plaster,false,walls);wallZ(1,-3.6,-3.1);wallZ(1,-2.05,-1.8);box(1,2.4,-2.57,.12,.4,1.05,plaster,false,walls);
 // Open balcony doorways with frames and glass panels at their sides.
 const glass=new THREE.MeshStandardMaterial({color:'#bed4cf',transparent:true,opacity:.2,roughness:.18,metalness:.12,depthWrite:false,side:THREE.DoubleSide});
 wallX(-3,-2.55,6);wallX(.15,1.05,6);wallX(2.65,3,6);
 for(const [a,b]of [[-2.55,.15],[1.05,2.65]]){box((a+b)/2,2.5,6,b-a,.15,.14,trim);box(a,1.25,6,.06,2.5,.1,metal);box(b,1.25,6,.06,2.5,.1,metal);box(a+.38,1.22,6,.76,2.36,.025,glass,true);box(a+.76,1.22,6,.04,2.4,.07,metal);box((a+b)/2,.02,6,b-a,.03,.17,metal)}
 box(0,.5,7.4,6,1,.08,glass,true);box(0,1.03,7.4,6.15,.065,.07,metal);box(-3,.55,6.7,.12,1.1,1.4,plaster,true);box(3,.55,6.7,.12,1.1,1.4,plaster,true);
 for(let x=-3;x<=3;x+=1.5)box(x,.5,7.4,.04,1,.07,metal);
 box(0,2.66,0,6,.1,12,white,false,ceiling);
 // Main furnishings establish the reference layout.
 box(-.02,.22,3.35,.94,.32,2.35,wood,true);box(-.02,.45,3.35,.95,.25,2.3,fabric);box(.35,.78,3.35,.23,.55,2.4,fabric);box(-.05,.69,2.15,.92,.46,.2,fabric);box(-.05,.69,4.55,.92,.46,.2,fabric);
 box(-1.35,.35,3.35,.62,.12,1.5,oak,true);for(const z of [2.75,3.95])for(const x of [-1.56,-1.13])box(x,.17,z,.06,.34,.06,wood);
 box(-2.7,.24,3.3,.42,.48,2.7,oak,true);box(-2.88,1.22,3.25,.06,.94,1.7,dark);
 box(-1.98,.45,.15,1.85,.9,.72,white,true);box(-1.98,.94,.15,1.96,.08,.81,mat('#deddd5'));
 box(-.4,.76,.65,.94,.09,1.3,oak,true);for(const x of [-.77,-.04])for(const z of [.15,1.15])box(x,.36,z,.055,.72,.055,wood);
 box(2.15,.24,4.35,1.32,.35,2.65,wood,true);box(2.15,.49,4.35,1.27,.24,2.58,fabric);box(2.15,.72,5.7,1.4,1,.1,wood);
 box(2.62,.38,1.92,.56,.75,1.4,oak,true);box(2.65,.77,-.77,.52,1.5,1.7,wood,true);
 box(-2.58,.48,-1.05,.65,.96,1.05,white,true);box(-2.6,1.05,-3.25,.57,2.1,1.4,white,true);
 box(.1,.43,-5.58,.68,.86,.68,white,true);box(-.45,.44,-4.93,.58,.88,.55,white,true);
 box(2.03,.3,-5.28,1.66,.6,1.05,white,true);box(2.48,.26,-2.6,.67,.52,.77,white,true);
 const hemi=new THREE.HemisphereLight('#f5f8f2','#b7bba4',2.25);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff5df',3.3);sun.position.set(-3,9,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;scene.add(sun);
 const ambientLights:THREE.PointLight[]=[];for(const [x,z]of [[-1,2],[2,3],[-1.5,-3],[.1,-4.5],[2,-4.5],[2,-2.5],[2,-.8]]){const light=new THREE.PointLight('#ffdfaa',2.5,7,1.4);light.position.set(x,2.35,z);scene.add(light);ambientLights.push(light)}
 // Enrichment hook.
 const decor = {box,mat,root,white,wood,oak,dark,fabric,metal,tile,glass,textures};
 addDetails(decor);
 let azimuth=.43,elevation=.86,distance=18.7;const pressed=new Set<string>();const pointers=new Map<number,{x:number;y:number}>();
 let lastPinch=0,disposed=false,frame=0,last=performance.now(),lastNotify=0;
 const canvas=renderer.domElement;
 function notify(){onChange({...state})}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 function configure(){outer.scale.y=state.mode==='overview'?.4:1;ceiling.visible=state.mode==='walk';scene.background=new THREE.Color(state.mode==='overview'?(state.night?'#26352e':'#e8ece7'):(state.night?'#18272e':'#d9e8e8'))}
 function clear(){pressed.clear();pointers.clear();lastPinch=0}
 function goTo(id:string){canvas.focus({preventScroll:true});const target=spots[id];if(!target)throw new Error('不明な部屋です');clear();state.mode='walk';state.room=id;Object.assign(state,target);pitch=0;camera.position.set(state.x,1.6,state.z);configure();notify()}
 function overview(){clear();if(document.pointerLockElement===canvas)document.exitPointerLock();state.mode='overview';configure();notify()}
 let pitch=0;
 const keyMap:Record<string,string>={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'fast',ShiftRight:'fast'};
 function keydown(e:KeyboardEvent){if(state.mode!=='walk'||document.querySelector('[role=dialog]')||(e.target as HTMLElement)?.closest('button,input,[role=dialog]'))return;const k=keyMap[e.code];if(k){e.preventDefault();pressed.add(k)}}
 function keyup(e:KeyboardEvent){const k=keyMap[e.code];if(k)pressed.delete(k)}
 function down(e:PointerEvent){canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];lastPinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}}
 function look(dx:number,dy:number){if(state.mode==='overview'){azimuth-=dx*.006;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.33,1.48)}else{state.yaw-=dx*.003;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.2,1.2)}}
 function move(e:PointerEvent){if(document.pointerLockElement===canvas){look(e.movementX,e.movementY);return}const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&state.mode==='overview'){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);distance=THREE.MathUtils.clamp(distance+(lastPinch-d)*.035,10,32);lastPinch=d}else if(pointers.size===1)look(dx,dy)}
 function up(e:PointerEvent){pointers.delete(e.pointerId);lastPinch=0}
 function wheel(e:WheelEvent){e.preventDefault();if(state.mode==='overview')distance=THREE.MathUtils.clamp(distance+e.deltaY*.016,10,32)}
 function visibility(){if(document.hidden)clear()}
 function contextLost(e:Event){e.preventDefault();clear();canvas.setAttribute('aria-label','3D表示が中断されました。再読み込みしてください。');const message=document.createElement('div');message.className='error';message.textContent='3D表示が中断されました。ページを再読み込みしてください。';host.appendChild(message)}
 document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('webglcontextlost',contextLost);
 function animate(now:number){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.045);last=now;
 if(state.mode==='overview'){const scale=Math.max(1,.82/camera.aspect),r=distance*scale;camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(azimuth)*Math.cos(elevation)*r+.6);camera.lookAt(0,.4,.6)}
 else{const fw=Number(pressed.has('forward'))-Number(pressed.has('back')),side=Number(pressed.has('right'))-Number(pressed.has('left'));if(fw||side){const speed=(pressed.has('fast')?2.5:1.45)*dt/Math.hypot(fw,side);const dx=(-Math.sin(state.yaw)*fw+Math.cos(state.yaw)*side)*speed,dz=(-Math.cos(state.yaw)*fw-Math.sin(state.yaw)*side)*speed;if(!collides(state.x+dx,state.z,obstacles))state.x+=dx;if(!collides(state.x,state.z+dz,obstacles))state.z+=dz;state.room=roomAt(state.x,state.z)}
 camera.position.set(state.x,1.6,state.z);camera.rotation.set(pitch,state.yaw,0,'YXZ');if(now-lastNotify>100){notify();lastNotify=now}}
 renderer.render(scene,camera);
 }
 configure();notify();frame=requestAnimationFrame(animate);
 const api:ApartmentController={goTo,overview,toggleNight(){state.night=!state.night;hemi.intensity=state.night?.35:2.25;sun.intensity=state.night?.18:3.3;ambientLights.forEach(l=>l.intensity=state.night?5:2.5);renderer.toneMappingExposure=state.night?1.05:1.14;configure();notify()},reset(){azimuth=.43;elevation=.86;distance=18.7;if(state.mode==='walk')goTo('living');else notify()},hold(key,value){if(value)pressed.add(key);else pressed.delete(key)},lockPointer(){if(state.mode==='walk'){canvas.focus();try{const result=canvas.requestPointerLock();if(result)result.catch(()=>{})}catch{}}},dispose(){disposed=true;cancelAnimationFrame(frame);clear();resizeObserver.disconnect();if(document.pointerLockElement===canvas)document.exitPointerLock();document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',contextLost);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>m.dispose())}});textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();cleanupTools()}};
 let cleanupTools=()=>{};
 const context=(document as Document & {modelContext?:{registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>Promise<unknown>},options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
 if(context?.registerTool){
  const lifecycle=new AbortController();cleanupTools=()=>lifecycle.abort();
  const waitForView=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  for(const tool of [
   {name:'navigate_apartment_room',description:'Move the viewer into a room in the 3D apartment and enter walking mode.',inputSchema:{type:'object',properties:{room:{type:'string',enum:Object.keys(spots)}},required:['room'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||!('room' in input)||typeof input.room!=='string'||!Object.hasOwn(spots,input.room))throw new Error('Choose a valid apartment room.');goTo(input.room);await waitForView();return {mode:state.mode,room:state.room}}},
   {name:'show_apartment_overview',description:'Switch the apartment to its whole-home 3D overview.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('No parameters expected.');overview();await waitForView();return {mode:state.mode}}}
  ]){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}
 }

 return api;
}
type Decor={box:(x:number,y:number,z:number,w:number,h:number,d:number,m?:THREE.Material,solid?:boolean,parent?:THREE.Group)=>THREE.Mesh;mat:(c:string,r?:number,m?:number)=>THREE.MeshStandardMaterial;root:THREE.Group;white:THREE.Material;wood:THREE.Material;oak:THREE.Material;dark:THREE.Material;fabric:THREE.Material;metal:THREE.Material;tile:THREE.Material;glass:THREE.Material;textures:THREE.Texture[]};

function addDetails({box,mat,root,white,wood,oak,dark,fabric,metal,glass,textures}:Decor){
 const leaf=mat('#537245'),leafLight=mat('#789063'),linen=mat('#f0ece0'),earth=mat('#564b3a'),ceramic=mat('#e5e3d8'),black=mat('#242b29'),brass=mat('#9f865c',.35,.5);
 function round(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,rotation=0){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.19),m);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
 function cylinder(x:number,y:number,z:number,r1:number,r2:number,h:number,m:THREE.Material,segments=20){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
 function sphere(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:THREE.Material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);mesh.scale.set(sx,sy,sz);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh}
 function plant(x:number,y:number,z:number,size:number){cylinder(x,y+size*.2,z,size*.15,size*.12,size*.4,ceramic);cylinder(x,y+size*.41,z,size*.135,size*.135,.015,earth);cylinder(x,y+size*.68,z,.012,.018,size*.55,wood);for(let i=0;i<11;i++){const angle=i*2.399,r=size*(.16+(i%3)*.05);const l=sphere(x+Math.sin(angle)*r,y+size*(.65+(i%4)*.12),z+Math.cos(angle)*r,size*.13,size*.22,size*.055,i%2?leaf:leafLight);l.rotation.set(Math.sin(angle)*.6,angle,Math.cos(angle)*.6)}}
 function rug(x:number,z:number,w:number,d:number,color:string){const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d')!;cx.fillStyle=color;cx.fillRect(0,0,128,128);for(let i=0;i<128;i+=2){cx.strokeStyle=i%4?'#fff1':'#0001';cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,128);cx.moveTo(0,i);cx.lineTo(128,i);cx.stroke()}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w*3,d*3);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);box(x,.012,z,w,.024,d,new THREE.MeshStandardMaterial({map:t,roughness:1}))}
 rug(-1.06,3.34,2.65,3.15,'#c8c3b1');rug(-1.93,-.63,1.65,.72,'#d2d0c3');rug(1.73,2.56,1.3,1.24,'#d3c9b9');
 for(const z of [2.57,3.35,4.13]){round(-.05,.57,z,.8,.17,.73,linen);round(.28,.89,z,.18,.55,.76,fabric)}
 for(const z of [2.53,4.12]){const cushion=round(-.01,.89,z,.28,.42,.41,mat(z<3?'#b6ae94':'#cac0a7'));cushion.rotation.z=.28}
 for(const x of [-.34,.27])for(const z of [2.3,4.4])cylinder(x,.1,z,.035,.028,.18,wood);
 box(-1.4,.433,3.73,.3,.045,.21,mat('#496b6f')).rotation.y=.15;box(-1.4,.46,3.73,.25,.013,.18,linen).rotation.y=.15;plant(-1.35,.415,2.99,.38);
 for(const z of [2.25,3.3,4.35]){box(-2.476,.26,z,.015,.36,.88,wood);box(-2.462,.38,z,.025,.016,.25,brass)}
 box(-2.835,1.24,3.25,.007,.84,1.59,new THREE.MeshStandardMaterial({color:'#283831',roughness:.2,metalness:.3}));
 plant(-2.64,0,5.36,1.1);plant(-2.7,.49,4.39,.3);
 // Kitchen units, stone counter, burners and recessed sink.
 for(const x of [-2.66,-2.03,-1.4]){box(x,.48,.52,.59,.79,.024,white);box(x,.77,.55,.25,.02,.025,metal)}
 box(-2.51,.987,.16,.59,.016,.54,black);
 for(const [x,z,r]of [[-2.65,.04,.09],[-2.37,.08,.09],[-2.51,.32,.07]]){cylinder(x,1.001,z,r,r,.015,dark);const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.72,.01,8,20),metal);ring.rotation.x=Math.PI/2;ring.position.set(x,1.015,z);root.add(ring)}
 for(const x of [-2.68,-2.52,-2.36])cylinder(x,1.003,.385,.025,.025,.012,metal);
 round(-1.47,.991,.15,.61,.022,.49,metal);round(-1.47,1.005,.15,.5,.012,.38,mat('#687975',.28,.6));cylinder(-1.47,1.015,.15,.035,.035,.008,metal);
 cylinder(-1.22,1.09,-.075,.018,.018,.21,metal);box(-1.22,1.195,.014,.035,.03,.2,metal);
 box(-2.58,1.61,-1.055,.68,.023,1.02,mat('#e0e2dd'));box(-2.22,.8,-1.055,.024,.52,.025,metal);box(-2.22,1.89,-1.055,.024,.38,.025,metal);
 for(const x of [-2.72,-2.24]){box(x,.53,-1.57,.45,.9,.035,white);box(x,.87,-1.535,.2,.017,.024,metal)}
 plant(-2.05,.94,-1.34,.34);
 // Four dining chairs.
 for(const x of [-.66,-.13])for(const z of [-.28,1.43]){box(x,.43,z,.42,.08,.43,oak,true);round(x,.49,z,.4,.08,.39,linen);box(x,.74,z+(z<0?-.18:.18),.43,.5,.065,wood);for(const xx of [x-.15,x+.15])for(const zz of [z-.15,z+.15])box(xx,.22,zz,.035,.44,.035,wood)}
 plant(-.4,.81,.6,.35);cylinder(-.43,.829,1.02,.095,.095,.015,ceramic);
 // Bedroom bedding, pillows and desk.
 round(2.15,.67,4.05,1.23,.15,1.84,linen);for(let i=0;i<8;i++)box(1.58+i*.16,.753,4.35,.012,.006,1.15,mat('#e5e0d3'));
 round(2.15,.685,5.28,.95,.17,.44,linen);round(2.15,.76,5.48,.8,.12,.26,fabric);
 box(2.15,.765,3.33,1.22,.024,.42,mat('#aaa18c'));box(1.36,.25,5.47,.3,.5,.46,oak,true);cylinder(1.36,.54,5.47,.08,.08,.025,brass);cylinder(1.36,.68,5.47,.018,.018,.26,brass);cylinder(1.36,.82,5.47,.105,.14,.2,linen);
 box(2.59,.8,1.87,.65,.055,1.51,oak);box(2.81,1.09,1.72,.035,.42,.61,black);box(2.77,.93,1.72,.13,.03,.2,metal);box(2.35,.842,1.7,.19,.018,.47,mat('#585e58'));plant(2.61,.83,2.4,.34);
 box(1.98,.43,1.85,.42,.06,.45,wood,true);box(1.79,.72,1.85,.06,.5,.46,wood);
 // Open wardrobe with shelves and a hanging rail.
 box(2.37,1.25,-.77,.045,.055,1.5,metal);for(let i=0;i<7;i++){const z=-1.38+i*.19;const garment=round(2.28,.93,z,.28,.68,.12,mat(['#d8d0bd','#77817b','#b9b7a6','#e4e0d3'][i%4]));garment.rotation.z=.04;box(2.31,1.31,z,.32,.024,.022,wood)}
 for(const y of [.22,1.62,2.08])box(2.64,y,-.78,.59,.05,1.68,oak);
 for(const z of [-1.28,-.72,-.21])box(2.64,.39,z,.43,.3,.37,mat('#a4997d'));
 // Vanity, front-loading washer and framed mirror.
 const drum=cylinder(.1,.48,-5.226,.225,.225,.025,dark,32);drum.rotation.x=Math.PI/2;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.228,.025,10,32),metal);rim.position.set(.1,.48,-5.202);root.add(rim);
 const inner=cylinder(.1,.48,-5.195,.18,.18,.012,mat('#43565b',.2,.6),32);inner.rotation.x=Math.PI/2;
 box(.1,.78,-5.22,.6,.13,.018,white);box(-.08,.795,-5.2,.15,.046,.015,dark);const knob=cylinder(.3,.79,-5.197,.035,.035,.02,metal);knob.rotation.x=Math.PI/2;
 round(-.45,.9,-4.93,.61,.08,.59,ceramic);sphere(-.45,.925,-4.89,.215,.055,.195,mat('#b9c4bd'));
 cylinder(-.45,1.015,-5.13,.018,.018,.18,metal);box(-.45,1.11,-5.06,.035,.03,.15,metal);
 box(-.717,1.56,-4.93,.025,.81,.59,wood);box(-.7,1.56,-4.93,.01,.73,.51,mat('#afc5bd',.06,.9));
 box(.57,1.13,-5.84,.31,.04,.13,oak);cylinder(.54,1.22,-5.84,.035,.035,.15,mat('#729480'));
 // Bath tub rim, pale water, tile joints, shower and taps.
 round(2.03,.61,-5.28,1.73,.1,1.12,ceramic);round(2.03,.672,-5.28,1.44,.025,.83,mat('#a1c4cc',.17,.12));round(2.03,.679,-5.28,1.25,.009,.64,new THREE.MeshStandardMaterial({color:'#c6e0e1',roughness:.12,transparent:true,opacity:.6}));
 box(2.78,1.2,-4.45,.04,1.6,.04,metal);const shower=cylinder(2.61,1.99,-4.45,.11,.11,.035,metal);shower.rotation.z=-.25;box(2.69,1.99,-4.45,.24,.03,.035,metal);
 cylinder(2.78,.81,-5.3,.023,.023,.2,metal);box(2.71,.92,-5.3,.17,.035,.035,metal);
 for(let z=-5.75;z<-3.65;z+=.32)box(2,.006,z,1.9,.006,.008,mat('#d6d9d1'));
 for(let x=1.14;x<2.98;x+=.32)box(x,.008,-4.8,.008,.006,2.25,mat('#d6d9d1'));
 // Toilet cistern and oval seat.
 round(2.71,.67,-2.6,.32,.52,.64,ceramic);sphere(2.34,.55,-2.6,.4,.065,.285,ceramic);sphere(2.3,.61,-2.6,.245,.013,.177,mat('#a9b9b1'));sphere(2.3,.619,-2.6,.193,.009,.136,mat('#d4dfd9'));
 box(2.73,.941,-2.6,.06,.013,.12,metal);box(1.9,.81,-3.49,.3,.05,.12,wood);cylinder(1.87,.91,-3.49,.065,.065,.18,ceramic);
 // Entrance door and shoe storage.
 box(-1.66,1.15,-5.87,.9,2.3,.08,wood);box(-1.28,1.03,-5.81,.13,.025,.04,metal);box(-2.5,1.1,-3.25,.39,.017,1.24,wood);
 // Door trim around open passages, to make them visible at eye level.
 for(const [a,b,z]of [[-.2,.72,-1.8],[-.55,.4,-3.6]]){for(const x of [a,b])box(x,1.12,z,.055,2.24,.155,wood);box((a+b)/2,2.25,z,b-a+.055,.055,.155,wood)}
 for(const [x,a,b]of [[.85,.82,1.82],[.85,-1.38,-.38],[1,-4.6,-3.6],[1,-3.1,-2.05]]){for(const z of [a,b])box(x,1.12,z,.155,2.24,.055,wood);box(x,2.25,(a+b)/2,.155,.055,b-a+.055,wood)}
 // Art, curtains, pendant shades, a small balcony planter.
 box(-2.91,1.62,1.53,.035,.72,.6,wood);box(-2.886,1.62,1.53,.015,.63,.51,mat('#e2d8bb'));sphere(-2.87,1.67,1.53,.012,.2,.15,mat('#7c8a73'));
 for(const x of [-2.52,.1,1.07,2.64]){for(let j=0;j<4;j++)cylinder(x+j*.025,1.22,5.88,.042,.038,2.35,mat('#e8e7dc'))}
 for(const [x,z,r]of [[-.4,.65,.3],[-1.05,3.35,.25],[2.05,3.15,.22]]){cylinder(x,2.44,z,.012,.012,.27,dark);cylinder(x,2.23,z,r*.4,r,.22,linen);cylinder(x,2.12,z,r*.86,r*.86,.017,new THREE.MeshStandardMaterial({color:'#ffedc6',emissive:'#ffe2a0',emissiveIntensity:.7}))}
 plant(2.45,0,6.8,.7);box(2.46,.22,6.83,.49,.44,.55,mat('#c7c5b8'),true);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat('#e8ece7'));ground.rotation.x=-Math.PI/2;ground.position.y=-.49;ground.receiveShadow=true;root.add(ground);
}


