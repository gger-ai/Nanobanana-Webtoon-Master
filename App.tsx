
import React, { useState, useEffect } from 'react';
import { ArtStyle, GenerationState, WebtoonPlan, ImageModelType } from './types';
import { STYLE_CONFIGS } from './constants';
import { createWebtoonPlan, rebuildPrompt, verifyApiKey, generateWebtoonPreviewImage } from './services/geminiService';
import { 
  RocketLaunchIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  SparklesIcon,
  InformationCircleIcon as InfoIcon,
  UserPlusIcon,
  PresentationChartBarIcon,
  LanguageIcon,
  Cog6ToothIcon,
  XMarkIcon,
  LockClosedIcon,
  SignalIcon,
  TrashIcon,
  BoltIcon,
  ListBulletIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  GlobeAltIcon,
  PhotoIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  ExclamationCircleIcon,
  CpuChipIcon,
  KeyIcon,
  CheckIcon,
  CloudIcon,
  LightBulbIcon
} from '@heroicons/react/24/solid';

const EXT_STORAGE_KEY = 'WEBTOON_MASTER_EXT_KEY';
const ACTIVE_KEY_STORAGE_KEY = 'WEBTOON_MASTER_ACTIVE_SOURCE'; // 'external' | 'internal'
const VERSION = '2025.01.09 v2.2.0';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';
type KeySource = 'external' | 'internal';

