"""Copy only explicitly public app assets; never copy a whole checkout."""
from pathlib import Path
import shutil
import json

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
if SITE.exists():
    shutil.rmtree(SITE)
SITE.mkdir()
for name in ('index.html','app.js','question-bank.js','questions.json','manifest.webmanifest','icon.svg','sw.js'):
    shutil.copyfile(ROOT/name, SITE/name)
catalog = json.loads((ROOT/'data/catalog.json').read_text())
(SITE/'data').mkdir()
shutil.copyfile(ROOT/'data/catalog.json', SITE/'data/catalog.json')
for unit in catalog['units']:
    if not unit['file']:
        continue
    source = (ROOT/'data'/unit['file']).resolve()
    if not source.is_relative_to(ROOT/'data/questions'):
        raise ValueError('Question path escapes the public question bank')
    destination = SITE/'data'/unit['file']
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
print('Prepared static assets in _site')
