"""Archive only public YFAI GET responses and script resources for reproducible analysis.
No credentials, generated media, account mutations or generation requests.
"""
import concurrent.futures
import datetime
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'https://yf.token6688.com'
ROUTES = [
    '/zh-CN/console', '/zh-CN/console/models', '/zh-CN/console/keys',
    '/zh-CN/console/usage', '/zh-CN/console/calls',
    '/zh-CN/api-docs', '/zh-CN/api-docs/tasks', '/zh-CN/api-docs/media',
    '/openapi.json', '/v1/logical-models', '/v1/skills/models/mj_imagine',
]

def get(path):
    name = hashlib.sha256(path.encode()).hexdigest()[:12] + '-' + path.split('/')[-1]
    name = re.sub(r'[^a-zA-Z0-9_.-]', '_', name)
    if '.' not in name: name += '.txt'
    request = urllib.request.Request(BASE + path, headers={'User-Agent': 'FrameDock-public-integration-audit/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            data = response.read()
            content_type = response.headers.get('Content-Type', '')
            status = response.status
        (ROOT / 'sources' / name).write_bytes(data)
        return {'url': BASE + path, 'file': 'sources/' + name, 'status': status,
                'content_type': content_type, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    except Exception as error:
        return {'url': BASE + path, 'error': str(error)}

def main():
    (ROOT / 'sources').mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        entries = list(pool.map(get, ROUTES))
        scripts = set()
        for item in entries:
            if 'file' not in item or 'html' not in item['content_type']: continue
            text = (ROOT / item['file']).read_text()
            scripts.update(re.findall(r'<script[^>]+src="([^"]+)', text))
        entries.extend(pool.map(get, sorted(scripts)))
    (ROOT / 'manifest.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'entries': len(entries), 'scripts': len(scripts), 'bytes': sum(x.get('bytes', 0) for x in entries), 'errors': [x for x in entries if 'error' in x]}, ensure_ascii=False))

if __name__ == '__main__': main()
