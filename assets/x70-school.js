(function(){
"use strict";
const SOURCE="https://pro.sony/s3/cms-static-content/uploadfile/99/1237493098399.pdf";
const PHOTO="https://newmedia.report/images/tutorials/x70/image37.jpg";
const COMMONS="https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Camera124.jpg/960px-Camera124.jpg";
const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=(root,sel)=>root.querySelector(sel);
const els=(root,sel)=>Array.from(root.querySelectorAll(sel));
const make=(label,value)=>'<button type="button" data-x70-value="'+e(value)+'">'+e(label)+'</button>';
const face='<div class="x70-person"><div class="x70-hair"></div><div class="x70-head"><i></i><i></i><b></b></div><div class="x70-shirt"></div></div>';
const key=(lesson,scene)=>"tc-x70:"+lesson+":"+scene;
function result(root,ok,good,bad){const o=el(root,"[data-x70-result]");if(o){o.textContent=ok?good:bad;o.classList.toggle("is-right",!!ok);o.classList.toggle("is-wrong",!ok);}}
function frame(){return '<div class="x70-view"><div class="x70-grid"></div>'+face+'<span class="x70-rec">● STBY</span><span class="x70-meta" data-x70-meta>1080 / 25p</span></div>';}
function credit(src,label){return '<p class="x70-credit">Иллюстрация: <a target="_blank" rel="noopener noreferrer" href="'+e(src)+'">'+e(label)+'</a></p>';}
function render(s,copy){
const title='<section class="x70-stage"><div class="x70-demo">';
let body="";
if(s.mode==="photo"){
body='<div class="x70-real-photo"><img src="'+PHOTO+'" alt="Реальная Sony PXW-X70: боковые кнопки питания, WHT BAL, IRIS, GAIN, SHUTTER SPEED, слот SD" loading="eager" referrerpolicy="no-referrer"/><div class="x70-photo-points">'+[
["IRIS",22,90,"Диафрагма: управляет количеством света и глубиной резкости."],
["GAIN",34,90,"Усиление в темноте. Чем больше dB, тем заметнее шум."],
["SHUTTER SPEED",46,90,"Выдержка. При 25p для начала ставим 1/50 секунды."],
["WHT BAL",45,60,"Баланс белого: сохраняем правильный цвет кожи и белых предметов."],
["THUMBNAIL",47,38,"Просмотр. После дубля найдите и воспроизведите файл."],
["POWER",45,47,"Питание. Камеру включают и выключают штатной кнопкой."]
].map((p,i)=>'<button style="left:'+p[1]+'%;top:'+p[2]+'%" type="button" aria-label="Найти '+e(p[0])+'" data-x70-hot="'+i+'">'+(i+1)+'</button>').join("")+'</div></div>'+
credit("https://multimedia.journalism.berkeley.edu/tutorials/sony-x70/","Berkeley Advanced Media Institute · фото панели Sony X70")+
'<p class="x70-small">Цифры стоят на настоящих кнопках. Нажимай их, пока не найдёшь все шесть. Затем покажи кнопки на вашей камере.</p><div class="x70-tip" data-x70-tip>Нажми на кружок на фотографии, чтобы узнать назначение кнопки.</div><div class="x70-track" data-x70-tracker>Найдено 0 из 6</div>';
}else if(s.mode==="back"){
body='<div class="x70-sideby"><img class="x70-camera-picture" src="'+COMMONS+'" alt="Настоящая Sony PXW-X70 на штативе: объектив, рукоятка, экран, видоискатель" loading="lazy"/><div class="x70-steps"><strong>Осмотри настоящую камеру</strong><p>Найди: объектив, бленду, ручку, откидной экран, видоискатель, батарею и разъём микрофона. Если сомневаешься, спроси у преподавателя, а не тяни за непонятную деталь.</p><div class="x70-chips">Объектив · Экран · Видоискатель · Рукоятка · Аккумулятор</div><p class="x70-small">Камеру переносим только за штатную рукоятку или корпус, со страховкой ремнём. Не переносим за экран и микрофон.</p></div></div>'+credit("https://commons.wikimedia.org/wiki/File:Camera124.jpg","Niyasbinnazeer · CC BY-SA 3.0, оригинальная фотография, без изменения")+'<a class="x70-source" target="_blank" rel="noopener" href="'+SOURCE+'">Схемы корпуса в руководстве Sony, страницы 4–11</a>';
}else if(s.mode==="order"||s.mode==="sequence"){
let items=s.items||[];
body='<div class="x70-sideby"><div class="x70-steps"><h3>'+e(s.mode==="order"?"Собери алгоритм":"Выстрой монтаж")+'</h3><p>Нажимай действия в правильной последовательности. Для мыши доступно перетаскивание, для телефона — касание.</p><div class="x70-order-options">'+items.map((x,i)=>'<button draggable="true" type="button" data-x70-order="'+i+'">'+e(x)+'</button>').join("")+'</div></div><div class="x70-steps"><h3>Твой порядок</h3><ol data-x70-order-list></ol><button type="button" data-x70-order-reset>Начать заново</button><button type="button" data-x70-order-verify>Проверить последовательность</button><div class="x70-feedback" data-x70-result>Ошибаться можно. Важно понять, почему порядок имеет значение.</div></div></div>';
}else if(s.mode==="video"){
const start=Number(s.start||0);
body='<div class="x70-video"><iframe loading="lazy" title="'+e(s.videoTitle||"Обучающее видео Sony PXW-X70")+'" src="https://www.youtube-nocookie.com/embed/oHytL4rJXg0?start='+start+'&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="x70-small">Фрагмент демонстрации Bath Spa University, автор Frederick Reed. Если YouTube недоступен, выполните параллельную проверку на настоящей камере.</p><a href="https://www.youtube.com/watch?v=oHytL4rJXg0&t='+start+'s" target="_blank" rel="noopener">Открыть исходный ролик</a><div class="x70-feedback">Задание: после просмотра покажи преподавателю тот же орган управления на Sony.</div>';
}else if(s.mode==="compare"||s.mode==="framing"||s.mode==="focus"){
body='<div class="x70-sideby"><div class="x70-shot">'+frame()+'</div><div class="x70-steps"><h3>'+e(s.action||"Найди правильный кадр")+'</h3><p>'+e(s.instruction||"Меняй параметры и наблюдай, как изменяется изображение.")+'</p>';
if(s.mode==="compare")body+='<label class="x70-field">'+e(s.sliderLabel||"Параметр")+'<input type="range" min="0" max="100" value="100" data-x70-slide/><span data-x70-readout>100%</span></label>';
if(s.mode==="framing")body+='<label class="x70-field">Крупность <input type="range" min="40" max="160" value="95" data-x70-zoom/></label><label class="x70-field">Горизонт <input type="range" min="-15" max="15" value="9" data-x70-level/></label><label class="x70-field">Положение героя <input type="range" min="-35" max="35" value="20" data-x70-position/></label>';
if(s.mode==="focus")body+='<div class="x70-option">'+make("Резкий фон","background")+make("Резкие глаза","eyes")+'</div>';
body+='<button type="button" data-x70-evaluate>Проверить кадр</button><div class="x70-feedback" data-x70-result>Сначала исправь изображение.</div></div></div>';
}else if(s.mode==="exposure"){
body='<div class="x70-sideby"><div><div class="x70-shot">'+frame()+'</div><p class="x70-small">Учебная модель: эффект яркости, шума, цвета и резкости упрощён. Реальная экспозиция зависит от света сцены и настроек камеры.</p></div><div class="x70-steps"><h3>Пульт оператора</h3><div class="x70-controls">'+[
["SHUTTER","shutter",[["1/25",25],["1/50",50],["1/100",100],["1/200",200]]],
["IRIS","iris",[["F2.8",2.8],["F4",4],["F5.6",5.6],["F8",8],["F11",11]]],
["GAIN","gain",[["0 dB",0],["+6 dB",6],["+12 dB",12],["+18 dB",18]]],
["ND","nd",[["CLEAR",0],["1/4",1],["1/16",2],["1/64",3]]],
["WHITE BALANCE","wb",[["3200 K · лампа",3200],["5600 K · день",5600]]],
["FOCUS","focus",[["Резкий фон","bad"],["Глаза резкие","eyes"]]]
].map(d=>'<label class="x70-field">'+e(d[0])+'<select data-x70-control="'+d[1]+'">'+d[2].map(z=>'<option value="'+z[1]+'">'+e(z[0])+'</option>').join("")+'</select></label>').join("")+'</div><button type="button" data-x70-evaluate>Проверить кадр</button><div class="x70-feedback" data-x70-result>У тебя нет единственной магической кнопки. Подбери комбинацию.</div></div></div>';
}else if(s.mode==="white"){
body='<div class="x70-sideby"><div class="x70-shot">'+frame()+'<div class="x70-wb-overlay" data-x70-wb-overlay></div></div><div class="x70-steps"><h3>Верни человеку естественный цвет</h3><p>Тёплые лампы освещают лицо, но камера ошибочно настроена на дневной свет. Передвинь ползунок цветовой температуры.</p><label class="x70-field">Баланс белого: <span data-x70-readout>5600 K</span><input type="range" min="2500" max="7500" step="100" value="5600" data-x70-wb/></label><button type="button" data-x70-evaluate>Проверить цвет</button><div class="x70-feedback" data-x70-result>Подсказка: для ламп часто начинают около 3200 K, затем измеряют по белому листу.</div></div></div>';
}else if(s.mode==="motion"){
body='<div class="x70-motion"><div><b>1/50 · движение естественное</b><div class="x70-motion-track"><div class="x70-runner is-smooth">●</div></div></div><div><b>1/500 · движение более «рубленое»</b><div class="x70-motion-track"><div class="x70-runner is-staccato">●</div></div></div></div><button data-x70-motion type="button">Пауза / Пуск</button><p class="x70-small">Схематичная оригинальная анимация. В реальном видео разница проявляется в смазе движения каждого кадра, а не обязательно в скорости объекта.</p>';
}else if(s.mode==="check"||s.mode==="exam"){
const items=s.items||[];
body='<div class="x70-checklist">'+items.map((t,i)=>'<label><input type="checkbox" data-x70-check="'+i+'"/><span>'+e(t)+'</span></label>').join("")+'</div><button type="button" data-x70-check-final>Проверить готовность</button><div class="x70-feedback" data-x70-result>Отмечай только то, что действительно проверил на камере. Не подменяй съёмку галочками.</div>';
}else if(s.mode==="scenario"){
body='<div class="x70-cards">'+s.options.map((o,i)=>'<button type="button" data-x70-case="'+i+'"><strong>'+e(o.title)+'</strong><span>'+e(o.text)+'</span></button>').join("")+'</div><div class="x70-feedback" data-x70-result>Выбери производственное решение и объясни его.</div>';
}else if(s.mode==="resolution"){
body='<div class="x70-resolutions">'+[["HD",1280,720],["FULL HD",1920,1080],["4K",3840,2160]].map((r,i)=>'<div class="x70-resolution-card"><div class="x70-resolution-box x70-size-'+i+'">'+r[0]+'</div><b>'+r[1]+' × '+r[2]+'</b></div>').join("")+'</div><p class="x70-small">4K на Sony PXW-X70 может требовать специальной лицензии CBKZ-X70FX и совместимой прошивки. Для наших базовых занятий Full HD достаточно.</p>';
}else{
body='<div class="x70-feedback">Демонстрация не найдена.</div>';
}
return title+body+'</div></section>';
}
function bind(s,mark,lessonId,sceneNo){
const root=document.querySelector("#scene-content .x70-stage");if(!root)return;
const saved=key(lessonId,sceneNo);const complete=()=>{localStorage.setItem(saved,"1");if(typeof mark==="function")mark();};
const mode=s.mode;
if(mode==="photo"){
const desc=["IRIS открывает или прикрывает объектив. Меньше число F — обычно светлее.","GAIN усиливает сигнал. При слабом свете помогает, но шум растёт.","SHUTTER SPEED задаёт длительность экспозиции кадра. Для 25p начни с 1/50.","WHT BAL помогает белому оставаться белым при разном свете. Ручная память A/B.","THUMBNAIL открывает записанные клипы. После дубля проверь материал.","POWER — питание. Перед работой убедись, что батарея заряжена."];
let seen=new Set();els(root,"[data-x70-hot]").forEach(b=>b.addEventListener("click",()=>{const n=Number(b.dataset.x70Hot);seen.add(n);b.classList.add("seen");el(root,"[data-x70-tip]").textContent=desc[n];el(root,"[data-x70-tracker]").textContent="Найдено "+seen.size+" из 6";if(seen.size===6)complete();}));
}else if(mode==="order"||mode==="sequence"){
let selected=[];const all=els(root,"[data-x70-order]");const list=el(root,"[data-x70-order-list]");const redraw=()=>{list.innerHTML=selected.map((i)=>'<li>'+e(s.items[i])+'</li>').join("");all.forEach(b=>b.disabled=selected.includes(Number(b.dataset.x70Order)));};
all.forEach(b=>{b.addEventListener("click",()=>{selected.push(Number(b.dataset.x70Order));redraw();});b.addEventListener("dragstart",ev=>{ev.dataTransfer.setData("text/plain",b.dataset.x70Order);});});
list.addEventListener("dragover",ev=>ev.preventDefault());list.addEventListener("drop",ev=>{ev.preventDefault();const n=Number(ev.dataTransfer.getData("text/plain"));if(Number.isInteger(n)&&n>=0&&n<s.items.length&&!selected.includes(n)){selected.push(n);redraw();}});
el(root,"[data-x70-order-reset]").addEventListener("click",()=>{selected=[];redraw();result(root,false,"","Попробуем снова. С чего начинается работа?");});
el(root,"[data-x70-order-verify]").addEventListener("click",()=>{const right=selected.length===s.items.length&&selected.every((v,i)=>v===i);result(root,right,"Да! Логика верная. Теперь повтори действия на реальной камере.",selected.length<s.items.length?"Не все действия выполнены.":"Порядок неверен. Первая проверка должна предшествовать нажатию REC. Начни снова и подумай, что будет, если перепутать шаги.");if(right)complete();});redraw();
}else if(mode==="exposure"){
const controls=Object.fromEntries(els(root,"[data-x70-control]").map(x=>[x.dataset.x70Control,x]));const shot=el(root,".x70-view");const person=el(root,".x70-person");const get=n=>Number(controls[n].value);controls.shutter.value="100";controls.iris.value="5.6";controls.gain.value="0";controls.nd.value="0";controls.wb.value="5600";controls.focus.value="bad";
const update=()=>{
const light=Number(s.light||1), ratio=light*Math.pow(4/get("iris"),2)*50/get("shutter")*Math.pow(2,get("gain")/6)/Math.pow(4,get("nd"));
const b=Math.min(2.2,Math.max(.22,ratio));shot.style.filter="brightness("+b+")";person.style.filter=controls.focus.value==="eyes"?"none":"blur(4px)";
shot.style.setProperty("--x70-wb-tint",get("wb")===Number(s.wb||5600)?"transparent":get("wb")>Number(s.wb||5600)?"rgba(255,125,40,.35)":"rgba(44,114,255,.3)");
shot.classList.toggle("has-noise",get("gain")>=12);el(root,"[data-x70-meta]").textContent="1/"+get("shutter")+" · F"+get("iris")+" · "+get("gain")+"dB · ND"+get("nd");
const faults=[];
if(get("shutter")!==50)faults.push("Для привычного движения 25p верни 1/50.");
if(ratio<.52)faults.push("Слишком темно: больше света через IRIS, меньше ND или добавь свет.");
if(ratio>2.1)faults.push("Пересвет: используй IRIS или ND.");
if(get("wb")!==Number(s.wb||5600))faults.push("Исправь WB под источник света.");
if(controls.focus.value!=="eyes")faults.push("Глаза не в фокусе.");
if(s.light>=10&&get("gain")!==0)faults.push("На ярком солнце GAIN должен быть минимальным.");
if(s.light<.5&&get("nd")!==0)faults.push("В темноте ND мешает.");
return faults;};
Object.values(controls).forEach(c=>c.addEventListener("change",()=>{update();el(root,"[data-x70-result]").textContent="Настройки изменились. Проверь результат.";}));
el(root,"[data-x70-evaluate]").addEventListener("click",()=>{const f=update(),ok=!f.length;result(root,ok,"Кадр пригоден! Теперь повтори выбранную настройку на Sony PXW-X70.",f.slice(0,3).join(" "));if(ok)complete();});update();
}else if(mode==="compare"){
const slide=el(root,"[data-x70-slide]"),shot=el(root,".x70-view");const update=()=>{const v=Number(slide.value);shot.style.filter=s.effect==="shake"?"blur("+Math.max(0,6-v*.06)+"px)":"brightness("+(v/100*1.5+.25)+")";el(root,"[data-x70-readout]").textContent=v+"%";};slide.addEventListener("input",update);el(root,"[data-x70-evaluate]").addEventListener("click",()=>{const ok=Number(slide.value)>=Number(s.min||65)&&Number(slide.value)<=Number(s.max||90);result(root,ok,s.good||"Верно: герой читается, пересвета нет.",s.bad||"Проверь: лицо должно быть видно, но светлые участки не должны полностью пропадать.");if(ok)complete();});update();
}else if(mode==="framing"){
const shot=el(root,".x70-view"),p=el(root,".x70-person"),z=el(root,"[data-x70-zoom]"),r=el(root,"[data-x70-level]"),pos=el(root,"[data-x70-position]");
const update=()=>{p.style.transform="translateX("+pos.value+"%) scale("+(Number(z.value)/100)+") rotate("+r.value+"deg)";};
[z,r,pos].forEach(c=>c.addEventListener("input",update));el(root,"[data-x70-evaluate]").addEventListener("click",()=>{const ok=Number(z.value)>=75&&Number(z.value)<=115&&Math.abs(Number(r.value))<=2&&Math.abs(Number(pos.value))<=10;result(root,ok,"Кадр собран: горизонт ровный, герой не обрезан, воздуха достаточно.","Проверь горизонт, крупность и положение героя. Не оставляй пустоту над головой и не срезай макушку.");if(ok)complete();});update();
}else if(mode==="focus"){
const shot=el(root,".x70-view");let current="background";shot.classList.add("x70-blurred");
els(root,"[data-x70-value]").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.x70Value;shot.classList.toggle("x70-blurred",current!=="eyes");}));el(root,"[data-x70-evaluate]").addEventListener("click",()=>{const ok=current==="eyes";result(root,ok,"Теперь взгляд героя держит кадр.","Резкий фон отвлекает внимание. В интервью резкость проверяем по глазам.");if(ok)complete();});
}else if(mode==="white"){
const slider=el(root,"[data-x70-wb]"),tint=el(root,"[data-x70-wb-overlay]");const update=()=>{const n=Number(slider.value);el(root,"[data-x70-readout]").textContent=n+" K";tint.style.background=n>4000?"rgba(245,133,27,"+Math.min(.57,(n-4000)/6000).toFixed(2)+")":"rgba(40,123,255,"+Math.min(.32,(4000-n)/4700).toFixed(2)+")";};slider.addEventListener("input",update);el(root,"[data-x70-evaluate]").addEventListener("click",()=>{const n=Number(slider.value),ok=Math.abs(n-3200)<=350;result(root,ok,"Цвет близок к нейтральному. На реальной камере WB лучше измерить по белому листу в свете героя.","Посмотри на белое: оно всё ещё слишком синее или жёлтое. При тёплых лампах попробуй 3200 K.");if(ok)complete();});update();
}else if(mode==="scenario"){
els(root,"[data-x70-case]").forEach(b=>b.addEventListener("click",()=>{const n=Number(b.dataset.x70Case),op=s.options[n];result(root,!!op.correct,op.reason||"Хорошее решение",op.reason||"Попробуй другой вариант и подумай о последствиях.");if(op.correct)complete();}));
}else if(mode==="check"||mode==="exam"){
els(root,"[data-x70-check]").forEach(b=>{try{b.checked=JSON.parse(localStorage.getItem(saved+":checks")||"[]").includes(Number(b.dataset.x70Check));}catch{}b.addEventListener("change",()=>localStorage.setItem(saved+":checks",JSON.stringify(els(root,"[data-x70-check]:checked").map(x=>Number(x.dataset.x70Check)))));});
el(root,"[data-x70-check-final]").addEventListener("click",()=>{const n=els(root,"[data-x70-check]:checked").length,all=els(root,"[data-x70-check]").length,ok=n===all;result(root,ok,"Контрольный список собран. Теперь преподаватель должен увидеть запись на настоящей камере.","Отмечено "+n+" из "+all+". Проверь оставшееся. Не отмечай пункт, если не сделал его в действительности.");if(ok)complete();});
}else if(mode==="motion"){el(root,"[data-x70-motion]").addEventListener("click",()=>{root.classList.toggle("is-paused");complete();});}
}
window.TIMECODE_X70={render,bind};
})();