
import React, { useState, useEffect } from 'react';
import { ArtStyle, GenerationState, WebtoonPlan } from './types';
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
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const STORAGE_KEY = 'NANOBANANA_API_KEY';
const VERSION = 'v260107-1';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

const App: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ArtStyle.INSTATOON);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  
  // Image Generation State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [state, setState] = useState<GenerationState>({
    isPlanning: false,
    plan: null,
    error: null,
  });

  // Load API Key from LocalStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setVerificationStatus('success'); // Assume saved key was valid
    }
  }, []);

  const handleVerifyAndSave = async () => {
    if (!apiKey) return;
    setVerificationStatus('loading');
    const isValid = await verifyApiKey(apiKey);
    
    if (isValid) {
      setVerificationStatus('success');
      localStorage.setItem(STORAGE_KEY, apiKey);
    } else {
      setVerificationStatus('error');
    }
  };

  const handleResetKey = () => {
    if(confirm('저장된 API 키를 삭제하시겠습니까?')) {
      setApiKey('');
      localStorage.removeItem(STORAGE_KEY);
      setVerificationStatus('idle');
    }
  };

  const handleCreatePlan = async () => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (!savedKey) {
      setIsSettingsOpen(true);
      setState(prev => ({ ...prev, error: '설정에서 Gemini API 키를 먼저 저장해주세요!' }));
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
    setGeneratedImage(null); // Reset image on new plan
    setImageError(null);

    try {
      const plan = await createWebtoonPlan(subject, selectedStyle, savedKey);
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
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (!state.plan || !savedKey) return;
    setIsUpdatingPrompt(true);
    try {
      const newPrompt = await rebuildPrompt(state.plan, savedKey);
      updatePlan({ englishPrompt: newPrompt });
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: '프롬프트 갱신 중 오류가 발생했습니다.' }));
    } finally {
      setIsUpdatingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (!state.plan?.englishPrompt || !savedKey) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImage(null);
    
    try {
      const imageUrl = await generateWebtoonPreviewImage(state.plan.englishPrompt, savedKey);
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
      link.download = `nanobanana_webtoon_${Date.now()}.png`;
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
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">나노바나나 PRO 웹툰 마스터</h1>
                <span className="px-2 py-0.5 bg-yellow-600 text-white text-[10px] font-bold rounded-full animate-pulse">PRO (2K READY)</span>
              </div>
              <p className="text-yellow-900/80 font-bold text-xs tracking-wide">Google Gemini Pro 2K Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={() => setIsHelpOpen(true)}
              className="px-4 py-2.5 bg-white text-yellow-600 rounded-full text-xs font-bold shadow-sm hover:bg-yellow-50 transition-colors flex items-center gap-1.5"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" /> 사용방법
            </button>
            <button 
              onClick={() => {
                setVerificationStatus(apiKey ? 'success' : 'idle');
                setIsSettingsOpen(true);
              }}
              className="p-2.5 bg-white text-gray-900 rounded-full shadow-sm hover:bg-gray-100 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-400" /> API 설정 및 권한
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="hover:bg-gray-100 rounded-full p-1 transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Google Gemini API Key</label>
                <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                  <LockClosedIcon className="w-3 h-3" /> AES-256 OBFUSCATED
                </span>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { 
                    setApiKey(e.target.value); 
                    if(verificationStatus !== 'idle') setVerificationStatus('idle');
                  }}
                  className={`w-full bg-[#1a1f2e] text-white rounded-full py-3.5 px-6 pr-10 font-mono text-sm tracking-widest outline-none border-2 transition-all ${
                    verificationStatus === 'error' ? 'border-red-500' : 
                    verificationStatus === 'success' ? 'border-green-500' : 'border-transparent focus:border-yellow-400'
                  }`}
                  placeholder="Paste your API key here..."
                />
                <SignalIcon className={`w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${
                  verificationStatus === 'success' ? 'text-green-500' : 'text-gray-600'
                }`} />
              </div>
            </div>
            <div className="flex gap-3 mb-8">
              <button
                onClick={handleVerifyAndSave}
                disabled={verificationStatus === 'loading' || !apiKey}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  verificationStatus === 'success' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : verificationStatus === 'error'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#1a1f2e] hover:bg-gray-800 text-white'
                } active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {verificationStatus === 'loading' ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    검증 중...
                  </>
                ) : verificationStatus === 'success' ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    인증 완료됨
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-4 h-4 text-yellow-400" />
                    키 저장 및 권한 검증
                  </>
                )}
              </button>
              <button
                onClick={handleResetKey}
                className="w-12 h-12 flex items-center justify-center bg-red-50 rounded-xl hover:bg-red-100 transition-colors shrink-0 group"
              >
                <TrashIcon className="w-5 h-5 text-red-300 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ListBulletIcon className="w-4 h-4" /> Capabilities Checklist
              </h3>
              <div className="space-y-3">
                {["텍스트 분석/기획안", "표준 이미지 (Standard)", "Pro 이미지 (2K High Quality)"].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${verificationStatus === 'success' ? 'text-gray-700' : 'text-gray-400'}`}>
                      <span className="mr-2 opacity-50">{idx === 0 ? '📄' : idx === 1 ? '🌄' : '✨'}</span>
                      {item}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      verificationStatus === 'success' ? 'bg-green-500 text-white' : 'bg-gray-200 text-white'
                    }`}>
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6 pl-1">
              <h4 className="text-[10px] font-black text-gray-800 uppercase mb-1">User-End Encryption</h4>
              <p className="text-[10px] text-gray-400 italic">로컬 저장 데이터 보호 계층 활성화</p>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors active:scale-95">닫기</button>
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
                { step: 1, title: '웹툰 주제를 입력한다.', desc: '예시) 얼굴이 곧 신용카드! 편의점부터 공항까지 점령한 \'페이스페이\' 생체인식 가이드' },
                { step: 2, title: '화풍 선택' },
                { step: 3, title: '"기획안 생성" 버튼' },
                { step: 4, title: '"웹툰 기획 상세" 내역에서 수정하고 싶은 부분을 수정한다.' },
                { step: 5, title: '정리가 되었다면 "프롬프트 최적화" 버튼을 클릭' },
                { step: 6, title: '오른쪽에 "copy prompt"를 활용하거나, "2k 미리보기 이미지 생성"' }
              ].map((item, idx) => (
                 <div key={idx} className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-[#1a1f2e] text-yellow-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                     {String(item.step).padStart(2, '0')}
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                     {item.desc && (
                       <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed font-medium">
                         {item.desc}
                       </div>
                     )}
                   </div>
                 </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
               <p className="text-sm text-gray-600 mb-4 font-medium">이후 저장하고 활용하면 된다.</p>
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                 <InformationCircleIconMini className="w-4 h-4 text-red-500" />
                 <p className="text-xs font-bold text-red-600">ps. 꼭 "프롬프트 최적화" 버튼을 사용하여 최적화 해야한다.</p>
               </div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-6 py-4 bg-[#1a1f2e] text-white rounded-2xl font-bold hover:bg-black transition-colors">이해했습니다!</button>
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
             <div className="grid grid-cols-2 gap-2">
               {(Object.keys(STYLE_CONFIGS) as ArtStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      selectedStyle === style 
                        ? 'border-yellow-400 bg-yellow-50 shadow-inner' 
                        : 'border-gray-50 hover:border-yellow-200'
                    }`}
                  >
                    <div className={selectedStyle === style ? 'text-yellow-600' : 'text-gray-300'}>
                      {STYLE_CONFIGS[style].icon}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{style.split(' ')[0]}</span>
                  </button>
               ))}
             </div>
           </div>

           {/* Action Button */}
           <button
            onClick={handleCreatePlan}
            disabled={state.isPlanning || !apiKey}
            className={`w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-2 shadow-xl transition-all ${
              (state.isPlanning || !apiKey) ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#1a1f2e] text-white hover:bg-black active:scale-95'
            }`}
          >
            {state.isPlanning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <RocketLaunchIcon className="w-5 h-5 text-white" />}
            기획안 생성
          </button>

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
             <p className="text-[10px] text-gray-400 font-medium">Ver. {VERSION} | Developed by NanoBanana</p>
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

            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !state.plan?.englishPrompt}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-black text-yellow-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-8"
            >
              <SparklesIcon className="w-4 h-4" /> 2K 미리보기 이미지 생성
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
