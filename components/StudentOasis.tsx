/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { CurriculumBook, CurriculumLesson, KeyVisual } from '../types';
import { getAllCurricula } from '../services/curriculumService';
import { supabase } from '../services/supabaseClient';
import { getStudentTasks, completeTask, OasisTask } from '../services/oasisService';
import { GoogleGenAI } from "@google/genai";
import { 
    Map, Scroll, Trophy, MessageCircle, Star, Palette, FlaskConical, 
    Compass, X, Send, User, ChevronRight, Lock, Unlock, PlayCircle,
    Award, Crown, Layout, Zap, BookOpen, Mic, Volume2, CheckCircle, HelpCircle,
    Bell, Gift, Target, Sparkles
} from 'lucide-react';

// Initialize Gemini for "Little Aleem"
// Safely handle API Key for client-side usage
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

// --- Types ---
interface StudentOasisProps {
    onBack: () => void;
    userParams?: { name: string; grade: string };
    isTeacherMode?: boolean; // New prop to enable monitoring tools
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'aleem';
    text: string;
}

// --- Visual Assets & Styles ---
// Custom glassmorphism classes and nature themes are applied via Tailwind classes

export const StudentOasis: React.FC<StudentOasisProps> = ({ onBack, userParams, isTeacherMode = false }) => {
    const [activeTab, setActiveTab] = useState<'map' | 'treasures' | 'lab' | 'leaderboard'>('map');
    const [curricula, setCurricula] = useState<CurriculumBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<CurriculumBook | null>(null);
    const [activeLesson, setActiveLesson] = useState<CurriculumLesson | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'lesson-player'>('map');
    const [currentSlide, setCurrentSlide] = useState(0); // Track slide progress
    const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]); // Using lesson names/ids
    const [chatOpen, setChatOpen] = useState(false);
    const studentName = userParams?.name || 'بطل';
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInitialized, setChatInitialized] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [teacherNote, setTeacherNote] = useState(''); // For admin broadcast input
    
    // --- Supabase Sync Dependencies ---
    const [userId, setUserId] = useState<string | null>( userParams?.name === 'زائر' ? null : null ); // Initialize from props if possible, else logic below
    const [xp, setXp] = useState(840);
    const [level, setLevel] = useState(12);
    const [oasisTasks, setOasisTasks] = useState<OasisTask[]>([]);
    const [activeTask, setActiveTask] = useState<OasisTask | null>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [lastCompletedLesson, setLastCompletedLesson] = useState<CurriculumLesson | null>(null);
    const [lessonQuizMode, setLessonQuizMode] = useState(false);

    // Initialize personalized chat greeting
    useEffect(() => {
        if (!chatInitialized) {
            const greeting = `مرحباً يا ${studentName}! أنا "عليم"، صديقك في رحلة المعرفة. اسألني عن أي كلمة صعبة أو مفهوم في دروسك.`;
            setChatMessages([{ id: '1', sender: 'aleem', text: greeting }]);
            setChatInitialized(true);
        }
    }, [studentName, chatInitialized]);

    // Initialize User & Sync
    useEffect(() => {
        const initSupabase = async () => {
            // 1. Check for logged in user via Supabase Auth
            const { data: { session } } = await supabase.auth.getSession();
            let effectiveUserId = session?.user?.id;

            // Fallback for demo/guest mode if no auth session
            if (!effectiveUserId) {
                 effectiveUserId = localStorage.getItem('smart_teacher_student_id');
                 if (!effectiveUserId) {
                      effectiveUserId = crypto.randomUUID();
                      localStorage.setItem('smart_teacher_student_id', effectiveUserId);
                 }
            }

            setUserId(effectiveUserId);

            // 2. Fetch User Data (or create if missing)
            let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', effectiveUserId)
                .maybeSingle();
            
            if (!profile) {
                // Profile doesn't exist (new guest or wiped DB), so create it
                const newProfile = { 
                    id: effectiveUserId, 
                    full_name: userParams?.name || 'زائر', 
                    role: 'student', 
                    xp: 840, 
                    level: 12 
                };
                const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
                
                if (!insertError) {
                    profile = newProfile;
                } else {
                    console.error("Error creating student profile:", insertError);
                }
            }
            
            if (profile) {
                setXp(profile.xp || 840);
                setLevel(profile.level || 12);
            }

            // 3. Fetch Unlocked Lessons
            const { data: progress } = await supabase
                .from('student_progress')
                .select('lesson_title')
                .eq('student_id', effectiveUserId);
            
            if (progress && progress.length > 0) {
                 const dbUnlocked = progress.map(p => p.lesson_title);
                 setUnlockedLessons(prev => Array.from(new Set([...prev, ...dbUnlocked])));
            } else {
                 // If no progress, ensure first lesson is unlocked (usually handled by local state init, but double check)
            }
            
            // 4. Listen for Teacher Broadcasts and New Tasks (Realtime)
            const channel = supabase
                .channel('public:teacher_broadcasts')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teacher_broadcasts' }, (payload) => {
                    if (payload.new.active) {
                        alert(`📢 تنبيه من المعلم: ${payload.new.message}`);
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oasis_tasks' }, (payload) => {
                    // Check if task is for this student or class (simplified check)
                    const newTask = payload.new as OasisTask;
                    setOasisTasks(prev => [newTask, ...prev]);
                    // Auto-open if it's high priority or "Grandfather & Mansour" rule implies visual disruption
                    setActiveTask(newTask);
                })
                .subscribe();

            // Initial fetch of tasks
            if (effectiveUserId) {
                 getStudentTasks(effectiveUserId).then(tasks => setOasisTasks(tasks));
            }

            return () => {
                supabase.removeChannel(channel);
            };
        };

        initSupabase();
    }, []);

    // Sync XP to DB when changed
    useEffect(() => {
        if (!userId) return;
        const syncXp = async () => {
            await supabase.from('profiles').update({ xp, level }).eq('id', userId);
        };
        // Debounce slightly to avoid spamming DB but here we just run it
        const timer = setTimeout(syncXp, 1000);
        return () => clearTimeout(timer);
    }, [xp, level, userId]);

    // Load curricula on mount
    useEffect(() => {
        const saved = getAllCurricula();
        setCurricula(saved);
        if (saved.length > 0) setSelectedBook(saved[0]);
        
        // Mock unlocked lessons for demo
        // In real app, check user progress
        if (saved.length > 0 && saved[0].curriculumStructure.length > 0) {
            setUnlockedLessons([saved[0].curriculumStructure[0].lessonTitle]);
        }
    }, []);

    // --- "Little Aleem" Chat Logic ---
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const updatedContext = [...chatMessages, { role: 'user', content: chatInput }];
        const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: chatInput };
        setChatMessages(prev => [...prev, newUserMsg]);
        setChatInput('');
        setIsChatLoading(true);

        // SYNC: Save User Message
        if (userId) {
            await supabase.from('chat_history').insert([
                { student_id: userId, sender: 'user', text: chatInput }
            ]);
        }

        try {
            const lessonContext = activeLesson 
                ? `الطالب يدرس حالياً درس: "${activeLesson.lessonTitle}". أهداف الدرس: ${activeLesson.objectives.slice(0, 2).join('؛ ')}. ركّز إجاباتك على هذا السياق عند الإمكان.`
                : '';
            const systemInstruction = `أنت 'عليم'، مساعد ذكي ولطيف للأطفال في المرحلة الابتدائية. مهمتك شرح الكلمات الصعبة والمفاهيم العلمية بأسلوب مبسط جداً ومرح، واستخدام تشبيهات من الطبيعة والحياة اليومية. تحدث باللغة العربية الفصحى البسيطة مع بعض كلمات التشجيع. إجاباتك يجب أن تكون قصيرة (أقل من 50 كلمة) لكي لا يمل الطفل. ${lessonContext}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-lite",
                contents: [{ parts: [{ text: chatInput }] }],
                config: { systemInstruction }
            });
            
            const responseText = response.text || "عذراً يا صديقي، لم أستطع فهم ذلك.";

            const newAleemMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'aleem', text: responseText };
            setChatMessages(prev => [...prev, newAleemMsg]);

            // SYNC: Save Aleem Message
            if (userId) {
                await supabase.from('chat_history').insert([
                    { student_id: userId, sender: 'aleem', text: responseText }
                ]);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setChatMessages(prev => [...prev, { id: 'err', sender: 'aleem', text: 'عذراً يا صديقي، حدث خطأ بسيط في الاتصال. هل يمكنك إعادة السؤال؟' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const sendTeacherBroadcast = async () => {
        if (!teacherNote.trim()) return;
        
        // Optimistic UI update (not really needed as we listen to channel, but good for feedback)
        
        // SYNC: Send to Supabase
        await supabase.from('teacher_broadcasts').insert([
            { message: teacherNote, type: 'note', active: true } 
        ]);
        
        setTeacherNote('');
        alert('✅ تم إرسال الملاحظة للطلاب!');
    };

    // --- Admin/Teacher Monitoring Overlay ---
    const renderAdminOverlay = () => {
        if (!isTeacherMode) return null;

        return (
            <div className="absolute top-20 left-6 z-50 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-red-500/50 rounded-xl p-4 w-72 shadow-2xl pointer-events-auto">
                    <div className="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <h3 className="text-red-400 font-bold text-xs uppercase tracking-wider">لوحة المعلم</h3>
                        </div>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">LIVE</span>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Status Monitor */}
                        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                             <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                <div className="text-slate-500 mb-1">المتواجدون</div>
                                <div className="text-emerald-400 font-mono font-bold text-lg">24/30</div>
                             </div>
                             <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                <div className="text-slate-500 mb-1">تنبيهات</div>
                                <div className="text-amber-400 font-mono font-bold text-lg">3</div>
                             </div>
                        </div>

                        {/* Interactive Tools */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-400 font-bold">أدوات التفاعل الفوري</label>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="اكتب ملاحظة للطلاب..." 
                                    value={teacherNote}
                                    onChange={(e) => setTeacherNote(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:border-red-500 outline-none"
                                />
                                <button onClick={sendTeacherBroadcast} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors">
                                    <Send size={12} />
                                </button>
                            </div>

                            <button className="w-full py-1.5 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 text-[10px] rounded transition-all flex items-center justify-center gap-2 group">
                                <HelpCircle size={12} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                إطلاق سؤال سريع (Pop Quiz)
                            </button>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] rounded transition-colors flex items-center justify-center gap-1">
                                    <CheckCircle size={12} /> تصويت
                                </button>
                                <button className="py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] rounded transition-colors flex items-center justify-center gap-1">
                                    <Volume2 size={12} /> نداء
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-slate-700/50 my-2" />

                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">وضع التحكم:</span>
                            <span className="text-red-400 font-bold">إداري كامل</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Active Task Overlay (Grandfather/Mansour Style) ---
    const renderActiveTask = () => {
        if (!activeTask) return null;

        const bgTexture = activeTask.visualStyle === 'wood' 
            ? 'https://www.transparenttextures.com/patterns/wood-pattern.png' 
            : activeTask.visualStyle === 'stone'
            ? 'https://www.transparenttextures.com/patterns/asfalt-dark.png'
            : 'https://www.transparenttextures.com/patterns/aged-paper.png';

        const bgColor = activeTask.visualStyle === 'wood' 
            ? 'bg-amber-900 text-amber-100 border-amber-700'
            : activeTask.visualStyle === 'stone'
            ? 'bg-slate-800 text-slate-100 border-slate-600'
            : 'bg-[#fdfbf7] text-slate-900 border-amber-200'; // Paper

        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300 pointer-events-auto">
                <div className={`relative max-w-lg w-full rounded-sm shadow-2xl overflow-hidden p-8 ${bgColor}`}>
                    
                    {/* Texture Overlay */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url("${bgTexture}")` }}></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 flex items-center justify-center mb-2">
                             <Gift size={32} />
                        </div>
                        
                        <h2 className="text-2xl font-bold font-serif">{activeTask.title}</h2>
                        
                        <div className="w-full h-px bg-current opacity-20 my-2" />
                        
                        <p className="text-lg leading-relaxed font-serif">
                            {activeTask.content}
                        </p>

                        <div className="mt-8 flex gap-4 w-full">
                            <button 
                                onClick={() => setActiveTask(null)}
                                className="flex-1 py-3 px-4 rounded border border-current opacity-50 hover:opacity-100 transition-opacity font-bold"
                            >
                                إخفاء مؤقت
                            </button>
                            <button 
                                onClick={async () => {
                                    await completeTask(activeTask.id, 100); // Mock score
                                    setOasisTasks(prev => prev.filter(t => t.id !== activeTask.id));
                                    setActiveTask(null);
                                    setXp(prev => prev + 50);
                                    alert("🎉 أحسنت! اكتشفت كنزاً جديداً");
                                }}
                                className="flex-1 py-3 px-4 rounded bg-emerald-600 text-white hover:bg-emerald-500 font-bold shadow-lg"
                            >
                                لقد فهمت! (إنهاء)
                            </button>
                        </div>
                    </div>

                    {/* Decorative Corners */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-current opacity-50"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-current opacity-50"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-current opacity-50"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-current opacity-50"></div>
                </div>
            </div>
        );
    };


    const finishLessonWithCelebration = async () => {
        if (!activeLesson || !selectedBook) return;
        const xpReward = 50;
        const newXp = xp + xpReward;
        setXp(newXp);
        const newLevel = Math.floor(newXp / 1000) + 1;
        if (newLevel > level) setLevel(newLevel);

        const currentIdx = selectedBook.curriculumStructure.findIndex(l => l.lessonTitle === activeLesson.lessonTitle);
        let nextLessonTitle = '';
        if (currentIdx >= 0 && currentIdx < selectedBook.curriculumStructure.length - 1) {
            nextLessonTitle = selectedBook.curriculumStructure[currentIdx + 1].lessonTitle;
            if (!unlockedLessons.includes(nextLessonTitle)) {
                setUnlockedLessons(prev => [...prev, nextLessonTitle]);
            }
        }

        try {
            if (userId) {
                await supabase.from('student_progress').insert({ student_id: userId, lesson_title: nextLessonTitle || 'COMPLETED_ALL' });
                await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', userId);
            }
        } catch (e) { console.error("Error saving progress:", e); }

        setLastCompletedLesson(activeLesson);
        setShowCompletionModal(true);
        setLessonQuizMode(false);
    };

    const handleLessonCompletion = async () => {
        if (!activeLesson || !selectedBook) return;
        const hasQuiz = activeLesson.assessmentQuestions && activeLesson.assessmentQuestions.length > 0;
        if (hasQuiz && !lessonQuizMode) {
            setLessonQuizMode(true);
            return;
        }
        await finishLessonWithCelebration();
    };

    const closeCompletionModal = () => {
        setShowCompletionModal(false);
        setLastCompletedLesson(null);
        setViewMode('map');
        setActiveLesson(null);
        setCurrentSlide(0);
    };

    // --- Lesson Player Renderer ---
    const renderLessonPlayer = () => {
        if (!activeLesson) return null;
        const totalSlides = Math.max(5, Math.ceil((activeLesson.objectives.length + activeLesson.activities.length) / 2) || 5);
        const firstQuizQuestion = activeLesson.assessmentQuestions?.[0];

        // Quiz mode: اختبار فهم سريع
        if (lessonQuizMode && firstQuizQuestion) {
            return (
                <div className="w-full h-full flex flex-col bg-slate-900/90 backdrop-blur-xl relative z-20">
                    <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50">
                        <button onClick={() => setLessonQuizMode(false)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300">
                            <ChevronRight size={20} />
                        </button>
                        <h2 className="text-white font-bold">اختبار فهم سريع</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
                        <div className="max-w-xl w-full bg-amber-900/30 border border-amber-500/40 rounded-2xl p-8 text-center">
                            <Target size={48} className="mx-auto mb-4 text-amber-400" />
                            <h3 className="text-amber-100 font-bold text-lg mb-6">قبل أن تنهي، تأكد من فهمك:</h3>
                            <p className="text-slate-200 text-lg leading-relaxed mb-8">{firstQuizQuestion}</p>
                            <p className="text-amber-200/80 text-sm mb-6">فكّر في إجابتك، ثم اضغط للتأكيد</p>
                            <button
                                onClick={handleLessonCompletion}
                                className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto"
                            >
                                <CheckCircle size={20} /> أكملت الفهم، إنهاء الدرس
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full h-full flex flex-col bg-slate-900/90 backdrop-blur-xl relative z-20">
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setViewMode('map'); setCurrentSlide(0); setLessonQuizMode(false); }}
                            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">{activeLesson.lessonTitle}</h2>
                            <p className="text-xs text-amber-500 font-mono">مرحباً {studentName}، جاري التعلم...</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">نشط الآن</div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="aspect-video bg-gradient-to-br from-amber-950/50 to-slate-900 rounded-2xl border border-amber-500/30 overflow-hidden relative flex flex-col items-center justify-center">
                            {activeLesson.keyVisuals?.[currentSlide % (activeLesson.keyVisuals.length || 1)] ? (
                                <div className="p-6 text-center">
                                    <span className="text-4xl mb-2 block">
                                        {activeLesson.keyVisuals[currentSlide % activeLesson.keyVisuals.length].material === 'stone' ? '🪨' : 
                                         activeLesson.keyVisuals[currentSlide % activeLesson.keyVisuals.length].material === 'wood' ? '🪵' : 
                                         activeLesson.keyVisuals[currentSlide % activeLesson.keyVisuals.length].material === 'fabric' ? '🧵' : '📜'}
                                    </span>
                                    <p className="text-amber-100 font-serif text-lg">« {activeLesson.keyVisuals[currentSlide % activeLesson.keyVisuals.length].text} »</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-400">
                                    <BookOpen size={48} className="mb-2 text-amber-500/60" />
                                    <p className="font-bold">شريحة {currentSlide + 1} من {totalSlides}</p>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2"><Star size={18} /> أهداف الدرس</h3>
                                <ul className="space-y-3">
                                    {activeLesson.objectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />{obj}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2"><Zap size={18} /> الأنشطة</h3>
                                <ul className="space-y-3">
                                    {activeLesson.activities.slice(0, currentSlide + 1).map((act, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <div className="w-5 h-5 rounded flex items-center justify-center bg-cyan-500/20 text-cyan-400 text-[10px] font-bold shrink-0">{i + 1}</div>
                                            {act}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-20 border-t border-white/10 bg-slate-900/80 backdrop-blur flex items-center justify-center gap-4">
                    <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}
                        className="px-6 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">السابق</button>
                    <span className="font-mono text-slate-500 mx-4">{currentSlide + 1} / {totalSlides}</span>
                    {currentSlide < totalSlides - 1 ? (
                        <button onClick={() => setCurrentSlide(currentSlide + 1)} className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 shadow-lg shadow-amber-500/20">التالي</button>
                    ) : (
                        <button onClick={handleLessonCompletion} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                            <CheckCircle size={18} /> إنهاء الدرس
                        </button>
                    )}
                </div>
            </div>
        );
    };


    // --- 
    // --- Tab Content Renderers ---

    const renderMap = () => {
        if (!selectedBook) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-200">
                <Map size={48} className="text-amber-400 mb-4 opacity-50" />
                <p>لا توجد مناهج متاحة بعد. اطلب من معلمك إضافة كتاب!</p>
            </div>
        );

        return (
            <div className="relative w-full h-full overflow-y-auto custom-scrollbar p-6">
                {/* Map Background Illustration (CSS Pattern) */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ 
                         backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d97706\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                     }} 
                />
                
                <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                    {/* Personalized Welcome & Progress */}
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-2xl p-6 mb-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-amber-100 flex items-center gap-2">
                                    <Sparkles className="text-amber-400" size={24} />
                                    مرحباً يا {studentName}!
                                </h2>
                                <p className="text-amber-200/80 text-sm mt-1">رحلة المعرفة تنتظرك. اختر المحطة التالية!</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-amber-400">
                                        {Math.max(0, unlockedLessons.filter(t => selectedBook.curriculumStructure.some(l => l.lessonTitle === t)).length - 1)}
                                        <span className="text-amber-200/60 text-base font-normal"> / {selectedBook.curriculumStructure.length}</span>
                                    </div>
                                    <div className="text-[10px] text-amber-200/70 font-bold">دروس مكتملة</div>
                                </div>
                                <div className="w-24 h-24 rounded-full border-2 border-amber-500/50 flex items-center justify-center bg-amber-500/10">
                                    <span className="text-2xl font-black text-amber-400">المستوى {level}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (xp % 1000) / 10)}%` }}></div>
                            </div>
                            <span className="text-xs font-mono text-amber-200/80">{xp} XP</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Target size={16} className="text-amber-400 shrink-0" />
                            <span className="text-sm text-amber-200/90">مهمة اليوم: أكمل درساً واحداً على الأقل واجمع كنزاً جديداً!</span>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-amber-100 drop-shadow-md">{selectedBook.bookMetadata.subject} - خريطة الكنز</h2>
                        <p className="text-amber-200/80 text-sm">أكمل الدروس لتضيء الخريطة وتكتشف الكنوز!</p>
                    </div>

                    <div className="relative border-l-4 border-dashed border-amber-500/30 ml-6 md:ml-auto md:mr-auto space-y-12 pb-12">
                        {selectedBook.curriculumStructure.map((lesson, index) => {
                            const isUnlocked = isTeacherMode || index === 0 || unlockedLessons.includes(lesson.lessonTitle); // Teachers see all unlocked
                            const isNext = !isUnlocked && (index === 0 || unlockedLessons.includes(selectedBook.curriculumStructure[index - 1].lessonTitle));
                            
                            return (
                                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8`}>
                                    {/* Evaluation Node on Line */}
                                    <div className={`absolute left-[-10px] md:left-1/2 md:-translate-x-1/2 w-6 h-6 rounded-full border-4 ${isUnlocked ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-800 border-slate-600'} z-20 shadow-lg transition-all`} />

                                    {/* Content Card */}
                                    <div className={`flex-1 md:w-1/2 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left pl-8 md:pl-0'}`}>
                                        <div 
                                            className={`
                                                relative group overflow-hidden rounded-2xl p-5 border backdrop-blur-md transition-all duration-500
                                                ${isUnlocked 
                                                    ? 'bg-amber-900/40 border-amber-500/50 hover:bg-amber-800/50 hover:scale-105 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                                                    : 'bg-slate-900/60 border-slate-700 opacity-70 grayscale'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isUnlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                                                    المحطة {index + 1}
                                                </span>
                                                {isUnlocked ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} className="text-slate-500" />}
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">{lesson.lessonTitle}</h3>
                                            <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                                                 {lesson.objectives[0] || "رحلة شيقة في انتظارك..."}
                                            </p>

                                            {/* Action Button */}
                                            {isUnlocked && (
                                                <button 
                                                    onClick={() => {
                                                        setActiveLesson(lesson);
                                                        setViewMode('lesson-player');
                                                    }}
                                                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                                >
                                                    <PlayCircle size={14} /> ابدأ الرحلة
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Empty spacer for alternating layout */}
                                    <div className="hidden md:block flex-1" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderTreasures = () => {
        // Collect all KeyVisuals from available curricula
        const allTreasures: { visual: KeyVisual, source: string }[] = [];
        curricula.forEach(book => {
            book.curriculumStructure.forEach(lesson => {
                lesson.keyVisuals.forEach(kv => {
                    allTreasures.push({ visual: kv, source: lesson.lessonTitle });
                });
            });
        });

        return (
            <div className="p-6 overflow-y-auto h-full custom-scrollbar">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-amber-100 flex items-center justify-center gap-3">
                        <Scroll className="text-amber-400" /> كنوز "عليم"
                    </h2>
                    <p className="text-amber-200/70 text-sm mt-1">بطاقات الإنجاز والمفاهيم العلمية التي جمعتها</p>
                </div>

                {allTreasures.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allTreasures.map((item, i) => {
                            // Determine style based on material
                            const materialStyle = item.visual.material === 'stone' 
                                ? 'bg-stone-800 border-stone-600 text-stone-200' 
                                : item.visual.material === 'wood'
                                ? 'bg-orange-950 border-orange-800 text-orange-200'
                                : item.visual.material === 'fabric'
                                ? 'bg-rose-950 border-rose-800 text-rose-200'
                                : 'bg-amber-100 text-amber-900 border-amber-300'; // Paper default (light mode for contrast)

                            return (
                                <div key={i} className={`relative group p-6 rounded-xl border-2 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden ${materialStyle}`}>
                                    {/* Texture Overlay */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
                                    
                                    <div className="relative z-10 flex flex-col items-center text-center h-full">
                                        <div className="mb-4 opacity-80">
                                            {item.visual.material === 'stone' && <span className="text-4xl">🪨</span>}
                                            {item.visual.material === 'wood' && <span className="text-4xl">🪵</span>}
                                            {item.visual.material === 'fabric' && <span className="text-4xl">🧵</span>}
                                            {item.visual.material === 'paper' && <span className="text-4xl">📜</span>}
                                        </div>
                                        
                                        <h3 className="font-bold text-xl mb-2 font-serif tracking-wide" style={{ fontFamily: 'Amiri, serif' }}>
                                            « {item.visual.text} »
                                        </h3>
                                        
                                        <div className="mt-auto pt-4 flex flex-col items-center gap-1 w-full border-t border-current/20">
                                            <span className="text-[10px] uppercase font-mono tracking-widest opacity-60">{item.visual.calligraphyStyle} Style</span>
                                            <span className="text-[10px] font-bold opacity-80">{item.source}</span>
                                        </div>
                                    </div>

                                    {/* Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none rounded-xl" />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Scroll size={48} className="mb-4 opacity-30" />
                        <p>صندوق الكنوز فارغ! أكمل الدروس لجمع البطاقات الفنية.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderLab = () => {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 p-8 text-center">
                <div className="relative w-32 h-32 mb-6 group cursor-pointer">
                    <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                    <div className="relative w-full h-full bg-slate-900 border-2 border-cyan-500/50 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
                        <FlaskConical size={48} className="text-cyan-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">المختبر الافتراضي</h2>
                <p className="max-w-md text-sm text-slate-400 mb-8">
                    قريباً ستتمكن من إجراء التجارب العلمية من كتابك المدرسي بشكل تفاعلي ومحاكاة الظواهر الطبيعية!
                </p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                    {['تجربة تمدد السوائل', 'دورة حياة الفراشة', 'انكسار الضوء', 'تركيب الذرة'].map((exp, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3 opacity-60 cursor-not-allowed">
                            <Lock size={16} /> {exp}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLeaderboard = () => {
        const students: { name: string; points: number; badge: string; isCurrent?: boolean }[] = [
            { name: "أحمد الفاتح", points: 1250, badge: "master" },
            { name: "سارة النور", points: 1100, badge: "diamond" },
            { name: "كريم الجبل", points: 950, badge: "gold" },
            { name: `أنت (${studentName})`, points: xp, badge: "silver", isCurrent: true },
            { name: "ليلى الورد", points: 720, badge: "bronze" },
        ];
        
        return (
            <div className="max-w-2xl mx-auto p-6 overflow-y-auto h-full custom-scrollbar">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-amber-100 flex items-center justify-center gap-2">
                        <Trophy className="text-yellow-400" /> لوحة الصدارة
                    </h2>
                    <p className="text-amber-200/70 text-sm">أبطال التحديات لهذا الشهر</p>
                </div>

                <div className="space-y-4">
                    {students.map((student, i) => (
                        <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-sm transition-transform hover:scale-[1.02] ${
                            student.isCurrent 
                                ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] order-first mb-6 transform scale-105 ring-1 ring-amber-400/50' 
                                : 'bg-slate-900/60 border-slate-700/50'
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                                i === 0 ? 'bg-yellow-500 text-yellow-950' :
                                i === 1 ? 'bg-slate-300 text-slate-800' :
                                i === 2 ? 'bg-amber-700 text-amber-200' :
                                'bg-slate-800 text-slate-400'
                            }`}>
                                {i + 1}
                            </div>
                            
                            <div className="flex-1">
                                <h4 className={`font-bold ${student.isCurrent ? 'text-amber-100' : 'text-slate-200'}`}>
                                    {student.name}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Award size={10} /> المستوى {student.isCurrent ? level : '12'}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-black text-xl text-amber-400">{student.isCurrent ? xp : student.points}</div>
                                <div className="text-[10px] text-amber-500/50 font-mono">نقطة XP</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans text-slate-100" dir="rtl">
            
            {/* --- THEME BACKGROUND (Oasis) --- */}
            <div className="absolute inset-0 pointer-events-none z-0">
                {renderActiveTask()}
                {renderAdminOverlay()}
                {/* Completion Celebration Modal */}
                {showCompletionModal && lastCompletedLesson && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 pointer-events-auto animate-in fade-in zoom-in duration-300">
                        <div className="relative max-w-md w-full bg-gradient-to-br from-amber-900/95 to-orange-900/95 border-2 border-amber-500/50 rounded-2xl p-8 shadow-2xl text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/30 flex items-center justify-center animate-pulse">
                                    <Trophy size={40} className="text-amber-400" />
                                </div>
                                <h2 className="text-2xl font-black text-amber-100 mb-2">أحسنت يا {studentName}! 🎉</h2>
                                <p className="text-amber-200/90 mb-4">أكملت الدرس «{lastCompletedLesson.lessonTitle}» بنجاح</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold mb-6">
                                    <Zap size={18} /> +50 نقطة XP
                                </div>
                                <button
                                    onClick={closeCompletionModal}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold hover:from-amber-500 hover:to-orange-500 shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Compass size={18} /> العودة للخريطة
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Sky Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950" />
                
                {/* Dunes Silhouette (SVG) */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20"
                     style={{
                         backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 1200 300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath fill=\'%23d97706\' d=\'M0,192L48,170.7C96,149,192,107,288,106.7C384,107,480,149,576,165.3C672,181,768,171,864,149.3C960,128,1056,96,1152,90.7L1248,85.3V320H1152C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320H0Z\'/%3E%3C/svg%3E")',
                         backgroundRepeat: 'no-repeat',
                         backgroundSize: 'cover',
                         backgroundPosition: 'bottom'
                     }}
                />
                
                {/* Stars */}
                <div className="absolute top-0 inset-x-0 h-1/2 opacity-60" 
                     style={{ backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 90px 40px, #ffffff, rgba(0,0,0,0))', backgroundSize: '200px 200px' }} 
                />
            </div>

            {/* --- TOP BAR --- */}
            <div className="absolute top-0 left-0 right-0 z-20 h-16 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                    >
                        <Layout size={20} />
                    </button>
                    
                    {/* Subject Selector */}
                    {curricula.length > 0 && viewMode === 'map' && (
                        <select 
                            value={selectedBook?.id || ''}
                            onChange={(e) => {
                                const book = curricula.find(c => c.id === e.target.value);
                                if (book) setSelectedBook(book);
                            }}
                            className="bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                        >
                            {curricula.map(book => (
                                <option key={book.id} value={book.id}>
                                    {book.bookMetadata.subject} - {book.bookMetadata.grade}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Lesson Selector (Quick Jump) */}
                    {selectedBook && viewMode === 'map' && (
                         <div className="relative">
                            <select 
                                onChange={(e) => {
                                    const lesson = selectedBook.curriculumStructure.find(l => l.lessonTitle === e.target.value);
                                    if (lesson) {
                                        setActiveLesson(lesson);
                                        // Optional: Auto-start or just highlight? Let's auto-start for "Slide Selection" feel
                                        setViewMode('lesson-player');
                                    }
                                }}
                                className="bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 font-bold w-40 truncate"
                                defaultValue=""
                            >
                                <option value="" disabled>انتقل إلى درس...</option>
                                {selectedBook.curriculumStructure.map((l, i) => (
                                    <option key={i} value={l.lessonTitle} disabled={!unlockedLessons.includes(l.lessonTitle) && i !== 0}>
                                        {l.lessonTitle}
                                    </option>
                                ))}
                            </select>
                         </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Notifications (New Tasks) */}
                    <button 
                        onClick={() => { if (oasisTasks.length > 0) setActiveTask(oasisTasks[0]); }}
                        className="relative p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white transition-colors"
                    >
                        <Bell size={20} />
                        {oasisTasks.length > 0 && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-bounce" />
                        )}
                    </button>

                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                        <Crown size={14} className="text-yellow-400" />
                        <span className="font-mono font-bold text-yellow-100 text-xs">{xp} XP</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="absolute top-16 bottom-20 left-0 right-0 z-10 overflow-hidden">
                {renderAdminOverlay()}
                {viewMode === 'lesson-player' ? renderLessonPlayer() : (
                    <>
                        {activeTab === 'map' && renderMap()}
                        {activeTab === 'treasures' && renderTreasures()}
                        {activeTab === 'lab' && renderLab()}
                        {activeTab === 'leaderboard' && renderLeaderboard()}
                    </>
                )}
            </div>

            {/* --- BOTTOM NAVIGATION (Glassmorphism) --- */}
            {viewMode === 'map' && (
            <div className="absolute bottom-6 left-6 right-6 h-16 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl z-30 flex items-center justify-around shadow-2xl">
                <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-all ${activeTab === 'map' ? 'text-amber-400 -translate-y-2' : 'text-slate-400 hover:text-slate-200'}`}>
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'map' ? 'bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : ''}`}>
                        <Compass size={activeTab === 'map' ? 24 : 20} />
                    </div>
                    <span className="text-[10px] font-bold">الخريطة</span>
                </button>
                
                <button onClick={() => setActiveTab('treasures')} className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-all ${activeTab === 'treasures' ? 'text-rose-400 -translate-y-2' : 'text-slate-400 hover:text-slate-200'}`}>
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'treasures' ? 'bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : ''}`}>
                        <Scroll size={activeTab === 'treasures' ? 24 : 20} />
                    </div>
                    <span className="text-[10px] font-bold">كنوزي</span>
                </button>

                <div className="w-px h-8 bg-white/10" />

                <button onClick={() => setActiveTab('lab')} className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-all ${activeTab === 'lab' ? 'text-cyan-400 -translate-y-2' : 'text-slate-400 hover:text-slate-200'}`}>
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'lab' ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : ''}`}>
                        <FlaskConical size={activeTab === 'lab' ? 24 : 20} />
                    </div>
                    <span className="text-[10px] font-bold">المختبر</span>
                </button>
                
                <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-all ${activeTab === 'leaderboard' ? 'text-yellow-400 -translate-y-2' : 'text-slate-400 hover:text-slate-200'}`}>
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'leaderboard' ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}`}>
                        <Trophy size={activeTab === 'leaderboard' ? 24 : 20} />
                    </div>
                    <span className="text-[10px] font-bold">الأبطال</span>
                </button>
            </div>
            )}

            {/* --- FLOATING CHAT BOT (LITTLE ALEEM) --- */}
            <div className={`absolute bottom-24 right-6 z-40 transition-all duration-300 ${chatOpen ? 'w-80 h-96' : 'w-14 h-14'}`}>
                {chatOpen ? (
                    <div className="w-full h-full bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
                        {/* Chat Header */}
                        <div className="bg-gradient-to-r from-amber-700 to-orange-800 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
                                <h3 className="text-white font-bold text-sm">مساعد عليم الصغير</h3>
                            </div>
                            <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                        msg.sender === 'user' 
                                            ? 'bg-amber-600 text-white rounded-tr-none' 
                                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 px-3 py-2 rounded-xl rounded-tl-none border border-slate-700">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150" />
                                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-300" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Input */}
                        <div className="p-3 border-t border-slate-700 bg-slate-900 flex gap-2 items-center">
                            <button 
                                onClick={() => {
                                    if (isRecording) {
                                        setIsRecording(false);
                                        // Simulate successful voice capture
                                        setTimeout(() => {
                                            const voiceMsg: ChatMessage = { 
                                                id: Date.now().toString(), 
                                                sender: 'user', 
                                                text: '🎤 [رسالة صوتية 0:12]' 
                                            };
                                            setChatMessages(prev => [...prev, voiceMsg]);
                                            setIsChatLoading(true);
                                            
                                            // Simulate AI processing voice
                                            setTimeout(() => {
                                                setChatMessages(prev => [...prev, { 
                                                    id: (Date.now() + 1).toString(), 
                                                    sender: 'aleem', 
                                                    text: 'أحسنت! سمعتك بوضوح. سأشرح لك ذلك...' 
                                                }]);
                                                setIsChatLoading(false);
                                            }, 1500);
                                        }, 500);
                                    } else {
                                        setIsRecording(true);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                    isRecording 
                                        ? 'bg-red-500/20 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                {isRecording ? <div className="w-4 h-4 bg-red-500 rounded-sm" /> : <Mic size={16} />}
                            </button>

                            <input 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isRecording ? "جارٍ الاستماع..." : "اسألني عن كلمة صعبة..."}
                                disabled={isRecording}
                                className={`flex-1 bg-slate-800 border-none rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all ${isRecording ? 'opacity-50' : ''}`}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isChatLoading || isRecording}
                                className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setChatOpen(true)}
                        className="w-full h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform animate-bounce-slow"
                    >
                        <MessageCircle size={24} />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
                    </button>
                )}
            </div>

            <style>{`
                .animate-bounce-slow {
                    animation: bounce 3s infinite;
                }
            `}</style>
        </div>
    );
};
