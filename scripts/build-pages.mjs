import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const project=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url)));
const basePath='/3Droom-model20260909';
const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:project,stdio:'inherit',env:{...process.env,GITHUB_PAGES_BASE_PATH:basePath}});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
const source=path.join(project,'dist','client'),target=path.resolve(project,'docs');
if(path.dirname(target)!==project||path.basename(target)!=='docs')throw new Error('Unexpected publishing directory');
if(fs.existsSync(target)){
 if(fs.lstatSync(target).isSymbolicLink()||fs.realpathSync(target)!==target)throw new Error('Publishing directory resolves outside the project');
 if(!fs.existsSync(path.join(target,'.nojekyll')))throw new Error('Refusing to replace a directory that was not generated for Pages');
 fs.rmSync(target,{recursive:true});
}
if(!fs.existsSync(path.join(source,'index.html')))throw new Error('Missing built index.html');
fs.mkdirSync(target,{recursive:true});
// assetPrefix places bundles in a nested directory; Pages adds that prefix itself.
for(const entry of fs.readdirSync(source,{withFileTypes:true})){
 if(entry.name===basePath.slice(1)){
  for(const child of fs.readdirSync(path.join(source,entry.name)))fs.cpSync(path.join(source,entry.name,child),path.join(target,child),{recursive:true});
 }else if(!entry.name.startsWith('.'))fs.cpSync(path.join(source,entry.name),path.join(target,entry.name),{recursive:true});
}
fs.writeFileSync(path.join(target,'.nojekyll'),'');
const html=fs.readFileSync(path.join(target,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(v=>v.startsWith('/')&&!v.startsWith('//'));
for(const asset of assets){
 if(!asset.startsWith(basePath+'/'))throw new Error('Asset is missing the GitHub Pages prefix: '+asset);
 const local=decodeURIComponent(asset.slice(basePath.length+1).split('?')[0]);
 if(!fs.existsSync(path.join(target,local)))throw new Error('Missing published asset: '+asset);
}
console.log('GitHub Pages files ready; '+assets.length+' asset references validated.');


