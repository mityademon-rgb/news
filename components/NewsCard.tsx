
import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onMarkReplace: (id: string) => void;
  isMarkedForReplace: boolean;
  sarcasmValue?: number;
  onSarcasmChange?: (val: number) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ 
  item, 
  isSelected, 
  onToggle, 
  sarcasmValue = 5, 
  onSarcasmChange 
}) => {
  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`relative cursor-pointer rounded-2xl border transition-all duration-300 flex flex-col h-full select-none overflow-hidden ${
        isSelected 
          ? 'border-brand-orange bg-white ring-2 ring-brand-orange shadow-2xl scale-[1.02] z-10' 
          : 'border-slate-200 bg-white hover:border-brand-orange/40 hover:shadow-lg'
      }`}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <span className={`px-2 py-1 text-[10px] font-black uppercase rounded ${isSelected ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'}`}>
            {item.location || 'РФ'}
          </span>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-brand-orange bg-brand-orange' : 'border-slate-200 bg-white'}`}>
            {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
        </div>
        
        <h3 className={`text-lg font-bold mb-3 leading-tight ${isSelected ? 'text-brand-orange' : 'text-slate-800'}`}>
          {item.title}
        </h3>
        
        <p className="text-sm text-slate-500 leading-relaxed flex-grow">
          {item.summary}
        </p>

        {isSelected && onSarcasmChange && (
          <div 
            className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-black text-brand-orange uppercase">САРКАЗМ: {sarcasmValue}</span>
               <span className="text-[10px] text-orange-400 font-bold italic">
                 {sarcasmValue > 7 ? 'Ядовито' : sarcasmValue > 3 ? 'Жванецкий' : 'Ирония'}
               </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={sarcasmValue} 
              onChange={(e) => onSarcasmChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
            />
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <span>{item.date || 'АКТУАЛЬНО'}</span>
           <span className={isSelected ? 'text-brand-orange' : ''}>{isSelected ? 'ВЫБРАНО' : 'ВЫБРАТЬ'}</span>
        </div>
      </div>
    </div>
  );
};
