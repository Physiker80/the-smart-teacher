import React, { useState, useEffect } from 'react';
import { LessonPlan, CurriculumLesson } from '../types';
import { Send, Layout, Activity, Users, Eye, Zap, BookOpen } from 'lucide-react';
import { supabase } from '../services/supabaseClient'; // Make sure this exists

interface OasisCommandCenterProps {
    currentLesson?: LessonPlan;
    onBack: () => void;
}

export const OasisCommandCenter: React.FC<OasisCommandCenterProps> = ({ currentLesson, onBack }) => {
    const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [liveStudents, setLiveStudents] = useState<{name: string, status: string, progress: number}[]>([]);

    // Simulate connecting to live session
    useEffect(() => {
        // In a real app, this would subscribe to Supabase Realtime
        const mockStudents = [
            { name: "أحمد", status: "online", progress: 30 },
            { name: "سارة", status: "focus", progress: 65 },
            { name: "كريم", status: "idle", progress: 10 },
        ];
        setLiveStudents(mockStudents);

        const interval = setInterval(() => {
            // Randomly update progress to simulate live feed
            setLiveStudents(prev => prev.map(s => ({
                ...s,
                progress: Math.min(100, s.progress + Math.random() * 5)
            })));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleQuickSend = async () => {
        if (!selectedParagraph && !currentLesson) return;
        
        setIsSending(true);
        // Simulate API call to send task
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Visual feedback
        // Trigger notification
        setIsSending(false);
        alert("✅ تم إرسال المهمة إلى واحة التلاميذ بنجاح!");
    };

    return (
        <div className="w-full h-full bg-slate-950 p-6 flex flex-col gap-6" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-cyan-400">
                        مركز قيادة الواحة (The Command Center)
                    </h1>
                    <p className="text-slate-400 text-sm">تحكم ببيئة التعلم النشطة وأرسل المهام لحظياً</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                        خروج
                    </button>
                    <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        متصل بالواحة
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                
                {/* Left Panel: Lesson Content (Draggable Source) */}
                <div className="col-span-8 bg-slate-900/50 rounded-2xl border border-slate-700 p-4 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-300 border-b border-slate-700/50 pb-2">
                        <BookOpen size={18} />
                        <h2 className="font-bold">محتوى الدرس: {currentLesson?.topic || "لم يتم تحديد درس"}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {currentLesson?.slides?.map((slide, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setSelectedParagraph(slide.narration)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-lg ${
                                    selectedParagraph === slide.narration 
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50' 
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-mono text-slate-500">شريحة {idx + 1}</span>
                                    <Layout size={14} className="text-slate-600" />
                                </div>
                                <h3 className="font-bold text-slate-200 mb-2">{slide.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{slide.narration}</p>
                                
                                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedParagraph(slide.narration); handleQuickSend(); }}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                                    >
                                        <Send size={12} /> إرسال فوري للواحة
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {!currentLesson && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <BookOpen size={48} className="mb-4 opacity-50" />
                                <p>الرجاء اختيار درس من المخطط لعرض محتوياته هنا</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Live Monitoring & Control */}
                <div className="col-span-4 flex flex-col gap-6">
                    
                    {/* Live Stats */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-cyan-400 mb-4">
                            <Activity size={18} />
                            <h2 className="font-bold">المراقبة الحية (Discovery Zone)</h2>
                        </div>
                        
                        <div className="space-y-3">
                            {liveStudents.map((student, i) => (
                                <div key={i} className="bg-slate-800 p-3 rounded-xl flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${student.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-200">{student.name}</span>
                                            <span className="text-slate-500">{Math.round(student.progress)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-cyan-500 transition-all duration-1000"
                                                style={{ width: `${student.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {student.progress < 20 && (
                                        <div className="text-amber-500 animate-pulse" title="يحتاج مساعدة"><Zap size={14} /></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Learning Card Preview */}
                    <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-700/30 p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 text-amber-400 mb-4">
                            <Eye size={18} />
                            <h2 className="font-bold">معاينة بطاقة التعلم</h2>
                        </div>

                        <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-amber-100/5 rounded-xl border border-amber-500/20 p-4 relative overflow-hidden group">
                           {selectedParagraph ? (
                               <>
                                   <div className="absolute top-2 left-2 w-8 h-8 opacity-20 bg-[url('/path/to/decoration.svg')]"></div>
                                   <h3 className="text-center font-bold text-amber-500 mb-3 border-b border-amber-500/20 pb-2">بطاقة معرفية</h3>
                                   <p className="text-sm text-slate-300 text-center leading-loose font-serif">
                                       {selectedParagraph.substring(0, 150)}...
                                   </p>
                                   <div className="mt-4 flex justify-center">
                                       <button 
                                           onClick={handleQuickSend}
                                           disabled={isSending}
                                           className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full text-white font-bold shadow-lg shadow-orange-900/50 hover:scale-105 transition-transform flex items-center gap-2"
                                       >
                                           {isSending ? 'جاري الإرسال...' : 'إرسال للطلاب 🚀'}
                                       </button>
                                   </div>
                               </>
                           ) : (
                               <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
                                   حدد فقرة من الدرس لتحويلها إلى بطاقة "كنز" للطالب
                               </div>
                           )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
