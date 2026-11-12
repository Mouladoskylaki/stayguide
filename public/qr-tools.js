// Presentation helpers shared by the host workspace and public welcome card.
export function previewWarning(value){
  let url;
  try{url=new URL(value);}catch{return 'This destination could not be verified. Do not use it for permanent printed cards.';}
  const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
  let ipv4=host.split('.').map(Number);
  const mapped=host.match(/^::ffff:([a-f\d]{1,4}):([a-f\d]{1,4})$/);
  if(mapped){const n=parseInt(mapped[1]+mapped[2].padStart(4,'0'),16);ipv4=[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255];}
  const local4=ipv4.length===4&&ipv4.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(
    [0,10,127].includes(ipv4[0])||(ipv4[0]===172&&ipv4[1]>=16&&ipv4[1]<=31)||
    (ipv4[0]===192&&ipv4[1]===168)||(ipv4[0]===169&&ipv4[1]===254)||
    (ipv4[0]===100&&ipv4[1]>=64&&ipv4[1]<=127)||(ipv4[0]===198&&[18,19].includes(ipv4[1])));
  const first=parseInt(host.split(':')[0],16);
  const local6=host.includes(':')&&(host==='::'||host==='::1'||(first&0xfe00)===0xfc00||(first&0xffc0)===0xfe80);
  if(local4||local6||host==='localhost'||!host.includes('.')&&!host.includes(':')||/\.(localhost|local|lan|internal|home)$/.test(host)){
    return 'Local preview link: this QR may only work on this device or local network. It is unsuitable for permanent printed cards. Use a stable public HTTPS address before printing for guests.';
  }
  if(/(^|\.)(trycloudflare\.com|ngrok-free\.app|ngrok\.app|ngrok\.io|loca\.lt|lhr\.life|localhost\.run|serveo\.net|serveousercontent\.com|pinggy\.link|devtunnels\.ms|tunnelmole\.net)$/.test(host)){
    return 'Temporary preview link: this address can stop working when sharing ends. Do not use this QR for permanent printed cards. Use a stable public HTTPS address first.';
  }
  if(url.protocol!=='https:')return 'This link does not use HTTPS. Use a stable public HTTPS address before making permanent printed cards.';
  return '';
}
export function qrFilename(name,format){
  if(!['png','svg'].includes(format))throw new Error('Unsupported QR format');
  let base=Array.from(String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-')).slice(0,60).join('').replace(/^-+|-+$/g,'')||'property';
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(base))base='property-'+base;
  return base+'-qr.'+format;
}
export function qrRasterSize(svg){
  const match=svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if(!match||match[1]!==match[2]||Number(match[1])<33||Number(match[1])>185)throw new Error('Invalid QR image');
  return Number(match[1])*32; // Whole pixels per module, including the canonical quiet zone.
}
export async function qrPngBlob(svg){
  const size=qrRasterSize(svg),source=URL.createObjectURL(new Blob([svg.replace(/width="\d+" height="\d+"/,`width="${size}" height="${size}"`)],{type:'image/svg+xml'}));
  let timer;
  try{
    const image=new Image();image.src=source;
    await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('QR image timed out')),10000);})]);
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
    context.imageSmoothingEnabled=false;context.fillStyle='#fff';context.fillRect(0,0,size,size);
    context.drawImage(image,0,0,size,size);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG unavailable')),'image/png'));
  }finally{clearTimeout(timer);URL.revokeObjectURL(source);}
}
