// Minimal dependency-free local preview server (Cloudflare D1 replaced by persisted JSON).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleRequest} from '../src/worker.js';
import {createLocalDb} from './db.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=path.join(root,'public');
const port=Number(process.env.PORT)||8787;
const db=createLocalDb(path.join(root,'.local','guides.json'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const assets={async fetch(request){
  let pathname=new URL(request.url).pathname;
  if(pathname==='/')pathname='/index.html';
  const target=path.resolve(pub,'.'+pathname);
  if(!target.startsWith(pub+path.sep))return new Response('Not found',{status:404});
  try{const data=await fs.readFile(target);return new Response(data,{headers:{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}});}catch{return new Response('Not found',{status:404});}
}};
http.createServer(async(req,res)=>{
  try{
    const chunks=[];for await(const c of req)chunks.push(c);
    const request=new Request(`http://${req.headers.host||'localhost:'+port}${req.url}`,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
    const response=await handleRequest(request,{DB:db,ASSETS:assets});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(err){console.error(err);res.writeHead(500);res.end('Error');}
}).listen(port,'127.0.0.1',()=>console.log(`StayGuide preview: http://127.0.0.1:${port}`));
