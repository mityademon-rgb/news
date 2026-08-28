import React from 'react';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefill: (amount: number) => void;
  generationsLeft: number;
}

export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose, onRefill, generationsLeft }) => {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'basic',
      name: 'Базовый старт',
      price: '490 ₽',
      generations: 30,
      description: 'Идеально для небольших личных блогов или тестирования',
      badge: 'Популярно',
      color: 'border-slate-200'
    },
    {
      id: 'pro',
      name: 'Безлимитный день',
      price: '1 290 ₽',
      generations: 150,
      description: 'Для активных редакций, публикующих более 10 постов в сутки',
      badge: 'Выгодно',
      color: 'border-brand-orange ring-2 ring-brand-orange/20'
    },
    {
      id: 'ultra',
      name: 'Медиа-Холдинг',
      price: '2 990 ₽',
      generations: 500,
      description: 'Безлимитные генерации с поддержкой приоритетного GPU',
      badge: 'Максимум',
      color: 'border-slate-200'
    }
  ];

  return (
    <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="billing-modal">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 my-8">
        
        {/* Header */}
        <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100 relative">
          <div className="absolute right-6 top-6">
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-brand-orange text-3xl leading-none transition-colors p-2"
              id="billing-close-btn"
            >
              &times;
            </button>
          </div>
          <div className="w-16 h-16 bg-red-50 text-brand-orange rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100 animate-pulse">
            ⚡
          </div>
          <h2 className="text-3xl font-black text-brand-dark uppercase italic tracking-tight">
            Лимит платных генераций исчерпан!
          </h2>
          <p className="text-slate-400 text-sm mt-2 font-medium max-w-md mx-auto">
            Для продолжения автоматического сбора новостей и создания ироничных лонгридов необходимо пополнить баланс.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-brand-dark text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider">
            <span>Ваш баланс:</span>
            <span className="text-brand-orange">{generationsLeft} генераций</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 text-center">Выбери пакет для мгновенного пополнения:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-white rounded-3xl p-6 border-2 flex flex-col justify-between transition-all hover:shadow-xl hover:scale-[1.02] relative ${plan.color}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 px-3 py-1 bg-brand-dark text-white text-[8px] font-black uppercase tracking-wider rounded-full border border-slate-700">
                    {plan.badge}
                  </span>
                )}
                
                <div>
                  <h4 className="text-sm font-black text-brand-dark uppercase tracking-wide mt-2">{plan.name}</h4>
                  <p className="text-slate-400 text-[10px] font-medium leading-normal mt-2 min-h-[40px]">{plan.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black text-brand-orange">+{plan.generations} ИИ</span>
                    <span className="text-xl font-black text-brand-dark">{plan.price}</span>
                  </div>
                  
                  <button 
                    onClick={() => onRefill(plan.generations)}
                    className="w-full py-3 bg-brand-dark hover:bg-brand-orange text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                    id={`refill-btn-${plan.id}`}
                  >
                    🚀 Выбрать
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-[10px] text-amber-800 font-bold leading-normal flex items-center gap-3">
            <span>💡</span>
            <p>
              Каждая генерация задействует продвинутые модели <strong>Gemini 1.5 Pro</strong> и <strong>Imagen 3</strong> для достижения максимальной глубины текста и реалистичности изображений.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
            id="billing-cancel-btn"
          >
            Закрыть и продолжить позже
          </button>
        </div>

      </div>
    </div>
  );
};
