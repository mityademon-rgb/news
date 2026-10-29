"""Real-provider probes using only synthetic facts; never import server or send messages."""
import base64
import json
import os
from pathlib import Path
import struct
import zlib
import ai_provider


def png():
    def chunk(kind, value):
        return struct.pack('!I', len(value)) + kind + value + struct.pack('!I', zlib.crc32(kind + value))
    rows = []
    for y in range(80):
        row = bytearray(b'\0')
        for x in range(120):
            row.extend((220, 15, 15) if 15 <= x < 105 and 25 <= y < 55 else (255, 255, 255))
        rows.append(bytes(row))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', 120, 80, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')


def run():
    persona = Path(__file__).with_name('MENTOR_VOICE.md').read_text()
    s = dict(AI_KEY=os.environ['MOONSHOT_API_KEY'], AI_API='https://api.moonshot.ai/v1',
        AI_MODEL=os.getenv('KIMI_MODEL', 'kimi-k2.6'),
        VISION_MODEL=os.getenv('KIMI_VISION_MODEL') or os.getenv('KIMI_MODEL', 'kimi-k2.6'))
    ai_provider.install(s)
    def ask(task, data, maximum=1300):
        response = s['kimi_request']('/chat/completions', dict(model=s['AI_MODEL'],
            max_tokens=1500, response_format={'type':'json_object'}, messages=[
                {'role':'system','content':persona+'\n'+task+' До '+str(maximum)+' знаков. Верни JSON {"text":"..."}.'},
                {'role':'user','content':json.dumps(data,ensure_ascii=False)}]), timeout=35)
        choice = response['choices'][0]
        assert choice.get('finish_reason') != 'length', 'preflight-truncated'
        body = json.loads(choice['message']['content'])['text']
        assert isinstance(body,str) and 2 <= len(body) <= maximum, 'preflight-invalid-text'
        return body
    samples=[]
    prior=[]
    for date, weekday, temp in [('2026-10-30','пятница',4),('2026-10-31','суббота',2),('2026-11-01','воскресенье',1)]:
        text=ask('Редакционная проба на ВЫМЫШЛЕННЫХ погодных данных: создай утреннюю перекличку. '
            'Не копируй previous. Не добавляй памятных дат и неизвестных событий. Укажи срок приёма.',
            dict(date=date,weekday=weekday,weather={'temp_c':temp,'rain':True,'location':'Москва'},
                close='09:00' if weekday=='пятница' else '09:50', previous=prior))
        samples.append(dict(kind='morning',text=text));prior.append(text)
    prior=[]
    for topic in ['Сравнить запись голоса рядом с телефоном и в другом конце комнаты',
                  'Снять чашку с боковым и фронтальным светом окна',
                  'Сравнить общий вопрос интервью и вопрос о конкретном эпизоде']:
        text=ask('Редакционная проба: преврати заданный практический эксперимент в конкретный лайфхак. '
            'Не добавляй исторических фактов, числовых норм или обещаний. Не повторяй previous.',dict(topic=topic,previous=prior))
        samples.append(dict(kind='tip',text=text));prior.append(text)
    dialogue=[]
    for question in ['Кими, как снять монстра из обычной чашки?', 'А если свет только от окна?',
                     'Вернёмся к чашке: как спрятать ручку из кадра?']:
        text=ask('Ответь по существу текущей реплики, продолжи dialogue. Не начинай объяснение сначала.',
                 dict(message=question,dialogue=dialogue))
        samples.append(dict(kind='dialogue',text=text));dialogue.extend([dict(role='user',body=question),dict(role='assistant',body=text)])
    text=ask('Одна короткая подводка к игре, без ответа, подсказок и новых фактов.',
             dict(kind='Правда или вымысел',question_intentionally_withheld=True),400)
    samples.append(dict(kind='game-intro',text=text))
    print('SYNTHETIC_TEXT_SAMPLES',json.dumps(samples,ensure_ascii=False),flush=True)
    assert len(set(x['text'] for x in samples))==len(samples)
    # An original synthetic PNG, no children's photos or external uploads.
    try:
        result=s['kimi_request']('/chat/completions',dict(max_tokens=650,thinking={'type':'disabled'},messages=[
            {'role':'system','content':'Опиши только видимое. JSON {"visible":true,"observation":"...","comment":"..."}.'},
            {'role':'user','content':[{'type':'text','text':'Что видно? Дай конкретное наблюдение о форме и цвете, затем один совет по композиции.'},
             {'type':'image_url','image_url':{'url':'data:image/png;base64,'+base64.b64encode(png()).decode()}}]}]),timeout=40)
        body=result['choices'][0]['message']['content'].strip()
        if body.startswith('```'):body=body.split('\n',1)[1].rsplit('```',1)[0]
        image=json.loads(body)
        assert image.get('visible') is True and 'красн' in image.get('observation','').lower()
        print('SYNTHETIC_VISION_PASS',json.dumps(image,ensure_ascii=False),flush=True)
        vision=True
    except Exception as error:
        # Existing Moonshot route is preserved; its outage must be reported, never hidden.
        print('SYNTHETIC_VISION_UNAVAILABLE',type(error).__name__,flush=True)
        vision=False
    print('PREFLIGHT_TEXT_PASS',len(samples),'VISION_PASS',vision,'NO_MESSAGES_SENT',flush=True)
    return vision


if __name__=='__main__':run()
