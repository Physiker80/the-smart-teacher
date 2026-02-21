import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LessonPlan, CurriculumBook, CurriculumLesson, getCurriculumBookDisplayName } from '../types';
import { generateLessonPlan } from '../services/geminiService';
import { getAllCurricula } from '../services/curriculumService';
import { Loader2, Send, X, AlertCircle, Atom, Cpu, GraduationCap, Camera, CameraOff, RotateCcw, Check, Upload, FileText, Image as ImageIcon, Book, FlaskConical } from 'lucide-react';

interface LessonGeneratorProps {
    onSuccess: (plan: LessonPlan) => void;
    onCancel: () => void;
    initialTopic?: string;
    initialGrade?: string;
    initialActivities?: string[];
    initialSubject?: string;
}

interface CapturedImage {
    mimeType: string;
    data: string; // base64 raw
    previewUrl: string; // data url for display
    name?: string;
    size?: number;
}

type InputMode = 'camera' | 'upload';

export const LessonGenerator: React.FC<LessonGeneratorProps> = ({ onSuccess, onCancel, initialTopic, initialGrade, initialActivities = [], initialSubject }) => {
    const [topic, setTopic] = useState(initialTopic || '');
    const [gradeLevel, setGradeLevel] = useState(initialGrade || 'الصف الثالث الابتدائي');
    const [selectedActivities, setSelectedActivities] = useState<string[]>(initialActivities);
    const [isLoading, setIsLoading] = useState(false);
    const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState("تهيئة النظام...");
    const [inputMode, setInputMode] = useState<InputMode>('upload'); // Default to upload as requested implicitly
    const [savedCurricula, setSavedCurricula] = useState<CurriculumBook[]>([]);
    const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('');

    // Load curricula
    useEffect(() => {
        setSavedCurricula(getAllCurricula());
    }, []);

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // File Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);

    const grades = [
        "الروضة", "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
        "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
        "الصف السابع الإعدادي", "الصف الثامن الإعدادي", "الصف التاسع الإعدادي"
    ];

    // Cleanup camera functionality
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // Camera Handlers
    const startCamera = useCallback(async () => {
        setCameraError(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsCameraOpen(true);
        } catch (err: any) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError') {
                setCameraError("تم رفض إذن الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.");
            } else if (err.name === 'NotFoundError') {
                setCameraError("لم يتم العثور على كاميرا متصلة.");
            } else {
                setCameraError("خطأ في تشغيل الكاميرا: " + err.message);
            }
        }
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = dataUrl.split(',')[1];

        setCapturedImage({
            mimeType: 'image/jpeg',
            data: base64Data,
            previewUrl: dataUrl,
            name: `capture-${Date.now()}.jpg`
        });

        stopCamera();
    }, [stopCamera]);

    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        startCamera();
    }, [startCamera]);

    // File Upload Handlers
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setCameraError(null);

        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError("حجم الملف كبير جداً. الحد الأقصى: 10 ميغابايت");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64Data = result.split(',')[1];
                setCapturedImage({
                    mimeType: file.type,
                    data: base64Data,
                    previewUrl: result,
                    name: file.name,
                    size: file.size
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const isPdf = capturedImage?.mimeType === 'application/pdf';

    const handleGenerate = async () => {
        if (!topic && !capturedImage) return;

        setIsLoading(true);
        setStatusText("تنشيط غرفة العمليات التربوية...");

        try {
            setTimeout(() => setStatusText("> تحليل الفئة العمرية والمعايير..."), 1500);
            setTimeout(() => setStatusText("> تصميم سيناريو رحلة البطل..."), 4000);
            setTimeout(() => setStatusText("> إعداد الإخراج البصري (Pixar Style)..."), 7000);
            setTimeout(() => setStatusText("> صياغة دليل المعلم الذكي..."), 10000);

            // Combine topic with selected activities for comprehensive prompt
            const promptWithActivities = selectedActivities.length > 0 
                ? `${topic}\n\n**الأنشطة المطلوبة:**\n${selectedActivities.map(a => `- ${a}`).join('\n')}`
                : topic;

            const plan = await generateLessonPlan(
                promptWithActivities,
                gradeLevel,
                capturedImage ? { mimeType: capturedImage.mimeType, data: capturedImage.data } : undefined
            );
            if (initialSubject) plan.subject = initialSubject;
            onSuccess(plan);
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || "فشل التوليد لأسباب غير معروفة";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    // Switch input mode handler
    const handleModeSwitch = (mode: InputMode) => {
        setInputMode(mode);
        setCapturedImage(null);
        setError(null);
        setCameraError(null);
        stopCamera();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="w-full min-h-screen bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 relative font-sans text-slate-100 z-50">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} className="hidden"></canvas>

            {/* Main Panel */}
            <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-700/50">

                {/* Tech Borders */}
                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-amber-500/50 rounded-tl-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-amber-500/50 rounded-br-2xl pointer-events-none"></div>

                {/* Header */}
                <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                            <Atom size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide">مولد الدروس - الإصدار 2</h2>
                            <p className="text-[10px] text-slate-400 font-mono tracking-widest">وحدة التخطيط المدعومة بالذكاء الاصطناعي</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6 relative z-10">

                    {/* NEW: Curriculum Selection */}
                    {savedCurricula.length > 0 && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-2">
                                    <Book size={14} /> اختر من المنهاج المحلل
                                </label>
                                {selectedCurriculumId && (
                                    <button onClick={() => setSelectedCurriculumId('')} className="text-[10px] text-red-400 hover:text-red-300">مسح الاختيار</button>
                                )}
                            </div>
                            
                            <select
                                value={selectedCurriculumId}
                                onChange={(e) => setSelectedCurriculumId(e.target.value)}
                                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 transition-all font-mono"
                            >
                                <option key="empty" value="">-- اختر كتاباً --</option>
                                {savedCurricula.map((c, idx) => (
                                    <option key={c.id || `curriculum-${idx}`} value={c.id}>{getCurriculumBookDisplayName(c)} • {c.bookMetadata?.grade || ''}</option>
                                ))}
                            </select>

                            {/* Lesson Chips */}
                            {selectedCurriculumId && (
                                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                    {savedCurricula.find(c => c.id === selectedCurriculumId)?.curriculumStructure.map((l, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setTopic(l.lessonTitle);
                                                const grade = savedCurricula.find(c => c.id === selectedCurriculumId)?.bookMetadata.grade;
                                                if (grade) setGradeLevel(grade);
                                            }}
                                            className="w-full text-right px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-xs text-slate-300 hover:text-white truncate flex items-center gap-2 group"
                                        >
                                            <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 group-hover:bg-emerald-500/20 group-hover:text-emerald-400">{i + 1}</span>
                                            {l.lessonTitle}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Grade Level Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-amber-500 font-mono flex items-center gap-2">
                            <GraduationCap size={14} /> تحديد المستوى التعليمي
                        </label>
                        <select
                            value={gradeLevel}
                            onChange={(e) => setGradeLevel(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-slate-900"
                        >
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* Input Field */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-400 font-mono flex items-center gap-2">
                            <Cpu size={14} /> إدخال موضوع الدرس
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="مثال: المجموعة الشمسية، القسمة المطولة..."
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-mono"
                        />
                    </div>

                    {/* Show Selected Activities */}
                    {selectedActivities.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-2">
                                <FlaskConical size={14} /> الأنشطة المختارة
                            </label>
                            <div className="bg-slate-950/50 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                {selectedActivities.map((act, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{act}</span>
                                        <button 
                                            onClick={() => setSelectedActivities(prev => prev.filter((_, idx) => idx !== i))}
                                            className="mr-auto text-slate-500 hover:text-red-400"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-800 flex-1"></div>
                        <span className="text-[10px] font-mono text-slate-500">طرق الإدخال الإضافية (اختياري)</span>
                        <div className="h-px bg-slate-800 flex-1"></div>
                    </div>

                    {/* Input Method Switcher */}
                    <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => handleModeSwitch('upload')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'upload'
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            <Upload size={14} /> رفع ملف
                        </button>
                        <button
                            onClick={() => handleModeSwitch('camera')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'camera'
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            <Camera size={14} /> كاميرا
                        </button>
                    </div>

                    {/* Content Area Based on Mode */}
                    <div className="min-h-[144px]">
                        {/* MODE: FILE UPLOAD */}
                        {inputMode === 'upload' && (
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                />

                                {!capturedImage ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-36 border-2 border-dashed border-slate-700 bg-slate-900/30 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        <div className="p-3 bg-slate-950 rounded-full text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-xl relative z-10">
                                            <Upload size={20} />
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-slate-300 font-bold block text-sm">رفع صورة أو كتاب</span>
                                            <span className="text-slate-600 text-[10px] font-mono">المدعوم: صور، PDF (أقصى حجم 10 ميغابايت)</span>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="relative h-36 rounded-xl overflow-hidden border border-blue-500/50 bg-slate-900 group">
                                        {isPdf ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <FileText size={40} className="text-blue-500" />
                                                <span className="font-mono text-xs text-center px-4 w-full truncate">{capturedImage.name}</span>
                                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">{formatSize(capturedImage.size)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <img src={capturedImage.previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 h-1/4 animate-scan pointer-events-none"></div>
                                            </>
                                        )}

                                        <div className="absolute top-0 right-0 p-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCapturedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="bg-slate-950/80 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                            <div className="bg-blue-500/20 backdrop-blur border border-blue-500/30 text-blue-400 text-[10px] px-3 py-1 rounded font-mono font-bold flex items-center gap-2">
                                                <Check size={12} />
                                                التحليل جاهز
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MODE: CAMERA */}
                        {inputMode === 'camera' && (
                            <div>
                                {!isCameraOpen && !capturedImage ? (
                                    /* Camera Start Button */
                                    <button
                                        onClick={startCamera}
                                        className="w-full h-36 border-2 border-dashed border-slate-700 bg-slate-900/30 rounded-xl hover:border-emerald-500 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        <div className="p-3 bg-slate-950 rounded-full text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all shadow-xl relative z-10">
                                            <Camera size={24} />
                                        </div>
                                        <div className="relative z-10 text-center">
                                            <span className="text-slate-300 font-bold block text-sm">تفعيل الكاميرا</span>
                                            <span className="text-slate-600 text-[10px] font-mono">التقط صورة من الكتاب مباشرة</span>
                                        </div>
                                    </button>
                                ) : isCameraOpen && !capturedImage ? (
                                    /* Live Camera Feed */
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/50 bg-black">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-56 object-cover"
                                        ></video>

                                        {/* Scanning Overlay */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 h-1/4 animate-scan"></div>
                                        </div>

                                        {/* Camera Controls */}
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                            <button
                                                onClick={stopCamera}
                                                className="bg-red-500/80 backdrop-blur text-white p-3 rounded-full hover:bg-red-500 transition-all shadow-lg"
                                                title="إغلاق الكاميرا"
                                            >
                                                <CameraOff size={20} />
                                            </button>
                                            <button
                                                onClick={capturePhoto}
                                                className="bg-emerald-500 text-white p-4 rounded-full hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110"
                                                title="التقاط صورة"
                                            >
                                                <Camera size={24} />
                                            </button>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            <div className="bg-red-500/80 backdrop-blur text-white text-[10px] px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 animate-pulse">
                                                <span className="w-2 h-2 rounded-full bg-white"></span>
                                                مباشر
                                            </div>
                                        </div>
                                    </div>
                                ) : capturedImage ? (
                                    /* Captured Image Preview */
                                    <div className="relative h-56 rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-900 group">
                                        <img src={capturedImage.previewUrl} alt="Captured" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />

                                        {/* Action Buttons */}
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                                            <button
                                                onClick={retakePhoto}
                                                className="bg-slate-900/80 backdrop-blur border border-slate-600 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-2"
                                            >
                                                <RotateCcw size={14} /> إعادة التقاط
                                            </button>
                                            <button
                                                onClick={() => setCapturedImage(null)}
                                                className="bg-red-500/20 backdrop-blur border border-red-500/30 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
                                            >
                                                <X size={14} /> إزالة
                                            </button>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            <div className="bg-emerald-500/20 backdrop-blur border border-emerald-500/30 text-emerald-400 text-[10px] px-3 py-1 rounded font-mono font-bold flex items-center gap-2">
                                                <Check size={12} />
                                                تم الالتقاط بنجاح
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {(cameraError || error) && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg mt-3 border border-red-500/20 font-mono">
                            <AlertCircle size={14} />
                            خطأ: {cameraError || error}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || (!topic && !capturedImage)}
                        className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest flex items-center justify-center gap-3 transition-all relative overflow-hidden group ${isLoading || (!topic && !capturedImage)
                            ? 'bg-slate-800 cursor-not-allowed text-slate-600 border border-slate-700'
                            : 'bg-amber-600 hover:bg-amber-500 text-slate-900 border border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>جاري المعالجة...</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-70 animate-pulse">{statusText}</span>
                            </div>
                        ) : (
                            <>
                                <span className="relative z-10 flex items-center gap-2">
                                    تنفيذ البروتوكول <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: -25%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 125%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
                .animate-spin-slow {
                    animation: spin 3s linear infinite;
                }
            `}</style>
        </div>
    );
};