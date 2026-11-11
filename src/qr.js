/** Minimal dependency-free QR Model 2 encoder, byte mode, ECC M, versions 6 or 10.
 * Intended for StayGuide HTTPS links <= 213 UTF-8 bytes. SVG generated server-side.
 */
const SPEC = {
  6: {size:41, data:108, ecc:16, blocks:[27,27,27,27], alignment:[6,34]},
  10:{size:57, data:216, ecc:26, blocks:[43,43,43,43,44], alignment:[6,28,50]},
};
function multiply(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11d);z^=((y>>>i)&1)*x;}return z;}
function divisor(degree){let d=new Uint8Array(degree);d[degree-1]=1;let root=1;for(let i=0;i<degree;i++){for(let j=0;j<degree;j++){d[j]=multiply(d[j],root);if(j+1<degree)d[j]^=d[j+1];}root=multiply(root,2);}return d;}
function remainder(data,div){let rem=new Uint8Array(div.length);for(const b of data){let k=b^rem[0];rem.copyWithin(0,1);rem[rem.length-1]=0;for(let i=0;i<rem.length;i++)rem[i]^=multiply(div[i],k);}return rem;}
export function qrMatrix(value){
  const bytes = new TextEncoder().encode(value);
  const version = bytes.length<=106?6:10;
  if(bytes.length>(version===6?106:213))throw new Error('QR URL too long');
  const {size,data,ecc,blocks,alignment}=SPEC[version];
  const bit=[];
  const put=(n,len)=>{for(let i=len-1;i>=0;i--)bit.push((n>>>i)&1);};
  put(4,4);put(bytes.length,version<10?8:16);for(const b of bytes)put(b,8);
  for(let i=0;i<4&&bit.length<data*8;i++)bit.push(0);
  while(bit.length%8)bit.push(0);
  const words=[];for(let i=0;i<bit.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bit[i+j];words.push(b);}
  for(let i=0;words.length<data;i++)words.push(i%2===0?0xec:0x11);
  const dataBlocks=[],eccBlocks=[];let k=0,gen=divisor(ecc);
  for(const len of blocks){const b=words.slice(k,k+len);dataBlocks.push(b);eccBlocks.push([...remainder(b,gen)]);k+=len;}
  const code=[];for(let i=0;i<Math.max(...blocks);i++)for(const b of dataBlocks)if(i<b.length)code.push(b[i]);
  for(let i=0;i<ecc;i++)for(const b of eccBlocks)code.push(b[i]);
  const modules=Array.from({length:size},()=>Array(size).fill(false));
  const func=Array.from({length:size},()=>Array(size).fill(false));
  function f(x,y,v){if(x>=0&&x<size&&y>=0&&y<size){modules[y][x]=!!v;func[y][x]=true;}}
  for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]]){
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
      const dist=Math.max(Math.abs(dx),Math.abs(dy));f(cx+dx,cy+dy,dist!==2&&dist!==4);
    }
  }
  for(let i=8;i<size-8;i++){f(6,i,i%2===0);f(i,6,i%2===0);}
  for(const cy of alignment)for(const cx of alignment){
    if((cx===6&&(cy===6||cy===size-7))||(cy===6&&cx===size-7))continue;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)f(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  }
  function format(mask){let dat=mask,rem=dat;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);const bits=((dat<<10)|rem)^0x5412;
    for(let i=0;i<=5;i++)f(8,i,(bits>>>i)&1);f(8,7,(bits>>>6)&1);f(8,8,(bits>>>7)&1);f(7,8,(bits>>>8)&1);
    for(let i=9;i<15;i++)f(14-i,8,(bits>>>i)&1);
    for(let i=0;i<8;i++)f(size-1-i,8,(bits>>>i)&1);
    for(let i=8;i<15;i++)f(8,size-15+i,(bits>>>i)&1);
    f(8,size-8,true);
  }
  format(0);
  if(version>=7){let rem=version;for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1f25);let bits=(version<<12)|rem;
    for(let i=0;i<18;i++){let v=(bits>>>i)&1;f(size-11+i%3,Math.floor(i/3),v);f(Math.floor(i/3),size-11+i%3,v);}
  }
  let cursor=0;
  for(let right=size-1;right>=1;right-=2){if(right===6)right=5;
    for(let vert=0;vert<size;vert++){
      const y=((right+1)&2)===0?size-1-vert:vert;
      for(let dx=0;dx<2;dx++){
        const x=right-dx;if(func[y][x])continue;
        let b=cursor<code.length*8?(code[cursor>>>3]>>>(7-(cursor&7)))&1:0;
        modules[y][x]=!!(b^(((x+y)&1)===0?1:0));cursor++;
      }
    }
  }
  return modules;
}
export function qrSvg(text){
  const mat=qrMatrix(text),margin=4,size=mat.length;
  let p='';for(let y=0;y<size;y++){for(let x=0;x<size;){if(!mat[y][x]){x++;continue;}let start=x;while(x<size&&mat[y][x])x++;p+=`M${start+margin} ${y+margin}h${x-start}v1H${start+margin}z`;}}
  const total=size+margin*2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code"><path fill="#ffffff" d="M0 0h${total}v${total}H0z"/><path fill="#142c2a" d="${p}"/></svg>`;
}
