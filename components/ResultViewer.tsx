
import React, { useState } from 'react';
import { GeneratedContentPack, PublishingConfig, ArticleSection } from '../types';
import { publishToSmmBox, publishToWordPress } from '../services/publishingService';
import { generateSingleImage } from '../services/geminiService';

interface ResultViewerProps {
  pack: GeneratedContentPack;
  pubConfig: PublishingConfig;
  paidGenerationsLeft?: number;
  setPaidGenerationsLeft?: React.Dispatch<React.SetStateAction<number>>;
  onOpenBilling?: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ 
  pack, 
  pubConfig, 
  paidGenerationsLeft = 5, 
  setPaidGenerationsLeft, 
  onOpenBilling 
}) => {
  const [activeTab, setActiveTab] = useState<'site' | 'tg' | 'vk_ok' | 'prompts'>('site');
  const [isEditing, setIsEditing] = useState(false);
  
  const [headline, setHeadline] = useState(pack.siteArticle?.headline || '');
  const [readersSituation, setReadersSituation] = useState(pack.siteArticle?.readersSituation || '');
  const [navigationRoute, setNavigationRoute] = useState<string[]>(pack.siteArticle?.navigationRoute || []);
  const [sections, setSections] = useState<ArticleSection[]>(pack.siteArticle?.sections || []);
  const [hashtags, setHashtags] = useState(pack.siteArticle?.hashtags || '');
  const [seo, setSeo] = useState(pack.siteArticle?.seo || { focusKeyword: '', seoTitle: '', metaDescription: '', keywords: '', hashtags: '' });
  const [tgText, setTgText] = useState(pack.socials?.tg || '');
  const [vkOkText, setVkOkText] = useState(pack.socials?.vk_ok || '');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  
  const [images, setImages] = useState<string[]>(pack.generatedImages || []);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [pubStatus, setPubStatus] = useState<{ loading: boolean, success?: boolean, msg: string }>({ loading: false, msg: '' });

  const handleUpdateSection = (index: number, field: 'heading' | 'body', value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const handleDrawImages = async () => {
    if (paidGenerationsLeft <= 0) {
      onOpenBilling?.();
      return;
    }

    setIsDrawing(true);
    setPubStatus({ loading: true, msg: 'Генерируем фотореалистичные иллюстрации (3 шт)...' });
    const newImages: string[] = [];
    try {
      for (const prompt of pack.imagePrompts.slice(0, 3)) {
        if (paidGenerationsLeft <= 0) {
          onOpenBilling?.();
          break;
        }
        const img = await generateSingleImage(prompt);
        newImages.push(img);
        setImages([...newImages]); // Постепенное обновление
        if (setPaidGenerationsLeft) {
          setPaidGenerationsLeft(prev => Math.max(0, prev - 1));
        }
      }
      setPubStatus({ loading: false, success: true, msg: 'Иллюстрации готовы!' });
    } catch (e: any) {
      setPubStatus({ loading: false, success: false, msg: `Ошибка рисования: ${e.message}` });
    } finally {
      setIsDrawing(false);
      setPubStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handlePublishWP = async () => {
    setPubStatus({ loading: true, msg: 'Публикация на WordPress...' });
    try {
      await publishToWordPress(
        pubConfig.wordPress,
        pubConfig.useProxy,
        pubConfig, // Pass full config for proxy provider
        headline,
        sections,
        images,
        hashtags,
        pack.metaDescription,
        scheduleDate,
        (msg) => setPubStatus({ loading: true, msg }),
        readersSituation,
        navigationRoute,
        seo
      );
      setPubStatus({ loading: false, success: true, msg: 'Статья опубликована!' });
    } catch (e: any) {
      setPubStatus({ loading: false, success: false, msg: `Ошибка WP: ${e.message}` });
    } finally {
      setPubStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handlePublishSmmBox = async (text: string) => {
    setPubStatus({ loading: true, msg: 'Отправка в SmmBox...' });
    try {
      await publishToSmmBox(pubConfig, text, images, scheduleDate ? new Date(scheduleDate) : undefined);
      setPubStatus({ loading: false, success: true, msg: 'Пост отправлен в SmmBox!' });
    } catch (e: any) {
      setPubStatus({ loading: false, success: false, msg: `Ошибка: ${e.message}` });
    } finally {
      setPubStatus(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-50 overflow-hidden animate-fade-in mb-10">
      <div className="bg-brand-dark p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <span className="text-brand-orange text-[10px] font-black uppercase tracking-[0.2em] mb-1">Статья и посты готовы</span>
          <h3 className="text-white font-black text-xl italic leading-tight uppercase line-clamp-1">{headline}</h3>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsEditing(!isEditing)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isEditing ? 'bg-brand-orange text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isEditing ? '💾 Сохранить' : '📝 Править'}</button>
           <button onClick={handlePublishWP} disabled={pubStatus.loading || images.length === 0} className="px-6 py-3 bg-brand-orange text-white rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all shadow-lg disabled:opacity-50">🌐 На сайт</button>
        </div>
      </div>

      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2">
        {(['site', 'seo', 'tg', 'vk_ok', 'prompts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab === 'site' ? 'Статья' : tab === 'seo' ? 'SEO Блок' : tab === 'tg' ? 'Telegram' : tab === 'vk_ok' ? 'VK/OK' : 'Промпты'}
          </button>
        ))}
      </div>

      <div className="px-8 py-4 bg-orange-50/30 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest ml-1">📅 Отложенный постинг</label>
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="text-xs p-2 rounded-lg border border-orange-200 outline-none bg-white font-bold" />
            </div>
            <button 
                onClick={handleDrawImages} 
                disabled={isDrawing}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${images.length > 0 ? 'bg-slate-100 text-slate-600' : 'bg-brand-dark text-white animate-bounce'}`}
            >
                {isDrawing ? '⏳ Рисуем...' : images.length > 0 ? '🎨 Перерисовать' : '🎨 Нарисовать иллюстрации'}
            </button>
        </div>
        {pubStatus.msg && (
            <span className={`text-[10px] font-black uppercase ${pubStatus.success ? 'text-green-600' : 'text-brand-orange'}`}>{pubStatus.msg}</span>
        )}
      </div>

      <div className="p-8">
        {activeTab === 'site' && (
          <div className="max-w-3xl mx-auto space-y-8">
            {isEditing ? (
              <input value={headline} onChange={e => setHeadline(e.target.value)} className="w-full text-4xl font-black italic text-brand-dark border-b-2 border-brand-orange/20 outline-none pb-2" />
            ) : (
              <h1 className="text-4xl font-black italic text-brand-dark leading-tight">{headline}</h1>
            )}

            {/* Ситуация читателя */}
            <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-brand-orange italic">
               <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">Ситуация читателя</span>
               {isEditing ? (
                 <textarea value={readersSituation} onChange={e => setReadersSituation(e.target.value)} rows={3} className="w-full bg-transparent outline-none text-slate-700 text-lg leading-relaxed" />
               ) : (
                 <p className="text-lg text-slate-700 leading-relaxed font-serif">"{readersSituation}"</p>
               )}
            </div>

            {/* Маршрут навигации */}
            <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Навигация по смыслам</span>
                <div className="flex flex-wrap gap-3">
                    {navigationRoute.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                            <span className="w-5 h-5 bg-brand-dark text-white text-[10px] flex items-center justify-center rounded-full font-bold">{idx + 1}</span>
                            {isEditing ? (
                                <input 
                                    value={point} 
                                    onChange={e => {
                                        const newRoute = [...navigationRoute];
                                        newRoute[idx] = e.target.value;
                                        setNavigationRoute(newRoute);
                                    }} 
                                    className="text-xs font-bold text-slate-600 outline-none"
                                />
                            ) : (
                                <span className="text-xs font-bold text-slate-600">{point}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               {images.length > 0 ? images.map((img, i) => (
                 <div key={i} className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt="Photo-real" />
                 </div>
)) : pack.error ? (
                  <div className="col-span-3 bg-red-50 border border-red-200 text-red-600 p-6 rounded-3xl text-center">
                     <span className="text-3xl mb-2 block">⚠️</span>
                     <span className="text-xs font-black uppercase block mb-2">Ошибка генерации картинок</span>
                     <p className="text-xs font-medium text-red-500 mb-4">{pack.error}</p>
                     <p className="text-[10px] uppercase text-slate-400 font-bold">Вы можете нажать кнопку «Нарисовать иллюстрации» выше, чтобы попробовать еще раз.</p>
                  </div>
               ) : (
                  <div className="col-span-3 py-10 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                     <span className="text-4xl mb-2">📸</span>
                     <span className="text-[10px] font-black uppercase">Иллюстрации еще не созданы</span>
                  </div>
               )}
            </div>

            <div className="article-font space-y-6 text-lg text-slate-700 leading-[1.8]">
              {sections.map((sec, idx) => (
                <div key={idx} className="space-y-4">
                  {isEditing ? (
                    <>
                      <input value={sec.heading} onChange={e => handleUpdateSection(idx, 'heading', e.target.value)} className="w-full font-bold text-xl text-brand-dark border-l-4 border-brand-orange pl-4 outline-none bg-slate-50 py-2" />
                      <textarea value={sec.body} onChange={e => handleUpdateSection(idx, 'body', e.target.value)} rows={6} className="w-full p-4 border border-slate-200 rounded-2xl outline-none" />
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-brand-dark border-l-4 border-brand-orange pl-6 my-8">{sec.heading}</h2>
                      <div className="whitespace-pre-wrap">{sec.body}</div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block">Теги</span>
               <div className="flex flex-wrap gap-2">
                  {hashtags.split(',').map((t, i) => (
                    <span key={i} className="px-3 py-1.5 bg-orange-50 text-brand-orange text-[10px] font-black uppercase rounded-lg border border-orange-100">{t.trim()}</span>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                <div>
                   <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">Focus Keyword</label>
                   <input 
                     value={seo.focusKeyword} 
                     onChange={e => setSeo({...seo, focusKeyword: e.target.value})} 
                     readOnly={!isEditing} 
                     className="w-full bg-white p-4 rounded-xl border border-slate-100 outline-none text-sm font-bold" 
                   />
                </div>
                <div>
                   <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">SEO Title (до 60 символов)</label>
                   <input 
                     value={seo.seoTitle} 
                     onChange={e => setSeo({...seo, seoTitle: e.target.value})} 
                     readOnly={!isEditing} 
                     className="w-full bg-white p-4 rounded-xl border border-slate-100 outline-none text-sm font-bold" 
                   />
                </div>
                <div>
                   <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">Meta Description (до 160 символов)</label>
                   <textarea 
                     value={seo.metaDescription} 
                     onChange={e => setSeo({...seo, metaDescription: e.target.value})} 
                     readOnly={!isEditing} 
                     rows={3}
                     className="w-full bg-white p-4 rounded-xl border border-slate-100 outline-none text-sm font-medium" 
                   />
                </div>
                <div>
                   <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">Keywords</label>
                   <input 
                     value={seo.keywords} 
                     onChange={e => setSeo({...seo, keywords: e.target.value})} 
                     readOnly={!isEditing} 
                     className="w-full bg-white p-4 rounded-xl border border-slate-100 outline-none text-sm" 
                   />
                </div>
                <div>
                   <label className="text-[9px] font-black text-brand-orange uppercase tracking-widest block mb-2">Hashtags</label>
                   <input 
                     value={seo.hashtags} 
                     onChange={e => setSeo({...seo, hashtags: e.target.value})} 
                     readOnly={!isEditing} 
                     className="w-full bg-white p-4 rounded-xl border border-slate-100 outline-none text-sm" 
                   />
                </div>
             </div>
             <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest italic">Технический блок для копирования в Yoast / RankMath</p>
          </div>
        )}

        {activeTab === 'tg' && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <textarea value={tgText} onChange={e => setTgText(e.target.value)} readOnly={!isEditing} rows={12} className="w-full bg-transparent outline-none text-slate-800 text-sm leading-relaxed resize-none font-medium" />
             </div>
             <button onClick={() => handlePublishSmmBox(tgText)} disabled={pubStatus.loading} className="w-full py-5 bg-[#0088cc] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50">🚀 Опубликовать в Telegram</button>
          </div>
        )}

        {activeTab === 'vk_ok' && (
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <textarea value={vkOkText} onChange={e => setVkOkText(e.target.value)} readOnly={!isEditing} rows={12} className="w-full bg-transparent outline-none text-slate-800 text-sm leading-relaxed resize-none font-medium" />
             </div>
             <button onClick={() => handlePublishSmmBox(vkOkText)} disabled={pubStatus.loading} className="w-full py-5 bg-[#4c75a3] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50">🚀 Опубликовать в VK/OK</button>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
             {pack.imagePrompts.map((p, i) => (
               <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Фото-промпт {i+1}</span>
                  <p className="text-[11px] text-slate-600 italic leading-relaxed">"{p}"</p>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
