"""Free contract probes only. Never calls invoke/generate or uploads user media.
Reads the existing FrameDock YFAI key in memory; never records credentials or upstream headers.
"""
import concurrent.futures
import datetime
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'https://yf.token6688.com'
ALLOWED = {'/api/v1/model-runtime/dry-run', '/v1/pricing-estimate', '/v1/models', '/v1/skills/balance'}

def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if not re.search(r'authorization|secret|cookie|api.?key|credential|^headers$|^channel_id$', k, re.I)}
    if isinstance(value, list): return [clean(x) for x in value]
    if isinstance(value, str):
        value = re.sub(r'(?i)Bearer\s+[^\s"\x27]+', 'Bearer [REDACTED]', value)
        value = re.sub(r'\bsk-[A-Za-z0-9_-]+', '[REDACTED]', value)
        if len(value) > 500: return {'string_length': len(value), 'preview': value[:160]}
    return value

def key_from_app():
    url = 'http://127.0.0.1:8787/api/kv/local_storage/infinite-canvas%3Aai_config_store'
    payload = json.load(urllib.request.urlopen(url, timeout=10))
    config = json.loads(payload['value'])['state']['config']
    return next(x['apiKey'] for x in config['channels'] if 'yf.token6688.com' in x.get('baseUrl', '') and x.get('apiKey'))

def main():
    key = key_from_app()
    def call(name, path, body=None):
        assert path in ALLOWED
        req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
        try:
            response = urllib.request.urlopen(req, timeout=60)
        except urllib.error.HTTPError as error: response = error
        except Exception as error: return {'name': name, 'error': type(error).__name__, 'path': path}
        with response:
            try: data = json.load(response)
            except Exception: data = {'non_json': True}
            if isinstance(data, dict) and isinstance(data.get('wire'), dict):
                wire = data['wire']
                if isinstance(wire.get('body'), str):
                    try: wire['body'] = json.loads(wire['body'])
                    except Exception: pass
                wire.pop('headers', None)
                wire.pop('url', None)
            if path == '/v1/models': data = {'model_count': len(data.get('data', []))}
            if path == '/v1/skills/balance': data = {'top_level_fields': list(data), 'credits_fields': list(data.get('credits', {}))}
            return {'name': name, 'path': path, 'status': response.status, 'input': clean(body), 'response': clean(data), 'observed_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}

    def invoke(model, category, params, **extra):
        return {'model_id': model, 'modality': category, 'params': params, **extra}
    base = {'prompt': 'A small cat, studio photograph.', 'mode': 'text-to-image', 'quality': '1', 'aspect_ratio': '1:1'}
    refs = ['https://example.com/reference-%d.png' % i for i in range(1, 6)]
    cases = [
        ('mj_generate', invoke('mj_imagine', 'image', base, operation='generate')),
        ('mj_edit_missing_attachment', invoke('mj_imagine', 'image', base, operation='edit')),
        ('mj_three_images', invoke('mj_imagine', 'image', {**base, 'images': refs[:3]}, operation='generate')),
        ('mj_duplicate_envelope_three', invoke('mj_imagine', 'image', {**base, 'images': refs[:3]}, operation='generate', attachments=refs[:3])),
        ('mj_five_images', invoke('mj_imagine', 'image', {**base, 'images': refs}, operation='generate')),
        ('mj_long_prompt', invoke('mj_imagine', 'image', {**base, 'prompt': 'A' * 7000}, operation='generate')),
        ('seedance_fast_4k', invoke('seedance-2-0-official', 'video', {'prompt': 'A landscape.', 'mode': 'text-to-video', 'quality': 'fast', 'resolution': '4k', 'duration': '4'})),
        ('seedance_special_10sec', invoke('seedance-2-5-special', 'video', {'prompt': 'A landscape.', 'mode': 'text-to-video', 'resolution': '720p', 'duration': '10'})),
        ('speech_prompt_only', invoke('speech-2.8', 'audio', {'prompt': 'Hello world.', 'voice': 'female-tianmei', 'version': '2.8', 'tier': 'hd'})),
        ('speech_input', invoke('speech-2.8', 'audio', {'input': 'Hello world.', 'voice': 'female-tianmei', 'version': '2.8', 'tier': 'hd'}, operation='speech')),
        ('music_generate', invoke('music', 'audio', {'prompt': 'Gentle instrumental piano.', 'mode': 'instrumental', 'version': 'chirp-v6'}, operation='generate')),
        ('whisper_transcribe', invoke('whisper-1', 'audio', {'audios': ['https://example.com/reference.mp3'], 'audio_duration_sec': '18.11'}, operation='transcribe')),
    ]
    results = [call('api_key', '/v1/models'), call('balance_shape', '/v1/skills/balance')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results.extend(pool.map(lambda case: call(case[0], '/api/v1/model-runtime/dry-run', case[1]), cases))
    quote = call('mj_channels', '/v1/pricing-estimate', {'model': 'mj_imagine', 'params': base, 'include_all_channels': True})
    results.append(quote)
    channels = quote.get('response', {}).get('channels', [])
    lane = next((v.get('lane') for v in channels if v.get('vendor') == 'BB6'), None)
    if lane:
        results.append(call('mj_bb6_pinned', '/api/v1/model-runtime/dry-run', invoke('mj_imagine', 'image', base, operation='generate', lane_ids=[lane])))
    results.append(call('video_quote_missing_duration', '/v1/pricing-estimate', {'model': 'seedance-2-5', 'params': {'mode': 'reference', 'duration': '5', 'resolution': '720p', 'videos': ['https://example.com/reference.mp4']}}))
    (ROOT / 'contract-probes.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    for r in results:
        response = r.get('response', {})
        print(json.dumps({'name': r['name'], 'status': r.get('status'), 'vendor': response.get('wire', {}).get('vendor'), 'error': clean(response.get('error') or r.get('error'))}, ensure_ascii=False))

if __name__ == '__main__': main()
