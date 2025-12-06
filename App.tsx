import React, { useState, useRef } from 'react';
import { SmileStyle, ToothShade, SimulationState } from './types';
import { generateSmile } from './services/geminiService';
import { Button } from './components/Button';
import { Spinner } from './components/Spinner';
import { CameraCapture } from './components/CameraCapture';
import { LiveAR } from './components/LiveAR';

// Icons as simple SVGs
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MagicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    originalImage: null,
    generatedImage: null,
    isProcessing: false,
    selectedStyle: SmileStyle.HOLLYWOOD,
    selectedShade: ToothShade.BL1,
    error: null,
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const [showLiveAR, setShowLiveAR] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ 
          ...prev, 
          originalImage: reader.result as string, 
          generatedImage: null,
          error: null 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageSrc: string) => {
    setState(prev => ({ 
      ...prev, 
      originalImage: imageSrc, 
      generatedImage: null,
      error: null 
    }));
    setShowCamera(false);
  };

  const handleLiveARCapture = (original: string, generated: string, style: SmileStyle, shade: ToothShade) => {
    setState({
      originalImage: original,
      generatedImage: generated,
      selectedStyle: style,
      selectedShade: shade,
      isProcessing: false,
      error: null
    });
    setShowLiveAR(false);
  };

  const handleGenerate = async () => {
    if (!state.originalImage) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const result = await generateSmile(
        state.originalImage,
        state.selectedStyle,
        state.selectedShade
      );
      setState(prev => ({ ...prev, generatedImage: result, isProcessing: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message || "حدث خطأ غير متوقع" 
      }));
    }
  };

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    setShowPrintModal(false);
    // Allow animation to finish
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownload = () => {
    if (state.generatedImage) {
      const link = document.createElement('a');
      link.href = state.generatedImage;
      link.download = `dr-naamneh-smile-simulation-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-cyan-500 selection:text-white">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 z-0 pointer-events-none no-print"></div>

      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      {showLiveAR && (
        <LiveAR onCapture={handleLiveARCapture} onClose={() => setShowLiveAR(false)} />
      )}

      {/* Print Confirmation Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl no-print">
          <div className="w-full max-w-md p-8 bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] relative text-center transform transition-all scale-100">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
              <span className="text-cyan-400"><PrintIcon /></span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">تأكيد الطباعة</h3>
            <p className="text-gray-400 mb-8">هل تريد طباعة تقرير المحاكاة للمريض؟ يرجى التأكد من أن الطابعة جاهزة.</p>
            
            <div className="flex justify-center gap-4">
              <Button variant="secondary" onClick={() => setShowPrintModal(false)}>
                إلغاء
              </Button>
              <Button onClick={handleConfirmPrint} icon={<PrintIcon />}>
                طباعة الآن
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 flex flex-col min-h-screen">
        
        {/* Header - No Print */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 no-print">
          <div className="text-right">
            <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-l from-cyan-400 to-purple-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              د. محمد النعامنه
            </h1>
            <p className="text-cyan-200 text-lg tracking-wider mt-2 opacity-80">مركز طب الأسنان المتطور 2040</p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-4">
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm font-mono text-cyan-300">النظام: متصل</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="text-sm font-mono text-purple-300">AI: NANO-BANANA</span>
            </div>
          </div>
        </header>

        {/* Print Header - Only visible on print */}
        <div className="hidden print-only text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold text-black">مركز الدكتور محمد النعامنه لطب الأسنان</h1>
          <p className="text-gray-600 mt-2">تقرير المحاكاة التجميلية للأسنان</p>
          <div className="flex justify-between mt-4 text-sm text-gray-500">
            <span>التاريخ: {new Date().toLocaleDateString('ar-JO')}</span>
            <span>طبيب المعالج: د. محمد النعامنه</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Panel (Left Side on Desktop due to RTL) */}
          <div className="lg:col-span-3 space-y-6 no-print">
            
            {/* Input Methods */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
              <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">01</span> إدخال الصورة
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button 
                  variant="secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col h-24 gap-1 text-sm"
                >
                  <UploadIcon />
                  رفع ملف
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCamera(true)}
                  className="flex flex-col h-24 gap-1 text-sm"
                >
                  <CameraIcon />
                  صور الآن
                </Button>

                {/* Live AR Button */}
                 <Button 
                  variant="primary" 
                  onClick={() => setShowLiveAR(true)}
                  className="col-span-2 flex flex-col h-16 gap-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 hover:shadow-purple-500/30"
                >
                  <div className="flex items-center gap-2">
                     <LiveIcon />
                     <span>مرآة الذكاء الاصطناعي (مباشر)</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* AI Controls */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
               <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">02</span> تخصيص الابتسامة
              </h3>

              {/* Smile Style */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">نوع الابتسامة</label>
                <select 
                  value={state.selectedStyle}
                  onChange={(e) => setState(prev => ({ ...prev, selectedStyle: e.target.value as SmileStyle }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                >
                  {Object.values(SmileStyle).map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              {/* Tooth Shade */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">درجة البياض</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(ToothShade).map(shade => (
                    <button
                      key={shade}
                      onClick={() => setState(prev => ({ ...prev, selectedShade: shade as ToothShade }))}
                      className={`text-right px-4 py-2 rounded-lg text-sm transition-all ${
                        state.selectedShade === shade 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500' 
                          : 'bg-slate-800 text-gray-400 border border-transparent hover:bg-slate-700'
                      }`}
                    >
                      {shade}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!state.originalImage || state.isProcessing}
                  className="w-full shadow-lg shadow-cyan-500/20"
                  icon={state.isProcessing ? undefined : <MagicIcon />}
                >
                  {state.isProcessing ? 'جاري التحليل والمعالجة...' : 'تطبيق المحاكاة'}
                </Button>
              </div>
            </div>
            
            {state.generatedImage && (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" onClick={handlePrintClick} className="w-full border-dashed" icon={<PrintIcon />}>
                  طباعة التقرير
                </Button>
                <Button variant="secondary" onClick={handleDownload} className="w-full border-dashed border-cyan-500/30 text-cyan-300" icon={<DownloadIcon />}>
                  تحميل الصورة
                </Button>
              </div>
            )}

          </div>

          {/* Visualization Area */}
          <div className="lg:col-span-9 flex flex-col gap-6">
            
            {/* Error Display */}
            {state.error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-center no-print animate-bounce">
                {state.error}
              </div>
            )}

            {/* Display Container */}
            <div className="flex-1 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden relative min-h-[500px] flex items-center justify-center print:bg-white print:border-none print:shadow-none">
              
              {!state.originalImage ? (
                <div className="text-center text-gray-500 flex flex-col items-center">
                  <div className="w-20 h-20 border-2 border-gray-700 border-dashed rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl opacity-30">🦷</span>
                  </div>
                  <p>الرجاء التقاط صورة أو رفع ملف للبدء</p>
                  <p className="text-xs text-gray-600 mt-2">أو جرب "مرآة الذكاء الاصطناعي" للمعاينة المباشرة</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col items-center p-4">
                  
                  {state.isProcessing && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
                      <Spinner />
                    </div>
                  )}

                  {/* Image Grid for Print/View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full items-center justify-center">
                    
                    {/* Before */}
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 print:border-gray-200">
                       <img 
                        src={state.originalImage} 
                        alt="Before" 
                        className="w-full h-auto object-contain max-h-[60vh]"
                      />
                      <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md print:bg-gray-200 print:text-black">
                        قبل (Original)
                      </div>
                    </div>

                    {/* After */}
                    {state.generatedImage ? (
                       <div className="relative group rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] print:border-gray-200 print:shadow-none">
                        <img 
                          src={state.generatedImage} 
                          alt="After" 
                          className="w-full h-auto object-contain max-h-[60vh]"
                        />
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg print:hidden">
                          بعد (Simulation)
                        </div>
                         {/* Print specific details overlay */}
                         <div className="hidden print:block absolute bottom-0 right-0 left-0 bg-white/90 p-2 text-xs text-black border-t">
                            نمط: {state.selectedStyle} | لون: {state.selectedShade}
                         </div>
                      </div>
                    ) : (
                      // Placeholder for After image
                      <div className="hidden md:flex flex-col items-center justify-center h-full border-2 border-white/5 border-dashed rounded-xl bg-white/5 no-print">
                        <p className="text-gray-500 text-sm">ستظهر النتيجة هنا</p>
                      </div>
                    )}
                  </div>

                  {/* Comparison Slider hint (Visual only) */}
                  {state.generatedImage && (
                    <div className="mt-4 text-center no-print">
                      <p className="text-cyan-300 text-sm">تم تطبيق نمط: <span className="font-bold text-white">{state.selectedStyle}</span> - لون: <span className="font-bold text-white">{state.selectedShade}</span></p>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-600 text-sm no-print">
           نظام المحاكاة الذكي v4.2 - حقوق الملكية محفوظة لمركز د. محمد النعامنه 2040 &copy;
        </footer>
      </div>
    </div>
  );
};

export default App;