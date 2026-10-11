from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parents[1]
out=['#pragma once','#include <Arduino.h>','struct WebAsset {const char* path;const char* type;const uint8_t* data;size_t size;};']
rows=[];manifest={}
for i,p in enumerate(sorted((root/'web').rglob('*'))):
    if not p.is_file():continue
    data=p.read_bytes();compressed=gzip.compress(data,mtime=0);name=f'web_{i}'
    out.append(f'static const uint8_t {name}[] PROGMEM = {{'+','.join(map(str,compressed))+'};')
    route='/'+p.relative_to(root/'web').as_posix();mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}[p.suffix]
    rows.append('{'+json.dumps(route)+','+json.dumps(mime)+f',{name},sizeof({name})'+'}')
    manifest[route]={'bytes':len(data),'gzip':len(compressed),'sha256':hashlib.sha256(data).hexdigest()}
out.append('static const WebAsset WEB_ASSETS[] = {'+','.join(rows)+'};')
(root/'firmware/VolcanoDial/web_assets.hpp').write_text('\n'.join(out)+'\n',encoding='utf-8')
(root/'web-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Lokale Web-Oberflaeche:',sum(x['gzip'] for x in manifest.values()),'Bytes gzip')
