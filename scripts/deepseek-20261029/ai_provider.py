"""Text-provider switch; image understanding stays on the original Moonshot route."""
import copy
import json
import os
import urllib.error
import urllib.request


def has_images(payload):
    return any(isinstance(m.get('content'), list) and any(
        p.get('type') in ('image_url', 'input_image') for p in m['content'] if isinstance(p, dict)
    ) for m in payload.get('messages', []))


def request_json(url, key, payload, timeout):
    req = urllib.request.Request(url, data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError('AI provider HTTP ' + str(error.code)) from None
    except Exception as error:
        raise ValueError('AI provider transport ' + type(error).__name__) from None
    if not isinstance(result, dict) or not result.get('choices'):
        raise ValueError('AI provider invalid response')
    return result


def install(scope):
    if os.getenv('AI_TEXT_PROVIDER') != 'deepseek':
        return
    key = os.getenv('DEEPSEEK_API_KEY', '')
    if not key:
        raise RuntimeError('DeepSeek key missing')
    original_key = scope['AI_KEY']
    original_api = scope['AI_API']
    original_vision = scope['VISION_MODEL']
    model = os.getenv('DEEPSEEK_MODEL', 'deepseek-flash')
    endpoint = 'https://api.deepseek.com'

    def request(path, payload, timeout=24):
        if path != '/chat/completions':
            raise ValueError('AI route unsupported path')
        data = copy.deepcopy(payload)
        if has_images(data):
            data['model'] = original_vision
            return request_json(original_api + path, original_key, data, timeout)
        data['model'] = model
        data['thinking'] = {'type': 'disabled'}
        data.pop('reasoning_effort', None)
        return request_json(endpoint + path, key, data, timeout)

    # Install before chef_voice: its persona wrapper still wraps both routes.
    # creative_digest also uses these globals for its own direct JSON transport.
    scope.update(kimi_request=request, AI_KEY=key, AI_MODEL=model, AI_API=endpoint,
                 AI_TEXT_PROVIDER='deepseek')
