import React, { useState } from 'react';

interface AddNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (news: { title: string; summary: string; location: string; sourceUrl: string }) => void;
}

export const AddNewsModal: React.FC<AddNewsModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    location: '',
    sourceUrl: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.summary) return;
    onAdd(formData);
    setFormData({ title: '', summary: '', location: '', sourceUrl: '' }); // Reset
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-brand-orange animate-fade-in">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-brand-dark font-sans uppercase tracking-wide">
            Добавить свою тему
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-brand-orange text-2xl font-bold leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Заголовок темы <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all font-bold text-brand-dark" 
              placeholder="Например: Открытие нового отеля в Сочи"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Суть новости (Фактура для AI) <span className="text-red-500">*</span></label>
            <textarea 
              required
              rows={4}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all text-sm" 
              placeholder="Опишите детали, цифры или ключевую мысль, которую AI должен развернуть в статью..."
              value={formData.summary}
              onChange={e => setFormData({...formData, summary: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Локация (Опционально)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-orange outline-none text-sm" 
                  placeholder="Страна/Город"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Источник (Опционально)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-orange outline-none text-sm" 
                  placeholder="URL или название"
                  value={formData.sourceUrl}
                  onChange={e => setFormData({...formData, sourceUrl: e.target.value})}
                />
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button 
               type="button"
               onClick={onClose}
               className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm uppercase"
             >
               Отмена
             </button>
             <button 
               type="submit"
               className="px-6 py-2.5 bg-brand-orange text-white rounded-lg font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200 text-sm uppercase tracking-wide brand-glow"
             >
               Добавить в список
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};