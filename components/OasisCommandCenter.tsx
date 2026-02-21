import React, { useState, useEffect } from 'react';
import { LessonPlan, ClassRoom, SlideContent, Worksheet, WorksheetItem } from '../types';
import { Send, Layout, Activity, Eye, Zap, BookOpen, Layers, X, ImageIcon, RefreshCw, FileText, Loader2, Download, Award } from 'lucide-react';
import { fetchLessonPlans, saveLessonPlan, saveWorksheet } from '../services/syncService';
import { fetchTeacherClasses } from '../services/classService';
import { generateSlideImage, generateWorksheet } from '../services/geminiService';
import { CertificateCreator } from './CertificateCreator';
// @ts-ignore
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun } from 'docx';
// @ts-ignore
import FileSaver from 'file-saver';

const ALL_GRADES = ["الروضة", "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي", "الصف السابع الإعدادي", "الصف الثامن الإعدادي", "الصف التاسع الإعدادي"];
const COMMON_SUBJECTS = ["العلوم", "اللغة العربية", "الرياضيات", "التربية الإسلامية", "اللغة الإنجليزية", "الاجتماعيات", "التربية الفنية"];
const SEMESTER_OPTIONS = [
    { value: '', label: 'كل الفصول' },
    { value: 'الأول', label: 'الفصل الأول' },
    { value: 'الثاني', label: 'الفصل الثاني' },
];

interface OasisCommandCenterProps {
    currentLesson?: LessonPlan;
    onBack: () => void;
    userId?: string;
    teacherSubject?: string;
}

type LessonPlanWithMeta = LessonPlan & { classId?: string; createdAt?: string };