const App: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ArtStyle.INSTATOON);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Dual API Keys
  const [extApiKey, setExtApiKey] = useState('');
  const [isInternalKeySelected, setIsInternalKeySelected] = useState(false);
  // Default to internal
  const [activeKeySource, setActiveKeySource] = useState<KeySource>('internal');
  
  const [extStatus, setExtStatus] = useState<VerificationStatus>('idle');
  // Internal status is implicitly 'success' if isInternalKeySelected is true, but we can verify if needed.
  // For simplicity, we assume selection via window.aistudio implies validity or at least existence.

  // Image Generation State
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModelType>('nano-pro');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [state, setState] = useState<GenerationState>({
    isPlanning: false,
    plan: null,
    error: null,
  });

  // Load API Keys & Status on mount
  useEffect(() => {
    const savedExt = localStorage.getItem(EXT_STORAGE_KEY);
    if (savedExt) {
      setExtApiKey(savedExt);
      setExtStatus('success'); // Assume valid if present (re-verify on usage/modal open could be better)
    }

    const checkInternalKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsInternalKeySelected(hasKey);
      }
    };
    checkInternalKey();

    const savedSource = localStorage.getItem(ACTIVE_KEY_STORAGE_KEY) as KeySource;
    if (savedSource) {
      setActiveKeySource(savedSource);
    }
  }, []);

  // Poll for internal key status when modal is open (to catch changes from dialog)
  useEffect(() => {
    let interval: number;
    if (isSettingsOpen) {
      interval = window.setInterval(async () => {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsInternalKeySelected(hasKey);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSettingsOpen]);

  const getActiveKey = () => {
    if (activeKeySource === 'external') return extApiKey;
    if (activeKeySource === 'internal') return process.env.API_KEY || '';
    return extApiKey || process.env.API_KEY || '';
  };

  const isCurrentKeyValid = () => {
    if (activeKeySource === 'external') return extStatus === 'success';
    if (activeKeySource === 'internal') return isInternalKeySelected;
    return false;
  };

  const switchActiveSource = (source: KeySource) => {
    setActiveKeySource(source);
    localStorage.setItem(ACTIVE_KEY_STORAGE_KEY, source);
  };

  const handleVerifyExt = async () => {
    if (!extApiKey) return;
    setExtStatus('loading');
    const isValid = await verifyApiKey(extApiKey);
    if (isValid) {
      setExtStatus('success');
      localStorage.setItem(EXT_STORAGE_KEY, extApiKey);
      if (!isInternalKeySelected) switchActiveSource('external');
    } else {
      setExtStatus('error');
    }
  };

  const handleSelectInternalKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsInternalKeySelected(hasKey);
      if (hasKey) {
        switchActiveSource('internal');
      }
    } else {
      alert("이 환경에서는 Google Cloud 프로젝트 키 선택을 지원하지 않습니다.");
    }
  };

  const handleResetExt = () => {
    if(confirm('외부 API 키를 삭제하시겠습니까?')) {
      setExtApiKey('');
      localStorage.removeItem(EXT_STORAGE_KEY);
      setExtStatus('idle');
      if (activeKeySource === 'external' && isInternalKeySelected) switchActiveSource('internal');
    }
  };

  const handleCreatePlan = async () => {
    const activeKey = getActiveKey();
    if (!activeKey) {
      setIsSettingsOpen(true);
      setState(prev => ({ ...prev, error: '설정에서 API 키를 먼저 저장해주세요!' }));
      return;
    }
    if (!subject.trim()) {
      setState(prev => ({ ...prev, error: '주제를 입력해주세요!' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isPlanning: true, 
      plan: null, 
      error: null 
    }));
    setGeneratedImage(null); 
    setImageError(null);

    try {
      const plan = await createWebtoonPlan(subject, selectedStyle, activeKey);
      setState(prev => ({ ...prev, isPlanning: false, plan }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isPlanning: false, 
        error: '기획안 생성 중 오류가 발생했습니다. API 키를 확인해주세요.' 
      }));
    }
  };

  const handleRebuildPrompt = async () => {
    const activeKey = getActiveKey();
    if (!state.plan || !activeKey) return;
    setIsUpdatingPrompt(true);
    try {
      const newPrompt = await rebuildPrompt(state.plan, activeKey);
      updatePlan({ englishPrompt: newPrompt });
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: '프롬프트 갱신 중 오류가 발생했습니다.' }));
    } finally {
      setIsUpdatingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    const activeKey = getActiveKey();
    if (!state.plan?.englishPrompt || !activeKey) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImage(null);
    
    try {
      const imageUrl = await generateWebtoonPreviewImage(state.plan.englishPrompt, activeKey, selectedImageModel);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      setImageError(err.message || "이미지 생성에 실패했습니다.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const updatePlan = (updates: Partial<WebtoonPlan>) => {
    setState(prev => ({
      ...prev,
      plan: prev.plan ? { ...prev.plan, ...updates } : null
    }));
  };

  const updateStoryStep = (index: number, value: string) => {
    if (!state.plan) return;
    const newSummary = [...state.plan.storySummary];
    newSummary[index] = value;
    updatePlan({ storySummary: newSummary });
  };

  const updateDialogueStep = (index: number, value: string) => {
    if (!state.plan) return;
    const newDialogues = [...state.plan.dialogues];
    newDialogues[index] = value;
    updatePlan({ dialogues: newDialogues });
  };

  const copyPrompt = () => {
    if (state.plan?.englishPrompt) {
      navigator.clipboard.writeText(state.plan.englishPrompt);
      alert('프롬프트가 복사되었습니다!');
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `webtoon_master_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#f8fafc]">
      <header className="bg-yellow-400 py-6 px-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-2xl shadow-inner">
              <span className="text-3xl">🍌</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">웹툰 마스터</h1>
                <span className="px-2 py-0.5 bg-yellow-600 text-white text-[10px] font-bold rounded-full animate-pulse">MULTI-ENGINE</span>
              </div>
              <p className="text-yellow-900/80 font-bold text-xs tracking-wide">Nanobanana + Gemini + Imagen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={() => setIsHelpOpen(true)}
              className="px-4 py-2.5 bg-white text-yellow-600 rounded-full text-xs font-bold shadow-sm hover:bg-yellow-50 transition-colors flex items-center gap-1.5"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" /> 사용방법
            </button>

            {/* API Status Indicators */}
            <div className="flex items-center gap-1 bg-yellow-500/20 p-1 rounded-full mr-1">
               <div className={`px-2 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 transition-colors ${extStatus === 'success' ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-400 border-gray-200'} ${activeKeySource === 'external' ? 'ring-2 ring-white ring-offset-1 ring-offset-yellow-400' : 'opacity-60'}`}>
                 <div className={`w-1.5 h-1.5 rounded-full ${extStatus === 'success' ? 'bg-white' : 'bg-gray-300'}`}></div>
                 EXT
               </div>
               <div className={`px-2 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 transition-colors ${isInternalKeySelected ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 text-gray-400 border-gray-200'} ${activeKeySource === 'internal' ? 'ring-2 ring-white ring-offset-1 ring-offset-yellow-400' : 'opacity-60'}`}>
                 <div className={`w-1.5 h-1.5 rounded-full ${isInternalKeySelected ? 'bg-white' : 'bg-gray-300'}`}></div>
                 INT
               </div>
            </div>

            <button 
              onClick={() => {
                setIsSettingsOpen(true);
              }}
              className="p-2.5 bg-white text-gray-900 rounded-full shadow-sm hover:bg-gray-100 transition-colors relative"
            >
              <Cog6ToothIcon className="w-5 h-5" />
              {(!extApiKey && !isInternalKeySelected) && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-yellow-400"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-400" /> API 설정 및 선택
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="hover:bg-gray-100 rounded-full p-1 transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6 flex items-start gap-3">
               <InformationCircleIconMini className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
               <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                  사용할 API 키를 직접 선택할 수 있습니다. <br/>
                  <span className="font-bold">외부 키(External)</span>는 개인 키, <span className="font-bold">자체 키(Internal)</span>는 공유받은 프로젝트 키를 의미합니다.
               </p>
            </div>

             {/* Internal API Key Section (First) */}
            <div 
              className={`mb-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                activeKeySource === 'internal' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-gray-50 border-gray-100 opacity-80 hover:opacity-100'
              }`}
              onClick={() => switchActiveSource('internal')}
            >
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${activeKeySource === 'internal' ? 'border-blue-500 bg-white' : 'border-gray-300 bg-transparent'}`}>
                        {activeKeySource === 'internal' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">자체 API 키 (Internal)</span>
                        <span className="text-[10px] text-gray-500">공유받은 Google Cloud Project Key</span>
                     </div>
                  </div>
                  {isInternalKeySelected && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">CONNECTED</span>}
               </div>

               <div className="pl-8" onClick={(e) => e.stopPropagation()}>
                   <button 
                      onClick={handleSelectInternalKey}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-blue-300 transition-all group"
                   >
                      <CloudIcon className={`w-5 h-5 ${isInternalKeySelected ? 'text-blue-500' : 'text-gray-400'} group-hover:text-blue-500 transition-colors`} />
                      <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">
                        {isInternalKeySelected ? '프로젝트 키 변경하기' : 'Google Cloud 프로젝트 키 선택'}
                      </span>
                   </button>
                   {isInternalKeySelected && (
                     <div className="mt-2 text-[10px] text-blue-500 font-medium flex items-center gap-1">
                       <CheckIcon className="w-3 h-3" /> API Key Selected via AI Studio
                     </div>
                   )}
               </div>
            </div>

            {/* External API Key Section (Second) */}
            <div 
              className={`mb-6 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                activeKeySource === 'external' ? 'bg-green-50 border-green-400 ring-2 ring-green-100' : 'bg-gray-50 border-gray-100 opacity-80 hover:opacity-100'
              }`}
              onClick={() => switchActiveSource('external')}
            >
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${activeKeySource === 'external' ? 'border-green-500 bg-white' : 'border-gray-300 bg-transparent'}`}>
                        {activeKeySource === 'external' && <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">외부 API 키 (External)</span>
                        <span className="text-[10px] text-gray-500">사용자 개인의 Gemini API Key</span>
                     </div>
                  </div>
                  {extStatus === 'success' && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">VERIFIED</span>}
               </div>
               
               <div className="pl-8" onClick={(e) => e.stopPropagation()}>
                   <div className="relative group mb-3">
                      <input
                        type="password"
                        value={extApiKey}
                        onChange={(e) => { 
                          setExtApiKey(e.target.value); 
                          if(extStatus !== 'idle') setExtStatus('idle');
                        }}
                        className="w-full bg-white text-gray-800 rounded-xl py-3 px-4 pr-10 font-mono text-xs tracking-widest outline-none border border-gray-200 focus:border-green-400 transition-all"
                        placeholder="Paste External Key..."
                      />
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={handleVerifyExt}
                        disabled={extStatus === 'loading' || !extApiKey}
                        className="flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 bg-[#1a1f2e] text-white hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {extStatus === 'loading' ? '검증 중...' : '검증 및 저장'}
                      </button>
                      <button onClick={handleResetExt} className="w-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300">
                        <TrashIcon className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                   </div>
               </div>
            </div>
            
            {/* Capabilities Checklist */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ListBulletIcon className="w-4 h-4" /> Capabilities Checklist
              </h3>
              <div className="space-y-3">
                {["텍스트 분석/기획안", "표준 이미지 (Standard)", "Pro 이미지 (2K High Quality)"].map((item, idx) => {
                  const isActive = isCurrentKeyValid();
                  return (
                    <div key={idx} className="flex justify-between items-center">
                      <span className={`text-sm font-bold ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                        <span className="mr-2 opacity-50">{idx === 0 ? '📄' : idx === 1 ? '🌄' : '✨'}</span>
                        {item}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-white'
                      }`}>
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors active:scale-95">설정 닫기</button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-7 h-7 text-yellow-400" /> 사용방법 안내
              </h2>
              <button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-6">
              {[
                { step: 1, title: '웹툰 주제 입력', desc: '예시) 얼굴이 곧 신용카드! 편의점부터 공항까지 점령한 \'페이스페이\' 가이드' },
                { step: 2, title: '화풍 선택', desc: '9가지 다양한 화풍 중 스토리에 어울리는 스타일을 선택하세요.' },
                { step: 3, title: '기획안 생성', desc: '"기획안 생성" 버튼을 눌러 AI가 제안하는 스토리와 대사를 확인하세요.' },
                { step: 4, title: '기획안 수정', desc: '생성된 4컷 스토리, 대사, 캐릭터 설정을 원하는 대로 직접 수정하세요.' },
                { step: 5, title: '프롬프트 최적화 (필수)', desc: '수정이 끝났다면 반드시 "프롬프트 최적화" 버튼을 눌러주세요.' },
                { step: 6, title: '이미지 생성', desc: '우측 패널에서 이미지 모델(나노/프로/이미진)을 선택하고 "이미지 생성"을 클릭하세요.' }
              ].map((item, idx) => (
                 <div key={idx} className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-[#1a1f2e] text-yellow-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                     {String(item.step).padStart(2, '0')}
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                     {item.desc && (
                       <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed font-medium break-keep">
                         {item.desc}
                       </div>
                     )}
                   </div>
                 </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
               <p className="text-sm text-gray-600 mb-4 font-medium">이후 저장하고 활용하면 됩니다.</p>
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                 <InformationCircleIconMini className="w-4 h-4 text-red-500" />
                 <p className="text-xs font-bold text-red-600">ps. 수정 후에는 꼭 "프롬프트 최적화"를 다시 실행해야 반영됩니다.</p>
               </div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-6 py-4 bg-[#1a1f2e] text-white rounded-2xl font-bold hover:bg-black transition-colors">완벽하게 이해했습니다!</button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <main className="max-w-[1600px] mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start">
        
        {/* Left Column (Inputs) - 3 Columns */}
        <div className="lg:col-span-3 space-y-4">
           {/* Step 1: Subject */}
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
             <label className="text-sm font-bold text-gray-500 mb-3 block">01. 웹툰 주제</label>
             <textarea 
               className="w-full h-32 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-yellow-400 p-4 text-base font-bold text-gray-800 placeholder-gray-400 resize-none outline-none"
               placeholder="예: 페라이트 코어의 원리와 특징"
               value={subject}
               onChange={(e) => setSubject(e.target.value)}
             />
           </div>

           {/* Step 2: Style */}
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
             <label className="text-sm font-bold text-gray-500 mb-3 block">02. 화풍 선택</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
               {(Object.keys(STYLE_CONFIGS) as ArtStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[90px] ${
                      selectedStyle === style 
                        ? 'border-yellow-400 bg-yellow-50 shadow-inner' 
                        : 'border-gray-50 hover:border-yellow-200'
                    }`}
                  >
                    <div className={selectedStyle === style ? 'text-yellow-600' : 'text-gray-300'}>
                      {STYLE_CONFIGS[style].icon}
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight break-keep">{style.split('(')[0].trim()}</span>
                  </button>
               ))}
             </div>
           </div>

           {/* Action Button */}
           <div>
             {/* Selected Style Description */}
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center mb-3 transition-all">
                <p className="text-xs font-bold text-gray-600 break-keep flex items-start justify-center gap-1.5">
                  <LightBulbIcon className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  {STYLE_CONFIGS[selectedStyle].description}
                </p>
             </div>

             <button
              onClick={handleCreatePlan}
              disabled={state.isPlanning || (!extApiKey && !isInternalKeySelected)}
              className={`w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-2 shadow-xl transition-all ${
                (state.isPlanning || (!extApiKey && !isInternalKeySelected)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#1a1f2e] text-white hover:bg-black active:scale-95'
              }`}
            >
              {state.isPlanning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <RocketLaunchIcon className="w-5 h-5 text-white" />}
              기획안 생성
            </button>
           </div>

          {/* Rebuild Button */}
          {state.plan && (
            <button
              onClick={handleRebuildPrompt}
              disabled={isUpdatingPrompt}
              className="w-full py-4 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 active:scale-95 transition-all"
            >
              {isUpdatingPrompt ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
              프롬프트 최적화
            </button>
          )}

          {/* Version Footer */}
          <div className="pt-8 pl-2">
             <p className="text-[10px] text-gray-400 font-medium">최근 업데이트: {VERSION} | Developed by Webtoon Master</p>
          </div>
        </div>

        {/* Center Column (Plan Details) - 6 Columns */}
        <div className="lg:col-span-6">
          {(state.isPlanning || state.plan) ? (
            <div className={`bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 min-h-[800px] transition-all ${state.isPlanning ? 'opacity-50 animate-pulse' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black flex items-center gap-2 text-gray-900">
                  <PresentationChartBarIcon className="w-5 h-5 text-yellow-500" /> 웹툰 기획 상세
                </h3>
                {state.plan && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                    <CheckCircleIcon className="w-3 h-3" /> INFORMATION VERIFIED
                  </div>
                )}
              </div>

              {state.plan && (
                <div className="space-y-6">
                  {/* Character */}
                  <div className="p-1 rounded-3xl border border-blue-100 bg-blue-50/30">
                     <div className="bg-white rounded-[1.2rem] p-6 shadow-sm">
                        <label className="text-xs font-bold text-blue-600 mb-4 block">메인 캐릭터</label>
                        <input 
                          className="w-full text-2xl font-black text-blue-900 mb-4 outline-none placeholder-blue-200"
                          value={state.plan.recommendedCharacter.name}
                          onChange={(e) => updatePlan({ recommendedCharacter: { ...state.plan!.recommendedCharacter, name: e.target.value } })}
                        />
                         <textarea 
                          className="w-full bg-blue-50/50 rounded-xl p-4 text-sm font-medium text-blue-800 resize-none h-20 outline-none"
                          value={state.plan.recommendedCharacter.appearance}
                          onChange={(e) => updatePlan({ recommendedCharacter: { ...state.plan!.recommendedCharacter, appearance: e.target.value } })}
                        />
                     </div>
                  </div>

                  {/* 4 Panels */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 pl-2">4컷 스토리 및 대사</label>
                    {state.plan.storySummary.map((step, idx) => (
                      <div key={idx} className="bg-white rounded-[1.5rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                           <span className="font-black text-xl italic text-gray-800">{idx + 1}</span>
                           <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Panel Scene</span>
                        </div>
                        <textarea 
                          className="w-full text-base font-medium text-gray-700 outline-none resize-none h-16 bg-transparent"
                          value={step}
                          onChange={(e) => updateStoryStep(idx, e.target.value)}
                        />
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex gap-3">
                          <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          <input 
                            className="w-full text-base font-bold text-blue-600 outline-none bg-transparent"
                            value={state.plan.dialogues[idx]}
                            onChange={(e) => updateDialogueStep(idx, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info Block */}
                  <div className="bg-[#f0fdf4] rounded-[1.5rem] p-6 border border-green-100">
                    <div className="flex items-center gap-2 mb-4">
                      <InfoIcon className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold text-green-600 uppercase">정보 텍스트 블록 (Dedicated Info Box)</span>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <textarea 
                        className="w-full h-32 text-base text-gray-700 leading-relaxed outline-none resize-none bg-transparent"
                        value={state.plan.infoTextBlock}
                        onChange={(e) => updatePlan({ infoTextBlock: e.target.value })}
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-bold text-green-500 italic">* 이 내용은 프롬프트의 'dedicated info box' 영역에 반영됩니다.</p>
                  </div>

                  {/* References (New) */}
                  <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 uppercase">조사 근거 (Reference Sources)</span>
                    </div>
                     <div className="bg-white rounded-2xl p-4 shadow-sm">
                         {state.plan.referenceSources && state.plan.referenceSources.length > 0 ? (
                           <ul className="space-y-2">
                             {state.plan.referenceSources.map((src, i) => (
                               <li key={i} className="flex items-center gap-2 text-base font-bold text-blue-600">
                                 <LinkIconMini className="w-4 h-4 text-blue-300" />
                                 {src}
                               </li>
                             ))}
                           </ul>
                         ) : (
                           <p className="text-xs text-gray-400">참고할 만한 소스가 없습니다.</p>
                         )}
                     </div>
                     <p className="mt-3 text-[10px] font-medium text-gray-400 italic">* 신뢰도 높은 소스 위주로 교차 검증된 정보를 기반으로 작성되었습니다.</p>
                  </div>

                  {/* Outro */}
                  <div className="bg-purple-50 rounded-[1.5rem] p-6 border border-purple-100">
                    <div className="flex items-center gap-2 mb-4">
                      <UserPlusIcon className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold text-purple-500 uppercase">아웃트로 패널</span>
                    </div>
                    <div className="space-y-3">
                       <div className="bg-white rounded-xl p-4 shadow-sm">
                         <textarea 
                            className="w-full text-base font-medium text-purple-800 outline-none resize-none h-12 bg-transparent"
                            value={state.plan.outroDetails.action}
                            onChange={(e) => updatePlan({ outroDetails: { ...state.plan!.outroDetails, action: e.target.value } })}
                         />
                       </div>
                       <div className="bg-white rounded-xl p-4 shadow-sm">
                         <input 
                            className="w-full text-base font-bold text-purple-900 outline-none bg-transparent"
                            value={state.plan.outroDetails.dialogue}
                            onChange={(e) => updatePlan({ outroDetails: { ...state.plan!.outroDetails, dialogue: e.target.value } })}
                         />
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[800px] border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center text-gray-300 gap-4 bg-white/50">
              <PresentationChartBarIcon className="w-20 h-20 text-gray-200" />
              <p className="text-sm font-bold text-gray-400">기획안이 생성되면 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* Right Column (Preview & Prompt) - 3 Columns */}
        <div className="lg:col-span-3">
          <div className="bg-[#0f172a] rounded-[2.5rem] p-6 text-white min-h-[800px] flex flex-col shadow-2xl sticky top-28">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xs font-black text-yellow-500 tracking-widest uppercase leading-relaxed w-2/3">2K Masterpiece<br/>Preview</h3>
              <div className="flex gap-2">
                 {generatedImage && (
                   <button onClick={() => setIsImageModalOpen(true)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-300">
                     <ArrowsPointingOutIcon className="w-4 h-4" />
                   </button>
                 )}
                 <button onClick={downloadImage} disabled={!generatedImage} className="p-2 bg-yellow-500 rounded-full text-yellow-900 hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed">
                   <ArrowDownTrayIcon className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Image Area */}
            <div className="aspect-[9/16] bg-gray-900/50 rounded-[2rem] border-2 border-gray-800 mb-6 flex items-center justify-center relative overflow-hidden group">
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-yellow-500 animate-pulse">Rendering 2K...</p>
                </div>
              ) : generatedImage ? (
                <>
                  <img src={generatedImage} alt="Webtoon Preview" className="w-full h-full object-cover" />
                  <div 
                    onClick={() => setIsImageModalOpen(true)}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                  >
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
                      <ArrowsPointingOutIcon className="w-10 h-10" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-4">
                   {imageError ? (
                     <>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                          <ExclamationCircleIcon className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-red-400 max-w-[200px] leading-relaxed">
                          {imageError}
                        </p>
                     </>
                   ) : (
                     <>
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600">
                          <PhotoIcon className="w-8 h-8" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">No Image Preview</p>
                     </>
                   )}
                </div>
              )}
            </div>

            {/* Model Selector (Redesigned) */}
            <div className="mb-6">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <CpuChipIcon className="w-5 h-5 text-gray-400"/> 이미지 생성 엔진
               </h3>
               <div className="flex flex-col gap-3">
                 {/* Nano Flash */}
                 <button
                   onClick={() => setSelectedImageModel('nano-flash')}
                   className={`relative overflow-hidden group flex items-center p-4 rounded-2xl border-2 transition-all ${
                     selectedImageModel === 'nano-flash'
                       ? 'bg-[#1e293b] border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                       : 'bg-[#1e293b] border-transparent hover:border-gray-600'
                   }`}
                 >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${
                       selectedImageModel === 'nano-flash' ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                       <BoltIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <span className={`block text-sm font-bold ${selectedImageModel === 'nano-flash' ? 'text-white' : 'text-gray-400'}`}>나노바나나 (Standard)</span>
                       <span className="text-[10px] text-gray-500 font-medium">빠른 속도 · 일관성 최적화</span>
                    </div>
                    {selectedImageModel === 'nano-flash' && <CheckIcon className="w-5 h-5 text-yellow-400 absolute right-4" />}
                 </button>

                 {/* Nano Pro */}
                 <button
                   onClick={() => setSelectedImageModel('nano-pro')}
                   className={`relative overflow-hidden group flex items-center p-4 rounded-2xl border-2 transition-all ${
                     selectedImageModel === 'nano-pro'
                       ? 'bg-gradient-to-r from-[#312e81] to-[#1e1b4b] border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.3)]'
                       : 'bg-[#1e293b] border-transparent hover:border-gray-600'
                   }`}
                 >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${
                       selectedImageModel === 'nano-pro' ? 'bg-indigo-400 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                       <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <span className={`block text-sm font-bold ${selectedImageModel === 'nano-pro' ? 'text-indigo-200' : 'text-gray-400'}`}>나노바나나 PRO</span>
                       <span className={`text-[10px] font-medium ${selectedImageModel === 'nano-pro' ? 'text-indigo-300' : 'text-gray-500'}`}>2K 고해상도 · 디테일 강화</span>
                    </div>
                    {selectedImageModel === 'nano-pro' && <CheckIcon className="w-5 h-5 text-indigo-400 absolute right-4" />}
                 </button>

                 {/* Imagen */}
                 <button
                   onClick={() => setSelectedImageModel('imagen')}
                   className={`relative overflow-hidden group flex items-center p-4 rounded-2xl border-2 transition-all ${
                     selectedImageModel === 'imagen'
                       ? 'bg-[#1e293b] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                       : 'bg-[#1e293b] border-transparent hover:border-gray-600'
                   }`}
                 >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${
                       selectedImageModel === 'imagen' ? 'bg-cyan-400 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                       <PhotoIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <span className={`block text-sm font-bold ${selectedImageModel === 'imagen' ? 'text-white' : 'text-gray-400'}`}>이미진 (Imagen 3.0)</span>
                       <span className="text-[10px] text-gray-500 font-medium">높은 창의성 · 다양한 화풍</span>
                    </div>
                    {selectedImageModel === 'imagen' && <CheckIcon className="w-5 h-5 text-cyan-400 absolute right-4" />}
                 </button>
               </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !state.plan?.englishPrompt}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-black text-yellow-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-8"
            >
              <SparklesIcon className="w-4 h-4" /> 이미지 생성
            </button>

            {/* Prompt Area */}
            <div className="flex-grow flex flex-col">
              <div className="flex justify-between items-end mb-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nanobanana English Prompt</label>
                <button onClick={copyPrompt} className="text-[10px] font-black text-yellow-500 hover:text-white transition-colors uppercase flex items-center gap-1">
                  Copy Prompt
                </button>
              </div>
              <div className="flex-grow bg-[#1e293b] rounded-3xl p-5 border border-gray-700 relative group/prompt">
                <textarea 
                  className="w-full h-full bg-transparent text-xs font-mono text-gray-400 outline-none resize-none custom-scrollbar leading-relaxed"
                  value={state.plan?.englishPrompt || "기획안이 생성되면 프롬프트가 여기에 표시됩니다."}
                  readOnly
                />
                <div className="absolute w-1 h-8 bg-yellow-500 rounded-full left-0 top-8 opacity-50"></div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              <SparklesIcon className="w-3 h-3 text-yellow-600" /> Optimized for Gemini 3 Pro 2K
            </div>
          </div>
        </div>

      </main>

      {/* Image Modal */}
      {isImageModalOpen && generatedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsImageModalOpen(false)}>
           <button 
             onClick={() => setIsImageModalOpen(false)}
             className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors"
           >
             <XMarkIcon className="w-8 h-8" />
           </button>
           <img 
             src={generatedImage} 
             alt="Full Screen Preview" 
             className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
             onClick={(e) => e.stopPropagation()}
           />
        </div>
      )}
    </div>
  );
};

// Mini Icons for list items
function InformationCircleIconMini({className}:{className?:string}) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" /></svg>
}

function LinkIconMini({className}:{className?:string}) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
}

export default App;
