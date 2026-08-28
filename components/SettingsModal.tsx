
import React, { useState, useEffect } from 'react';
import { PublishingConfig, ProxyProvider } from '../types';
import { fetchSmmBoxGroups, testWordPressConnection } from '../services/publishingService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PublishingConfig;
  onSave: (config: PublishingConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState<PublishingConfig>(config);
  const [activeTab, setActiveTab] = useState<'smm' | 'wp'>('smm');
  const [testStatus, setTestStatus] = useState<{ loading: boolean, msg: string, success?: boolean } | null>(null);

  useEffect(() => {
    setFormData(config);
    setTestStatus(null);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, section?: 'wp') => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    if (section === 'wp') {
        setFormData(prev => ({ 
            ...prev, 
            wordPress: { ...prev.wordPress, [name]: val } 
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleTestSmm = async () => {
    setTestStatus({ loading: true, msg: 'Проверка подключения SmmBox...' });
    try {
        const tempConfig = { ...formData, smmBoxToken: formData.smmBoxToken.trim() };
        const groups = await fetchSmmBoxGroups(tempConfig);
        setTestStatus({ loading: false, success: true, msg: `Успешно! Найдено групп/проектов: ${groups.length}` });
    } catch (e: any) {
        setTestStatus({ loading: false, success: false, msg: `Ошибка: ${e.message}` });
    }
  };

  const handleTestWp = async () => {
      setTestStatus({ loading: true, msg: 'Проверка подключения WordPress...' });
      try {
          const res = await testWordPressConnection(formData.wordPress, formData.useProxy, formData);
          setTestStatus({ loading: false, success: true, msg: `Успешно! Вход выполнен: ${res.name} (ID: ${res.id})` });
      } catch (e: any) {
          setTestStatus({ loading: false, success: false, msg: `Ошибка: ${e.message}` });
      }
  };

  const handleSave = () => {
    const cleanedData: PublishingConfig = {
        ...formData,
        smmBoxToken: formData.smmBoxToken.trim(),
        targetGroupName: formData.targetGroupName.trim() || 'Первый туристический',
        wordPress: {
            url: formData.wordPress.url.trim(),
            username: formData.wordPress.username.trim(),
            applicationPassword: formData.wordPress.applicationPassword.trim()
        }
    };
    localStorage.setItem('tourgenius_settings', JSON.stringify(cleanedData));
    onSave(cleanedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-200">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-4">
            <button onClick={() => {setActiveTab('smm'); setTestStatus(null);}} className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTab === 'smm' ? 'bg-brand-orange text-white' : 'text-slate-400'}`}>SmmBox</button>
            <button onClick={() => {setActiveTab('wp'); setTestStatus(null);}} className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTab === 'wp' ? 'bg-brand-orange text-white' : 'text-slate-400'}`}>WordPress</button>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-brand-orange text-3xl leading-none transition-colors">&times;</button>
        </div>
        
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Блок настройки прокси */}
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-2">
             <div className="flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">Безопасное серверное проксирование</h4>
                    <p className="text-[10px] text-emerald-700 font-medium leading-normal mt-1">
                        Все запросы к WordPress и SmmBox теперь отправляются через наш надежный бэкенд-сервер. 
                        Это полностью исключает любые CORS-ошибки ("Failed to fetch") и не требует установки браузерных расширений или использования сторонних прокси!
                    </p>
                </div>
             </div>
          </div>

          {activeTab === 'smm' ? (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Токен SmmBox</label>
                    <input type="password" name="smmBoxToken" value={formData.smmBoxToken} onChange={handleChange as any} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none font-mono text-sm" placeholder="api_token" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Имя проекта в SmmBox</label>
                    <input type="text" name="targetGroupName" value={formData.targetGroupName} onChange={handleChange as any} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none transition-all font-bold" placeholder="Первый туристический" />
                    <p className="text-[9px] text-slate-400 mt-2 font-medium">
                        * Укажите название группы/проекта, как оно написано в личном кабинете SmmBox. Туда будут отправляться посты для ВК, ОК и Telegram.
                    </p>
                </div>
                <button 
                  onClick={handleTestSmm} 
                  disabled={testStatus?.loading}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  {testStatus?.loading && activeTab === 'smm' ? 'Проверка...' : '🔗 Проверить подключение SmmBox'}
                </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL Сайта (с https://)</label>
                    <input type="text" name="url" value={formData.wordPress.url} onChange={e => handleChange(e as any, 'wp')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none transition-all" placeholder="https://mytravelsite.com" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Логин WP</label>
                    <input type="text" name="username" value={formData.wordPress.username} onChange={e => handleChange(e as any, 'wp')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none transition-all" placeholder="admin" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Пароль приложения</label>
                    <input type="password" name="applicationPassword" value={formData.wordPress.applicationPassword} onChange={e => handleChange(e as any, 'wp')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none transition-all font-mono text-sm" placeholder="xxxx xxxx xxxx xxxx" />
                </div>
                <button 
                  onClick={handleTestWp} 
                  disabled={testStatus?.loading}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                >
                  {testStatus?.loading && activeTab === 'wp' ? 'Проверка...' : '🔗 Проверить подключение WordPress'}
                </button>
            </div>
          )}

          {testStatus && (
            <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wide text-center animate-fade-in ${testStatus.success ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                {testStatus.msg}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-100 transition-all">Отмена</button>
          <button onClick={handleSave} className="flex-2 px-10 py-4 bg-brand-dark text-white rounded-2xl font-black uppercase text-xs hover:bg-brand-orange transition-all shadow-xl shadow-orange-100">Сохранить</button>
        </div>
      </div>
    </div>
  );
};
