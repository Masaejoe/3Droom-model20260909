import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export type ViewState={mode:'overview'|'walk';room:string;x:number;z:number;yaw:number;night:boolean};
export type ApartmentController={goTo:(room:string)=>void;overview:()=>void;toggleNight:()=>void;reset:()=>void;hold:(key:string,value:boolean)=>void;lockPointer:()=>void;dispose:()=>void};
export type Obstacle={minX:number;maxX:number;minZ:number;maxZ:number};
export const spots:Record<string,{x:number;z:number;yaw:number}>={living:{x:.23,z:5.35,yaw:.42},bedroom:{x:1.5,z:2.1,yaw:Math.PI},closet:{x:1.5,z:-.75,yaw:-Math.PI/2},entry:{x:-1.55,z:-4.7,yaw:Math.PI},wash:{x:.15,z:-4.15,yaw:.4},bath:{x:1.65,z:-4,yaw:-.35},toilet:{x:1.6,z:-2.55,yaw:-Math.PI/2},balcony:{x:-.6,z:6.7,yaw:Math.PI}};
export function collides(x:number,z:number,obstacles:Obstacle[],radius=.18){
 if(x < -2.9+radius || x > 2.9-radius || z < -5.9+radius || z > 7.32-radius)return true;
 return obstacles.some(b=>{const dx=x-Math.max(b.minX,Math.min(x,b.maxX)),dz=z-Math.max(b.minZ,Math.min(z,b.maxZ));return dx*dx+dz*dz<radius*radius});
}
export function roomAt(x:number,z:number){if(z>6)return 'balcony';if(z<-3.6){if(x>1)return 'bath';if(x>-.8)return 'wash';return 'entry'}if(z<-1.8){if(x>1)return 'toilet';return 'entry'}if(x>.85)return z<.2?'closet':'bedroom';return 'living'}
export function createApartment(host:HTMLDivElement,onChange:(s:ViewState)=>void):ApartmentController{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f2f0');
 const camera=new THREE.PerspectiveCamera(48,1,.05,180);camera.rotation.order='YXZ';
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D空間。ドラッグで見回し、WASDまたは矢印キーで歩きます。');host.appendChild(renderer.domElement);
 const root=new THREE.Group();scene.add(root);const obstacles:Obstacle[]=[];const textures:THREE.Texture[]=[];
 const state:ViewState={mode:'overview',room:'living',...spots.living,night:false};
 const walls=new THREE.Group();root.add(walls);const outer=new THREE.Group();root.add(outer);const ceiling=new THREE.Group();root.add(ceiling);ceiling.visible=false;
 const mat=(color:string,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});

 // Fine-grained, deterministic surface maps. Color, relief and roughness share scale.
 function surface(kind:'oak'|'cloth'|'stone'|'plaster',color:string,repeat=1){
  const c=document.createElement('canvas');c.width=c.height=512;const context=c.getContext('2d')!;
  const pixels=context.createImageData(512,512);let seed=923;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5);
   const grain=kind==='oak'?Math.sin(x*.21+Math.sin(y*.025)*2.5)*5+Math.sin(x*.91+y*.006)*2:kind==='cloth'?((x%4<2?1:-1)+(y%4<2?1:-1))*3:0;
   const value=Math.max(0,Math.min(255,236+grain+noise*(kind==='stone'?30:kind==='plaster'?7:17)));
   const i=(y*512+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);
  const bump=t.clone();bump.colorSpace=THREE.NoColorSpace;textures.push(bump);
  return new THREE.MeshStandardMaterial({color,map:t,bumpMap:bump,bumpScale:kind==='cloth'?.009:kind==='oak'?.004:.002,roughness:kind==='cloth'?.94:kind==='oak'?.48:kind==='stone'?.62:.9});
 }
 const white=mat('#f1f0eb',.43),plaster=surface('plaster','#e3e2dd',3),trim=mat('#e9e8e3'),wood=surface('oak','#bba078'),oak=surface('oak','#cfb88f'),dark=mat('#303332'),fabric=surface('cloth','#eeeae1',3),metal=mat('#b5b9b6',.23,.85),tile=surface('stone','#bfc2c1',4);
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material=white,solid=false,parent:THREE.Group=root){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  if(solid&&y-h/2<1.75&&y+h/2>.08){mesh.updateWorldMatrix(true,false);const bounds=new THREE.Box3().setFromObject(mesh);obstacles.push({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z});}return mesh;
 }
 function wall(x:number,z:number,w:number,d:number,external=false){box(x,1.3,z,w,2.6,d,plaster,true,external?outer:walls);box(x,.055,z,w+.013,.11,d+.013,trim,false,external?outer:walls)}
 function wallX(x1:number,x2:number,z:number){wall((x1+x2)/2,z,x2-x1,.12)}
 function wallZ(x:number,z1:number,z2:number){wall(x,(z1+z2)/2,.12,z2-z1)}
 function floor(x:number,z:number,w:number,d:number,m:THREE.Material,lift=0){box(x,-.065+lift,z,w,.13,d,m)}

 // Boards run across the apartment, as in the supplied image.
 const texCanvas=document.createElement('canvas');texCanvas.width=1024;texCanvas.height=1024;const ctx=texCanvas.getContext('2d')!;
 let seed=27;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 ctx.fillStyle='#c7b18c';ctx.fillRect(0,0,1024,1024);
 for(let row=0;row<16;row++){const start=row*64,offset=(row%3)*173;
  for(let col=-1;col<3;col++){const x=col*512+offset,v=Math.floor(random()*13)-6;
   ctx.fillStyle=`rgb(${197+v},${173+v},${133+v})`;ctx.fillRect(x,start,511,63.5);
   for(let n=0;n<76;n++){const yy=start+random()*63;ctx.strokeStyle=`rgba(99,73,41,${.025+random()*.065})`;ctx.lineWidth=.4+random()*.6;ctx.beginPath();ctx.moveTo(x,yy);ctx.bezierCurveTo(x+170,yy+Math.sin(n)*2,x+350,yy-2,x+512,yy);ctx.stroke()}
   ctx.fillStyle='rgba(239,226,200,.18)';ctx.fillRect(x,start,511,.7);
  }
 }
 const floorTex=new THREE.CanvasTexture(texCanvas);floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(1.35,3);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(floorTex);
 const floorBump=floorTex.clone();floorBump.colorSpace=THREE.NoColorSpace;textures.push(floorBump);
 const floorMat=new THREE.MeshStandardMaterial({map:floorTex,bumpMap:floorBump,bumpScale:.006,roughness:.49,color:'#fffdfa'});
 floor(0,0,6,12,floorMat);floor(0,6.7,6,1.4,tile);floor(-1.9,-5.3,2.2,1.4,tile,.007);floor(.1,-4.8,1.8,2.4,tile,.007);floor(2,-4.8,2,2.4,tile,.007);
 box(0,-.21,.7,6.25,.24,13.65,mat('#bfc4b9'));box(0,-.4,.7,6.45,.12,13.85,mat('#d6dbd1'));
 wall(-3,0,.16,12,true);wall(3,0,.16,12,true);wall(0,-6,6,.16,true);
 wallX(-3,-.2,-1.8);wallX(.72,3,-1.8);box(.26,2.4,-1.8,.92,.4,.12,plaster,false,walls);
 wallZ(.85,-1.8,.2);wallZ(.85,.2,.82);wallZ(.85,1.82,6);box(.85,2.4,1.32,.12,.4,1,plaster,false,walls);wallX(.85,1.14,.2);wallX(2.13,3,.2);box(1.635,2.4,.2,.99,.4,.12,plaster,false,walls);
 wallZ(-.8,-6,-3.6);wallX(-.8,-.55,-3.6);wallX(.4,3,-3.6);box(-.075,2.4,-3.6,.95,.4,.12,plaster,false,walls);
 wallZ(1,-6,-4.6);box(1,2.4,-4.1,.12,.4,1,plaster,false,walls);wallZ(1,-3.6,-3.1);wallZ(1,-2.05,-1.8);box(1,2.4,-2.57,.12,.4,1.05,plaster,false,walls);
 // Open balcony doorways with frames and glass panels at their sides.
 const glass=new THREE.MeshStandardMaterial({color:'#bed4cf',transparent:true,opacity:.2,roughness:.18,metalness:.12,depthWrite:false,side:THREE.DoubleSide});
 wallX(-3,-2.55,6);wallX(.15,1.05,6);wallX(2.65,3,6);
 for(const [a,b]of [[-2.55,.15],[1.05,2.65]]){box((a+b)/2,2.5,6,b-a,.15,.14,trim);box(a,1.25,6,.06,2.5,.1,metal);box(b,1.25,6,.06,2.5,.1,metal);box(a+.38,1.22,6,.76,2.36,.025,glass,true);box(a+.76,1.22,6,.04,2.4,.07,metal);box((a+b)/2,.02,6,b-a,.03,.17,metal)}
 box(0,.5,7.4,6,1,.08,glass,true);box(0,1.03,7.4,6.15,.065,.07,metal);box(-3,.55,6.7,.12,1.1,1.4,plaster,true);box(3,.55,6.7,.12,1.1,1.4,plaster,true);
 for(let x=-3;x<=3;x+=1.5)box(x,.5,7.4,.04,1,.07,metal);
 box(0,2.66,0,6,.1,12,white,false,ceiling);

 // Fixed service fittings; living furniture is built together below.
 box(-2.6,1.05,-3.25,.57,2.1,1.4,white,true);
 box(.1,.43,-5.58,.68,.86,.68,white,true);box(-.45,.44,-4.08,.58,.88,.55,white,true);
 box(2.03,.3,-5.28,1.66,.6,1.05,white,true);box(2.48,.26,-2.6,.67,.52,.77,white,true);
 box(2.70,.10,-.78,.45,.20,1.64,wood,true);
 // GPU_ENV_BEGIN
 const pmrem=new THREE.PMREMGenerator(renderer);const lightRoom=new RoomEnvironment();
 const environment=pmrem.fromScene(lightRoom,.06);scene.environment=environment.texture;scene.environmentIntensity=.32;
 lightRoom.dispose();pmrem.dispose();
 // GPU_ENV_END
 const hemi=new THREE.HemisphereLight('#fbfcff','#b8aca0',1.65);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff7e8',2.8);sun.position.set(-3,8,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=3;sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;scene.add(sun);
 const ambientLights:THREE.PointLight[]=[];for(const [x,z]of [[-1,2],[2,3],[-1.5,-3],[.1,-4.5],[2,-4.5],[2,-2.5],[2,-.8]]){const light=new THREE.PointLight('#ffe7c5',.7,7,1.5);light.position.set(x,2.35,z);scene.add(light);ambientLights.push(light)}
 // Enrichment hook.
 const decor = {box,mat,root,white,wood,oak,dark,fabric,metal,tile,glass,textures,surface};
 addDetails(decor);
 let azimuth=.015,elevation=1.12,distance=23.8;const pressed=new Set<string>();const pointers=new Map<number,{x:number;y:number}>();
 let lastPinch=0,disposed=false,frame=0,last=performance.now(),lastNotify=0;
 const canvas=renderer.domElement;
 function notify(){onChange({...state})}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 function configure(){outer.scale.y=state.mode==='overview'?.34:1;walls.scale.y=state.mode==='overview'?.34:1;camera.fov=state.mode==='overview'?36:60;camera.updateProjectionMatrix();ceiling.visible=state.mode==='walk';scene.background=new THREE.Color(state.mode==='overview'?(state.night?'#26352e':'#f1f2f0'):(state.night?'#18272e':'#d9e8e8'))}
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
 if(state.mode==='overview'){const scale=Math.max(1,.52/camera.aspect),r=distance*scale;camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(azimuth)*Math.cos(elevation)*r+.6);camera.lookAt(0,.4,.6)}
 else{const fw=Number(pressed.has('forward'))-Number(pressed.has('back')),side=Number(pressed.has('right'))-Number(pressed.has('left'));if(fw||side){const speed=(pressed.has('fast')?2.5:1.45)*dt/Math.hypot(fw,side);const dx=(-Math.sin(state.yaw)*fw+Math.cos(state.yaw)*side)*speed,dz=(-Math.cos(state.yaw)*fw-Math.sin(state.yaw)*side)*speed;if(!collides(state.x+dx,state.z,obstacles))state.x+=dx;if(!collides(state.x,state.z+dz,obstacles))state.z+=dz;state.room=roomAt(state.x,state.z)}
 camera.position.set(state.x,1.6,state.z);camera.rotation.set(pitch,state.yaw,0,'YXZ');if(now-lastNotify>100){notify();lastNotify=now}}
 renderer.render(scene,camera);
 }
 configure();notify();frame=requestAnimationFrame(animate);
 const api:ApartmentController={goTo,overview,toggleNight(){state.night=!state.night;hemi.intensity=state.night?.35:1.65;sun.intensity=state.night?.18:2.8;ambientLights.forEach(l=>l.intensity=state.night?5:.7);scene.environmentIntensity=state.night?.12:.32;renderer.toneMappingExposure=state.night?1.05:1.03;configure();notify()},reset(){azimuth=.015;elevation=1.12;distance=23.8;if(state.mode==='walk')goTo('living');else notify()},hold(key,value){if(value)pressed.add(key);else pressed.delete(key)},lockPointer(){if(state.mode==='walk'){canvas.focus();try{const result=canvas.requestPointerLock();if(result)result.catch(()=>{})}catch{}}},dispose(){disposed=true;cancelAnimationFrame(frame);clear();resizeObserver.disconnect();if(document.pointerLockElement===canvas)document.exitPointerLock();document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',contextLost);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>m.dispose())}});textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();canvas.remove();cleanupTools()}};
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
type Decor={box:(x:number,y:number,z:number,w:number,h:number,d:number,m?:THREE.Material,solid?:boolean,parent?:THREE.Group)=>THREE.Mesh;mat:(c:string,r?:number,m?:number)=>THREE.MeshStandardMaterial;root:THREE.Group;white:THREE.Material;wood:THREE.Material;oak:THREE.Material;dark:THREE.Material;fabric:THREE.Material;metal:THREE.Material;tile:THREE.Material;glass:THREE.Material;textures:THREE.Texture[];surface:(kind:'oak'|'cloth'|'stone'|'plaster',color:string,repeat?:number)=>THREE.MeshStandardMaterial};

function addDetails({box,mat,root,white,wood,oak,dark,fabric,metal,glass,textures,surface}:Decor){
 const leaf=mat('#537245'),leafLight=mat('#789063'),linen=surface('cloth','#f5f2e9',3),earth=mat('#564b3a'),ceramic=mat('#e5e3d8'),black=mat('#242b29'),brass=mat('#9f865c',.35,.5),cushion=surface('cloth','#c6bba5',3),stone=surface('stone','#d9d9d3',2);
 function round(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,rotation=0){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.19),m);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
 function cylinder(x:number,y:number,z:number,r1:number,r2:number,h:number,m:THREE.Material,segments=20){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
 function sphere(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:THREE.Material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);mesh.scale.set(sx,sy,sz);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh}
 function plant(x:number,y:number,z:number,size:number){cylinder(x,y+size*.2,z,size*.15,size*.12,size*.4,ceramic);cylinder(x,y+size*.41,z,size*.135,size*.135,.015,earth);cylinder(x,y+size*.68,z,.012,.018,size*.55,wood);for(let i=0;i<11;i++){const angle=i*2.399,r=size*(.16+(i%3)*.05);const l=sphere(x+Math.sin(angle)*r,y+size*(.65+(i%4)*.12),z+Math.cos(angle)*r,size*.13,size*.22,size*.055,i%2?leaf:leafLight);l.rotation.set(Math.sin(angle)*.6,angle,Math.cos(angle)*.6)}}

 function rug(x:number,z:number,w:number,d:number,color:string){const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d')!;const data=cx.createImageData(512,512);let n=674;
 for(let i=0;i<512*512;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;const v=177+(n%72);data.data[i*4]=v;data.data[i*4+1]=v;data.data[i*4+2]=v;data.data[i*4+3]=255}
 cx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w*2,d*2);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);const bump=t.clone();bump.colorSpace=THREE.NoColorSpace;textures.push(bump);box(x,.015,z,w,.028,d,new THREE.MeshStandardMaterial({color,map:t,bumpMap:bump,bumpScale:.025,roughness:1}))}
 function shadow(x:number,z:number,w:number,d:number,opacity:number){
  const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d')!;const pixels=cx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const edge=Math.max(Math.abs(x-63.5),Math.abs(y-63.5))/64;const i=(y*128+x)*4;pixels.data[i]=30;pixels.data[i+1]=24;pixels.data[i+2]=16;pixels.data[i+3]=Math.round(255*Math.pow(Math.max(0,1-edge),.5))}
  cx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(c);textures.push(texture);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w+.18,d+.18),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.034,z);root.add(mesh);
 }

 // Match the reference: low table / sofa / open aisle, then a clear gap to dining.
 rug(-1.52,4,2.08,2.52,'#c9c4b5');rug(-1.97,.07,1.55,.58,'#cac9c3');
 shadow(-.60,4,.99,2.64,.25);shadow(-1.96,4,.70,1.64,.15);shadow(-.34,.88,1.30,1.27,.11);
 box(-.60,.22,4,.86,.27,2.45,wood,true).name='sofa-footprint';
 round(-.60,.34,4,.87,.22,2.46,fabric);
 for(const z of [3.27,4,4.73]){
  round(-.65,.49,z,.72,.18,.70,linen);
  const back=round(-.25,.75,z,.22,.60,.75,fabric);back.rotation.z=-.07;
 }
 round(-.61,.63,2.82,.91,.43,.19,fabric);round(-.61,.63,5.18,.91,.43,.19,fabric);
 for(const z of [3.15,4.82]){const pillow=round(-.50,.78,z,.33,.40,.42,cushion);pillow.rotation.set(.12,.15,.3)}
 for(const x of [-.90,-.28])for(const z of [2.96,5.04])cylinder(x,.105,z,.028,.026,.17,wood);
 box(-1.96,.38,4,.52,.085,1.40,oak,true).name='coffee-footprint';
 for(const z of [3.44,4.56])for(const x of [-2.14,-1.78])box(x,.185,z,.043,.37,.043,wood);
 box(-1.96,.438,4.39,.31,.032,.23,mat('#556e76')).rotation.y=.17;box(-1.96,.458,4.39,.27,.012,.2,linen).rotation.y=.17;plant(-1.96,.43,3.75,.34);
 box(-2.73,.19,4,.34,.38,2.55,oak,true);
 box(-2.88,1.04,4,.047,.98,1.69,dark);
 box(-2.849,1.04,4,.008,.9,1.6,new THREE.MeshStandardMaterial({color:'#26302f',roughness:.19,metalness:.22}));
 for(const z of [3.18,4,4.82]){box(-2.551,.21,z,.014,.31,.77,wood);box(-2.53,.3,z,.018,.012,.22,metal)}
 plant(-2.72,.4,2.94,.34);plant(-2.73,.4,5.13,.25);
 // Kitchen aligned with the dining table, with a square, speckled stone top.
 box(-1.98,.43,.88,1.80,.86,.73,white,true);
 box(-1.98,.9,.88,1.90,.075,.81,stone);
 for(const x of [-2.60,-2,-1.40]){box(x,.46,1.255,.57,.72,.027,white);box(x,.77,1.28,.23,.014,.023,metal)}
 box(-2.50,.946,.87,.57,.014,.55,black);
 for(const [x,z,r]of [[-2.65,.75,.095],[-2.35,.77,.095],[-2.5,1.05,.075]]){cylinder(x,.96,z,r,r,.014,dark);const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.72,.009,8,20),metal);ring.rotation.x=Math.PI/2;ring.position.set(x,.97,z);root.add(ring)}
 for(const x of [-2.65,-2.49,-2.34])cylinder(x,.964,1.11,.021,.021,.014,metal);
 round(-1.48,.95,.88,.62,.024,.54,metal);round(-1.48,.968,.88,.50,.014,.42,mat('#9aa6a4',.18,.8));cylinder(-1.48,.98,.88,.032,.032,.01,metal);
 cylinder(-1.22,1.055,.64,.016,.016,.2,metal);box(-1.22,1.155,.72,.03,.028,.19,metal);
 box(-1.43,.42,-1.38,1.23,.84,.57,white,true);box(-1.43,.865,-1.38,1.3,.05,.63,stone);
 for(const x of [-1.84,-1.43,-1.02])box(x,.44,-1.084,.39,.73,.024,white);
 box(-2.58,1.10,-1.08,.65,2.12,.73,white,true);
 box(-2.58,1.48,-.706,.62,.018,.02,metal);box(-2.28,1.79,-.69,.023,.32,.028,metal);box(-2.28,.92,-.69,.023,.45,.028,metal);
 // The dining tabletop is wider across the room, not lengthwise.
 box(-.34,.735,.88,1.10,.075,.92,oak,true).name='dining-footprint';
 for(const x of [-.80,.12])for(const z of [.50,1.26])box(x,.35,z,.047,.7,.047,wood);
 for(const x of [-.64,-.04])for(const z of [.12,1.63]){
  const seat=box(x,.43,z,.43,.07,.41,wood,true);if(z>1)seat.name=x<-.3?'dining-front-left':'dining-front-right';
  round(x,.49,z,.42,.075,.40,linen);
  round(x,.69,z+(z<.8?-.17:.17),.43,.41,.057,linen);
  for(const xx of [x-.155,x+.155])for(const zz of [z-.145,z+.145])box(xx,.215,zz,.033,.43,.033,wood);
 }
 plant(-.34,.78,.88,.30);

 // Bed with a draped duvet and pillow facing the balcony, as in the reference.
 box(2.18,.23,4.2,1.30,.32,2.83,wood,true);
 round(2.18,.48,4.2,1.30,.23,2.80,linen);
 round(2.18,.65,3.91,1.32,.15,2.13,linen);
 box(2.18,.55,5.64,1.36,.94,.09,wood);
 for(let i=0;i<23;i++){const x=1.55+i*.055;const fold=round(x,.729+Math.sin(i*1.7)*.004,3.98,.029,.013,1.75,linen);fold.rotation.y=Math.sin(i)*.003}
 round(2.18,.63,5.34,1.03,.17,.44,linen);
 const pillow=round(2.18,.71,5.4,.94,.14,.43,linen);pillow.rotation.y=.025;
 round(2.18,.746,4.88,1.27,.065,.23,fabric);
 shadow(2.18,4.2,1.48,3.05,.22);
 box(2.61,.745,1.84,.61,.075,1.15,oak,true);
 for(const z of [1.36,2.32])box(2.61,.36,z,.055,.72,.06,wood);
 box(2.86,1.07,1.81,.04,.41,.55,wood);box(2.832,1.07,1.81,.006,.34,.46,mat('#d6d8ce'));plant(2.66,.79,2.23,.28);
 box(2.02,.44,1.83,.38,.07,.42,wood,true);round(1.84,.72,1.83,.065,.46,.42,fabric);
 // Open wardrobe with shelves and a hanging rail.
 box(2.37,1.25,-.77,.045,.055,1.5,metal);for(let i=0;i<7;i++){const z=-1.38+i*.19;const garment=round(2.28,.93,z,.28,.68,.12,mat(['#d8d0bd','#77817b','#b9b7a6','#e4e0d3'][i%4]));garment.rotation.z=.04;box(2.31,1.31,z,.32,.024,.022,wood)}
 for(const y of [.22,1.62,2.08])box(2.64,y,-.78,.59,.05,1.68,oak);
 for(const z of [-1.28,-.72,-.21])box(2.64,.39,z,.43,.3,.37,mat('#a4997d'));
 // Vanity, front-loading washer and framed mirror.
 const drum=cylinder(.1,.48,-5.226,.225,.225,.025,dark,32);drum.rotation.x=Math.PI/2;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.228,.025,10,32),metal);rim.position.set(.1,.48,-5.202);root.add(rim);
 const inner=cylinder(.1,.48,-5.195,.18,.18,.012,mat('#43565b',.2,.6),32);inner.rotation.x=Math.PI/2;
 box(.1,.78,-5.22,.6,.13,.018,white);box(-.08,.795,-5.2,.15,.046,.015,dark);const knob=cylinder(.3,.79,-5.197,.035,.035,.02,metal);knob.rotation.x=Math.PI/2;
 round(-.45,.9,-4.08,.61,.08,.59,ceramic);sphere(-.45,.925,-4.04,.215,.055,.195,mat('#b9c4bd'));
 cylinder(-.45,1.015,-4.28,.018,.018,.18,metal);box(-.45,1.11,-4.21,.035,.03,.15,metal);
 box(-.717,1.56,-4.08,.025,.81,.59,wood);box(-.7,1.56,-4.08,.01,.73,.51,mat('#afc5bd',.06,.9));
 box(.57,1.13,-5.84,.31,.04,.13,oak);cylinder(.54,1.22,-5.84,.035,.035,.15,mat('#729480'));
 // Bath tub rim, pale water, tile joints, shower and taps.
 round(2.03,.61,-5.28,1.73,.1,1.12,ceramic);round(2.03,.672,-5.28,1.44,.025,.83,mat('#a1c4cc',.17,.12));round(2.03,.679,-5.28,1.25,.009,.64,new THREE.MeshStandardMaterial({color:'#c6e0e1',roughness:.12,transparent:true,opacity:.6}));
 box(2.78,1.2,-4.45,.04,1.6,.04,metal);const shower=cylinder(2.61,1.99,-4.45,.11,.11,.035,metal);shower.rotation.z=-.25;box(2.69,1.99,-4.45,.24,.03,.035,metal);
 cylinder(2.78,.81,-5.3,.023,.023,.2,metal);box(2.71,.92,-5.3,.17,.035,.035,metal);
 for(let z=-5.75;z<-3.65;z+=.32)box(2,.012,z,1.9,.006,.008,mat('#d6d9d1'));
 for(let x=1.14;x<2.98;x+=.32)box(x,.013,-4.8,.008,.006,2.25,mat('#d6d9d1'));
 // Toilet cistern and oval seat.
 round(2.71,.67,-2.6,.32,.52,.64,ceramic);sphere(2.34,.55,-2.6,.4,.065,.285,ceramic);sphere(2.3,.61,-2.6,.245,.013,.177,mat('#a9b9b1'));sphere(2.3,.619,-2.6,.193,.009,.136,mat('#d4dfd9'));
 box(2.73,.941,-2.6,.06,.013,.12,metal);box(1.9,.81,-3.49,.3,.05,.12,wood);cylinder(1.87,.91,-3.49,.065,.065,.18,ceramic);
 // Entrance door and shoe storage.
 box(-1.66,1.15,-5.87,.9,2.3,.08,wood);box(-1.28,1.03,-5.81,.13,.025,.04,metal);box(-2.5,1.1,-3.25,.39,.017,1.24,wood);
 // Door trim around open passages, to make them visible at eye level.
 for(const [a,b,z]of [[-.2,.72,-1.8],[-.55,.4,-3.6],[1.14,2.13,.2]]){for(const x of [a,b])box(x,1.12,z,.055,2.24,.155,wood);box((a+b)/2,2.25,z,b-a+.055,.055,.155,wood)}
 for(const [x,a,b]of [[.85,.82,1.82],[1,-4.6,-3.6],[1,-3.1,-2.05]]){for(const z of [a,b])box(x,1.12,z,.155,2.24,.055,wood);box(x,2.25,(a+b)/2,.155,.055,b-a+.055,wood)}

 // Open oak door leaves; the openings remain fully traversable.
 function door(x:number,z:number,width:number,angle:number){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);
  const leaf=box(width/2,1.04,0,width,2.08,.04,wood,true,g);
  box(width*.83,1.02,-.033,.13,.026,.035,metal,false,g);box(width*.83,1.02,.033,.13,.026,.035,metal,false,g);
  leaf.name='open-oak-door';
 }
 door(-.2,-1.8,.9,-1.24);door(-.55,-3.6,.88,-1.27);door(1.14,.2,.94,-1.22);
 door(1,-3.1,.94,-.3);door(1,-4.6,.86,-.3);

 // Subtle curtain folds at the glazing; lighting fixtures are not in the reference view.
 for(const x of [-2.52,.1,1.07,2.64]){for(let j=0;j<4;j++)cylinder(x+j*.025,1.22,5.88,.042,.038,2.35,mat('#e8e7dc'))}
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat('#f1f2f0'));ground.rotation.x=-Math.PI/2;ground.position.y=-.49;ground.receiveShadow=true;root.add(ground);
}


