
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CurriculumBook, CurriculumLesson, KeyVisual, ClassRoom, getCurriculumBookDisplayName } from '../types';
import { analyzeCurriculum } from '../services/geminiService';
import { fetchCurriculumBooks, saveCurriculumBook, deleteCurriculumBook } from '../services/syncService';
import { exportLessonToPDF } from '../services/curriculumPdfService';
import { fetchTeacherClasses } from '../services/classService';
import { supabase } from '../services/supabaseClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    ArrowRight, Upload, FileText, Loader2, BookOpen, Target, Palette, FlaskConical,
    HelpCircle, ChevronDown, ChevronUp, Download, Brain, Sparkles, ScanLine,
    CheckCircle2, AlertCircle, Eye, Layers, PenTool, Trash2, History, RotateCcw,
    BookmarkPlus, MapPin
} from 'lucide-react';

const MATERIAL_CONFIG: Record<string, { label: string; bg: string; border: string; textColor: string; emoji: string }> = {
    paper: { label: 'ورقة', bg: 'bg-amber-500/10', border: 'border-amber-500/20', textColor: 'text-amber-200', emoji: '📜' },
    stone: { label: 'حجر', bg: 'bg-stone-500/10', border: 'border-stone-500/20', textColor: 'text-stone-300', emoji: '🪨' },
    wood: { label: 'خشب', bg: 'bg-orange-800/20', border: 'border-orange-700/30', textColor: 'text-orange-200', emoji: '🪵' },
    fabric: { label: 'قماش', bg: 'bg-pink-500/10', border: 'border-pink-500/20', textColor: 'text-pink-200', emoji: '🧵' },
    metal: { label: 'معدن', bg: 'bg-slate-600/20', border: 'border-slate-500/30', textColor: 'text-slate-300', emoji: '⚙️' },
};

interface CurriculumAgentProps {
    userId?: string;
    onBack: () => void;
    onGenerateLesson?: (topic: string, grade: string, activities?: string[], subject?: string, part?: string) => void;
}

// ... existing code ...