export const OasisCommandCenter: React.FC<OasisCommandCenterProps> = ({ currentLesson: initialLesson, onBack, userId, teacherSubject }) => {
    const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [liveStudents, setLiveStudents] = useState<{name: string, status: string, progress: number}[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlanWithMeta[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [currentLesson, setCurrentLesson] = useState<LessonPlan | undefined>(initialLesson);
    const [previewSlide, setPreviewSlide] = useState<{ slide: SlideContent; index: number } | null>(null);
    const [generatingImageIdx, setGeneratingImageIdx] = useState<number | null>(null);
    const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
    const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
    const [showCertificateModal, setShowCertificateModal] = useState(false);

    useEffect(() => { setCurrentLesson(initialLesson); }, [initialLesson]);
    useEffect(() => { setWorksheet(null); }, [currentLesson?.id]);

    useEffect(() => {
        if (!userId) return;
        fetchTeacherClasses(userId).then(setClasses).catch(() => {});
    }, [userId]);

    useEffect(() => {
        fetchLessonPlans().then((plans) => setLessonPlans(plans || [])).catch(() => {});
    }, []);

    const teacherGrades = [...new Set(classes.map(c => c.gradeLevel).filter(Boolean))] as string[];
    const gradeOptions = teacherGrades.length > 0 ? teacherGrades : ALL_GRADES;

    const subjectsFromLessons = [...new Set(lessonPlans.map(p => p.subject).filter(Boolean))] as string[];
    const subjectOptions = [...new Set([...COMMON_SUBJECTS, ...subjectsFromLessons])];

    useEffect(() => {
        const grades = [...new Set(classes.map(c => c.gradeLevel).filter(Boolean))] as string[];
        if (grades.length === 1) setSelectedGrade(prev => prev || grades[0]);
    }, [classes]);

    useEffect(() => {
        if (teacherSubject && !selectedSubject) setSelectedSubject(teacherSubject);
    }, [teacherSubject, lessonPlans.length]);

    const filteredLessons = lessonPlans.filter(p => {
        const subjectMatch = !selectedSubject || (p.subject && (p.subject.includes(selectedSubject) || selectedSubject.includes(p.subject)));
        const gradeMatch = !selectedGrade || (p.grade && (p.grade.includes(selectedGrade) || selectedGrade.includes(p.grade)));
        const partMatch = !selectedSemester || !p.part || (p.part.includes(selectedSemester) || selectedSemester.includes(p.part));
        return subjectMatch && gradeMatch && partMatch;
    });

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

    const handleSendContent = async (content: string) => {
        setIsSending(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSending(false);
        alert("✅ تم إرسال المهمة إلى واحة التلاميذ بنجاح!");
    };

    const handleSendSlide = async (slide: SlideContent) => {
        const text = `${slide.title}\n\n${slide.narration}`;
        await handleSendContent(text);
        setPreviewSlide(null);
    };

    const handleSendAllSlides = async () => {
        if (!currentLesson?.slides?.length) return;
        setIsSending(true);
        const allText = currentLesson.slides.map((s, i) => `[شريحة ${i + 1}] ${s.title}\n${s.narration}`).join('\n\n---\n\n');
        await handleSendContent(allText);
        alert(`✅ تم إرسال ${currentLesson.slides.length} شريحة إلى واحة التلاميذ بنجاح!`);
    };

    const handleRegenerateSlideImage = async (slideIndex: number) => {
        const slide = currentLesson?.slides?.[slideIndex];
        if (!slide?.visualDescription || !currentLesson) return;
        setGeneratingImageIdx(slideIndex);
        try {
            const imageUrl = await generateSlideImage(slide.visualDescription);
            if (imageUrl) {
                const updatedSlides = [...currentLesson.slides];
                updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], imageUrl };
                const updated = { ...currentLesson, slides: updatedSlides };
                setCurrentLesson(updated);
                await saveLessonPlan(updated);
                if (previewSlide?.index === slideIndex) setPreviewSlide({ slide: updatedSlides[slideIndex], index: slideIndex });
            }
        } catch (e) {
            alert('فشل توليد الصورة. حاول مرة أخرى.');
        } finally {
            setGeneratingImageIdx(null);
        }
    };

    const handleGenerateWorksheet = async () => {
        if (!currentLesson || generatingWorksheet) return;
        setGeneratingWorksheet(true);
        setWorksheet(null);
        try {
            const ws = await generateWorksheet(currentLesson);
            setWorksheet(ws);
            try {
                await saveWorksheet(ws, currentLesson.id, currentLesson.topic);
            } catch (_) { /* مزامنة صامتة عند فشل DB */ }
        } catch (e) {
            alert('فشل توليد ورقة العمل. حاول مرة أخرى.');
        } finally {
            setGeneratingWorksheet(false);
        }
    };

    const downloadWorksheetDocx = (ws: Worksheet) => {
        const children: any[] = [
            new Paragraph({ text: ws.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
            ...(ws.instructions ? [new Paragraph({ text: ws.instructions, alignment: AlignmentType.RIGHT })] : []),
            new Paragraph({ text: '' })
        ];
        ws.items.forEach((item, i) => {
            const label = item.type === 'mcq' ? 'اختيار من متعدد' : item.type === 'fill_blank' ? 'املأ الفراغ' : item.type === 'short_answer' ? 'إجابة قصيرة' : 'صح أو خطأ';
            children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. [${label}] `, bold: true }), new TextRun({ text: item.text })], alignment: AlignmentType.RIGHT }));
            if (item.options?.length) {
                const letters = ['أ', 'ب', 'ج', 'د'];
                item.options.forEach((opt, j) =>
                    children.push(new Paragraph({ children: [new TextRun({ text: `   ${letters[j] || String(j + 1)}. ${opt}` })], alignment: AlignmentType.RIGHT, indent: { right: 360 } }))
                );
            }
            children.push(new Paragraph({ text: '' }));
        });
        children.push(new Paragraph({ text: '— نموذج الإجابات —', heading: HeadingLevel.HEADING_2, pageBreakBefore: true, alignment: AlignmentType.RIGHT }));
        ws.items.forEach((item, i) => {
            const ans = item.type === 'mcq' || item.type === 'true_false'
                ? (item.options && item.correctAnswer != null ? item.options[item.correctAnswer] : '—')
                : (item.answer || '—');
            const runChildren: any[] = [new TextRun({ text: `${i + 1}. ${ans}`, bold: true })];
            if (item.explanation) runChildren.push(new TextRun({ text: ` — ${item.explanation}` }));
            children.push(new Paragraph({ children: runChildren, alignment: AlignmentType.RIGHT }));
        });
        const doc = new Document({ sections: [{ properties: {}, children }] });
        Packer.toBlob(doc).then((blob) => FileSaver.saveAs(blob, `ورقة-عمل_${ws.topic.replace(/\s+/g, '-')}.docx`));
    };

    const handleSendWorksheet = async () => {
        if (!worksheet) return;
        const letters = ['أ', 'ب', 'ج', 'د'];
        const text = worksheet.title + '\n\n' + worksheet.items.map((item, i) => `${i + 1}. ${item.text}${item.options?.length ? '\n' + item.options.map((o, j) => `   ${letters[j] || String(j + 1)}. ${o}`).join('\n') : ''}`).join('\n\n');
        await handleSendContent(text);
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

            {/* Lesson Selector — المادة والفصل والصف (يتوافق الدرس مع المادة المولّد منها) */}
            <div className="bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 rounded-2xl border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-4">
                    <Layers size={18} />
                    <h2 className="font-bold">اختيار الدرس — المادة • الفصل • الصف</h2>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">المادة</label>
                        <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white min-w-[160px] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                            dir="rtl"
                            title="المادة التي وُلِد منها الدرس"
                        >
                            <option value="">اختر المادة</option>
                            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">الفصل</label>
                        <select
                            value={selectedSemester}
                            onChange={e => setSelectedSemester(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white min-w-[140px] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                            dir="rtl"
                        >
                            {SEMESTER_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                            الصف {teacherGrades.length > 0 && <span className="text-emerald-500/70 font-normal">(من فصولك)</span>}
                        </label>
                        <select
                            value={selectedGrade}
                            onChange={e => setSelectedGrade(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white min-w-[180px] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                            dir="rtl"
                        >
                            <option value="">{teacherGrades.length > 0 ? 'اختر الصف' : 'كل الصفوف'}</option>
                            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">الدرس المولد</label>
                        <select
                            value={currentLesson?.id || ''}
                            onChange={e => {
                                const plan = filteredLessons.find(p => p.id === e.target.value);
                                setCurrentLesson(plan);
                            }}
                            className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white w-full focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                            dir="rtl"
                        >
                            <option value="">— اختر درساً —</option>
                            {filteredLessons.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.topic} — {p.grade} {p.subject ? `• ${p.subject}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    {(selectedSubject || selectedGrade || selectedSemester) && filteredLessons.length === 0 && (
                        <p className="text-amber-400 text-sm py-2">لا توجد دروس مطابقة للتصفية</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                
                {/* Left Panel: Lesson Content (Draggable Source) */}
                <div className="col-span-8 bg-slate-900/50 rounded-2xl border border-slate-700 p-4 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-slate-300 border-b border-slate-700/50 pb-2">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} />
                            <h2 className="font-bold">محتوى الدرس: {currentLesson?.topic || "لم يتم تحديد درس"}</h2>
                        </div>
                        {currentLesson?.slides?.length && (
                            <button
                                onClick={handleSendAllSlides}
                                disabled={isSending}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold"
                            >
                                <Send size={16} /> إرسال كل الشرائح ({currentLesson.slides.length})
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {currentLesson?.slides?.map((slide, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setSelectedParagraph(slide.narration)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-lg flex gap-4 ${
                                    selectedParagraph === slide.narration 
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50' 
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-mono text-slate-500">شريحة {idx + 1}</span>
                                        <Layout size={14} className="text-slate-600" />
                                    </div>
                                    <h3 className="font-bold text-slate-200 mb-2">{slide.title}</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{slide.narration}</p>
                                </div>
                                <div className="w-28 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-600">
                                    {slide.imageUrl ? (
                                        <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect fill='%23334155' width='80' height='60'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' font-family='sans-serif'%3Eخطأ%3C/text%3E%3C/svg%3E"; }} />
                                    ) : slide.visualDescription ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-center p-2">
                                            <ImageIcon size={24} className="mb-1 opacity-50" />
                                            <span className="text-[10px]">بدون صورة</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex flex-col gap-2 justify-end">
                                    {slide.visualDescription && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRegenerateSlideImage(idx); }}
                                            disabled={generatingImageIdx !== null}
                                            className="text-xs bg-violet-600/80 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                                        >
                                            {generatingImageIdx === idx ? (
                                                <span className="animate-spin">⏳</span>
                                            ) : (
                                                <RefreshCw size={12} />
                                            )}
                                            {slide.imageUrl ? 'تحسين' : 'توليد'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPreviewSlide({ slide, index: idx }); }}
                                        className="text-xs bg-amber-600/80 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                                    >
                                        <Eye size={12} /> معاينة
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedParagraph(slide.narration); handleSendSlide(slide); }}
                                        disabled={isSending}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center gap-2"
                                    >
                                        <Send size={12} /> إرسال
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

                    {/* شهادة إبداع للطالب المتميز */}
                    <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 rounded-2xl border border-amber-700/30 p-4 flex flex-col">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <Award size={18} />
                            <h2 className="font-bold">شهادة إبداع</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">اصنع شهادة مميزة باسلوب ديزني أو بيكسار للطالب المتميز.</p>
                        <button
                            onClick={() => setShowCertificateModal(true)}
                            className="w-full py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-2"
                        >
                            <Award size={16} /> توليد شهادة إبداع
                        </button>
                    </div>

                    {/* ورقة عمل لتقييم الطلاب */}
                    <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl border border-blue-700/30 p-4 flex flex-col">
                        <div className="flex items-center gap-2 text-blue-400 mb-4">
                            <FileText size={18} />
                            <h2 className="font-bold">ورقة عمل لتقييم الطلاب</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">أنشئ ورقة عمل متنوعة (اختيار، املأ الفراغ، إجابة قصيرة) لاختبار فهم الطلاب.</p>
                        {!worksheet ? (
                            <button
                                onClick={handleGenerateWorksheet}
                                disabled={!currentLesson || generatingWorksheet}
                                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2"
                            >
                                {generatingWorksheet ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                {generatingWorksheet ? 'جاري التوليد...' : 'توليد ورقة العمل'}
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-sm font-bold text-slate-200">{worksheet.title}</div>
                                <div className="max-h-32 overflow-y-auto text-xs text-slate-400 space-y-1 pr-1">
                                    {worksheet.items.slice(0, 4).map((item, i) => (
                                        <div key={item.id} className="line-clamp-2">{i + 1}. {item.text}</div>
                                    ))}
                                    {worksheet.items.length > 4 && <div className="text-slate-500">+ {worksheet.items.length - 4} أسئلة أخرى</div>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadWorksheetDocx(worksheet)}
                                        className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} /> تنزيل DOCX
                                    </button>
                                    <button
                                        onClick={handleSendWorksheet}
                                        disabled={isSending}
                                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} /> إرسال للواحة
                                    </button>
                                </div>
                                <button
                                    onClick={() => setWorksheet(null)}
                                    className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    إنشاء ورقة جديدة
                                </button>
                            </div>
                        )}
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
                                   <h3 className="text-center font-bold text-amber-500 mb-3 border-b border-amber-500/20 pb-2">معاينة قبل الإرسال</h3>
                                   <p className="text-sm text-slate-300 text-center leading-loose font-serif max-h-32 overflow-y-auto">
                                       {selectedParagraph}
                                   </p>
                                   <div className="mt-4 flex justify-center">
                                       <button 
                                           onClick={() => handleSendContent(selectedParagraph)}
                                           disabled={isSending}
                                           className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full text-white font-bold shadow-lg shadow-orange-900/50 hover:scale-105 transition-transform flex items-center gap-2"
                                       >
                                           {isSending ? 'جاري الإرسال...' : 'إرسال للطلاب 🚀'}
                                       </button>
                                   </div>
                               </>
                           ) : (
                               <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
                                   انقر على شريحة لمعاينتها هنا ثم إرسالها، أو استخدم &quot;معاينة&quot; و&quot;إرسال&quot; على كل شريحة
                               </div>
                           )}
                        </div>
                    </div>

                </div>
            </div>

            {/* نافذة شهادة الإبداع */}
            {showCertificateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
                    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Award size={20} className="text-amber-400" /> شهادة إبداع للطالب المتميز
                            </h3>
                            <button onClick={() => setShowCertificateModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <CertificateCreator
                            lessonTopic={currentLesson?.topic || ''}
                            studentOptions={liveStudents.map(s => ({ name: s.name }))}
                            onClose={() => setShowCertificateModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* نافذة معاينة الشريحة قبل الإرسال */}
            {previewSlide && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
                    <div className="w-full max-w-xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Eye size={18} className="text-amber-400" />
                                معاينة الشريحة {previewSlide.index + 1} قبل الإرسال
                            </h3>
                            <button onClick={() => setPreviewSlide(null)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-amber-950/20 space-y-4">
                            {previewSlide.slide.imageUrl && (
                                <div className="rounded-xl overflow-hidden border border-slate-600 bg-slate-800 aspect-video max-h-48">
                                    <img src={previewSlide.slide.imageUrl} alt={previewSlide.slide.title} className="w-full h-full object-contain" />
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-amber-200">{previewSlide.slide.title}</h4>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{previewSlide.slide.narration}</p>
                            {previewSlide.slide.visualDescription && !previewSlide.slide.imageUrl && (
                                <button 
                                    onClick={() => handleRegenerateSlideImage(previewSlide.index)}
                                    disabled={generatingImageIdx !== null}
                                    className="text-sm bg-violet-600/80 hover:bg-violet-500 px-4 py-2 rounded-lg flex items-center gap-2 text-white"
                                >
                                    {generatingImageIdx === previewSlide.index ? <span className="animate-spin">⏳</span> : <ImageIcon size={16} />}
                                    توليد صورة للشريحة
                                </button>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-700 flex gap-3 justify-end">
                            <button onClick={() => setPreviewSlide(null)} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-bold hover:bg-slate-600">
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleSendSlide(previewSlide.slide)}
                                disabled={isSending}
                                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-2"
                            >
                                <Send size={18} /> {isSending ? 'جاري الإرسال...' : 'إرسال للواحة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
