import os
import unittest
from unittest.mock import patch
import ai_provider


class Routing(unittest.TestCase):
    def scope(self):
        return dict(AI_KEY='old-placeholder', AI_API='https://original.invalid/v1',
                    AI_MODEL='old', VISION_MODEL='old-vision', kimi_request=lambda *a: None)

    @patch.dict(os.environ, {'AI_TEXT_PROVIDER': 'deepseek', 'DEEPSEEK_API_KEY': 'new-placeholder'})
    def test_text_and_photo_keep_separate_credentials(self):
        scope = self.scope()
        ai_provider.install(scope)
        body = {'model': 'old', 'thinking': {'type': 'disabled'},
                'messages': [{'role': 'system', 'content': 'persona'}, {'role': 'user', 'content': 'hi'}]}
        with patch.object(ai_provider, 'request_json', return_value={'choices': []}) as send:
            scope['kimi_request']('/chat/completions', body)
            url, key, data, timeout = send.call_args.args
            self.assertEqual((url, key, data['model']),
                ('https://api.deepseek.com/chat/completions', 'new-placeholder', 'deepseek-flash'))
            self.assertEqual(data['thinking'], {'type': 'disabled'})
            self.assertEqual(data['messages'], body['messages'])
            self.assertIn('thinking', body)
            photo = {'messages': [{'role': 'user', 'content': [{'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,AA'}}]}]}
            scope['kimi_request']('/chat/completions', photo, timeout=40)
            url, key, data, timeout = send.call_args.args
            self.assertEqual((url, key, data['model'], timeout),
                ('https://original.invalid/v1/chat/completions', 'old-placeholder', 'old-vision', 40))

    @patch.dict(os.environ, {'AI_TEXT_PROVIDER': 'moonshot'})
    def test_disabled_is_unchanged(self):
        scope = self.scope()
        old = dict(scope)
        ai_provider.install(scope)
        self.assertEqual(scope, old)


if __name__ == '__main__':
    unittest.main()
