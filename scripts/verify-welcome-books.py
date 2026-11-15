"""Independent Poppler and raster validation of browser-produced SG-P22 fixture PDFs.
Usage: python3 scripts/verify-welcome-books.py /tmp/browser-artifacts/book
"""
from pathlib import Path
import sys,subprocess as sp,json,re,unicodedata as ud,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageOps
repo=Path(__file__).resolve().parents[1]
p=Path(sys.argv[1]);fixtures=json.loads((p/'fixtures.json').read_text());results=[]
def run(*args):return sp.check_output(args,stderr=sp.STDOUT).decode()
def norm(text):return re.sub(r'\s+','',ud.normalize('NFC',text))
order=['welcome','wifi_name','wifi_password','checkin','checkout','rules','appliances','parking','local_tips','emergency','contact','additional']
for f in fixtures:
 pdf=p/(f['id']+'.pdf');info=run('pdfinfo',str(pdf));fonts=run('pdffonts',str(pdf));text=run('pdftotext','-enc','UTF-8',str(pdf),'-');bbox=run('pdftotext','-bbox-layout',str(pdf),'-');urls=run('pdfinfo','-url',str(pdf));
 for suffix,data in [('info.txt',info),('fonts.txt',fonts),('text.txt',text),('bbox.html',bbox),('urls.txt',urls)]: (p/(f['id']+'-'+suffix)).write_text(data)
 root=ET.fromstring(bbox);pages=root.findall('.//{*}page')
 # Exclude only the known generated header/footer bands, never saved body words.
 # This preserves ordered completeness checks for fields that span page boundaries.
 bodytop=46 if f['size']=='A5' else 56;bottom=38 if f['size']=='A5' else 44
 bodywords=[]
 for page_index,page in enumerate(pages):
  for word in page.findall('.//{*}word'):
   if page_index==0 or float(word.attrib['yMin'])>=bodytop-1 and float(word.attrib['yMax'])<=float(page.attrib['height'])-bottom+1:bodywords.append(word.text or '')
 actual=norm(''.join(bodywords));cursor=0;missing=[]
 expected=[f['model']['property_name'],f['destination']]+[f['model'][k] for k in order if f['model'].get(k,'').strip()]
 for value in expected:
  i=actual.find(norm(value),cursor)
  if i<0:missing.append(value[:30])
  else:cursor=i+len(norm(value))
 cover=norm(''.join(w.text or '' for w in pages[0].findall('.//{*}word')))
 coverfits=all(norm(v) in cover for v in expected[:2]+['StayGuide.'])
 dimensions=[];bounds=[];overlaps=[];blank=[]
 for no,page in enumerate(pages,1):
  w,h=float(page.attrib['width']),float(page.attrib['height']);dimensions.append([w,h]);words=page.findall('.//{*}word')
  if len(words)<2:blank.append(no)
  expectedwh=[595.28,841.89] if f['size']=='A4' else [419.53,595.28]
  assert all(abs(a-b)<.1 for a,b in zip([w,h],expectedwh))
  for word in words:
   box=[float(word.attrib[k]) for k in ['xMin','yMin','xMax','yMax']]
   if box[0]<25 or box[2]>w-25 or box[1]<20 or box[3]>h-12:bounds.append([no,word.text,box])
  lines=page.findall('.//{*}line')
  for i,a in enumerate(lines):
   aa=[float(a.attrib[k]) for k in ['xMin','yMin','xMax','yMax']]
   for b in lines[i+1:]:
    bb=[float(b.attrib[k]) for k in ['xMin','yMin','xMax','yMax']]
    if min(aa[2],bb[2])-max(aa[0],bb[0])>1 and min(aa[3],bb[3])-max(aa[1],bb[1])>1:overlaps.append([no,aa,bb])
 assert 'NotoSans' in fonts and all('yes yes yes' in re.sub(r' +',' ',line) for line in fonts.splitlines()[2:] if line.strip()),fonts
 assert f['destination'] in urls
 assert not missing,(f['id'],missing)
 assert coverfits,(f['id'],'cover overflow')
 assert not bounds,(f['id'],bounds[:3])
 assert not overlaps,(f['id'],overlaps[:3])
 assert not blank,(f['id'],blank)
 if f['id'].startswith('minimal'):assert len(pages)==1 and 'House rules' not in text
 # Every included section title must share a page with its first saved text.
 titles=[('welcome','Welcome'),('wifi_name','Wi-Fi'),('checkin','Check-in & check-out'),('rules','House rules'),('appliances','How things work'),('parking','Parking & transport'),('local_tips','Local favourites'),('emergency','Emergency information'),('contact','Contact your host'),('additional','Good to know')]
 page_text=[norm(''.join(w.text or '' for w in page.findall('.//{*}word'))) for page in pages]
 for key,title in titles:
  value=f['model'].get(key,'').strip()
  if value:assert any(norm(title) in pt and norm(value[:20]) in pt for pt in page_text),(f['id'],'stranded heading',title)
 # Replace only this verifier's numbered page/gray renders, so a shorter book
 # cannot leave obsolete pages in contact sheets on repeat validation.
 for previous in p.glob(f['id']+'-*.png'):
  if re.fullmatch(re.escape(f['id'])+r'-\d+(?:-gray)?\.png',previous.name):previous.unlink()
 # Independently rasterize every page; all outputs remain outside Git.
 sp.run(['pdftoppm','-r','110','-png',str(pdf),str(p/f['id'])],check=True,stdout=sp.DEVNULL,stderr=sp.PIPE)
 results.append(dict(id=f['id'],pages=len(pages),dimensions=dimensions,coverFits=coverfits,missingText=missing,bounds=bounds,overlaps=overlaps,blank=blank))
