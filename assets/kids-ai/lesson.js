(function(){
'use strict';
const BASE='./assets/kids-ai/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessions=new Map();
const kinds=[['text','Текст','writer'],['image','Изображение','artist'],['sound','Звук','musician'],['video','Видео','director'],['human','Человек','welcome'],['data','Сначала данные','learning']];
const helpers=[
 ['Интервью','writer','Помощник предлагает вопросы','Предложи три открытых вопроса школьнику, который снял первый фильм.','Мы слушаем гостя и уточняем то, что он действительно рассказал.'],
 ['Съёмка','director','Помощник предлагает идею','Придумай смешную историю на 30 секунд для троих участников с телефоном.','Мы выбираем планы, снимаем действие, проверяем картинку и звук.'],
 ['Ведущий','writer','Помощник упрощает фразу','Перепиши это сообщение коротко и понятно для школьников: [текст].','Мы произносим текст своим голосом, делаем паузы и общаемся со зрителем.'],
 ['Оформление','artist','Помощник предлагает изображение','Нарисуй персонажа для программы о школьных опытах: любопытного робота.','Мы решаем, подходит ли образ программе, и проверяем детали.']
];
const offline='Космический кот оказался в обычном кабинете. Карандаш на столе вдруг заявил: «Я тоже хочу в космос!» Кот построил ему ракету из бумаги, торжественно начал отсчёт — и карандаш нарисовал на листе Луну. «Прибыли», — сказал он. Кот посмотрел на рисунок: «Самый экономный полёт в моей жизни». Конец.';
function art(s){
 if(!s.image)return '';
 const motion=s.motion?BASE+s.motion+'-motion.webp?v=20261112-02':'';
 const still=esc(s.image);
 return `<figure class="nai-art"><img src="${still}" alt="${esc(s.imageAlt||s.title)}" ${motion?`data-nai-motion="${esc(motion)}" data-nai-still="${still}"`:''} loading="eager"><figcaption><span>Иллюстрация создана нейросетью</span>${motion?`<button type="button" data-nai-motion-toggle aria-pressed="false">Включить анимацию</button><a href="${BASE+s.motion}-motion.gif" download>GIF ↓</a>`:''}</figcaption></figure>`;
}
function typeCards(){return `<div class="nai-types">${kinds.slice(0,4).map(([id,title,img])=>`<figure><img src="${BASE+img}.webp" alt="Помощник: ${title.toLowerCase()}"><figcaption><b>${title}</b><span>${{text:'Истории, вопросы, объяснения',image:'Рисунки и варианты оформления',sound:'Музыка, голоса, эффекты',video:'Короткие движущиеся сцены'}[id]}</span></figcaption></figure>`).join('')}</div>`;}
function gameBody(){return '<div class="nai-game" data-nai-game></div>';}
function helperBody(){return `<div class="nai-help-tabs">${helpers.map((h,i)=>`<button type="button" data-nai-help="${i}" aria-pressed="${i===0}"><img src="${BASE+h[1]}.webp" alt=""><span>${h[0]}</span></button>`).join('')}</div><div class="nai-help-answer" data-nai-help-output></div>`;}
function builderBody(){return `<form class="nai-builder" data-nai-builder><label>1. Кто герой?<select name="hero"><option>космический кот</option><option>любопытный робот</option><option>забытый рюкзак</option></select></label><label>2. Где всё происходит?<select name="place"><option>обычный кабинет</option><option>школьная библиотека</option><option>коридор перед съёмкой</option></select></label><label>3. Что случилось?<select name="event"><option>обычный предмет начал разговаривать</option><option>герой получил странное сообщение</option><option>всё неожиданно пошло наоборот</option></select></label><button class="nai-primary" type="submit">Собрать задание →</button></form><section class="nai-prompt-area" data-nai-builder-output hidden><label for="nai-built">Готовое задание — его можно отредактировать</label><textarea id="nai-built" rows="6" spellcheck="false"></textarea><div class="nai-action-row"><button class="nai-primary" type="button" data-nai-copy-built>Скопировать задание</button><a href="https://alice.yandex.ru/" target="_blank" rel="noopener noreferrer">Открыть Алису ↗</a><a href="https://giga.chat/" target="_blank" rel="noopener noreferrer">Открыть ГигаЧат ↗</a></div><ol class="nai-mini-steps"><li>Открой доступный чат на устройстве взрослого.</li><li>Вставь задание в поле сообщения и отправь.</li><li>Прочитай ответ. Вернись в урок кнопкой вкладки браузера и нажми «Дальше».</li></ol><p class="nai-small">Внешний сервис может попросить вход. Используем доступ взрослого; личный аккаунт ребёнка для урока не нужен.</p></section><details class="nai-offline"><summary>Чат не открылся? Разберём готовый пример</summary><p class="nai-small">Подготовленный учебный пример, а не ответ из подключённого чата. Герой — космический кот, место — кабинет, событие — говорящий предмет.</p><p>${offline}</p><p class="nai-small">Роли для чтения: кот, карандаш, рассказчик.</p><p>Назови начало, неожиданность и финал. Что хочется изменить? На следующем экране есть фразы для правки.</p></details>`;}
function editorBody(){return `<div class="nai-edit-grid"><button type="button" data-nai-edit="short">Слишком длинно</button><button type="button" data-nai-edit="props">Нужен сложный реквизит</button><button type="button" data-nai-edit="ending">Не хватает финала</button><button type="button" data-nai-edit="fun">Хочется смешнее</button></div><section class="nai-prompt-area" data-nai-edit-output hidden><label for="nai-edit-text">Продолжение разговора — проверь и отправь в тот же чат</label><textarea id="nai-edit-text" rows="3" spellcheck="false"></textarea><button class="nai-primary" type="button" data-nai-copy-edit>Скопировать правку</button></section><div class="nai-before-after"><b>Как сравнить две версии?</b><ol><li>Что конкретно изменилось?</li><li>Историю стало понятнее или проще сыграть?</li><li>Какую версию берём и почему?</li></ol><p>Работаете с готовым примером без чата? Предложите исправленный финал сами и прочитайте две версии вслух.</p></div>`;}
function render(s,copy){
 const full=['types','dispatch','trust','help','builder','editor','quiz'].includes(s.mode);
 const read=s.read?.length?'<div class="nai-read">'+s.read.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'';
 let work='';
 if(s.mode==='types')work=typeCards();
 if(['dispatch','trust','quiz'].includes(s.mode))work=gameBody();
 if(s.mode==='help')work=helperBody();
 if(s.mode==='builder')work=builderBody();
 if(s.mode==='editor')work=editorBody();
 const example=s.example?`<div class="nai-example"><span>ПРИМЕР ПОРУЧЕНИЯ</span><p>${esc(s.example)}</p></div>`:'';
 const badge=s.badge?'<p class="nai-badge">'+esc(s.badge)+'</p>':'';
 const takeaway=s.takeaway?'<p class="nai-takeaway">'+esc(s.takeaway)+'</p>':'';
 return `<article class="scene nai-scene nai-${esc(s.mode)} ${full?'nai-full':''}"><div class="nai-copy">${badge}${copy}${read}${example}${takeaway}</div>${full?'':art(s)}${work?'<section class="nai-work">'+work+'</section>':''}</article>`;
}
async function copyText(value,b){try{await navigator.clipboard.writeText(value);b.textContent='Скопировано ✓';}catch{b.textContent='Выдели текст выше и скопируй вручную';}}
function resize(t){if(!t)return;t.style.height='auto';t.style.height=Math.max(90,t.scrollHeight+3)+'px';}
function bind(s,mark,lesson,scene){
 const root=document.querySelector('.nai-scene');if(!root)return;
 const context=lesson+':'+scene;
 if(!sessions.has(context))sessions.set(context,{index:0,solved:[],guess:null,finished:false});
 const state=sessions.get(context);
 root.querySelectorAll('[data-nai-motion]').forEach(img=>{
  const btn=root.querySelector('[data-nai-motion-toggle]');let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show=()=>{img.src=playing?img.dataset.naiMotion:img.dataset.naiStill;btn.textContent=playing?'Пауза анимации':'Включить анимацию';btn.setAttribute('aria-pressed',String(playing));};
  btn.addEventListener('click',()=>{playing=!playing;show();});show();
 });
 const game=root.querySelector('[data-nai-game]');
 if(game){
  const tasks=s.tasks;
  function paint(){
   if(state.finished){game.innerHTML=`<div class="nai-game-finish"><span>МИССИЯ ВЫПОЛНЕНА</span><h3>Разобрались с ${tasks.length} заданиями!</h3><p>${s.mode==='dispatch'?'Теперь ты выбираешь помощника по задаче. А если нужны сведения о реальном событии — сначала ищешь источник.':'Ты умеешь выбирать, проверять и улучшать ответ. Эти решения пригодятся в следующем задании.'}</p><button type="button" class="nai-primary" data-nai-restart>Сыграть ещё раз</button><p class="nai-small">Можно нажать «Дальше» внизу урока.</p></div>`;game.querySelector('[data-nai-restart]').onclick=()=>{Object.assign(state,{index:0,solved:[],guess:null,finished:false});paint();};return;}
   const t=tasks[state.index];
   const options=s.mode==='dispatch'?kinds.map(x=>({value:x[0],label:x[1],image:x[2]})):s.mode==='trust'?[{value:'use',label:'Можно попробовать'},{value:'check',label:'Сначала проверим'},{value:'fix',label:'Попросим исправить'}]:t.options.map((x,i)=>({value:String(i),label:x}));
   const correct=s.mode==='quiz'?String(t.correct):t.answer;
   const answered=state.guess!==null;const right=answered&&state.guess===correct;
   game.innerHTML=`<div class="nai-game-header"><b>ЗАДАНИЕ ${state.index+1} / ${tasks.length}</b><span>Выбери ответ → прочитай объяснение</span></div><div class="nai-task ${t.art?'nai-task-with-art':''}">${t.art?`<img src="${BASE+t.art}.webp" alt="Помощник в творческой лаборатории">`:''}<h3>${esc(t.task)}</h3></div><div class="nai-options ${s.mode==='dispatch'?'nai-options-six':''}">${options.map(o=>`<button type="button" data-nai-answer="${esc(o.value)}" aria-pressed="${state.guess===o.value}" ${right?'disabled':''}>${o.image?`<img src="${BASE+o.image}.webp" alt="">`:''}<span>${esc(o.label)}</span></button>`).join('')}</div>${answered?`<div class="nai-feedback ${right?'nai-correct':'nai-retry'}" role="status"><b>${right?'Да, подходит!':'Давай разберёмся.'}</b><p>${esc(t.why)}</p>${right?'':'<span>Теперь выбери подходящий ответ.</span>'}</div>`:''}<button type="button" class="nai-primary nai-game-next" data-nai-next ${right?'':'disabled'}>${state.index===tasks.length-1?'Завершить игру →':'Следующая задача →'}</button>`;
   game.querySelectorAll('[data-nai-answer]').forEach(b=>b.onclick=()=>{state.guess=b.dataset.naiAnswer;if(state.guess===correct)state.solved[state.index]=true;paint();});
   game.querySelector('[data-nai-next]').onclick=()=>{if(!right)return;if(state.index===tasks.length-1){state.finished=true;mark();}else{state.index++;state.guess=null;}paint();};
  }paint();
 }
 const help=root.querySelector('[data-nai-help-output]');
 if(help){const show=i=>{const h=helpers[i];help.innerHTML=`<h3>${h[2]}</h3><div class="nai-example"><span>ПОРУЧЕНИЕ ПОМОЩНИКУ</span><p>${esc(h[3])}</p></div><p><b>Наша работа:</b> ${esc(h[4])}</p>`;root.querySelectorAll('[data-nai-help]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.naiHelp)===i)));};root.querySelectorAll('[data-nai-help]').forEach(b=>b.onclick=()=>show(Number(b.dataset.naiHelp)));show(0);}
 const form=root.querySelector('[data-nai-builder]');
 if(form){
  const output=root.querySelector('[data-nai-builder-output]'),field=root.querySelector('#nai-built');
  form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);field.value=`Придумай смешную историю на одну минуту для детей 12+. Герой — ${d.get('hero')}. Место — ${d.get('place')}. Происшествие: ${d.get('event')}. Нас трое, есть обычный кабинет и один телефон. История должна быть понятной, с началом, неожиданностью и финалом. Без покупок, опасных действий и сложных трюков. Дай короткий текст и роли для троих.`;state.prompt=field.value;output.hidden=false;root.querySelector('[data-nai-copy-built]').textContent='Скопировать задание';resize(field);});
  if(state.prompt){field.value=state.prompt;output.hidden=false;requestAnimationFrame(()=>resize(field));}
  field.addEventListener('input',()=>{state.prompt=field.value;resize(field);});
  root.querySelector('[data-nai-copy-built]').onclick=e=>copyText(field.value,e.currentTarget);
 }
 const edits={short:'Сократи историю до одной минуты чтения. Сохрани понятное начало, неожиданность и финал.',props:'Переделай историю так, чтобы её могли сыграть трое детей в обычном кабинете. Без покупок, костюмов и сложных трюков. Из реквизита только бумага и карандаш.',ending:'Сделай финал понятным и неожиданным. Пусть он завершает именно эту историю, а не начинает другую.',fun:'Добавь один смешной поворот. Пусть смешной будет ситуация, без обидных шуток про людей.'};
 root.querySelectorAll('[data-nai-edit]').forEach(b=>b.onclick=()=>{root.querySelector('[data-nai-edit-output]').hidden=false;const t=root.querySelector('#nai-edit-text');t.value=edits[b.dataset.naiEdit];resize(t);root.querySelector('[data-nai-copy-edit]').textContent='Скопировать правку';});
 root.querySelector('[data-nai-copy-edit]')?.addEventListener('click',e=>copyText(root.querySelector('#nai-edit-text').value,e.currentTarget));
}
window.TIMECODE_KIDS_AI={render,bind};
})();
