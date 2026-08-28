
import React, { useState, useEffect } from 'react';
import { DigestData, PublishingConfig } from '../types';
import { publishToSmmBox } from '../services/publishingService';

interface DigestPostViewerProps {
  digest: DigestData;
  pubConfig: PublishingConfig;
  isGeneratingImage?: boolean;
  imageError?: string; 
}

export const DigestPostViewer: React.FC<DigestPostViewerProps> = ({ digest, pubConfig, isGeneratingImage, imageError }) => {
  const [activeView, setActiveView] = useState<'long' | 'short'>('long');
  const [editableText, setEditableText] = useState('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [pubStatus, setPubStatus] = useState<{success?: boolean, msg: string}>({msg: ''});
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditableText(activeView === 'long' ? digest.formattedDigestText : digest.formattedShortDigest);
  }, [digest, activeView]);

  const handlePublish = async () => {
    if (!pubConfig.smmBoxToken) {
        setPubStatus({success: false, msg: 'Токен SmmBox не настроен!'});
        return;
    }
    setPublishing(true);
    setPubStatus({msg: 'Отправка...'});
    try {
      await publishToSmmBox(pubConfig, editableText.trim(), digest.collageImage ? [digest.collageImage] : [], scheduleDate ? new Date(scheduleDate) : undefined);
      setPubStatus({success: true, msg: 'Дайджест отправлен!'});
    } catch (e: any) {
      setPubStatus({success: false, msg: e.message});
    } finally { setPublishing(false); }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(digest.collagePrompt || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyText = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = () => {
    if (!digest.collageImage) return;
    const link = document.createElement('a');
    link.href = digest.collageImage;
    link.download = `digest-collage-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-50 flex flex-col min-h-[750px] animate-fade-in">
      <div className="bg-white border-b border-slate-50 p-5 flex justify-between items-center">
        <div className="flex gap-2">
            <button onClick={() => setActiveView('long')} className={`text-[10px] px-6 py-2.5 rounded-xl font-black uppercase transition-all ${activeView === 'long' ? 'bg-brand-orange text-white shadow-md' : 'bg-white text-slate-400 border border-slate-50'}`}>Дайджест</button>
            <button onClick={() => setActiveView('short')} className={`text-[10px] px-6 py-2.5 rounded-xl font-black uppercase transition-all ${activeView === 'short' ? 'bg-brand-orange text-white shadow-md' : 'bg-white text-slate-400 border border-slate-50'}`}>Бег. строка</button>
        </div>
        {activeView === 'short' && (
           <button onClick={copyText} className="text-[9px] font-black text-brand-orange uppercase border-2 border-brand-orange/20 px-4 py-2 rounded-xl hover:bg-brand-orange/5 transition-all">
             {copied ? 'ГОТОВО ✅' : 'КОПИРОВАТЬ 📋'}
           </button>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="h-64 w-full bg-white shrink-0 relative overflow-hidden border-b border-slate-50">
            {digest.collageImage && (
                <img src={digest.collageImage} className="w-full h-full object-cover animate-fade-in" alt="Collage" />
            )}
            
            <div className={`absolute inset-0 bg-brand-dark/40 backdrop-blur-[2px] transition-all flex flex-col items-center justify-center p-6 text-center ${digest.collageImage ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                {isGeneratingImage ? (
                    <>
                        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-3"></div>
                        <span className="text-[11px] font-black text-white uppercase tracking-widest animate-pulse">ИИ рисует фото-обложку...</span>
                    </>
                ) : imageError ? (
                    <div className="w-full max-w-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest mb-2 text-red-400 block">Ошибка генерации обложки</span>
                        <div className="bg-red-950/40 backdrop-blur-md p-4 rounded-xl border border-red-500/30 w-full mb-3 text-red-200 text-[10px] font-medium leading-relaxed">
                            {imageError}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest mb-3 text-brand-orange block">Промпт обложки</span>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 w-full mb-3">
                            <p className="text-[10px] text-white italic line-clamp-4 font-medium">"{digest.collagePrompt}"</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyPrompt} className="flex-1 text-[9px] font-black text-white uppercase border border-white/30 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all">
                                {copied ? 'СКОПИРОВАНО! ✅' : 'КОПИРОВАТЬ ПРОМПТ 📋'}
                            </button>
                            {digest.collageImage && (
                                <button onClick={downloadImage} className="text-[9px] font-black text-white uppercase border border-white/30 px-4 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 transition-all shadow-lg">
                                    СКАЧАТЬ 📂
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-6 bg-white border-b border-slate-50 space-y-4">
           <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Отложенный постинг</label>
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full text-xs p-3.5 rounded-xl border border-slate-100 outline-none bg-white font-black text-brand-dark focus:ring-2 focus:ring-brand-orange transition-all" />
           </div>
           
           <button onClick={handlePublish} disabled={publishing} className="w-full bg-brand-dark text-white text-[11px] font-black py-4.5 rounded-2xl uppercase tracking-widest hover:bg-brand-orange transition-all disabled:opacity-50 shadow-xl">
             {publishing ? 'ОТПРАВКА...' : 'ОПУБЛИКОВАТЬ ДАЙДЖЕСТ'}
           </button>
           
           {pubStatus.msg && <div className={`p-4 rounded-xl text-[10px] text-center font-black border-2 animate-fade-in ${pubStatus.success === false ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{pubStatus.msg}</div>}
        </div>

        <div className="p-8 flex-1 bg-white flex flex-col">
            <textarea 
              value={editableText} 
              onChange={e => setEditableText(e.target.value)} 
              className="w-full flex-1 text-base text-black leading-relaxed font-bold outline-none border-none resize-none custom-scrollbar bg-white" 
            />
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-300 font-black italic uppercase">
              <span>Первый Туристический</span>
              <span>{editableText.length} зн.</span>
            </div>
        </div>
      </div>
    </div>
  );
};
