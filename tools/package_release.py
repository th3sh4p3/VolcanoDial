"""Create a portable release without build caches, debug symbols or device secrets."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
images={'VolcanoDial.ino.bin','VolcanoDial.ino.bootloader.bin','VolcanoDial.ino.partitions.bin','boot_app0.bin'}
files=[]
for p in root.rglob('*'):
    if not p.is_file():continue
    rel=p.relative_to(root)
    if any(x in {'.git','dist','superpowers','build','.build-tools','__pycache__','node_modules'} for x in rel.parts):continue
    if rel.parts[0]=='bin' and p.name not in images:continue
    files.append(p)
required=[root/'bin'/n for n in images]+[root/'tools/esptool.exe']
manifest={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest().upper() for p in required}
(root/'SHA256SUMS.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
version=json.loads((root/'package.json').read_text(encoding='utf8'))['version']
target=root/'dist'/f'VolcanoDial_{version}.zip'
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):z.write(p,'VolcanoDial/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert all('private' not in name and 'device-backup' not in name for name in z.namelist())
print(target)
print(f'{len(files)} Dateien, {target.stat().st_size} Bytes, SHA256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
