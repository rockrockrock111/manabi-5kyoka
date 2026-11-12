"""Copy only explicitly public app assets; never copy a whole checkout."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
if SITE.exists():
    shutil.rmtree(SITE)
SITE.mkdir()
for name in ('index.html','app.js','question-bank.js','questions.json','manifest.webmanifest','icon.svg','sw.js'):
    shutil.copyfile(ROOT/name, SITE/name)
shutil.copytree(ROOT/'data', SITE/'data')
print('Prepared static assets in _site')
