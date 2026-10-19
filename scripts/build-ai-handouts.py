#!/usr/bin/env python3
"""Generate four one-page course handouts and the offline workbook from canonical lessons.js."""
import io,json,subprocess
from pathlib import Path
from xml.sax.saxutils import escape
import qrcode
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
ROOT=Path(__file__).resolve().parents[1]
raw=subprocess.check_output(['node','-e',"const vm=require('vm'),fs=require('fs');const ctx={window:{}};vm.runInNewContext(fs.readFileSync('lessons.js','utf8'),ctx);process.stdout.write(JSON.stringify(ctx.window.TIMECODE_AI_COURSE));"],cwd=ROOT)
course=json.loads(raw)
OUT=ROOT/'assets/ai-course/handouts';OUT.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('D','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DB','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
style=ParagraphStyle('body',fontName='D',fontSize=10.5,leading=15.2,textColor=HexColor('#17202a'))
styleb=ParagraphStyle('bold',parent=style,fontName='DB')
services=['https://giga.chat/','https://chat.deepseek.com/','https://gamma.app/','https://giga.chat/']
selected=[12,3,9,2]
# A compact but complete prompt, leaving room for legible steps and QR codes.
prompts=[
'Ты методист ДК. Составь карточку кружка [название] для [возраст, уровень]. Условия: [материалы, длительность и частота встреч]. Формат: цель для родителей; конкретные навыки за 3 месяца; материалы; отдельно живой пост до 500 знаков с призывом записаться. Без клише и выдуманных цен, контактов, наград. Недостающие данные спроси.',
'У меня занятия в кружке по журналистике для детей 12+. Начни с азов. Создай план на 2 года обучения с упором на практику. Учитывай занятия 2 раза в неделю. Затем: подробно распиши первый месяц и создай игровой урок по одной из тем. Оформи понравившийся вариант таблицей для Word или Excel.',
'Создай презентацию на 6 слайдов для [тема, возраст] по проверенному сценарию: [вставить]. Структура: вопрос; объяснение с картинкой; правила игры; практика; сравнение; самопроверка. Один смысл и до 35 слов на экран. Предложи визуалы, не добавляй новые факты. Отдельно составь раздатку: 3 шага и критерий результата.',
'Ты редактор документов ДК. Преврати проверенную заметку [вставить обезличенные факты] в отчёт до одной страницы A4. Разделы: дата и тема; аудитория; цель по исходным данным; проведённые действия; наблюдаемые результаты; отклонения от плана. Не выдумывай эффект, отзывы, охват и награды. Недостающие данные вынеси в вопросы.'
]
prompts[0] = next(c["prompt"] for c in course[0]["cards"] if c["title"] == "Теперь — карточка, которую можно использовать")

def qr_image(url):
 img=qrcode.make(url);b=io.BytesIO();img.save(b,format='PNG');b.seek(0);return ImageReader(b)
def para(cv,text,y,width=511,bold=False,x=42):
 p=Paragraph(escape(text).replace('\n','<br/>'),styleb if bold else style);w,h=p.wrap(width,800);p.drawOn(cv,x,y-h);return y-h-7
for i,l in enumerate(course):
 if i not in (0,1): continue
 filename=OUT/f'module-{i+1:02}.pdf';cv=canvas.Canvas(str(filename),pagesize=(595.28,841.89));cv.setTitle(f'TIMECODE. Памятка {i+1}. {l["title"]}');cv.setAuthor('TIMECODE')
 cv.setFillColor(HexColor('#2458ea'));cv.rect(0,827,595,15,fill=1,stroke=0)
 cv.setFillColor(HexColor('#2458ea'));cv.setFont('DB',11);cv.drawString(42,798,f'TIMECODE / КУЛЬТУРНЫЙ КОД / 0{i+1}')
 y=para(cv,l['title'],774,bold=True);y=para(cv,'90 минут очно. После встречи: 30-40 минут за компьютером.',y)
 cv.drawImage(qr_image(f'https://timecode-lab.ru/#/ai/{i+1}/0'),42,y-100,100,100)
 cv.drawImage(qr_image(services[i]),170,y-100,100,100)
 cy=y-5;cy=para(cv,'Слева - урок. Справа - сервис.',cy,width=245,x=300,bold=True);cy=para(cv,services[i],cy,width=245,x=300);cv.linkURL(services[i],(170,y-100,270,y),relative=0);cv.linkURL(f'https://timecode-lab.ru/#/ai/{i+1}/0',(42,y-100,142,y),relative=0)
 y-=119;y=para(cv,'ГОТОВЫЙ ЗАПРОС / замените поля [в скобках]',y,bold=True)
 y=para(cv,prompts[i],y)
 y-=5;y=para(cv,'ДОМА / пошагово',y,bold=True)
 finish=next(c for c in l['cards'] if c['kind']=='finish')
 for j,t in enumerate(finish['steps'][:4]):y=para(cv,f'{j+1}. {t}',y)
 y-=3;y=para(cv,'ПЕРЕД СОХРАНЕНИЕМ И ОТПРАВКОЙ',y,bold=True)
 checks=['Названия, возраст, контакты, материалы и обещания.','План начинается с азов, подходит возрасту, в каждой теме есть практика. Часы и бланк добавляем после содержания.','Смысл и анатомия изображений, читаемость, поля, права.','Факты, даты, числа, единицы часов; никаких приписок.'][i]
 y=para(cv,checks+' Уберите заглушки [ ]. Проверьте файл целиком.',y)
 assert y>40,(i,y)
 cv.setFillColor(HexColor('#566171'));cv.setFont('D',8);cv.drawString(42,25,'Сервис не открылся? Откройте урок: там запасной вариант и все запросы. 19.10.2026')
 cv.showPage();cv.save()
# Canonical QR opening the first lesson, not an external redirect.
import qrcode.image.svg
for name,url in [('lesson-01-qr.svg','https://timecode-lab.ru/#/ai/1/0'),('course-qr.svg','https://timecode-lab.ru/#/ai')]:
 qrcode.make(url,image_factory=qrcode.image.svg.SvgPathImage,box_size=10,border=4).save(ROOT/'assets/ai-course'/name)
# Empty editable KTP structure; data must come from the teacher's actual programme.
(ROOT/'assets/ai-course/plan-template.csv').write_text('\ufeffПериод;Тема;Что дети делают на практике;Какая работа получается\nПервый год;;;\nВторой год;;;\n',encoding='utf8')
# Offline workbook: students only, never instructor narration.
parts=['<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Культурный код - рабочая тетрадь</title><style>body{font:18px/1.6 Arial,sans-serif;max-width:900px;margin:auto;padding:30px;color:#17202a}h1,h2{line-height:1.15}h2{margin-top:55px;border-top:4px solid #2458ea;padding-top:25px}pre{white-space:pre-wrap;background:#f0f3f8;padding:20px;font:16px/1.6 monospace}article{margin:35px 0}img{max-width:100%}a{color:#2458ea}@media print{h2{break-before:page}article{break-inside:avoid}button{display:none}}</style><h1>Культурный код на автопилоте</h1><p>4 встречи по 90 минут. В зале 6 астрономических / 8 академических часов. После каждой встречи - 30-40 минут дома.</p><button onclick="window.print()">Печать / сохранить PDF</button><p><a href="https://timecode-lab.ru/#/ai">К интерактивным урокам</a></p>']
for i,l in enumerate(course):
 parts.append(f'<h2>{i+1}. {escape(l["title"])}</h2><p>{escape(l["result"])}</p><p><a href="handouts/module-{i+1:02}.pdf">Одностраничная памятка PDF</a></p>')
 for c in l['cards']:
  parts.append(f'<article><h3>{escape(c["title"])}</h3><p>{escape(c["text"])}</p>')
  parts.extend(f'<p>{escape(t)}</p>' for t in c.get('read',[]))
  if c.get('outcomes'):parts.extend(f'<p><b>{escape(o["title"])}</b>: {escape(o["text"])}</p>' for o in c['outcomes'])
  if c['steps']:parts.append('<ol>'+''.join(f'<li>{escape(t)}</li>' for t in c['steps'])+'</ol>')
  if c['prompt']:parts.append('<pre>'+escape(c['prompt'])+'</pre>')
  if c.get('links'):parts.extend(f'<p><a href="{escape(t["url"])}">{escape(t["label"])}</a></p>' for t in c['links'])
  parts.append('</article>')
parts.append('</html>');(ROOT/'assets/ai-course/workbook.html').write_text(''.join(parts))
print('Updated handouts 1-2; rebuilt workbook and course QR; preserved handouts 3-4')
