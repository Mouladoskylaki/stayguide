"""Reproduce approved vendored assets from the audited POC archives; no downloads.
Usage: python3 scripts/prepare-pdf-assets.py /absolute/path/to/SG-P22-POC
"""
from pathlib import Path
import sys,tarfile,json,hashlib,base64,gzip,struct,zipfile
source=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]/'public/vendor';out.mkdir(exist_ok=True)
registry=json.loads((source/'registry.json').read_text());archive=(source/'pdfmake-0.3.14.tgz').read_bytes()
assert registry['version']=='0.3.14'
assert 'sha512-'+base64.b64encode(hashlib.sha512(archive).digest()).decode()==registry['dist']['integrity']
with tarfile.open(source/'pdfmake-0.3.14.tgz') as t:
 bundle=t.extractfile('package/build/pdfmake.min.js').read()
 (out/'pdfmake-0.3.14.min.js').write_bytes(bundle)
 (out/'pdfmake-LICENSE.txt').write_bytes(t.extractfile('package/LICENSE').read())
 (out/'svg-to-pdfkit-LICENSE.txt').write_bytes(t.extractfile('package/src/3rd-party/svg-to-pdfkit/LICENSE').read())
# Actual Unicode cmap, excluding glyph 0; intersect both approved weights.
def glyphs(data):
 tables={}
 for i in range(struct.unpack_from('>H',data,4)[0]):
  tag,_,off,_=struct.unpack_from('>4sIII',data,12+16*i);tables[tag]=off
 c=tables[b'cmap'];covered=set()
 for i in range(struct.unpack_from('>H',data,c+2)[0]):
  platform,encoding,off=struct.unpack_from('>HHI',data,c+4+8*i)
  if not(platform==0 or platform==3 and encoding in (1,10)):continue
  s=c+off;fmt=struct.unpack_from('>H',data,s)[0]
  if fmt==12:
   for j in range(struct.unpack_from('>I',data,s+12)[0]):
    a,b,g=struct.unpack_from('>III',data,s+16+12*j)
    covered.update(code for code in range(a,b+1) if g+code-a)
  if fmt==4:
   count=struct.unpack_from('>H',data,s+6)[0]//2;end=s+14;start=end+2*count+2;delta=start+2*count;offset=delta+2*count
   for j in range(count):
    a=struct.unpack_from('>H',data,start+2*j)[0];b=struct.unpack_from('>H',data,end+2*j)[0];d=struct.unpack_from('>h',data,delta+2*j)[0];o=struct.unpack_from('>H',data,offset+2*j)[0]
    for code in range(a,b+1):
     g=(code+d)&65535 if not o else struct.unpack_from('>H',data,offset+2*j+o+2*(code-a))[0]
     if o and g:g=(g+d)&65535
     if g and code!=65535:covered.add(code)
 return covered
fonts={};rawfonts=[];coverage=None
with zipfile.ZipFile(source/'NotoSans-v2.015.zip') as z:
 for name in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf']:
  b=(source/name).read_bytes();assert b==z.read('NotoSans/full/ttf/'+name)
  rawfonts.append(dict(file=name,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()));fonts[name]=base64.b64encode(b).decode();codes=glyphs(b);coverage=codes if coverage is None else coverage&codes
(out/'noto-sans-2.015.js').write_text('// Noto Sans v2.015, unmodified font bytes. See NotoSans-OFL.txt.\npdfMake.addVirtualFileSystem('+json.dumps(fonts,separators=(',',':'))+');\npdfMake.addFonts({Noto:{normal:"NotoSans-Regular.ttf",bold:"NotoSans-Bold.ttf",italics:"NotoSans-Regular.ttf",bolditalics:"NotoSans-Bold.ttf"}});\n')
ranges=[]
for code in sorted(coverage):
 if ranges and code==ranges[-1][1]+1:ranges[-1][1]=code
 else:ranges.append([code,code])
Path('public/pdf-font-coverage.js').write_text('// Generated from the intersection of both approved Noto Sans v2.015 cmaps.\nexport const FONT_RANGES='+json.dumps(ranges,separators=(',',':'))+';\n')
(out/'NotoSans-OFL.txt').write_bytes((source/'FONT-LICENSE.txt').read_bytes())
assets=[]
for name in ['pdfmake-0.3.14.min.js','noto-sans-2.015.js']:
 b=(out/name).read_bytes();assets.append(dict(file=name,bytes=len(b),gzipBytes=len(gzip.compress(b,mtime=0)),sha256=hashlib.sha256(b).hexdigest()))
(out/'pdf-assets.json').write_text(json.dumps(dict(pdfmake='0.3.14',font='Noto Sans v2.015',rawFonts=rawfonts,fontArchiveSha256=hashlib.sha256((source/'NotoSans-v2.015.zip').read_bytes()).hexdigest(),registryIntegrity=registry['dist']['integrity'],assets=assets),indent=2)+'\n')
print(json.dumps(assets,indent=2))