export const CurriculumAgent: React.FC<CurriculumAgentProps> = ({ userId, onBack, onGenerateLesson }) => {
    const [file, setFile] = useState<{ name: string; size: number; mimeType: string; data: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [thoughts, setThoughts] = useState<string[]>([]);
    const [result, setResult] = useState<CurriculumBook | null>(null);
    const [history, setHistory] = useState<CurriculumBook[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'thoughts' | 'results'>('thoughts');
    const [availableClasses, setAvailableClasses] = useState<ClassRoom[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedActivities, setSelectedActivities] = useState<Record<number, string[]>>({}); // Track selected activities per lesson index

    // ... existing refs ...
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resourceInputRef = useRef<HTMLInputElement>(null);
    const [targetLessonIndex, setTargetLessonIndex] = useState<number | null>(null);
    const thoughtsEndRef = useRef<HTMLDivElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Auto-scroll thoughts
    useEffect(() => {
        thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thoughts]);

    // Switch to results tab when done
    useEffect(() => {
        if (result) setActiveTab('results');
    }, [result]);

    // Load history & curriculum books
    useEffect(() => {
        const loadBooks = async () => {
            try {
                const books = await fetchCurriculumBooks();
                setHistory(books);
            } catch (e) {
                console.error('Failed to load curriculum books', e);
            }
        };
        loadBooks();
    }, []);

    // Load classes for "ربط بالفصل والشعبة" (same source as فصولي الدراسية - classes table)
    const loadClasses = useCallback(async () => {
        const id = userId || (await supabase.auth.getUser()).data?.user?.id;
        if (!id) return;
        try {
            const teacherClasses = await fetchTeacherClasses(id);
            setAvailableClasses(teacherClasses);
        } catch (e) {
            console.error('Failed to load classes', e);
        }
    }, [userId]);

    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

    // Refetch classes when result is ready (user sees link dropdown) - ensures fresh data
    useEffect(() => {
        if (result) loadClasses();
    }, [result, loadClasses]);

    const handleLinkToClass = async (classId: string) => {
        if (!result) return;
        const updatedResult = { ...result, linkedClassId: classId };
        setResult(updatedResult);
        try {
           await saveCurriculumBook(updatedResult); // Save immediately
           setSelectedClassId(classId);
           // Refresh history to reflect changes
           const books = await fetchCurriculumBooks();
           setHistory(books);
        } catch (e) {
            console.error(e);
            setError('فشل حفظ الربط بالفصل');
        }
    };

    // ... (rest of logic) ...

    const handleFileUpload = useCallback((uploadedFile: File) => {
        // ... (unchanged)
        if (!uploadedFile || uploadedFile.type !== 'application/pdf') {
            setError('يرجى رفع ملف PDF فقط.');
            return;
        }
        if (uploadedFile.size > 50 * 1024 * 1024) {
            setError('حجم الملف يتجاوز الحد الأقصى (50 ميجابايت).');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setFile({
                name: uploadedFile.name,
                size: uploadedFile.size,
                mimeType: uploadedFile.type,
                data: base64
            });
            setError(null);
            setResult(null);
            setThoughts([]);
        };
        reader.readAsDataURL(uploadedFile);
    }, []);

    // Resource Handler for Lessons
    const handleAddResource = (index: number) => {
        setTargetLessonIndex(index);
        resourceInputRef.current?.click();
    };

    const handleResourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (targetLessonIndex === null || !result || !file) return;

        // Basic file check (Image or PDF)
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert('يرجى رفع ملف صورة أو PDF فقط.');
            return;
        }

        const newRes = {
            id: `res-${Date.now()}`,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const,
            date: new Date().toISOString(),
        };
        
        const updatedStructure = [...result.curriculumStructure];
        const lesson = updatedStructure[targetLessonIndex];
        lesson.resources = [...(lesson.resources || []), newRes];
        
        const updatedResult = { ...result, curriculumStructure: updatedStructure };
        setResult(updatedResult);
        try {
            await saveCurriculumBook(updatedResult);
        } catch(e) { console.error(e); }

        setTargetLessonIndex(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (resourceInputRef.current) resourceInputRef.current.value = '';
    };

    // ... generate lesson ...
    const handleGenerateForLesson = (lesson: CurriculumLesson, index: number) => {
        if (onGenerateLesson) {
             const acts = selectedActivities[index] || lesson.activities;
             onGenerateLesson(lesson.lessonTitle, result?.bookMetadata.grade || '', acts, result?.bookMetadata?.subject, result?.bookMetadata?.part);
        } else {
            alert('خاصية توليد الدروس غير متوفرة في هذا الوضع');
        }
    };

    const handleLessonPDF = async (lesson: CurriculumLesson) => {
        try {
            await exportLessonToPDF(lesson, result?.bookMetadata);
        } catch (e) {
            console.error(e);
            setError('فشل تصدير PDF');
        }
    };

    const handleExportPDF = () => {
         if (!result) return;
         const doc = new jsPDF();
         doc.text(result.fileName, 10, 10);
         doc.save(`${result.fileName}.pdf`);
    };

    const handleExportJSON = () => {
        if (!result) return;
        const jsonString = JSON.stringify(result, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.fileName || 'curriculum'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportImage = async () => {
        const element = document.getElementById('results-panel');
        if (!element) return;
        try {
            const canvas = await html2canvas(element);
            const dataUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `${result?.fileName || 'curriculum'}.png`;
            a.click();
        } catch (e) {
            console.error("Image export failed", e);
        }
    };

    // ... input change ...
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };


    const handleAnalyze = async () => {
        if (!file) return;
        setIsProcessing(true);
        setThoughts([]);
        setResult(null);
        setError(null);
        setActiveTab('thoughts');

        try {
            const data = await analyzeCurriculum(
                { mimeType: file.mimeType, data: file.data },
                (thought) => setThoughts(prev => [...prev, thought])
            );
            // Save to DB immediately with UPSERT logic handled in service
            const savedData = await saveCurriculumBook(data);
             // Update local result with what the DB returned (especially ID if needed)
            const newRes = { ...data, id: savedData.id }; 
            setResult(newRes);
            const books = await fetchCurriculumBooks();
            setHistory(books);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التحليل');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    // ... exports ...

    const handleDeleteFromHistory = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('هل أنت متأكد من حذف هذا المنهج؟')) {
            try {
                await deleteCurriculumBook(id);
                const books = await fetchCurriculumBooks();
                setHistory(books);
                if (result?.id === id) setResult(null);
            } catch(e) { console.error(e); setError('فشل الحذف'); }
        }
    };


    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const renderKeyVisual = (kv: KeyVisual, idx: number) => {
        const config = MATERIAL_CONFIG[kv.material] || MATERIAL_CONFIG.paper;
        return (
            <div key={idx} className={`relative rounded-xl p-4 border ${config.bg} ${config.border} overflow-hidden group transition-all duration-300 hover:scale-[1.02]`}>
                {/* Material texture overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: kv.material === 'stone'
                            ? 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.15\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")'
                            : kv.material === 'wood'
                                ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 8px)'
                                : kv.material === 'fabric'
                                    ? 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Crect width=\'1\' height=\'1\' x=\'0\' y=\'0\'/%3E%3C/g%3E%3C/svg%3E")'
                                    : 'none'
                    }}
                />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{config.emoji}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{config.label} — {kv.calligraphyStyle}</span>
                    </div>
                    <p className={`text-base font-bold leading-relaxed ${config.textColor}`}
                        style={{ fontFamily: 'serif' }}>
                        « {kv.text} »
                    </p>
                </div>
            </div>
        );
    };

    const renderLesson = (lesson: CurriculumLesson, index: number) => {
        const isExpanded = expandedLesson === index;
        return (
            <div key={index} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30">
                {/* Lesson Header */}
                <button
                    onClick={() => setExpandedLesson(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-right hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm">
                            {index + 1}
                        </div>
                        <div className="flex-1 text-right">
                            <h4 className="text-white font-bold text-sm">{lesson.lessonTitle}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                الصفحات: {lesson.pageRange[0]} — {lesson.pageRange[1]} • {lesson.objectives.length} أهداف • {lesson.activities.length} أنشطة
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            <CheckCircle2 size={10} className="inline ml-1" /> جاهز
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                </button>

                {/* Lesson Details (Expanded) */}
                {isExpanded && (
                    <div className="border-t border-slate-800 p-5 space-y-5 animate-fadeIn">

                        {/* Objectives */}
                        {lesson.objectives.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Target size={14} className="text-blue-400" />
                                    <h5 className="text-sm font-bold text-blue-400">الأهداف التعليمية</h5>
                                </div>
                                <div className="space-y-2">
                                    {lesson.objectives.map((obj, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                            <span>{obj}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Key Visuals */}
                        {lesson.keyVisuals.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <PenTool size={14} className="text-amber-400" />
                                    <h5 className="text-sm font-bold text-amber-400">العناصر البصرية</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {lesson.keyVisuals.map((kv, i) => renderKeyVisual(kv, i))}
                                </div>
                            </div>
                        )}

                        {/* Activities */}
                        {lesson.activities.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <FlaskConical size={14} className="text-emerald-400" />
                                        <h5 className="text-sm font-bold text-emerald-400">الأنشطة والتجارب</h5>
                                        <span className="text-[10px] text-slate-500">(اختر أنشطة للتوليد أو اترك الكل)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedActivities({ ...selectedActivities, [index]: [...lesson.activities] });
                                            }}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold"
                                        >
                                            تحديد الكل
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const next = { ...selectedActivities };
                                                delete next[index];
                                                setSelectedActivities(next);
                                            }}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-600/50 font-bold"
                                        >
                                            إلغاء التحديد
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {lesson.activities.map((act, actIndex) => {
                                        const isSelected = selectedActivities[index]?.includes(act);
                                        return (
                                            <div 
                                                key={actIndex} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const current = selectedActivities[index] || [];
                                                    if (isSelected) {
                                                        setSelectedActivities({ ...selectedActivities, [index]: current.filter(a => a !== act) });
                                                    } else {
                                                        setSelectedActivities({ ...selectedActivities, [index]: [...current, act] });
                                                    }
                                                }}
                                                className={`transition-colors cursor-pointer rounded-lg p-3 text-sm text-slate-300 flex items-start gap-2 ${
                                                    isSelected 
                                                        ? 'bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                                        : 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10'
                                                }`}
                                            >
                                                {isSelected ? (
                                                    <CheckCircle2 size={12} className="text-emerald-400 mt-1 shrink-0" />
                                                ) : (
                                                    <FlaskConical size={12} className="text-emerald-500 mt-1 shrink-0" />
                                                )}
                                                <span className={isSelected ? 'text-white font-medium' : ''}>{act}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Assessment */}
                        {lesson.assessmentQuestions.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <HelpCircle size={14} className="text-violet-400" />
                                    <h5 className="text-sm font-bold text-violet-400">أسئلة التقويم</h5>
                                </div>
                                <div className="space-y-2">
                                    {lesson.assessmentQuestions.map((q, i) => (
                                        <div key={i} className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-sm text-slate-300 flex items-start gap-2">
                                            <span className="text-violet-400 font-bold shrink-0">س{i + 1}:</span>
                                            <span>{q}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resources Section & Actions */}
                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                                    <Layers size={14} /> مصادر ومرفقات الدرس
                                </h5>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleAddResource(index); }}
                                    className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <Upload size={12} /> رفع ملف
                                </button>
                            </div>
                            
                            {/* Resource List */}
                            {lesson.resources && lesson.resources.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {lesson.resources.map((res, i) => (
                                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700">
                                            {res.type === 'image' ? <Eye size={14} className="text-emerald-400" /> : <FileText size={14} className="text-red-400" />}
                                            <span className="text-xs text-slate-300 truncate flex-1">{res.name}</span>
                                            <span className="text-[9px] text-slate-500">{new Date(res.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600 mb-4 font-mono">لا توجد مرفقات بعد. يمكنك رفع صور توضيحية أو أوراق عمل.</p>
                            )}

                            {/* Smart Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLessonPDF(lesson); }}
                                    className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    title="تحميل تحليل الدرس PDF"
                                >
                                    <FileText size={18} />
                                    <span className="hidden sm:inline">تقرير PDF</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleGenerateForLesson(lesson, index); }}
                                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 group"
                                    title={(() => {
                                        const acts = selectedActivities[index];
                                        return acts?.length ? `توليد درس بـ ${acts.length} نشاط محدد` : 'توليد درس بكل الأنشطة';
                                    })()}
                                >
                                    <Brain size={16} /> توليد درس ذكي
                                    <span className="text-[10px] opacity-90">
                                        ({selectedActivities[index]?.length ? `${selectedActivities[index].length} أنشطة` : 'كل الأنشطة'})
                                    </span>
                                    <Sparkles size={14} className="group-hover:animate-spin" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen bg-slate-950 relative overflow-hidden font-sans text-slate-100">

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />
                <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500 transition-all">
                            <ArrowRight size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <Brain size={22} className="text-cyan-400" />
                                <h1 className="text-2xl font-black text-white tracking-tight">منهاجي</h1>
                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Agent</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">تحليل الكتب المدرسية وتحويلها إلى بيئة تعليمية رقمية متكاملة</p>
                        </div>
                    </div>

                    {result && (
                        <div className="flex gap-2">
                            <button onClick={handleExportImage} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-700 hover:text-white transition-all">
                                <Download size={14} /> صورة
                            </button>
                            <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-700 hover:text-white transition-all">
                                <FileText size={14} /> PDF
                            </button>
                            <button onClick={handleExportJSON} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-all">
                                <Download size={14} /> JSON
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto p-6">

                {/* Upload Zone */}
                {!isProcessing && !result && (
                    <div className="mb-8">
                        <div
                            ref={dropZoneRef}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${dragOver
                                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                                : file
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-slate-700 bg-slate-900/30 hover:border-cyan-500/40 hover:bg-slate-900/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handleInputChange}
                                className="hidden"
                            />
                            {/* Hidden Resource Input */}
                            <input
                                ref={resourceInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleResourceFileChange}
                                className="hidden"
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                        <FileText size={32} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">{file.name}</p>
                                        <p className="text-slate-400 text-sm mt-1">{formatSize(file.size)}</p>
                                    </div>
                                    <p className="text-xs text-slate-500">اضغط لتغيير الملف</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-cyan-500/40 transition-all">
                                        <Upload size={36} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">ارفع كتاباً مدرسياً (PDF)</p>
                                        <p className="text-slate-400 text-sm mt-1">اسحب الملف هنا أو اضغط للاختيار • الحد الأقصى 50 ميجابايت</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && !isProcessing && (
                            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                                <AlertCircle size={18} className="text-red-400 shrink-0" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Analyze Button */}
                        {file && (
                            <button
                                onClick={handleAnalyze}
                                className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                                <Brain size={22} className="relative z-10" />
                                <span className="relative z-10">بدء تحليل الكتاب</span>
                                <Sparkles size={16} className="relative z-10" />
                            </button>
                        )}

                        {/* History Panel */}
                        {history.length > 0 && (
                            <div className="mt-12 border-t border-slate-800 pt-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <History size={20} className="text-slate-400" />
                                    <h3 className="text-lg font-bold text-slate-300">سجل التحليل السابق</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {history.map(book => (
                                        <div key={book.id}
                                            onClick={() => setResult(book)}
                                            className="group relative bg-slate-900/40 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all hover:-translate-y-1"
                                        >
                                            <button
                                                onClick={(e) => handleDeleteFromHistory(e, book.id)}
                                                className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10"
                                            >
                                                <Trash2 size={12} />
                                            </button>

                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                                                    <BookOpen size={18} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="font-bold text-slate-200 truncate text-sm">{getCurriculumBookDisplayName(book)}</h4>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                        {new Date(book.analyzedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/30 p-2 rounded-lg">
                                                <span>{book.bookMetadata.subject}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                <span>{book.bookMetadata.grade}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                <span>{book.curriculumStructure.length} درس</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Processing / Results Area */}
                {(isProcessing || result) && (
                    <div>
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-1 mb-6 w-fit">
                            <button
                                onClick={() => setActiveTab('thoughts')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'thoughts'
                                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Brain size={14} />
                                تفكير منهاجي
                                {isProcessing && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('results')}
                                disabled={!result}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'results'
                                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                    : result ? 'text-slate-400 hover:text-white' : 'text-slate-600 cursor-not-allowed'
                                    }`}
                            >
                                <Layers size={14} />
                                النتائج
                                {result && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{result.curriculumStructure.length}</span>}
                            </button>
                        </div>

                        {/* Thinking Stream Panel */}
                        {activeTab === 'thoughts' && (
                            <div className="border border-slate-800 rounded-2xl bg-slate-900/30 backdrop-blur-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]' : result ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                        <h3 className="font-bold text-slate-200 text-sm">تدفق تفكير منهاجي</h3>
                                        <span className="text-[10px] font-mono text-slate-500">{isProcessing ? 'جاري التحليل...' : result ? 'مكتمل' : 'في الانتظار'}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-cyan-500/50">{thoughts.length} عمليات</span>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-3">
                                    {thoughts.map((thought, i) => (
                                        <div key={i} className="flex items-start gap-3 animate-slideIn" style={{ animationDelay: `${i * 50}ms` }}>
                                            <div className="mt-1 shrink-0">
                                                {i === thoughts.length - 1 && isProcessing ? (
                                                    <ScanLine size={14} className="text-cyan-400 animate-pulse" />
                                                ) : thought.startsWith('✅') ? (
                                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                                ) : thought.startsWith('❌') ? (
                                                    <AlertCircle size={14} className="text-red-400" />
                                                ) : (
                                                    <Eye size={14} className="text-cyan-500/60" />
                                                )}
                                            </div>
                                            <p className={`text-sm leading-relaxed ${thought.startsWith('✅') ? 'text-emerald-300 font-bold' : thought.startsWith('❌') ? 'text-red-300' : 'text-slate-300'}`}>
                                                {thought}
                                            </p>
                                        </div>
                                    ))}

                                    {isProcessing && thoughts.length > 0 && (
                                        <div className="flex items-center gap-2 text-cyan-400 text-sm">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="animate-pulse">منهاجي يفكر...</span>
                                        </div>
                                    )}

                                    {isProcessing && thoughts.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="relative">
                                                <Brain size={48} className="text-cyan-500/30" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Loader2 size={24} className="text-cyan-400 animate-spin" />
                                                </div>
                                            </div>
                                            <p className="text-slate-400 mt-4 text-sm">جاري تهيئة محرك التحليل الذكي...</p>
                                            <p className="text-slate-600 mt-1 text-xs">قد يستغرق التحليل 30-60 ثانية حسب حجم الكتاب</p>
                                        </div>
                                    )}

                                    <div ref={thoughtsEndRef} />
                                </div>
                            </div>
                        )}

                        {/* Results Panel */}
                        {activeTab === 'results' && result && (
                            <div id="results-panel" className="space-y-6 bg-slate-950 p-4 rounded-xl">
                                {/* Book Metadata Card */}
                                <div className="border border-cyan-500/20 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/20 backdrop-blur-sm p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <BookOpen size={24} className="text-cyan-400" />
                                        <h3 className="text-xl font-black text-white">بيانات الكتاب</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">المادة</div>
                                            <div className="text-white font-bold">{result.bookMetadata.subject}</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الصف</div>
                                            <div className="text-white font-bold">{result.bookMetadata.grade}</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الجزء</div>
                                            <div className="text-white font-bold">{result.bookMetadata.part}</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">الدروس</div>
                                            <div className="text-cyan-400 font-black text-xl">{result.curriculumStructure.length}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Class Linking Component */}
                                <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">ربط بالفصل والشعبة</h4>
                                            <p className="text-xs text-slate-500">حدد الفصل الدراسي لحفظ هذا المنهج فيه للوصول السريع</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <select
                                            value={result.linkedClassId || ''}
                                            onChange={(e) => handleLinkToClass(e.target.value)}
                                            className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                                            dir="rtl"
                                        >
                                            <option value="">-- عام / الأرشيف العام --</option>
                                            {availableClasses.length > 0 ? (
                                                availableClasses.map(cls => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {[cls.name, cls.gradeLevel, cls.subject].filter(Boolean).join(' • ')}
                                                    </option>
                                                ))
                                            ) : (
                                                <option disabled>لا توجد فصول مضافة بعد</option>
                                            )}
                                        </select>
                                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Lessons Tree */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Layers size={18} className="text-cyan-400" />
                                        <h3 className="text-lg font-bold text-slate-200">هيكل المنهج</h3>
                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-slate-700 to-transparent mr-4" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {result.curriculumStructure.map((lesson, i) => renderLesson(lesson, i))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Styles */}
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.3);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};