# The host controls must also produce actual independently parseable downloads.
ui=[]
for size in ['a4','a5']:
 file=p/('ui-download-'+size+'.pdf');info=run('pdfinfo',str(file));text=run('pdftotext',str(file),'-');
 assert 'Sea View Villa' in text and 'JavaScript:      no' in info
 width,height=map(float,re.search(r'Page size:\s+([\d.]+) x ([\d.]+)',info).groups())
 expected=[595.28,841.89] if size=='a4' else [419.53,595.28]
 assert all(abs(a-b)<.1 for a,b in zip([width,height],expected))
 ui.append(dict(size=size,property='Sea View Villa',dimensions=[width,height],passCheck=True))
(p/'ui-validation.json').write_text(json.dumps(ui,indent=2))
# Grayscale render for QR/presentation inspection, no PDF content changes.
for image in p.glob('welcome-a5-*.png'):
 if re.fullmatch(r'welcome-a5-\d+\.png',image.name):ImageOps.grayscale(Image.open(image)).save(image.with_name(image.stem+'-gray.png'))
images=sorted(file for file in p.glob('*-[0-9]*.png') if not file.name.startswith('contact-sheet-'))
for start in range(0,len(images),16):
 group=images[start:start+16];sheet=Image.new('RGB',(1200,4*450),'#ddd');draw=ImageDraw.Draw(sheet)
 for i,file in enumerate(group):
  im=Image.open(file).convert('RGB');im.thumbnail((285,415));x=(i%4)*300;y=(i//4)*450;sheet.paste(im,(x+(300-im.width)//2,y+24));draw.text((x+5,y+5),file.name,fill='black')
 sheet.save(p/f'contact-sheet-{start//16+1}.png')
# Compare canonical QR modules and four-module quiet zone after PDF rendering.
qr_results=[]
for f in fixtures:
 svg=run('node','--input-type=module','-e',"import {qrSvg} from './src/qr.js';process.stdout.write(qrSvg(process.argv[1]))",f['destination'])
 total=int(re.search(r'viewBox="0 0 (\d+)',svg).group(1));matrix=[[False]*total for _ in range(total)]
 for x,y,width,height in re.findall(r'M(\d+) (\d+)h(\d+)v(\d+)H\d+z',svg):
  x,y,width,height=map(int,(x,y,width,height))
  if width==total:continue
  for row in range(y,y+height):
   for col in range(x,x+width):matrix[row][col]=True
 first=next(file for file in p.glob(f['id']+'-*.png') if re.fullmatch(re.escape(f['id'])+r'-0*1\.png',file.name))
 im=Image.open(first).convert('RGB');pixels=im.load();points=[(x,y) for y in range(im.height) for x in range(im.width) if pixels[x,y]==(20,44,42)]
 assert points,(f['id'],'QR absent')
 left=min(x for x,y in points);right=max(x for x,y in points);top=min(y for x,y in points);bottom=max(y for x,y in points)
 scale=(right-left+1)/(total-8);ox=left-4*scale;oy=top-4*scale;mismatch=0;quiet=0
 # The flowing cover subtitle must end above the reserved QR panel, including
 # maximum-width titles. This checks text-versus-vector overlap beyond line boxes.
 coverwords=ET.fromstring(run('pdftotext','-bbox-layout',str(p/(f['id']+'.pdf')),'-')).findall('.//{*}page')[0].findall('.//{*}word')
 target=norm('Make yourself at home.');subtitle=[]
 for start in range(len(coverwords)):
  collected='';words=[]
  for word in coverwords[start:]:
   collected+=norm(word.text or '');words.append(word)
   if collected==target:subtitle=words;break
   if not target.startswith(collected):break
  if subtitle:break
 assert subtitle and max(float(word.attrib['yMax']) for word in subtitle)<oy-8,(f['id'],'cover title/subtitle reaches QR panel')
 for row in range(total):
  for col in range(total):
   # Pixel indices identify cells, so floor the geometric sample point.
   rgb=pixels[int(ox+(col+.5)*scale),int(oy+(row+.5)*scale)];dark=sum(rgb)<400
   mismatch+=dark!=matrix[row][col]
 for y in range(round(oy+1),round(oy+total*scale-1)):
  for x in range(round(ox+1),round(ox+total*scale-1)):
   if x<left-1 or x>right+1 or y<top-1 or y>bottom+1:quiet+=min(pixels[x,y])<250
 assert not mismatch and not quiet,(f['id'],mismatch,quiet)
 im.crop((int(ox),int(oy),int(ox+total*scale+1),int(oy+total*scale+1))).save(p/(f['id']+'-qr.png'))
 qr_results.append(dict(id=f['id'],destination=f['destination'],modulesCompared=total*total,moduleMismatches=mismatch,quietZoneModules=4,nonwhiteQuietPixels=quiet,independentDecoding='NOT TESTED: no installed decoder'))
(p/'qr-validation.json').write_text(json.dumps(qr_results,indent=2))
(p/'validation.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
