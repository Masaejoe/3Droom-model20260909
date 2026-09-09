import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=await fs.readFile(new URL('../app/space.ts',import.meta.url),'utf8');
const header=`
const __ctx=new Proxy({}, {get:()=>()=>{}});
globalThis.window={devicePixelRatio:1};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>__ctx})};
class TestRenderer{domElement={setAttribute(){}};shadowMap={};capabilities={getMaxAnisotropy:()=>8};setPixelRatio(){}}
`;
let code=ts.transpileModule(source.replace('new THREE.WebGLRenderer(','new TestRenderer(').replace('addDetails(decor);','addDetails(decor); return {obstacles,root};'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const target=new URL('../.geometry-check.mjs',import.meta.url);
try{
 await fs.writeFile(target,header+code);
 const {createApartment,spots,collides}=await import(target.href+'?t='+Date.now());
 const {obstacles,root}=createApartment({appendChild(){}},()=>{});
 for(const [name,p] of Object.entries(spots))assert.equal(collides(p.x,p.z,obstacles),false,'Spawn inside obstacle: '+name);
 const step=.08,minX=-2.8,minZ=-5.8,nx=71,nz=164;
 const point=(i,j)=>({x:minX+i*step,z:minZ+j*step});
 const nearest=(p)=>[Math.round((p.x-minX)/step),Math.round((p.z-minZ)/step)];
 const [si,sj]=nearest(spots.living),queue=[[si,sj]],seen=new Set([si+','+sj]);
 for(let n=0;n<queue.length;n++){const [i,j]=queue[n];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj,k=a+','+b;if(a<0||a>=nx||b<0||b>=nz||seen.has(k))continue;const p=point(a,b);if(collides(p.x,p.z,obstacles))continue;seen.add(k);queue.push([a,b])}}
 for(const [name,p]of Object.entries(spots)){const [i,j]=nearest(p);assert(seen.has(i+','+j),'No walking route from living to '+name)}
 assert(collides(-3.5,0,obstacles));assert(collides(0,8,obstacles));assert(collides(.85,3,obstacles),'Interior wall must block');assert(collides(-.02,3.35,obstacles),'Sofa must block');
 console.log(JSON.stringify({roomsReachable:Object.keys(spots).length,obstacles:obstacles.length,walkableCells:seen.size,meshes:root.children.length,checks:'spawn, all-room reachability, walls, furniture, exterior boundary passed'}));
}finally{await fs.unlink(target).catch(()=>{})}

