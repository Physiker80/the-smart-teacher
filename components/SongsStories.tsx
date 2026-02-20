import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, Music, BookOpen, Play, Pause, Heart, Star, Volume2, VolumeX, Clock, Sparkles, Download, FileText, Music2, Image as ImageIcon, Loader2, X, Camera, CameraOff, RotateCcw, Check, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { SongItem, StoryItem } from '../types';
import { generateSongOrStory } from '../services/geminiService';

interface SongsStoriesProps {
    onBack: () => void;
    initialTopic?: string;
    initialGrade?: string;
}

type TabType = 'songs' | 'stories';

export const SongsStories: React.FC<SongsStoriesProps> = ({ onBack, initialTopic, initialGrade }) => {
    const [activeTab, setActiveTab] = useState<TabType>('songs');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [expandedSongId, setExpandedSongId] = useState<string | null>(null); // For viewing notes
    const [generatingStoryId, setGeneratingStoryId] = useState<string | null>(null);
    const [storyImages, setStoryImages] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'lyrics' | 'score'>('lyrics');
    const [readingStoryId, setReadingStoryId] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Independent Generation State
    const [topicInput, setTopicInput] = useState(initialTopic || '');
    const [gradeInput, setGradeInput] = useState(initialGrade || 'الصف الثالث');

    // Camera / Upload State
    interface CapturedImage {
        mimeType: string;
        data: string;
        previewUrl: string;
        name?: string;
        size?: number;
    }
    type ScanInputMode = 'text' | 'camera' | 'upload';
    const [scanMode, setScanMode] = useState<ScanInputMode>('text');
    const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [songs, setSongs] = useState<SongItem[]>([
        {
            id: '1', title: 'نشيد الأرقام المرحة', subject: 'رياضيات', grade: 'الصف الأول', duration: '2:30', emoji: '🔢', color: 'from-blue-500/20 to-cyan-500/20',
            description: 'نشيد يساعد الطلاب على حفظ الأرقام من 1 إلى 20 بطريقة ممتعة.',
            musicalStyle: 'مرح - مقام عجم (Major Scale)',
            notes: '(المقدمة)\nأرقامنا أرقامنا ... ما أحلاها أرقامنا\n\n(المقطع الأول)\nواحد هو ربي ... اثنان ماما وبابا\nثلاثة هم إخواني ... أربعة هم أصحابي\n\n(اللازمة)\nخمسة أصابع بيدي ... ستة نرحوا للمدرسة\nسبعة نلعب بالملعب ... ثمانية نقرأ قصة\nتسعة نكتب واجبنا ... عشرة ننجح كلنا',
            downloadUrl: '#'
        },
        {
            id: '2', title: 'أغنية حروف الهجاء', subject: 'عربي', grade: 'الروضة', duration: '3:15', emoji: '🔤', color: 'from-amber-500/20 to-yellow-500/20',
            description: 'أغنية تعليمية لجميع الحروف العربية مع أمثلة للكلمات.',
            musicalStyle: 'هادئ - مقام نهاوند (Andante)',
            notes: 'ألف أرنب يجري يلعب ... يأكل جزراً كي لا يتعب\nباء بطة نطت نطة ... وقعت ضحكت منها القطة\nتاء تاج فوق الرأس ... فيه الذهب وفيه الماس\n...',
            downloadUrl: '#'
        },
        {
            id: '3', title: 'نشيد الفصول الأربعة', subject: 'علوم', grade: 'الصف الثاني', duration: '2:45', emoji: '🍂', color: 'from-green-500/20 to-emerald-500/20',
            description: 'وصف للتغيرات الجوية في كل فصل من فصول السنة.',
            musicalStyle: 'متنوع - يعكس جو كل فصل',
            notes: 'إحنا الفصول الأربعة ... إحنا الفصول الأربعة\nالشتاء بارد بارد ... والمطر ينزل ينزل\nالربيع أخضر أخضر ... والورد يفتح يفتح\nالصيف حار حار ... والشمس تسطع تسطع\nالخريف أصفر أصفر ... والورق يقع يقع',
            downloadUrl: '#'
        },
        {
            id: '4', title: 'أغنية جدول الضرب', subject: 'رياضيات', grade: 'الصف الثالث', duration: '4:00', emoji: '✖️', color: 'from-purple-500/20 to-indigo-500/20',
            description: 'تحفيظ جدول الضرب للأرقام من 2 إلى 5 عبر الإيقاع.',
            musicalStyle: 'إيقاعي - راب تعليمي',
            notes: 'يا شطار يا شطار ... تعالوا نحفظ الأرقام\n\n(جدول 2)\n2 في 1 يساوي 2\n2 في 2 يساوي 4 ... سيارة لها 4 كفرات\n2 في 3 يساوي 6 ... صحينا بدري الساعة 6\n2 في 4 يساوي 8 \n2 في 5 يساوي 10 ... أصابع يدي 10',
            downloadUrl: '#'
        },
        {
            id: '5', title: 'نشيد النظافة', subject: 'تربية', grade: 'الصف الأول', duration: '1:50', emoji: '🧼', color: 'from-pink-500/20 to-rose-500/20',
            description: 'حث الطلاب على النظافة الشخصية ونظافة المكان.',
            musicalStyle: 'حيوي - مارش (March - Bb Major)',
            notes: 'نظافة الأبدان ... فرض على الإنسان\nلأنها وقاية ... من كل ما يعان\n\nفالوجه واليدان ... والرأس والرجلان\nتغسل كل يوم ... قبل وبعد النوم\nوالثوب والكيان ... لابد ينظفان',
            downloadUrl: '#'
        },
        {
            id: '6', title: 'أغنية الكواكب', subject: 'علوم', grade: 'الصف الرابع', duration: '3:30', emoji: '🪐', color: 'from-indigo-500/20 to-blue-500/20',
            description: 'رحلة خيالية عبر كواكب المجموعة الشمسية.',
            musicalStyle: 'فضائي - إلكتروني (Synth)',
            notes: 'في فضاء واسع ... تسبح الكواكب\nحول شمس ساطعة ... تدور في موكب\n\nعطارد هو الأقرب ... حار جداً لا يُقرب\nوالزهرة هو الأجمل ... ساطع جداً في المُقبل\nوالأرض كوكبنا ... فيه نعيش حياتنا',
            downloadUrl: '#'
        },
    ]);

    const [stories, setStories] = useState<StoryItem[]>([
        {
            id: '1', title: 'مغامرة في بلاد الأرقام', subject: 'رياضيات', grade: 'الصف الأول', readTime: '5 دقائق', emoji: '🏰', color: 'from-blue-500/20 to-cyan-500/20', preview: 'في يوم مشمس، وجد سامر بوابة سحرية تأخذه إلى عالم تتكلم فيه الأرقام...',
            description: 'قصة خيالية تهدف لتعزيز حب الرياضيات وحل الألغاز الرقمية البسيطة. يتعلم الطفل فيها الأرقام الزوجية والفردية.',
            downloadUrl: '#'
        },
        {
            id: '2', title: 'الشجرة الحكيمة', subject: 'علوم', grade: 'الصف الثاني', readTime: '7 دقائق', emoji: '🌳', color: 'from-green-500/20 to-emerald-500/20', preview: 'كانت في حديقة المدرسة شجرة عملاقة تعرف كل أسرار الطبيعة...',
            description: 'قصة بيئية تعلم الطلاب أهمية الأشجار ودورها في الحفاظ على التوازن البيئي وتوفير الأكسجين.',
            downloadUrl: '#'
        },
        {
            id: '3', title: 'رحلة القطرة الشجاعة', subject: 'علوم', grade: 'الصف الثالث', readTime: '6 دقائق', emoji: '💧', color: 'from-cyan-500/20 to-blue-500/20', preview: 'قطرة ماء صغيرة تبدأ رحلتها من البحر إلى السماء ثم تعود مع المطر...',
            description: 'شرح مبسط وعلمي لدورة الماء في الطبيعة (التبخر، التكثف، الهطول) عبر شخصية كرتونية محببة.',
            downloadUrl: '#'
        },
        {
            id: '4', title: 'مملكة الحروف', subject: 'عربي', grade: 'الروضة', readTime: '4 دقائق', emoji: '👑', color: 'from-amber-500/20 to-yellow-500/20', preview: 'في مملكة بعيدة، كل حرف له شخصية مميزة ومنزل خاص...',
            description: 'قصة تعريفية بحروف الهجاء، تركز على أشكال الحروف ومواضعها في الكلمة بأسلوب قصصي.',
            downloadUrl: '#'
        },
        {
            id: '5', title: 'البطل الصغير والبركان', subject: 'جغرافيا', grade: 'الصف الرابع', readTime: '8 دقائق', emoji: '🌋', color: 'from-red-500/20 to-orange-500/20', preview: 'عمر يكتشف بركاناً صغيراً في رحلة مدرسية ويتعلم كيف تتشكل البراكين...',
            description: 'مغامرة علمية تشرح ظاهرة البراكين، الصهارة، والحمم البركانية بأسلوب مشوق وآمن.',
            downloadUrl: '#'
        },
        {
            id: '6', title: 'النحلة العالمة', subject: 'علوم', grade: 'الصف الأول', readTime: '5 دقائق', emoji: '🐝', color: 'from-yellow-500/20 to-amber-500/20', preview: 'نحلة صغيرة تأخذ الأطفال في جولة داخل الخلية لتعلمهم عن حياة النحل...',
            description: 'قصة تعرف الأطفال على مجتمع النحل، الملكة والشغالات، وكيفية صنع العسل.',
            downloadUrl: '#'
        }
    ]);

    const handleGenerateImage = (storyId: string, title: string) => {
        setGeneratingStoryId(storyId);
        // Simulate API call for image generation
        setTimeout(() => {
            setStoryImages(prev => ({
                ...prev,
                [storyId]: `https://placehold.co/600x400/1e293b/fbbf24/png?text=${encodeURIComponent(title)}+Scene`
            }));
            setGeneratingStoryId(null);
        }, 2000);
    };

    // --- Camera Functions ---
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsCameraOpen(false);
    }, []);

    useEffect(() => { return () => { stopCamera(); }; }, [stopCamera]);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
            setIsCameraOpen(true);
        } catch (err: any) {
            if (err.name === 'NotAllowedError') setCameraError('تم رفض إذن الكاميرا.');
            else if (err.name === 'NotFoundError') setCameraError('لم يتم العثور على كاميرا.');
            else setCameraError('خطأ في الكاميرا: ' + err.message);
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
        setCapturedImage({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl, name: `scan-${Date.now()}.jpg` });
        stopCamera();
    }, [stopCamera]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('حجم الملف كبير جداً. الحد الأقصى: 10MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setCapturedImage({ mimeType: file.type, data: result.split(',')[1], previewUrl: result, name: file.name, size: file.size });
        };
        reader.readAsDataURL(file);
    };

    const clearCapturedImage = () => { setCapturedImage(null); setCameraError(null); };

    // --- TEXT-TO-SPEECH ---
    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                return;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.85;
            utterance.pitch = 1.1;
            const voices = window.speechSynthesis.getVoices();
            const arVoice = voices.find(v => v.lang.startsWith('ar'));
            if (arVoice) utterance.voice = arVoice;
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            setIsSpeaking(true);
            window.speechSynthesis.speak(utterance);
        } else {
            alert('المتصفح لا يدعم القراءة الصوتية.');
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    // --- PDF DOWNLOAD ---
    const handleDownloadStory = (story: StoryItem) => {
        const imgHtml = storyImages[story.id]
            ? `<img src="${storyImages[story.id]}" style="width:100%;max-height:300px;object-fit:cover;border-radius:16px;margin-bottom:20px;" />`
            : '';
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;
        printWindow.document.write(`
            <html dir="rtl">
                <head>
                    <title>${story.title}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                        body { font-family: 'Tajawal', sans-serif; padding: 40px; direction: rtl; background: #fffbeb; color: #1e293b; max-width: 700px; margin: 0 auto; }
                        h1 { text-align: center; font-size: 28pt; color: #b45309; margin-bottom: 8px; }
                        .meta { text-align: center; font-size: 11pt; color: #78716c; margin-bottom: 24px; border-bottom: 2px solid #fbbf24; padding-bottom: 12px; }
                        .story-text { font-size: 16pt; line-height: 2.2; text-align: justify; white-space: pre-wrap; }
                        .emoji { font-size: 48pt; text-align: center; display: block; margin-bottom: 16px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 9pt; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="emoji">${story.emoji}</div>
                    <h1>${story.title}</h1>
                    <div class="meta">${story.subject} | ${story.grade} | وقت القراءة: ${story.readTime}</div>
                    ${imgHtml}
                    <div class="story-text">${story.description}</div>
                    <div class="footer">تم التصدير بواسطة منصة المعلم الذكي ✨</div>
                    <script>setTimeout(() => window.print(), 500);</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadSong = (song: SongItem) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;
        printWindow.document.write(`
            <html dir="rtl">
                <head>
                    <title>${song.title}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                        body { font-family: 'Tajawal', sans-serif; padding: 40px; direction: rtl; background: #fff; color: #1e293b; max-width: 700px; margin: 0 auto; }
                        h1 { text-align: center; font-size: 24pt; color: #be185d; margin-bottom: 8px; }
                        .meta { text-align: center; font-size: 11pt; color: #78716c; margin-bottom: 24px; border-bottom: 2px solid #ec4899; padding-bottom: 12px; }
                        .lyrics { font-size: 14pt; line-height: 2; text-align: center; white-space: pre-wrap; background: #fdf4ff; padding: 24px; border-radius: 12px; border: 1px solid #f0abfc; }
                        .emoji { font-size: 48pt; text-align: center; display: block; margin-bottom: 16px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 9pt; color: #a8a29e; border-top: 1px solid #e7e5e4; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="emoji">${song.emoji}</div>
                    <h1>🎵 ${song.title}</h1>
                    <div class="meta">${song.subject} | ${song.grade} | المدة: ${song.duration} | النمط: ${song.musicalStyle}</div>
                    <p style="font-size:12pt;color:#64748b;text-align:center;margin-bottom:20px;">${song.description}</p>
                    <div class="lyrics">${song.notes}</div>
                    <div class="footer">تم التصدير بواسطة منصة المعلم الذكي ✨</div>
                    <script>setTimeout(() => window.print(), 500);</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleGenerate = async () => {
        if ((!topicInput && !capturedImage) || isGenerating) return;
        setIsGenerating(true);
        try {
            const fileData = capturedImage ? { mimeType: capturedImage.mimeType, data: capturedImage.data } : undefined;
            const newItem = await generateSongOrStory(topicInput, activeTab === 'songs' ? 'song' : 'story', gradeInput, fileData);
            if (activeTab === 'songs') {
                setSongs([newItem as SongItem, ...songs]);
            } else {
                setStories([newItem as StoryItem, ...stories]);
            }
            setCapturedImage(null);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التوليد. الرجاء المحاولة مرة أخرى.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 p-6 md:p-10 pb-6 border-b border-white/5 bg-gradient-to-b from-slate-900/50 to-transparent backdrop-blur-sm">
                {/* Header Content */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                <Music2 className="text-indigo-400" size={32} />
                            </span>
                            الأناشيد والقصص
                        </h1>
                        <p className="text-slate-400 max-w-xl">
                            مكتبة تفاعلية للأناشيد التعليمية والقصص الهادفة، مصممة لتعزيز القيم والمفاهيم التربوية.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        {!initialTopic ? (
                            <div className="flex flex-col gap-3 bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/30 shadow-xl w-full md:w-auto">
                                {/* Mode Tabs */}
                                <div className="flex gap-1 bg-slate-950 rounded-xl p-1 border border-slate-700">
                                    <button onClick={() => { setScanMode('text'); stopCamera(); }} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                        <Sparkles size={14} /> كتابة موضوع
                                    </button>
                                    <button onClick={() => { setScanMode('upload'); stopCamera(); }} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                        <Upload size={14} /> رفع ملف
                                    </button>
                                    <button onClick={() => { setScanMode('camera'); startCamera(); }} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'camera' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                        <Camera size={14} /> كاميرا
                                    </button>
                                </div>

                                {/* Text Input Mode */}
                                {scanMode === 'text' && (
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} placeholder="عن ماذا تريد التأليف؟" className="bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 w-full md:w-64 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500" />
                                        <select value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-slate-900">
                                            <option>الروضة</option>
                                            <option>الصف الأول</option>
                                            <option>الصف الثاني</option>
                                            <option>الصف الثالث</option>
                                            <option>الصف الرابع</option>
                                            <option>الصف الخامس</option>
                                            <option>الصف السادس</option>
                                        </select>
                                        <button onClick={handleGenerate} disabled={isGenerating || !topicInput} className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
                                            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                            تأليف
                                        </button>
                                    </div>
                                )}

                                {/* Upload Mode */}
                                {scanMode === 'upload' && (
                                    <div className="flex flex-col gap-2">
                                        {capturedImage ? (
                                            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                                                {capturedImage.mimeType.startsWith('image/') ? (
                                                    <img src={capturedImage.previewUrl} className="w-16 h-16 object-cover rounded-lg border border-slate-600" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/30"><FileText className="text-red-400" size={24} /></div>
                                                )}
                                                <div className="flex-1 text-right">
                                                    <p className="text-sm text-white font-bold truncate">{capturedImage.name}</p>
                                                    <p className="text-xs text-slate-400">تم التحميل بنجاح</p>
                                                </div>
                                                <button onClick={clearCapturedImage} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <div onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-600 hover:border-indigo-500 cursor-pointer transition-colors group">
                                                <Upload size={24} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                                <span className="text-slate-400 group-hover:text-indigo-300 text-sm">اضغط لرفع صورة أو ملف PDF</span>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                                        <div className="flex gap-2">
                                            <select value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                                <option>الروضة</option><option>الصف الأول</option><option>الصف الثاني</option><option>الصف الثالث</option><option>الصف الرابع</option><option>الصف الخامس</option><option>الصف السادس</option>
                                            </select>
                                            <button onClick={handleGenerate} disabled={isGenerating || !capturedImage} className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
                                                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                                تأليف
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Camera Mode */}
                                {scanMode === 'camera' && (
                                    <div className="flex flex-col gap-2">
                                        {capturedImage ? (
                                            <div className="relative">
                                                <img src={capturedImage.previewUrl} className="w-full max-h-48 object-contain rounded-xl border border-emerald-500/30" />
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <button onClick={() => { clearCapturedImage(); startCamera(); }} className="p-2 bg-slate-900/80 rounded-lg text-slate-300 hover:text-white border border-slate-600"><RotateCcw size={16} /></button>
                                                    <button onClick={clearCapturedImage} className="p-2 bg-slate-900/80 rounded-lg text-red-400 hover:text-red-300 border border-slate-600"><X size={16} /></button>
                                                </div>
                                            </div>
                                        ) : isCameraOpen ? (
                                            <div className="relative">
                                                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover rounded-xl border border-indigo-500/30" />
                                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                                                    <button onClick={capturePhoto} className="p-3 bg-white rounded-full text-slate-900 shadow-xl hover:scale-110 transition-transform"><Camera size={20} /></button>
                                                    <button onClick={stopCamera} className="p-3 bg-red-500 rounded-full text-white shadow-xl hover:bg-red-400"><CameraOff size={20} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 bg-slate-950 p-6 rounded-xl border border-slate-700">
                                                {cameraError ? (
                                                    <p className="text-red-400 text-sm text-center">{cameraError}</p>
                                                ) : (
                                                    <p className="text-slate-400 text-sm">جاري تشغيل الكاميرا...</p>
                                                )}
                                                <button onClick={startCamera} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"><Camera size={14} className="inline ml-2" />تشغيل</button>
                                            </div>
                                        )}
                                        <canvas ref={canvasRef} className="hidden" />
                                        <div className="flex gap-2">
                                            <select value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                                <option>الروضة</option><option>الصف الأول</option><option>الصف الثاني</option><option>الصف الثالث</option><option>الصف الرابع</option><option>الصف الخامس</option><option>الصف السادس</option>
                                            </select>
                                            <button onClick={handleGenerate} disabled={isGenerating || !capturedImage} className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
                                                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                                تأليف
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        جاري التأليف...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        تأليف {activeTab === 'songs' ? 'نشيد' : 'قصة'} عن: {topicInput}
                                    </>
                                )}
                            </button>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={onBack}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <ArrowRight size={16} />
                                عودة
                            </button>
                        </div>
                    </div>
                </div>
                {/* Tab Switcher */}
                <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit mt-4">
                    <button
                        onClick={() => setActiveTab('songs')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'songs'
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Music size={16} /> أناشيد
                    </button>
                    <button
                        onClick={() => setActiveTab('stories')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'stories'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <BookOpen size={16} /> قصص
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-10 relative z-10 overflow-y-auto">
                {activeTab === 'songs' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {songs.map(song => (
                            <div
                                key={song.id}
                                className={`bg-gradient-to-br ${song.color} backdrop-blur border border-slate-700/50 rounded-2xl p-5 hover:scale-[1.02] transition-all group relative overflow-hidden flex flex-col`}
                            >
                                <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2"></div>

                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-3xl">{song.emoji}</span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950/50 px-2 py-1 rounded">{song.grade}</span>
                                </div>

                                <h3 className="text-base font-bold text-white mb-1">{song.title}</h3>
                                <p className="text-slate-400 text-xs mb-2">{song.subject}</p>

                                <div className="text-[10px] text-slate-300 bg-black/20 p-2 rounded-lg mb-4 line-clamp-2 min-h-[40px]">
                                    {song.description}
                                </div>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                        <Clock size={12} />
                                        {song.duration}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setExpandedSongId(song.id)}
                                            className="p-2 rounded-lg bg-slate-950/50 text-slate-400 hover:text-blue-400 transition-colors tooltip"
                                            title="عرض النوتات والوصف"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadSong(song)}
                                            className="p-2 rounded-lg bg-slate-950/50 text-slate-400 hover:text-green-400 transition-colors"
                                            title="تحميل كملف PDF"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPlayingId(playingId === song.id ? null : song.id)}
                                            className={`p-2 rounded-lg transition-all ${playingId === song.id
                                                ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                                                : 'bg-slate-950/50 text-slate-400 hover:text-pink-400'
                                                }`}
                                        >
                                            {playingId === song.id ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {playingId === song.id && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <div className="flex items-center gap-2 text-pink-400 text-xs animate-pulse">
                                            <Volume2 size={14} />
                                            <span className="font-mono">جاري التشغيل...</span>
                                            <div className="flex gap-0.5 items-end h-3">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="w-1 bg-pink-400 rounded-full animate-bounce" style={{ height: `${Math.random() * 12 + 4}px`, animationDelay: `${i * 0.1}s` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stories.map(story => (
                            <div
                                key={story.id}
                                className={`bg-gradient-to-br ${story.color} backdrop-blur border border-slate-700/50 rounded-2xl p-6 hover:scale-[1.01] transition-all group relative overflow-hidden cursor-pointer`}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>

                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-4xl">{story.emoji}</span>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950/50 px-2 py-1 rounded">{story.grade}</span>
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950/50 px-2 py-1 rounded flex items-center gap-1">
                                            <Clock size={10} /> {story.readTime}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                                <div className="min-h-[60px]">
                                    <p className="text-slate-400 text-xs mb-3 leading-relaxed">{story.preview}</p>
                                    <p className="text-slate-500 text-[10px] mb-3 border-t border-white/5 pt-2">{story.description}</p>
                                </div>

                                {storyImages[story.id] ? (
                                    <div className="mb-4 rounded-xl overflow-hidden h-48 border border-white/10 relative group-image">
                                        <img src={storyImages[story.id]} alt={story.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3 opacity-0 group-image-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between w-full items-center">
                                                <span className="text-[10px] text-white flex items-center gap-1"><Sparkles size={10} /> صورة مولدة بالذكاء الاصطناعي</span>
                                                <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors" title="تحميل الصورة">
                                                    <Download size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <button
                                            onClick={() => handleGenerateImage(story.id, story.title)}
                                            disabled={generatingStoryId === story.id}
                                            className="w-full py-6 rounded-xl border border-dashed border-white/20 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-amber-400 group-gen"
                                        >
                                            {generatingStoryId === story.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    جاري توليد المشهد (Simulating AI)...
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon size={14} className="group-gen-hover:scale-110 transition-transform" />
                                                    توليد صورة للمشهد
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950/30 px-2 py-1 rounded">{story.subject}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDownloadStory(story)}
                                            className="p-2 rounded-lg bg-slate-950/50 text-slate-400 hover:text-green-400 transition-colors"
                                            title="تحميل القصة كـ PDF"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={() => setReadingStoryId(story.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500 hover:text-white transition-all"
                                        >
                                            <BookOpen size={12} /> اقرأ القصة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Song Details Modal */}
                {expandedSongId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">
                            {(() => {
                                const song = songs.find(s => s.id === expandedSongId);
                                if (!song) return null;
                                return (
                                    <>
                                        {/* Left Side: Controls & Info */}
                                        <div className="w-full md:w-1/3 bg-slate-950/50 border-b md:border-b-0 md:border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
                                            <div className="text-center">
                                                <div className="text-6xl mb-4 animate-bounce hover:scale-110 transition-transform cursor-pointer">{song.emoji}</div>
                                                <h3 className="text-2xl font-bold text-white mb-1">{song.title}</h3>
                                                <div className="flex justify-center gap-2 mb-2">
                                                    <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">{song.grade}</span>
                                                    <span className="text-xs font-mono bg-pink-500/20 text-pink-300 px-2 py-1 rounded">{song.duration}</span>
                                                </div>
                                                <p className="text-sm text-slate-400">{song.subject}</p>
                                            </div>

                                            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تفاصيل الموسيقى</h4>
                                                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                                                    <span className="text-slate-500">النمط:</span>
                                                    <span className="text-white">{song.musicalStyle}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                                                    <span className="text-slate-500">المقام:</span>
                                                    <span className="text-white">عجم / نهاوند</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">السرعة:</span>
                                                    <span className="text-white">120 BPM</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">أدوات التوليد (AI Studio)</h4>

                                                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                                    <Music2 size={18} />
                                                    توليد اللحن (Melody)
                                                </button>

                                                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                                    <Volume2 size={18} />
                                                    توليد الغناء (Vocal)
                                                </button>

                                                <button className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-2 transition-all">
                                                    <Download size={18} />
                                                    تحميل الملف النهائي
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right Side: Lyrics & Description & Score */}
                                        <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col bg-gradient-to-br from-slate-900 to-slate-950 relative">
                                            <button
                                                onClick={() => setExpandedSongId(null)}
                                                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all z-20"
                                            >
                                                <X size={20} />
                                            </button>

                                            <div className="mb-6">
                                                <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                                    <FileText className="text-indigo-400" size={20} />
                                                    وصف النشيد
                                                </h4>
                                                <p className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                                    {song.description}
                                                </p>
                                            </div>

                                            <div className="flex-1 overflow-hidden flex flex-col">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                        <Music className="text-pink-400" size={20} />
                                                        المحتوى الموسيقي
                                                    </h4>

                                                    {/* Toggle Lyrics / Score */}
                                                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                                                        <button
                                                            onClick={() => setActiveModalTab('lyrics')}
                                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeModalTab === 'lyrics' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                        >
                                                            الكلمات
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveModalTab('score')}
                                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeModalTab === 'score' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                        >
                                                            النوتة الموسيقية
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative group-score">
                                                    {activeModalTab === 'lyrics' ? (
                                                        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 font-mono text-lg leading-loose text-center text-slate-200 whitespace-pre-wrap shadow-inner h-full">
                                                            {song.notes}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-[#fffbeb] text-slate-900 p-8 rounded-xl border border-amber-200/50 font-mono text-sm leading-relaxed shadow-inner h-full overflow-auto relative">
                                                            {/* Paper Texture Effect */}
                                                            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")' }}></div>

                                                            {/* Print Button Overlay */}
                                                            <button
                                                                onClick={() => {
                                                                    const printWindow = window.open('', '', 'width=800,height=600');
                                                                    if (printWindow) {
                                                                        printWindow.document.write(`
                                                                            <html dir="rtl">
                                                                                <head>
                                                                                    <title>طباعة النوتة - ${song.title}</title>
                                                                                    <style>
                                                                                        body { font-family: 'Courier New', monospace; padding: 20px; direction: rtl; text-align: left; }
                                                                                        h1 { text-align: center; margin-bottom: 20px; }
                                                                                        pre { white-space: pre-wrap; font-size: 14pt; line-height: 1.6; }
                                                                                        .meta { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                                                                    </style>
                                                                                </head>
                                                                                <body>
                                                                                    <h1>🎼 ${song.title}</h1>
                                                                                    <div class="meta">
                                                                                        <p><strong>المقام:</strong> ${song.musicalStyle}</p>
                                                                                        <p><strong>الصف:</strong> ${song.grade}</p>
                                                                                    </div>
                                                                                    <pre>${song.musicalNotation || song.notes}</pre>
                                                                                    <script>window.print();</script>
                                                                                </body>
                                                                            </html>
                                                                        `);
                                                                        printWindow.document.close();
                                                                    }
                                                                }}
                                                                className="absolute top-4 left-4 bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 p-2 rounded-lg transition-colors print-btn"
                                                                title="طباعة النوتة"
                                                            >
                                                                <Download size={16} />
                                                            </button>

                                                            <div className="text-center mb-6 border-b-2 border-slate-900/10 pb-4">
                                                                <h2 className="text-2xl font-bold font-serif mb-1">{song.title}</h2>
                                                                <div className="flex justify-center gap-4 text-xs text-slate-500 uppercase tracking-widest mt-2">
                                                                    <span>Key: {song.musicalStyle?.split('-')[1] || 'C Major'}</span>
                                                                    <span>•</span>
                                                                    <span>Tempo: Moderato</span>
                                                                </div>
                                                            </div>
                                                            <pre className="whitespace-pre-wrap font-bold text-slate-800 font-mono text-lg leading-relaxed">
                                                                {song.musicalNotation ||
                                                                    `[Em]           [D]
(مثال - لم يتم توليد نوتة لهذا النشيد بعد)

المقطع الأول:
   Do    Re    Mi    Fa    Sol
   أر - قا - م - نا ... أر - قا - م - نا

[C]           [B7]
   La    Sol   Fa    Mi    Re
   ما ... أح - لا - ها ... أر - قا - م - نا

(قم بتوليد نشيد جديد للحصول على النوتة الكاملة)`}
                                                            </pre>

                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ========== BIG BOOK READER MODAL ========== */}
                {readingStoryId && (() => {
                    const story = stories.find(s => s.id === readingStoryId);
                    if (!story) return null;
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <style>{`
                                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                                @keyframes sparkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                                .big-book { animation: slideUp 0.4s ease-out; }
                                .float-anim { animation: float 3s ease-in-out infinite; }
                                .sparkle-anim { animation: sparkle 2s ease-in-out infinite; }
                            `}</style>

                            {/* Decorative Background */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute top-10 left-10 text-6xl sparkle-anim" style={{ animationDelay: '0s' }}>⭐</div>
                                <div className="absolute top-20 right-20 text-4xl sparkle-anim" style={{ animationDelay: '0.5s' }}>🌙</div>
                                <div className="absolute bottom-20 left-20 text-5xl sparkle-anim" style={{ animationDelay: '1s' }}>✨</div>
                                <div className="absolute bottom-10 right-10 text-4xl sparkle-anim" style={{ animationDelay: '1.5s' }}>🌟</div>
                            </div>

                            <div className="big-book relative w-full max-w-3xl max-h-[90vh] mx-4 rounded-3xl overflow-hidden shadow-2xl shadow-amber-900/30 flex flex-col" style={{ background: 'linear-gradient(145deg, #fffbeb, #fef3c7, #fde68a20)' }}>

                                {/* Book Header */}
                                <div className="relative p-6 md:p-8 pb-4 border-b-2 border-amber-300/40">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400"></div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-5xl float-anim">{story.emoji}</span>
                                            <div>
                                                <h2 className="text-2xl md:text-3xl font-bold text-amber-900" style={{ fontFamily: 'Tajawal, sans-serif' }}>{story.title}</h2>
                                                <p className="text-amber-700/60 text-sm mt-1">{story.subject} • {story.grade} • {story.readTime}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setReadingStoryId(null); stopSpeaking(); }}
                                            className="p-2.5 rounded-full bg-amber-100 text-amber-800 hover:bg-red-100 hover:text-red-600 transition-all"
                                        >
                                            <X size={22} />
                                        </button>
                                    </div>

                                    {/* Control Bar */}
                                    <div className="flex items-center gap-3 mt-4">
                                        <button
                                            onClick={() => isSpeaking ? stopSpeaking() : handleSpeak(story.description)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isSpeaking
                                                    ? 'bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200'
                                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105'
                                                }`}
                                        >
                                            {isSpeaking ? <><VolumeX size={18} /> إيقاف القراءة</> : <><Volume2 size={18} /> 🔊 اقرأ لي</>}
                                        </button>
                                        <button
                                            onClick={() => handleDownloadStory(story)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 border-2 border-amber-300 font-bold text-sm hover:bg-amber-200 transition-all"
                                        >
                                            <Download size={16} /> تحميل PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Story Body */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#fbbf24 transparent' }}>
                                    {/* Generated Image */}
                                    {storyImages[story.id] && (
                                        <div className="mb-8 rounded-2xl overflow-hidden shadow-xl shadow-amber-200/30 border-4 border-white">
                                            <img src={storyImages[story.id]} alt={story.title} className="w-full h-56 md:h-72 object-cover" />
                                        </div>
                                    )}

                                    {/* Preview / Hook */}
                                    <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200/50">
                                        <p className="text-amber-800 text-lg md:text-xl leading-loose font-semibold text-center" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                                            ✨ {story.preview}
                                        </p>
                                    </div>

                                    {/* Main Story Text */}
                                    <div className="text-amber-950 text-lg md:text-xl leading-[2.5] whitespace-pre-wrap text-justify" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                                        {story.description}
                                    </div>

                                    {/* Story End Decoration */}
                                    <div className="text-center mt-10 mb-4">
                                        <div className="inline-block px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl border-2 border-amber-200">
                                            <span className="text-2xl">🎉</span>
                                            <p className="text-amber-800 font-bold text-lg mt-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>~ انتهت القصة ~</p>
                                            <p className="text-amber-600 text-sm mt-1">هل أعجبتك القصة؟ ⭐</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};


