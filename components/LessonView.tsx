
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LessonPlan, SlideContent, LessonProcedure, SmartAssets, QuizQuestion, Flashcard, MindMapNode, PodcastScript, InfographicSection, VideoScriptScene } from '../types';
import { generateSlideImage, generateQuiz, generateFlashcards, generateMindMap, generatePodcastScript, generateInfographic, generateVideoScript } from '../services/geminiService';
// @ts-ignore
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, TextRun, ShadingType } from "docx";
// @ts-ignore
import FileSaver from "file-saver";
// @ts-ignore
import html2pdf from "html2pdf.js";
// @ts-ignore
import PptxGenJS from "pptxgenjs";
// @ts-ignore
import mermaid from 'mermaid';
// @ts-ignore
import html2canvas from 'html2canvas';

import {
    LayoutTemplate, Sparkles, CheckCircle, Gamepad2, Flag, Image as ImageIcon,
    ArrowLeft, FileText, Presentation, Loader2, RefreshCw, Copy,
    Edit3, Save, X, MessageSquare, ScanEye, AlertTriangle,
    Target, Book, Layers, Lightbulb, ZoomIn, Download, Camera,
    Calculator, FlaskConical, Globe, Languages, Palette, Music, Dna,
    Clock, User, GraduationCap, Zap, CalendarDays, BrainCircuit, Mic, Video, List, PieChart, Send,
    ChevronLeft, ChevronRight, RotateCcw, Grid as GridIcon, Play
} from 'lucide-react';

// --- Export Helpers ---
const downloadQuizDocx = async (quiz: QuizQuestion[], topic: string) => {
    // @ts-ignore
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: `اختبار: ${topic}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }),
                ...quiz.flatMap((q, i) => [
                    new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.text}`, bold: true, size: 28, rightToLeft: true })], alignment: AlignmentType.RIGHT }),
                    ...q.options.map(opt => new Paragraph({ children: [new TextRun({ text: `• ${opt}`, size: 24, rightToLeft: true })], alignment: AlignmentType.RIGHT, indent: { right: 720 } })),
                    new Paragraph({ text: "" })
                ]),
                new Paragraph({ text: "الإجابات النموذجية", heading: HeadingLevel.HEADING_2, pageBreakBefore: true, alignment: AlignmentType.RIGHT }),
                ...quiz.map((q, i) => new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.options[q.correctAnswer]}`, bold: true, size: 24, rightToLeft: true }), new TextRun({ text: ` - ${q.explanation}`, size: 24, rightToLeft: true })], alignment: AlignmentType.RIGHT }))
            ]
        }]
    });
    const blob = await Packer.toBlob(doc);
    FileSaver.saveAs(blob, `اختبار_${topic}.docx`);
};

const downloadFlashcardsDocx = async (cards: Flashcard[], topic: string) => {
    // @ts-ignore
    const rows = [
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "المصطلح", alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_3 })] }), new TableCell({ children: [new Paragraph({ text: "التعريف", alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_3 })] })] }),
        ...cards.map(c => new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: c.front, alignment: AlignmentType.RIGHT })] }), new TableCell({ children: [new Paragraph({ text: c.back, alignment: AlignmentType.RIGHT })] })] }))
    ];
    const doc = new Document({
        sections: [{ children: [new Paragraph({ text: `بطاقات الذاكرة: ${topic}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), new Paragraph({ text: "" }), new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } })] }]
    });
    const blob = await Packer.toBlob(doc);
    FileSaver.saveAs(blob, `بطاقات_${topic}.docx`);
};

const downloadScriptDocx = async (title: string, content: { speaker: string, text: string }[], filename: string) => {
    // @ts-ignore
    const doc = new Document({
        sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), new Paragraph({ text: "" }), ...content.map(line => new Paragraph({ children: [new TextRun({ text: `${line.speaker}: `, bold: true, size: 24, rightToLeft: true }), new TextRun({ text: line.text, size: 24, rightToLeft: true })], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }))] }]
    });
    const blob = await Packer.toBlob(doc);
    FileSaver.saveAs(blob, `${filename}.docx`);
};

const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, filename);
};

interface LessonViewProps {
    plan: LessonPlan;
    onBack: () => void;
    onGamification?: () => void;
    onSimulation?: () => void;
    onSongs?: () => void;
    onSchedule?: () => void;
    onSave?: (plan: LessonPlan) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ plan, onBack, onGamification, onSimulation, onSongs, onSchedule, onSave }) => {
    // --- State ---
    const [lessonState, setLessonState] = useState<LessonPlan>({
        ...plan,
        prerequisites: plan.prerequisites || [],
        objectives: plan.objectives || [],
        procedures: plan.procedures || [],
        slides: plan.slides || [],
        evaluationQuestions: plan.evaluationQuestions || []
    });

    const [activeSection, setActiveSection] = useState<'overview' | 'assets' | number>('overview');
    const [activeSmartAsset, setActiveSmartAsset] = useState<'quiz' | 'flashcards' | 'mindmap' | 'podcast' | 'infographic' | 'video' | null>(null);
    const [imgLoadError, setImgLoadError] = useState(false);

    // Reset image error when changing slides
    useEffect(() => {
        setImgLoadError(false);
    }, [activeSection]);
    const [smartAssets, setSmartAssets] = useState<SmartAssets>(plan.assets || {});
    const [generatingAsset, setGeneratingAsset] = useState<string | null>(null); // 'quiz', 'flashcards', etc.
    const [assetError, setAssetError] = useState<string | null>(null);
    const [flashcardStudyMode, setFlashcardStudyMode] = useState(false);
    const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
    const [flashcardFlipped, setFlashcardFlipped] = useState(false);
    const mermaidRef = useRef<HTMLDivElement>(null);
    const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
    const [tempSlideData, setTempSlideData] = useState<SlideContent | null>(null);
    const [generatingImageId, setGeneratingImageId] = useState<number | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [confirmExportType, setConfirmExportType] = useState<'docx' | 'pptx' | 'image' | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [activeProcedure, setActiveProcedure] = useState<LessonProcedure | null>(null);
    const [snippingPreviewUrl, setSnippingPreviewUrl] = useState<string | null>(null);

    // --- Mermaid Init ---
    useEffect(() => {
        mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { primaryColor: '#10b981', primaryTextColor: '#e2e8f0', primaryBorderColor: '#34d399', lineColor: '#64748b', secondaryColor: '#1e293b', tertiaryColor: '#0f172a' } });
    }, []);

    useEffect(() => {
        if (activeSmartAsset === 'mindmap' && smartAssets.mindMap && mermaidRef.current) {
            const renderMermaid = async () => {
                try {
                    mermaidRef.current!.innerHTML = '';
                    const id = 'mermaid-' + Date.now();
                    const { svg } = await mermaid.render(id, smartAssets.mindMap!);
                    mermaidRef.current!.innerHTML = svg;
                } catch (e) {
                    console.error('Mermaid render error:', e);
                    if (mermaidRef.current) mermaidRef.current.innerHTML = '<p class="text-red-400 p-4">خطأ في عرض الخريطة الذهنية. يمكنك نسخ الكود واستخدامه في Mermaid Live Editor.</p>';
                }
            };
            renderMermaid();
        }
    }, [activeSmartAsset, smartAssets.mindMap]);

    // --- Helpers ---
    const todayDate = new Date().toLocaleDateString('ar-SY');

    // Helper to translate domain
    const getDomainLabel = (domain: string) => {
        if (domain === 'cognitive') return 'معرفي';
        if (domain === 'skill') return 'مهاري';
        if (domain === 'emotional') return 'وجداني';
        return domain;
    };

    const getDomainColor = (domain: string) => {
        if (domain === 'cognitive') return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
        if (domain === 'skill') return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
        if (domain === 'emotional') return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    };

    const getSlideIcon = (title: string, slideNum: number) => {
        const t = title || "";

        // 1. Specific Slide Function (High Priority)
        if (slideNum === 1 || t.includes("عنوان")) return <LayoutTemplate size={24} className="text-blue-400" />;
        if (t.includes("تمهيد") || t.includes("تهيئة")) return <Sparkles size={24} className="text-amber-400" />;
        if (t.includes("تقويم") || t.includes("سؤال")) return <CheckCircle size={24} className="text-green-400" />;
        if (t.includes("لعبة") || t.includes("نشاط")) return <Gamepad2 size={24} className="text-purple-400" />;
        if (t.includes("خاتمة")) return <Flag size={24} className="text-rose-400" />;

        // 2. Subject-based Icons (Medium Priority)
        const subject = lessonState.subject || "";
        if (subject.includes("رياضيات") || subject.includes("حساب") || subject.includes("جبر") || subject.includes("هندسة"))
            return <Calculator size={24} className="text-indigo-400" />;
        if (subject.includes("علوم") || subject.includes("فيزياء") || subject.includes("كيمياء"))
            return <FlaskConical size={24} className="text-teal-400" />;
        if (subject.includes("أحياء") || subject.includes("طبيعة"))
            return <Dna size={24} className="text-emerald-400" />;
        if (subject.includes("جغرافيا") || subject.includes("تاريخ") || subject.includes("اجتماعيات"))
            return <Globe size={24} className="text-sky-400" />;
        if (subject.includes("لغة") || subject.includes("عربي") || subject.includes("إنجليزي"))
            return <Languages size={24} className="text-pink-400" />;
        if (subject.includes("فنية") || subject.includes("رسم"))
            return <Palette size={24} className="text-fuchsia-400" />;
        if (subject.includes("موسيقى"))
            return <Music size={24} className="text-yellow-400" />;

        // 3. Generic Fallback
        return <ImageIcon size={24} className="text-slate-400" />;
    };

    // --- Handlers (Image Gen, Editing, Export) ---
    const handleEditStart = (slide: SlideContent) => {
        if (editingSlideId !== null && editingSlideId !== slide.slideNumber) {
            if (!window.confirm("توجد تعديلات غير محفوظة. هل تريد الاستمرار؟")) return;
        }
        setEditingSlideId(slide.slideNumber);
        setTempSlideData({ ...slide });
        setActiveSection(lessonState.slides.findIndex(s => s.slideNumber === slide.slideNumber));
    };

    const handleEditCancel = () => {
        setEditingSlideId(null);
        setTempSlideData(null);
    };

    const handleTempChange = (field: keyof SlideContent, value: string | number) => {
        if (tempSlideData) setTempSlideData({ ...tempSlideData, [field]: value });
    };

    const confirmSaveSlide = () => {
        if (tempSlideData && editingSlideId !== null) {
            const updatedSlides = lessonState.slides.map(s =>
                s.slideNumber === editingSlideId ? tempSlideData : s
            );
            setLessonState({ ...lessonState, slides: updatedSlides });
            handleEditCancel();
        }
    };

    const handleRegenerateImage = async (slideIndex: number, description: string) => {
        const slide = lessonState.slides[slideIndex];
        setGeneratingImageId(slide.slideNumber);
        setImageError(null);
        try {
            const imageUrl = await generateSlideImage(description);
            if (imageUrl) {
                const updatedSlides = [...lessonState.slides];
                updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], imageUrl: imageUrl };
                setLessonState({ ...lessonState, slides: updatedSlides });
            } else {
                setImageError("تم الوصول للحد الأقصى (Quota). يرجى المحاولة لاحقاً.");
            }
        } catch (err) {
            setImageError("فشل الاتصال بالخدمة.");
        } finally {
            setGeneratingImageId(null);
        }
    };

    const handleCopyImage = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            alert("تم نسخ الصورة إلى الحافظة بنجاح");
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء نسخ الصورة");
        }
    };

    const handleExportClick = (type: 'docx' | 'pptx' | 'image') => {
        setConfirmExportType(type);
    };

    // --- Smart Assets Handlers ---
    const handleGenerateAsset = async (type: 'quiz' | 'flashcards' | 'mindmap' | 'podcast' | 'infographic' | 'video') => {
        if (generatingAsset) return;
        setGeneratingAsset(type);
        setAssetError(null);
        try {
            // Create a copy of current assets
            let newAssets: SmartAssets = { ...smartAssets };

            if (type === 'quiz') {
                const data = await generateQuiz(lessonState.topic, lessonState.grade);
                newAssets.quiz = data;
            } else if (type === 'flashcards') {
                const data = await generateFlashcards(lessonState.topic, lessonState.grade);
                newAssets.flashcards = data;
            } else if (type === 'mindmap') {
                const data = await generateMindMap(lessonState.topic);
                newAssets.mindMap = data;
            } else if (type === 'podcast') {
                const data = await generatePodcastScript(lessonState.topic, lessonState.grade);
                newAssets.podcast = data;
            } else if (type === 'infographic') {
                const data = await generateInfographic(lessonState.topic, lessonState.grade);
                newAssets.infographic = data;
            } else if (type === 'video') {
                const data = await generateVideoScript(lessonState.topic, lessonState.grade);
                newAssets.videoScript = data;
            }

            setSmartAssets(newAssets);
            // Sync with main lesson state if we want to save it later
            setLessonState(prev => ({ ...prev, assets: newAssets }));

        } catch (error: any) {
            console.error("Asset Generation Error:", error);
            setAssetError(error?.message || "حدث خطأ أثناء التوليد. يرجى المحاولة مرة أخرى.");
        } finally {
            setGeneratingAsset(null);
        }
    };

    const handleDownloadAsset = async (type: string) => {
        if (!smartAssets) return;
        try {
            switch (type) {
                case 'quiz':
                    if (smartAssets.quiz) await downloadQuizDocx(smartAssets.quiz, lessonState.topic);
                    break;
                case 'flashcards':
                    if (smartAssets.flashcards) await downloadFlashcardsDocx(smartAssets.flashcards, lessonState.topic);
                    break;
                case 'mindmap':
                    if (smartAssets.mindMap) downloadTextFile(smartAssets.mindMap, `mindmap_${lessonState.topic}.mmd`);
                    break;
                case 'podcast':
                    if (smartAssets.podcast) await downloadScriptDocx(smartAssets.podcast.title, smartAssets.podcast.script, `بودكاست_${lessonState.topic}`);
                    break;
                case 'infographic':
                    if (smartAssets.infographic) {
                        const element = document.getElementById('infographic-container');
                        if (element) {
                            try {
                                const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                                const link = document.createElement('a');
                                link.download = `infographic_${lessonState.topic}.png`;
                                link.href = canvas.toDataURL('image/png');
                                link.click();
                            } catch {
                                // @ts-ignore
                                html2pdf().from(element).save(`infographic_${lessonState.topic}.pdf`);
                            }
                        } else {
                            alert("يرجى عرض الإنفوجرافيك أولاً لتنزيله.");
                            setActiveSmartAsset('infographic');
                        }
                    }
                    break;
                case 'video':
                    if (smartAssets.videoScript) await downloadScriptDocx("سيناريو الفيديو", smartAssets.videoScript.map(s => ({ speaker: `مشهد ${s.sceneNumber} (${s.duration})`, text: `بصري: ${s.visual}\nصوتي: ${s.audio}` })), `فيديو_${lessonState.topic}`);
                    break;
            }
        } catch (error) {
            console.error("Download Error:", error);
            alert("فشل التنزيل. يرجى المحاولة مرة أخرى.");
        }
    };

    const executeExport = async () => {
        if (!confirmExportType) return;
        const type = confirmExportType;
        setConfirmExportType(null);

        if (type === 'docx') {
            await generateDocx();
        } else if (type === 'pptx') {
            await generatePptx();
        } else if (type === 'image') {
            await exportAsImage();
        }
    };

    // --- Build Paper HTML (matching DOCX structure) ---
    const buildPaperHtml = (): HTMLDivElement => {
        const safeProcedures = lessonState.procedures || [];
        const safePrerequisites = lessonState.prerequisites || [];
        const safeObjectives = lessonState.objectives || [];
        const safeEvalQuestions = lessonState.evaluationQuestions || [];

        const container = document.createElement('div');
        container.style.cssText = 'direction:rtl; font-family: "Segoe UI", Tahoma, Arial, sans-serif; background:#fff; color:#1a1a1a; padding:40px 32px; width:794px; line-height:1.7; font-size:13px;';

        container.innerHTML = `
            <h1 style="text-align:center; font-size:22px; margin-bottom:4px; color:#1a1a1a;">سجل تحضير الدرس</h1>
            <p style="text-align:center; font-size:10px; color:#888; margin-bottom:16px;">منصة المعلم الذكي — تم التوليد تلقائياً</p>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr>
                    <td style="border:1px solid #333; padding:6px 10px; width:50%;">التاريخ: ${lessonState.date || todayDate}</td>
                    <td style="border:1px solid #333; padding:6px 10px; width:50%;">اليوم: ...............</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:6px 10px;">الصف: ${lessonState.grade}</td>
                    <td style="border:1px solid #333; padding:6px 10px;">الشعبة: ...............</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:6px 10px;">المادة: ${lessonState.subject}</td>
                    <td style="border:1px solid #333; padding:6px 10px;">المعلم: ${lessonState.teacherName || '...............'}</td>
                </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr><td style="border:1px solid #333; padding:8px 10px;"><b>الموضوع:</b> ${lessonState.topic}</td></tr>
                <tr><td style="border:1px solid #333; padding:8px 10px;"><b>موارد التعلم:</b> ${lessonState.resources || 'الكتاب المدرسي، السبورة، جهاز عرض، بطاقات'}</td></tr>
                <tr><td style="border:1px solid #333; padding:8px 10px;"><b>طرائق التدريس:</b> الحوار والمناقشة، التعلم النشط، العمل الجماعي، حل المشكلات</td></tr>
                <tr><td style="border:1px solid #333; padding:8px 10px;"><b>الأهداف:</b><br/>${safeObjectives.map(o => `• ${o.text}`).join('<br/>')}</td></tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr>
                    <td style="border:1px solid #333; padding:6px 10px; background:#E0F7FA; font-weight:bold; width:85%;">التمهيد والتهيئة</td>
                    <td style="border:1px solid #333; padding:6px 10px; background:#E0F7FA; font-weight:bold; text-align:center; width:15%;">الزمن</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:8px 10px;">${safePrerequisites.join(' - ') || 'مراجعة الدرس السابق'}</td>
                    <td style="border:1px solid #333; padding:8px 10px; text-align:center; font-weight:bold;">5 د</td>
                </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr style="background:#E0E0E0;">
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; width:15%;">الزمن</td>
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; width:25%;">مخرجات التعلم</td>
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; width:40%;">مسار الدرس</td>
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; width:20%;">التقويم</td>
                </tr>
                ${safeProcedures.map(proc => `
                    <tr>
                        <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold;">${proc.time || '10 د'}</td>
                        <td style="border:1px solid #333; padding:6px;">${proc.step}</td>
                        <td style="border:1px solid #333; padding:6px;">المعلم: ${proc.teacherRole}<br/>الطالب: ${proc.studentRole}<br/>الاستراتيجية: ${proc.strategy}</td>
                        <td style="border:1px solid #333; padding:6px;"></td>
                    </tr>
                `).join('')}
                <tr style="background:#F5F5F5;">
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold;">5 د</td>
                    <td style="border:1px solid #333; padding:6px; font-weight:bold;">غلق الدرس وتلخيص الأفكار</td>
                    <td style="border:1px solid #333; padding:6px;">${lessonState.closureActivity || ''}</td>
                    <td style="border:1px solid #333; padding:6px; font-weight:bold;">التقويم النهائي</td>
                </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr>
                    <td style="border:1px solid #333; padding:6px; background:#FFF3E0; font-weight:bold; width:50%; text-align:center;">نشاط للمتميزين (إثرائي)</td>
                    <td style="border:1px solid #333; padding:6px; background:#FFF3E0; font-weight:bold; width:50%; text-align:center;">نشاط للمتعثرين (مساند)</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:8px 10px;">${lessonState.differentiation?.enrichment || ' '}</td>
                    <td style="border:1px solid #333; padding:8px 10px;">${lessonState.differentiation?.support || ' '}</td>
                </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr><td colspan="2" style="border:1px solid #333; padding:6px; font-weight:bold;">المنطقة التأملية (ما بعد التنفيذ)</td></tr>
                <tr><td style="border:1px solid #333; padding:6px; background:#F3E5F5; font-weight:bold; width:100%;" colspan="2">ملاحظات المعلم</td></tr>
                <tr><td style="border:1px solid #333; padding:8px;" colspan="2">${lessonState.reflection?.teacherNotes || ' '}</td></tr>
                <tr><td style="border:1px solid #333; padding:6px; background:#F3E5F5; font-weight:bold;" colspan="2">نقاط القوة</td></tr>
                <tr><td style="border:1px solid #333; padding:8px;" colspan="2">${lessonState.reflection?.strengths || ' '}</td></tr>
                <tr><td style="border:1px solid #333; padding:6px; background:#F3E5F5; font-weight:bold;" colspan="2">نقاط للمعالجة</td></tr>
                <tr><td style="border:1px solid #333; padding:8px;" colspan="2">${lessonState.reflection?.weaknesses || ' '}</td></tr>
            </table>

            ${safeEvalQuestions.length > 0 ? `
            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
                <tr><td style="border:1px solid #333; padding:6px; background:#E8F5E9; font-weight:bold;">أسئلة التقويم</td></tr>
                ${safeEvalQuestions.map((q, i) => `<tr><td style="border:1px solid #333; padding:6px;">${i + 1}. ${q}</td></tr>`).join('')}
            </table>` : ''}

            <p style="text-align:center; font-size:10px; color:#999; margin-top:20px;">تم التصدير بواسطة منصة المعلم الذكي ✨</p>
        `;
        return container;
    };

    // --- IMAGE EXPORT (Snipping Tool Preview) ---
    const exportAsImage = async () => {
        const paperEl = buildPaperHtml();
        document.body.appendChild(paperEl);
        try {
            const canvas = await html2pdf().set({
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            }).from(paperEl).toCanvas();
            const dataUrl = canvas.toDataURL('image/png');
            setSnippingPreviewUrl(dataUrl);
        } finally {
            document.body.removeChild(paperEl);
        }
    };

    const handleSnippingDownload = () => {
        if (!snippingPreviewUrl) return;
        const a = document.createElement('a');
        a.href = snippingPreviewUrl;
        a.download = `تحضير-${lessonState.topic.replace(/\s+/g, '-')}.png`;
        a.click();
    };

    const handleSnippingCopy = async () => {
        if (!snippingPreviewUrl) return;
        try {
            const res = await fetch(snippingPreviewUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            alert('تم نسخ الصورة إلى الحافظة بنجاح! يمكنك لصقها في أي مكان.');
        } catch (err) {
            console.error(err);
            alert('فشل في نسخ الصورة. يرجى تحميلها بدلاً من ذلك.');
        }
    };

    // --- DOCX GENERATION LOGIC ---
    const generateDocx = async () => {
        // --- Helper for Cell Styling ---
        const createCell = (text: string, widthPercent: number, isHeader = false, shading = "") => {
            const shadingConfig = (shading || isHeader) ? {
                fill: shading || "F0F0F0",
                type: ShadingType.CLEAR,
                color: "auto"
            } : undefined;

            return new TableCell({
                width: { size: widthPercent, type: WidthType.PERCENTAGE },
                shading: shadingConfig,
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                },
                children: [
                    new Paragraph({
                        text: text,
                        alignment: isHeader ? AlignmentType.CENTER : AlignmentType.RIGHT,
                        bidirectional: true, // Right-to-Left Text
                        heading: isHeader ? HeadingLevel.HEADING_4 : undefined,
                        spacing: { before: 100, after: 100 },
                    }),
                ],
            });
        };

        const createMergedRow = (label: string, value: string) => {
            return new TableRow({
                children: [
                    new TableCell({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnSpan: 4,
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                            bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                            left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                            right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                        },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${label}: `, bold: true }),
                                    new TextRun({ text: value })
                                ],
                                alignment: AlignmentType.RIGHT,
                                bidirectional: true,
                                spacing: { before: 100, after: 100 },
                            })
                        ]
                    })
                ]
            });
        };

        // 1. Header Table (Date, Day, Grade, etc.)
        const headerTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        createCell(`التاريخ: ${lessonState.date || todayDate}`, 50),
                        createCell(`اليوم: ...............`, 50),
                    ]
                }),
                new TableRow({
                    children: [
                        createCell(`الصف: ${lessonState.grade}`, 50),
                        createCell(`الشعبة: ...............`, 50),
                    ]
                }),
                new TableRow({
                    children: [
                        createCell(`المادة: ${lessonState.subject}`, 50),
                        createCell(`المعلم: ${lessonState.teacherName || '...............'}`, 50),
                    ]
                }),
            ],
        });

        // 2. Info Table (Topic, Resources, Methods, Objectives)
        const infoTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                createMergedRow("الموضوع", lessonState.topic),
                createMergedRow("موارد التعلم", lessonState.resources || "الكتاب المدرسي، السبورة، جهاز عرض، بطاقات"),
                createMergedRow("طرائق التدريس", "الحوار والمناقشة، التعلم النشط، العمل الجماعي، حل المشكلات"),
                createMergedRow("الهدف العام", (lessonState.objectives && lessonState.objectives.length > 0) ? lessonState.objectives[0].text : ""),
            ]
        });

        // 3. Warm-up Table (Prerequisites)
        const safePrerequisites = lessonState.prerequisites || [];
        const warmupTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        createCell("التمهيد والتهيئة", 85, true, "E0F7FA"),
                        createCell("الزمن", 15, true, "E0F7FA"),
                    ]
                }),
                new TableRow({
                    children: [
                        createCell(safePrerequisites.join(" - ") || "مراجعة الدرس السابق", 85),
                        createCell("5 د", 15, true),
                    ]
                })
            ]
        });

        // 4. Main Matrix Table (Time, Outcomes, Path, Evaluation)
        const matrixHeaderRow = new TableRow({
            children: [
                createCell("التقويم", 20, true, "E0E0E0"),
                createCell("مسار الدرس (المعلم والطالب)", 40, true, "E0E0E0"),
                createCell("مخرجات التعلم", 25, true, "E0E0E0"),
                createCell("الزمن", 15, true, "E0E0E0"),
            ]
        });

        const safeProcedures = lessonState.procedures || [];
        const matrixRows = safeProcedures.map(proc => {
            return new TableRow({
                children: [
                    createCell("", 20),
                    createCell(
                        `المعلم: ${proc.teacherRole}\n\nالطالب: ${proc.studentRole}\n\nالاستراتيجية: ${proc.strategy}`,
                        40
                    ),
                    createCell(proc.step, 25),
                    createCell(proc.time || "10 د", 15, true),
                ]
            });
        });

        // Add Closure Row to Matrix
        const closureRow = new TableRow({
            children: [
                createCell("التقويم النهائي", 20, true, "F5F5F5"),
                createCell(lessonState.closureActivity || "", 40),
                createCell("غلق الدرس وتلخيص الأفكار", 25, true, "F5F5F5"),
                createCell("5 د", 15, true),
            ]
        });

        const matrixTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [matrixHeaderRow, ...matrixRows, closureRow],
        });

        // 5. Differentiation Table
        const diffTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        createCell("نشاط للمتعثرين (مساند)", 50, true, "FFF3E0"),
                        createCell("نشاط للمتميزين (إثرائي)", 50, true, "FFF3E0"),
                    ]
                }),
                new TableRow({
                    children: [
                        createCell(lessonState.differentiation?.support || "", 50),
                        createCell(lessonState.differentiation?.enrichment || "", 50),
                    ]
                })
            ]
        });

        // 6. Reflection Table
        const reflectionTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                createMergedRow("المنطقة التأملية (ما بعد التنفيذ)", ""),
                new TableRow({
                    children: [
                        createCell("ملاحظات المعلم", 100, true, "F3E5F5"),
                    ]
                }),
                new TableRow({
                    children: [createCell(lessonState.reflection?.teacherNotes || " ", 100)]
                }),
                new TableRow({
                    children: [
                        createCell("نقاط القوة", 100, true, "F3E5F5"),
                    ]
                }),
                new TableRow({
                    children: [createCell(lessonState.reflection?.strengths || " ", 100)]
                }),
                new TableRow({
                    children: [
                        createCell("نقاط للمعالجة", 100, true, "F3E5F5"),
                    ]
                }),
                new TableRow({
                    children: [createCell(lessonState.reflection?.weaknesses || " ", 100)]
                }),
            ]
        });


        // Assemble Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "سجل تحضير الدرس", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, bidirectional: true }),
                    new Paragraph({ text: "" }),
                    headerTable,
                    new Paragraph({ text: "" }),
                    infoTable,
                    new Paragraph({ text: "" }),
                    warmupTable,
                    new Paragraph({ text: "" }),
                    matrixTable,
                    new Paragraph({ text: "" }),
                    diffTable,
                    new Paragraph({ text: "" }),
                    reflectionTable,
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "تم التصدير بواسطة منصة المعلم الذكي", alignment: AlignmentType.CENTER, style: "Disabled" }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `تحضير-${lessonState.topic.replace(/\s+/g, '-')}.docx`);
    };

    const generatePptx = async () => {
        const pres = new PptxGenJS();
        pres.rtlMode = true;
        pres.layout = 'LAYOUT_16x9';
        pres.defineSlideMaster({
            title: "MASTER", background: { color: "F1F5F9" },
            objects: [{ rect: { x: 0, y: "90%", w: "100%", h: "10%", fill: { color: "0F766E" } } }]
        });
        let slide = pres.addSlide({ masterName: "MASTER" });
        slide.addText(lessonState.topic, { x: 0, y: 1.5, w: "100%", h: 1, fontSize: 44, bold: true, align: "center", color: "1E293B" });

        const safeSlides = lessonState.slides || [];
        safeSlides.forEach((s: any) => {
            slide = pres.addSlide({ masterName: "MASTER" });
            slide.addText(s.title, { x: "5%", y: 0.4, w: "90%", h: 0.6, fontSize: 28, bold: true, color: "1E293B", align: "right" });
            if (s.imageUrl) slide.addImage({ data: s.imageUrl, x: "15%", y: 1.2, w: "70%", h: 3.5, sizing: { type: "contain", w: "70%", h: 3.5 } });
            slide.addText(s.narration, { x: "10%", y: 5, w: "80%", h: 1.5, fontSize: 16, color: "475569", align: "center" });
        });
        pres.writeFile({ fileName: `lesson-${lessonState.topic}.pptx` });
    };

    // --- Render Component ---
    return (
        <div className="w-full h-screen bg-slate-950 overflow-hidden flex flex-col font-sans text-slate-100 relative">

            {/* 1. Background Grid (HUD Effect) */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>
            {/* Glowing Orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* 2. Top Header */}
            <div className="relative z-20 flex-none h-auto p-4 md:p-6 pb-2">
                <div className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center relative overflow-hidden group shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    <div className="flex-1 text-right w-full md:w-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl md:text-2xl font-bold text-slate-100">
                                عنوان الدرس: {lessonState.topic}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 text-xs md:text-sm font-mono text-slate-400">
                            <span>البيانات الوصفية: المعلم: {lessonState.teacherName || '...'} | الصف: {lessonState.grade} | المادة: {lessonState.subject} | التاريخ: {lessonState.date || todayDate}</span>
                        </div>
                    </div>

                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        {onSave && (
                            <button
                                onClick={() => onSave({ ...lessonState, assets: smartAssets })}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold"
                                title="حفظ في المصادر"
                            >
                                <Save size={14} />
                                حفظ
                            </button>
                        )}
                        {onSchedule && (
                            <button
                                onClick={onSchedule}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-white transition-all text-xs font-bold"
                                title="جدولة في التقويم"
                            >
                                <CalendarDays size={14} />
                                جدولة
                            </button>
                        )}
                        <button onClick={onBack} className="p-2 rounded-lg border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-500 transition-all bg-slate-950/50">
                            <ArrowLeft size={20} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Main Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 pt-2 gap-6 relative z-10">

                {/* --- Sidebar (Lesson Slides) --- */}
                <div className="w-full md:w-80 flex-none flex flex-col h-full">
                    <div className="bg-slate-900/40 backdrop-blur-sm border border-amber-500/30 rounded-2xl flex flex-col h-full shadow-[0_0_15px_rgba(245,158,11,0.05)] overflow-hidden">
                        <div className="p-4 border-b border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent text-center">
                            <h3 className="font-bold text-lg text-slate-100">شرائح الدرس</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {/* Overview Item */}
                            <div
                                onClick={() => setActiveSection('overview')}
                                className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden ${activeSection === 'overview'
                                    ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-10 rounded bg-slate-950/50 flex items-center justify-center border border-white/5">
                                        <LayoutTemplate size={20} className={activeSection === 'overview' ? 'text-amber-400' : 'text-slate-500'} />
                                    </div>
                                    <div className="text-right flex-1">
                                        <h4 className={`text-sm font-bold ${activeSection === 'overview' ? 'text-white' : 'text-slate-300'}`}>نظرة عامة</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">ملخص وأهداف</p>
                                    </div>
                                </div>
                            </div>
                            {/* Smart Assets Item (NotebookLM Style) */}
                            <div
                                onClick={() => setActiveSection('assets')}
                                className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden ${activeSection === 'assets'
                                    ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-10 rounded bg-slate-950/50 flex items-center justify-center border border-white/5">
                                        <BrainCircuit size={20} className={activeSection === 'assets' ? 'text-amber-400' : 'text-slate-500'} />
                                    </div>
                                    <div className="text-right flex-1">
                                        <h4 className={`text-sm font-bold ${activeSection === 'assets' ? 'text-white' : 'text-slate-300'}`}>المصادر الذكية</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">اختبار، بطاقات، ذهنية...</p>
                                    </div>
                                </div>
                            </div>

                            {/* Slides Loop */}
                            {lessonState.slides.map((slide, idx) => {
                                const isActive = activeSection === idx;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setActiveSection(idx)}
                                        className={`relative p-2 rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden ${isActive
                                            ? 'bg-slate-800 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                            : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-20 h-12 flex-none bg-black rounded-lg border border-slate-600 overflow-hidden">
                                                {slide.imageUrl ? (
                                                    <img src={slide.imageUrl} className="w-full h-full object-cover opacity-80" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                        {getSlideIcon(slide.title, slide.slideNumber)}
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 right-0 bg-slate-900/80 px-1 text-[9px] text-amber-500 font-mono border-tl-lg">0{slide.slideNumber}</div>
                                            </div>
                                            <div className="flex-1 text-right min-w-0">
                                                <h4 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{slide.title}</h4>
                                                <p className="text-[10px] text-slate-500 font-mono truncate">({slide.duration} د) {idx === 0 ? 'مقدمة' : 'شريحة'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex-1 flex flex-col h-full gap-4">
                    <div id="lesson-content-area" className="flex-1 bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-2xl relative overflow-hidden shadow-2xl flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

                        {/* --- VIEW: OVERVIEW (Summary & Objectives) --- */}
                        {activeSection === 'overview' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 animate-in fade-in slide-in-from-bottom-2 space-y-6">

                                {/* 1. Lesson Summary Card */}
                                <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/5 relative group">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-amber-500/50"></div>
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                                        <div className="flex items-center gap-3 text-slate-200 font-bold text-lg">
                                            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                                                <FileText size={18} />
                                            </div>
                                            ملخص الدرس
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="text-right">
                                                <h2 className="text-2xl font-bold text-slate-100 mb-1 tracking-tight">{lessonState.topic}</h2>
                                                <div className="flex gap-4 text-xs font-mono text-slate-400">
                                                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{lessonState.subject}</span>
                                                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{lessonState.grade}</span>
                                                </div>
                                            </div>
                                            <div className="text-left text-[10px] text-slate-500 font-mono border border-slate-700 px-2 py-1 rounded bg-slate-900">
                                                {lessonState.date || todayDate}
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold text-amber-500 mb-3 flex items-center gap-2 uppercase tracking-widest font-mono">
                                                <Layers size={12} /> تسلسل الأحداث (اضغط للتفاصيل)
                                            </h4>
                                            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                                {lessonState.procedures.slice(0, 5).map((proc, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setActiveProcedure(proc)}
                                                        className="flex-none bg-slate-800/50 border border-slate-700 rounded-lg p-3 w-40 text-center relative group/step hover:border-amber-500/50 hover:bg-slate-800 transition-all cursor-pointer"
                                                    >
                                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover/step:text-amber-500 group-hover/step:border-amber-500">
                                                            {i + 1}
                                                        </div>
                                                        <span className="block font-bold mb-1 text-slate-200 text-xs truncate">{proc.step}</span>
                                                        <span className="text-[10px] text-slate-500 block truncate">{proc.strategy}</span>
                                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 scale-x-0 group-hover/step:scale-x-100 transition-transform origin-left rounded-b-lg"></div>
                                                    </div>
                                                ))}
                                                {lessonState.procedures.length > 5 && (
                                                    <div className="flex-none flex items-center justify-center bg-slate-800/30 border border-slate-700 rounded-lg w-12 text-slate-500 text-xs hover:text-white hover:bg-slate-800 cursor-pointer">...</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {lessonState.closureActivity && (
                                                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
                                                    <h4 className="text-green-400 font-bold text-xs mb-2 flex items-center gap-2 uppercase tracking-widest font-mono">
                                                        <Flag size={12} /> الخاتمة
                                                    </h4>
                                                    <p className="text-slate-300 text-sm leading-relaxed">{lessonState.closureActivity}</p>
                                                </div>
                                            )}

                                            {lessonState.smartGuide && (
                                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                                    <h4 className="text-blue-400 font-bold text-xs mb-2 flex items-center gap-2 uppercase tracking-widest font-mono">
                                                        <Lightbulb size={12} /> دليل المعلم الذكي
                                                    </h4>
                                                    <p className="text-slate-300 text-sm leading-relaxed">{lessonState.smartGuide.valueAdded}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Objectives Card */}
                                <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/5 relative">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/50"></div>
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                                        <div className="flex items-center gap-3 text-slate-200 font-bold text-lg">
                                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
                                                <Target size={18} />
                                            </div>
                                            أهداف الدرس
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500">مصفوفة الأهداف</div>
                                    </div>
                                    <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2">
                                        {lessonState.objectives.map((obj, i) => (
                                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-l-0 border-t-0 border-b-0 border-r-4 transition-all hover:bg-slate-800/60 ${getDomainColor(obj.domain)}`}>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[10px] font-mono opacity-70 uppercase tracking-wider">{getDomainLabel(obj.domain)}</span>
                                                    </div>
                                                    <p className="text-slate-300 text-sm leading-relaxed font-medium">{obj.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Detailed Matrix Table */}
                                <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/5 relative">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-purple-500/50"></div>
                                    <div className="p-4 border-b border-white/5 bg-slate-950/50 text-slate-200 font-bold text-lg flex items-center gap-3">
                                        <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500 border border-purple-500/20">
                                            <Book size={18} />
                                        </div>
                                        مصفوفة الإجراءات التفصيلية
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-slate-900/80 text-slate-400 font-bold text-xs uppercase tracking-wider font-mono">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-800">المرحلة</th>
                                                    <th className="p-4 border-b border-slate-800">دور المعلم</th>
                                                    <th className="p-4 border-b border-slate-800">دور المتعلم</th>
                                                    <th className="p-4 border-b border-slate-800">الطريقة / الزمن</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {lessonState.procedures.map((proc, i) => (
                                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="p-4 text-amber-500 font-bold whitespace-nowrap align-top">{proc.step}</td>
                                                        <td className="p-4 text-slate-300 align-top leading-relaxed">{proc.teacherRole}</td>
                                                        <td className="p-4 text-slate-400 align-top leading-relaxed">{proc.studentRole}</td>
                                                        <td className="p-4 align-top">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700 text-center">{proc.strategy}</span>
                                                                {proc.time && <span className="text-[10px] text-slate-500 font-mono text-center">{proc.time}</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="h-10"></div>
                            </div>
                        )}

                        {/* --- VIEW: SMART ASSETS (NotebookLM Style) --- */}
                        {activeSection === 'assets' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                <div className="flex items-center gap-3 mb-6 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                                        <BrainCircuit size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-100">المصادر الذكية</h2>
                                        <p className="text-sm text-slate-400 font-mono">توليد محتوى تفاعلي إضافي باستخدام الذكاء الاصطناعي</p>
                                    </div>
                                </div>

                                {assetError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertTriangle size={20} />
                                        <span>{assetError}</span>
                                        <button onClick={() => setAssetError(null)} className="mr-auto hover:text-white transition-colors"><X size={16} /></button>
                                    </div>
                                )}

                                {!activeSmartAsset ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                        {/* Quiz Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><CheckCircle size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><CheckCircle size={24} /></div>
                                                {smartAssets.quiz && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">اختبار تفاعلي</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">توليد 5 أسئلة متعددة الخيارات مع الشرح.</p>

                                            {smartAssets.quiz ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('quiz')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('quiz')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل DOCX"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('quiz')} disabled={generatingAsset === 'quiz'} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                                                    {generatingAsset === 'quiz' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>

                                        {/* Flashcards Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><Layers size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg"><Layers size={24} /></div>
                                                {smartAssets.flashcards && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">بطاقات الذاكرة</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">8 بطاقات للمراجعة (المفهوم والتعريف).</p>

                                            {smartAssets.flashcards ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('flashcards')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('flashcards')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل DOCX"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('flashcards')} disabled={generatingAsset === 'flashcards'} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20">
                                                    {generatingAsset === 'flashcards' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>

                                        {/* Mind Map Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><BrainCircuit size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><BrainCircuit size={24} /></div>
                                                {smartAssets.mindMap && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">الخريطة الذهنية</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">خريطة مفاهيمية تلخص الدرس.</p>

                                            {smartAssets.mindMap ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('mindmap')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('mindmap')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل Mermaid"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('mindmap')} disabled={generatingAsset === 'mindmap'} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                                                    {generatingAsset === 'mindmap' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>

                                        {/* Podcast Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><Mic size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg"><Mic size={24} /></div>
                                                {smartAssets.podcast && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">بودكاست تعليمي</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">سيناريو حوار صوتي بين شخصين حول الدرس.</p>

                                            {smartAssets.podcast ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('podcast')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('podcast')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل Script"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('podcast')} disabled={generatingAsset === 'podcast'} className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20">
                                                    {generatingAsset === 'podcast' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>

                                        {/* Infographic Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><PieChart size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg"><PieChart size={24} /></div>
                                                {smartAssets.infographic && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">إنفوجرافيك</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">تصميم بصري للمعلومات الأساسية.</p>

                                            {smartAssets.infographic ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('infographic')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('infographic')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل PDF"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('infographic')} disabled={generatingAsset === 'infographic'} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
                                                    {generatingAsset === 'infographic' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>

                                        {/* Video Script Card */}
                                        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"><Video size={100} /></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><Video size={24} /></div>
                                                {smartAssets.videoScript && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/30">جاهز</span>}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-200 mb-2">فيديو تعليمي</h3>
                                            <p className="text-sm text-slate-400 mb-6 flex-1">سيناريو فيديو (بصري + صوتي).</p>

                                            {smartAssets.videoScript ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setActiveSmartAsset('video')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600">عرض</button>
                                                    <button onClick={() => handleDownloadAsset('video')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all border border-slate-600" title="تنزيل Script"><Download size={18} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleGenerateAsset('video')} disabled={generatingAsset === 'video'} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20">
                                                    {generatingAsset === 'video' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} توليد
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 relative min-h-[400px] animate-in fade-in zoom-in-95">
                                        <button onClick={() => setActiveSmartAsset(null)} className="sticky top-0 left-0 p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-700 hover:border-amber-500/30 transition-all flex items-center gap-2 text-sm font-bold z-10 shadow-lg">
                                            <ArrowLeft size={16} /> عودة
                                        </button>

                                        {/* DETAILS RENDERING LOGIC */}
                                        {activeSmartAsset === 'quiz' && smartAssets.quiz && (
                                            <div className="max-w-3xl mx-auto pt-4">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2"><CheckCircle /> اختبار: {lessonState.topic}</h3>
                                                    <button onClick={() => handleDownloadAsset('quiz')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-700 hover:text-white transition-colors"><Download size={16} /> تنزيل DOCX</button>
                                                </div>
                                                <div className="space-y-6">
                                                    {smartAssets.quiz.map((q, i) => (
                                                        <div key={i} className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                                                            <h4 className="font-bold text-lg mb-4 text-white flex gap-3"><span className="text-slate-600">{i + 1}.</span> {q.text}</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                                {q.options.map((opt, oid) => (
                                                                    <div key={oid} className={`p-3 rounded-lg border text-sm transition-colors ${oid === q.correctAnswer ? 'bg-green-500/10 border-green-500/50 text-green-300 font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                                                                        {opt}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 text-blue-300 text-sm flex gap-2">
                                                                <span className="font-bold flex-none text-blue-400">💡 الشرح: </span><span>{q.explanation}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeSmartAsset === 'flashcards' && smartAssets.flashcards && (
                                            <div className="max-w-4xl mx-auto pt-4">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Layers /> بطاقات الذاكرة</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => { setFlashcardStudyMode(!flashcardStudyMode); setActiveFlashcardIndex(0); setFlashcardFlipped(false); }} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 border transition-all ${flashcardStudyMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-purple-600 border-purple-500 text-white'}`}>
                                                            {flashcardStudyMode ? <><GridIcon size={14} /> عرض شبكي</> : <><Play size={14} /> وضع الدراسة</>}
                                                        </button>
                                                        <button onClick={() => handleDownloadAsset('flashcards')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-slate-700 hover:text-white transition-colors"><Download size={14} /> تنزيل</button>
                                                    </div>
                                                </div>

                                                {!flashcardStudyMode ? (
                                                    /* --- Grid View --- */
                                                    <>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            {smartAssets.flashcards.map((card, i) => (
                                                                <div key={i} onClick={() => { setActiveFlashcardIndex(i); setFlashcardStudyMode(true); setFlashcardFlipped(false); }} className="aspect-[3/2] perspective-1000 group cursor-pointer relative h-64">
                                                                    <div className="relative w-full h-full duration-700 transform-style-3d group-hover:rotate-y-180 transition-transform">
                                                                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 rounded-xl flex items-center justify-center p-6 text-center shadow-xl hover:shadow-purple-500/10 transition-shadow">
                                                                            <h4 className="text-xl font-bold text-white leading-relaxed">{card.front}</h4>
                                                                            <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">{i + 1}</div>
                                                                            <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">المفهوم</div>
                                                                        </div>
                                                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border-2 border-purple-500 rounded-xl flex items-center justify-center p-6 text-center shadow-xl overflow-y-auto custom-scrollbar">
                                                                            <div className="flex flex-col items-center justify-center h-full">
                                                                                <p className="text-lg text-purple-100 font-medium leading-relaxed">{card.back}</p>
                                                                                <div className="absolute bottom-3 right-3 text-[10px] text-purple-300 uppercase tracking-widest font-bold">التعريف</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-center text-slate-500 mt-8 text-sm">مرر الماوس فوق البطاقة لقلبها • انقر للدراسة</p>
                                                    </>
                                                ) : (
                                                    /* --- Study Mode (Carousel) --- */
                                                    <div className="flex flex-col items-center gap-6">
                                                        {/* Progress */}
                                                        <div className="flex items-center gap-2 w-full max-w-md">
                                                            <span className="text-xs text-slate-500 font-mono">{activeFlashcardIndex + 1}/{smartAssets.flashcards.length}</span>
                                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${((activeFlashcardIndex + 1) / smartAssets.flashcards.length) * 100}%` }} />
                                                            </div>
                                                        </div>

                                                        {/* Card */}
                                                        <div onClick={() => setFlashcardFlipped(!flashcardFlipped)} className="w-full max-w-lg aspect-[3/2] perspective-1000 cursor-pointer select-none">
                                                            <div className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${flashcardFlipped ? 'rotate-y-180' : ''}`}>
                                                                {/* Front */}
                                                                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border-2 border-purple-500/40 rounded-2xl flex flex-col items-center justify-center p-10 text-center shadow-2xl shadow-purple-500/5">
                                                                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">{activeFlashcardIndex + 1}</div>
                                                                    <h4 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">{smartAssets.flashcards[activeFlashcardIndex].front}</h4>
                                                                    <p className="absolute bottom-4 text-[11px] text-slate-500 uppercase tracking-widest">انقر لقلب البطاقة</p>
                                                                </div>
                                                                {/* Back */}
                                                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 border-2 border-purple-400 rounded-2xl flex flex-col items-center justify-center p-10 text-center shadow-2xl overflow-y-auto custom-scrollbar">
                                                                    <p className="text-xl md:text-2xl text-purple-100 font-medium leading-relaxed">{smartAssets.flashcards[activeFlashcardIndex].back}</p>
                                                                    <p className="absolute bottom-4 text-[11px] text-purple-300 uppercase tracking-widest">التعريف</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Navigation */}
                                                        <div className="flex items-center gap-4">
                                                            <button disabled={activeFlashcardIndex === 0} onClick={() => { setActiveFlashcardIndex(activeFlashcardIndex - 1); setFlashcardFlipped(false); }} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"><ChevronRight size={20} /></button>
                                                            <button onClick={() => setFlashcardFlipped(false)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-all" title="إعادة تعيين"><RotateCcw size={16} /></button>
                                                            <button disabled={activeFlashcardIndex === smartAssets.flashcards.length - 1} onClick={() => { setActiveFlashcardIndex(activeFlashcardIndex + 1); setFlashcardFlipped(false); }} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110"><ChevronLeft size={20} /></button>
                                                        </div>

                                                        {/* Dot Indicators */}
                                                        <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
                                                            {smartAssets.flashcards.map((_, i) => (
                                                                <button key={i} onClick={() => { setActiveFlashcardIndex(i); setFlashcardFlipped(false); }} className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeFlashcardIndex ? 'bg-purple-400 scale-125' : 'bg-slate-700 hover:bg-slate-600'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeSmartAsset === 'mindmap' && smartAssets.mindMap && (
                                            <div className="pt-4 h-full flex flex-col">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><BrainCircuit /> الخريطة الذهنية</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => { navigator.clipboard.writeText(smartAssets.mindMap || ""); alert("تم النسخ!"); }} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-slate-700 hover:text-white transition-colors"><Copy size={14} /> نسخ الكود</button>
                                                        <button onClick={() => handleDownloadAsset('mindmap')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-slate-700 hover:text-white transition-colors"><Download size={14} /> تنزيل</button>
                                                    </div>
                                                </div>
                                                {/* Rendered Mermaid Diagram */}
                                                <div className="flex-1 bg-slate-950 rounded-xl border border-emerald-500/30 overflow-auto min-h-[400px] flex items-center justify-center p-4">
                                                    <div ref={mermaidRef} className="mermaid-container w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto" />
                                                </div>
                                                <p className="mt-4 text-xs text-slate-500 text-center">يتم عرض الخريطة الذهنية تلقائياً • يمكنك نسخ الكود واستخدامه في Mermaid Live Editor</p>
                                            </div>
                                        )}

                                        {activeSmartAsset === 'podcast' && smartAssets.podcast && (
                                            <div className="max-w-3xl mx-auto pt-4">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2"><Mic /> {smartAssets.podcast.title} <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{smartAssets.podcast.duration}</span></h3>
                                                    <button onClick={() => handleDownloadAsset('podcast')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-700 hover:text-white transition-colors"><Download size={16} /> تنزيل DOCX</button>
                                                </div>
                                                <div className="space-y-4">
                                                    {smartAssets.podcast.script.map((line, i) => (
                                                        <div key={i} className={`flex gap-4 p-4 rounded-xl ${line.speaker.includes('A') || line.speaker.includes('1') ? 'bg-slate-800/80 mr-12 rounded-tr-none' : 'bg-rose-900/10 ml-12 border border-rose-500/20 rounded-tl-none'}`}>
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-none shadow-lg ${line.speaker.includes('A') || line.speaker.includes('1') ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'}`}>
                                                                {line.speaker.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1">{line.speaker}</div>
                                                                <p className="text-slate-200 leading-relaxed text-base">{line.text}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeSmartAsset === 'infographic' && smartAssets.infographic && (
                                            <div className="max-w-xl mx-auto pt-4">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2"><PieChart /> إنفوجرافيك الدرس</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleDownloadAsset('infographic')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-slate-700 hover:text-white transition-colors"><Camera size={14} /> تنزيل صورة</button>
                                                    </div>
                                                </div>
                                                <div id="infographic-container" className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                                                    {/* Header */}
                                                    <div className="relative bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white p-10 text-center overflow-hidden">
                                                        <div className="absolute inset-0 opacity-10">
                                                            <div className="absolute top-4 left-4 w-32 h-32 border-2 border-white rounded-full" />
                                                            <div className="absolute bottom-4 right-4 w-24 h-24 border-2 border-white rounded-full" />
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white rounded-full" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                                                                <Sparkles size={12} /> {lessonState.grade}
                                                            </div>
                                                            <h1 className="text-3xl md:text-4xl font-black mb-2 leading-tight">{lessonState.topic}</h1>
                                                            <p className="text-cyan-100 text-sm">منصة المعلم الذكي</p>
                                                        </div>
                                                    </div>

                                                    {/* Sections */}
                                                    <div className="relative px-6 py-8">
                                                        {/* Vertical Timeline */}
                                                        <div className="absolute left-[2.75rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-400 via-blue-400 to-indigo-400 z-0" />

                                                        <div className="space-y-6">
                                                            {smartAssets.infographic.map((sec, i) => {
                                                                const colors = [
                                                                    { bg: 'bg-cyan-500', ring: 'ring-cyan-200', border: 'border-cyan-100', accent: 'text-cyan-600' },
                                                                    { bg: 'bg-blue-500', ring: 'ring-blue-200', border: 'border-blue-100', accent: 'text-blue-600' },
                                                                    { bg: 'bg-indigo-500', ring: 'ring-indigo-200', border: 'border-indigo-100', accent: 'text-indigo-600' },
                                                                    { bg: 'bg-violet-500', ring: 'ring-violet-200', border: 'border-violet-100', accent: 'text-violet-600' },
                                                                    { bg: 'bg-purple-500', ring: 'ring-purple-200', border: 'border-purple-100', accent: 'text-purple-600' },
                                                                    { bg: 'bg-teal-500', ring: 'ring-teal-200', border: 'border-teal-100', accent: 'text-teal-600' },
                                                                ];
                                                                const c = colors[i % colors.length];
                                                                return (
                                                                    <div key={i} className="flex items-start gap-5 relative z-10">
                                                                        {/* Number Badge */}
                                                                        <div className={`w-14 h-14 rounded-xl ${c.bg} ring-4 ${c.ring} flex items-center justify-center text-white font-black text-lg shadow-lg flex-none`}>
                                                                            {String(i + 1).padStart(2, '0')}
                                                                        </div>
                                                                        {/* Content Card */}
                                                                        <div className={`flex-1 bg-white border-2 ${c.border} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                                                                            <h4 className={`font-bold text-lg mb-2 ${c.accent}`}>{sec.title}</h4>
                                                                            <p className="text-slate-600 leading-relaxed text-sm">{sec.content}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 text-center">
                                                        <div className="flex items-center justify-center gap-3 text-xs">
                                                            <BrainCircuit size={16} className="text-cyan-400" />
                                                            <span className="text-slate-400">منصة المعلم الذكي • Smart Teacher Platform</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeSmartAsset === 'video' && smartAssets.videoScript && (
                                            <div className="max-w-5xl mx-auto pt-4">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2"><Video /> سيناريو الفيديو</h3>
                                                    <button onClick={() => handleDownloadAsset('video')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-700 hover:text-white transition-colors"><Download size={16} /> تنزيل DOCX</button>
                                                </div>
                                                <div className="border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                                                    <table className="w-full text-right bg-slate-900">
                                                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider">
                                                            <tr>
                                                                <th className="p-4 w-16 text-center">#</th>
                                                                <th className="p-4 w-24 text-center">الزمن</th>
                                                                <th className="p-4 w-[40%]">المشهد البصري (Visual)</th>
                                                                <th className="p-4">الصوت (Voiceover)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {smartAssets.videoScript.map((scene, i) => (
                                                                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                                                                    <td className="p-4 font-bold text-orange-500 text-center bg-slate-900/50">{scene.sceneNumber}</td>
                                                                    <td className="p-4 font-mono text-xs text-slate-500 text-center">{scene.duration}</td>
                                                                    <td className="p-4 text-xs text-slate-400 font-mono leading-relaxed bg-slate-950/30 italic" dir="ltr">{scene.visual}</td>
                                                                    <td className="p-4 text-slate-200 leading-relaxed font-medium">{scene.audio}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: SLIDE DETAILS --- */}
                        {typeof activeSection === 'number' && (
                            <div className="flex-1 flex flex-col p-6 animate-in fade-in relative h-full overflow-hidden">
                                {(() => {
                                    const slide = lessonState.slides[activeSection];
                                    const isEditing = editingSlideId === slide.slideNumber;
                                    const data = (isEditing && tempSlideData) ? tempSlideData : slide;

                                    return (
                                        <div className="flex-1 flex flex-col gap-4 h-full">
                                            <div className="flex justify-between items-center border-b border-slate-700 pb-2 flex-none">
                                                <h2 className="text-xl font-bold text-amber-500">{data.title}</h2>
                                                <div className="flex gap-2">
                                                    {!isEditing ? (
                                                        <button onClick={() => handleEditStart(slide)} className="text-xs flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-600 hover:border-white transition-colors"><Edit3 size={12} /> تعديل</button>
                                                    ) : (
                                                        <>
                                                            <button onClick={confirmSaveSlide} className="text-xs bg-green-600 px-3 py-1 rounded-full text-white"><Save size={12} /></button>
                                                            <button onClick={handleEditCancel} className="text-xs bg-red-600 px-3 py-1 rounded-full text-white"><X size={12} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                                                <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-2">
                                                    <div className="bg-slate-800/20 rounded-xl border border-slate-700 p-4 relative flex-shrink-0">
                                                        <div className="text-[10px] text-amber-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                                                            <MessageSquare size={14} /> سيناريو المعلم (الشرح)
                                                        </div>
                                                        {isEditing ? (
                                                            <textarea className="w-full h-32 bg-slate-900/50 text-slate-200 text-sm p-3 rounded border border-slate-600 focus:border-amber-500 outline-none resize-none leading-relaxed" value={data.narration} onChange={(e) => handleTempChange('narration', e.target.value)} />
                                                        ) : (
                                                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{data.narration}</p>
                                                        )}
                                                    </div>
                                                    <div className="bg-slate-800/20 rounded-xl border border-slate-700 p-4 relative flex-shrink-0">
                                                        <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                                                            <ScanEye size={14} /> وصف الصورة (للذكاء الاصطناعي)
                                                        </div>
                                                        {isEditing ? (
                                                            <textarea className="w-full h-24 bg-slate-900/50 text-slate-300 text-xs p-3 rounded border border-blue-500/30 focus:border-blue-500 outline-none resize-none font-mono leading-relaxed" value={data.visualDescription} onChange={(e) => handleTempChange('visualDescription', e.target.value)} style={{ textAlign: 'right' }} />
                                                        ) : (
                                                            <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-900/30 p-2 rounded border border-white/5">{data.visualDescription}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col h-full gap-4">
                                                    <div className="flex-1 bg-black/40 rounded-xl border border-slate-700 relative overflow-hidden group flex items-center justify-center">
                                                        {(data.imageUrl || imgLoadError) ? (
                                                            <img
                                                                src={imgLoadError ? "/fallback-slide.svg" : data.imageUrl}
                                                                className={`max-w-full max-h-full object-contain shadow-2xl ${imgLoadError ? 'opacity-90' : 'cursor-zoom-in'}`}
                                                                onClick={() => !imgLoadError && setZoomedImage(data.imageUrl || null)}
                                                                onError={(e) => {
                                                                    if (!imgLoadError) {
                                                                        console.warn("Image Load Failed, switching to local fallback");
                                                                        setImgLoadError(true);
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-slate-600 text-center p-4">
                                                                {(imageError || imgLoadError) ? (
                                                                    <>
                                                                        <AlertTriangle size={32} className="mb-2 text-amber-500 opacity-80" />
                                                                        <span className="text-xs text-amber-500">
                                                                            {imgLoadError ? "فشل تحميل الصورة (الرابط منتهي الصلاحية أو محظور)" : imageError}
                                                                        </span>
                                                                        {imgLoadError && <span className="text-[10px] text-slate-500 mt-1">حاول "إعادة التوليد"</span>}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                                                        <span className="text-xs">لا توجد صورة مولدة</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                            {data.imageUrl && (
                                                                <button onClick={() => handleCopyImage(data.imageUrl!)} className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 rounded-lg hover:text-white hover:bg-slate-800 border border-slate-700 transition-all shadow-lg transform translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-300 delay-75"><Copy size={18} /></button>
                                                            )}
                                                            {data.imageUrl && (
                                                                <button onClick={() => setZoomedImage(data.imageUrl!)} className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 rounded-lg hover:text-white hover:bg-slate-800 border border-slate-700 transition-all shadow-lg transform translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-300 delay-100"><ZoomIn size={18} /></button>
                                                            )}
                                                        </div>
                                                        <div className="absolute bottom-4 right-4 z-10">
                                                            <button
                                                                onClick={() => handleRegenerateImage(activeSection, data.visualDescription)}
                                                                disabled={generatingImageId !== null}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${generatingImageId === slide.slideNumber
                                                                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                                                    : 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                                                                    }`}
                                                            >
                                                                {generatingImageId === slide.slideNumber ? (
                                                                    <>
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                        <span>جاري التوليد...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <RefreshCw size={14} />
                                                                        <span>{data.imageUrl ? 'إعادة التوليد' : 'توليد الصورة'}</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="h-24 flex flex-col md:flex-row items-center justify-center gap-4 border-t border-slate-800/50 pt-4 mt-2">
                        <div className="flex gap-4">
                            <button onClick={onSimulation} className="px-6 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 group">
                                <FlaskConical size={18} className="group-hover:rotate-12 transition-transform" />
                                <span>المحاكاة التفاعلية</span>
                            </button>
                            <button onClick={onGamification} className="px-6 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow-lg hover:shadow-purple-500/20 flex items-center gap-2 group">
                                <Gamepad2 size={18} className="group-hover:scale-110 transition-transform" />
                                <span>التلعيب والاختبارات</span>
                            </button>
                            <button onClick={onSongs} className="px-6 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-rose-500/20 flex items-center gap-2 group">
                                <Music size={18} className="group-hover:animate-bounce" />
                                <span>الأناشيد والقصص</span>
                            </button>
                        </div>
                        <div className="w-px h-10 bg-slate-700 hidden md:block mx-4"></div>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <button onClick={() => handleExportClick('pptx')} className="px-5 py-3 rounded-xl border border-amber-500 bg-amber-500/10 text-amber-500 font-bold hover:bg-amber-500 hover:text-slate-900 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 active:scale-95 text-sm">
                                <Presentation size={16} /><span>PPT</span>
                            </button>
                            <button onClick={() => handleExportClick('docx')} className="px-5 py-3 rounded-xl border border-slate-600 bg-slate-800/50 text-slate-300 font-bold hover:bg-slate-700 hover:text-white transition-all shadow-lg flex items-center gap-2 active:scale-95 text-sm">
                                <FileText size={16} /><span>Word</span>
                            </button>
                            <button onClick={() => handleExportClick('image')} className="px-5 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2 active:scale-95 text-sm">
                                <Camera size={16} /><span>صورة</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {confirmExportType && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-96 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"></div>
                        <div className="flex items-center gap-3 mb-4 text-amber-500"><AlertTriangle size={28} /><h3 className="text-xl font-bold text-white">تأكيد التصدير</h3></div>
                        <p className="text-slate-400 mb-6 text-sm leading-relaxed">هل أنت متأكد من رغبتك في تصدير الدرس بصيغة {confirmExportType === 'docx' ? 'Word Document' : confirmExportType === 'pptx' ? 'PowerPoint Presentation' : 'صورة PNG'}؟<br /><span className="text-xs text-slate-500 block mt-1">قد تستغرق العملية بضع ثوانٍ لتجهيز الملف.</span></p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmExportType(null)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-bold">إلغاء</button>
                            <button onClick={executeExport} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg text-sm font-bold">تأكيد وتحميل</button>
                        </div>
                    </div>
                </div>
            )}

            {activeProcedure && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600"></div>

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{activeProcedure.step}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"><Clock size={10} /> {activeProcedure.time || '10 دقائق'}</span>
                                        <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"><Zap size={10} /> {activeProcedure.strategy}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveProcedure(null)}
                                className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 group hover:border-blue-500/30 transition-colors">
                                <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2 uppercase tracking-widest">
                                    <GraduationCap size={14} /> دور المعلم
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeProcedure.teacherRole}</p>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 group hover:border-green-500/30 transition-colors">
                                <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2 uppercase tracking-widest">
                                    <User size={14} /> دور المتعلم
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeProcedure.studentRole}</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
                            <button
                                onClick={() => setActiveProcedure(null)}
                                className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors shadow-lg"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex items-center justify-center p-8 animate-in fade-in" onClick={() => setZoomedImage(null)}>
                    <img src={zoomedImage} className="max-w-full max-h-full rounded shadow-2xl border border-amber-500/50" />
                </div>
            )}

            {/* Snipping Tool Preview Modal */}
            {snippingPreviewUrl && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"></div>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center flex-none">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
                                    <Camera size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">أداة القص والنسخ</h3>
                                    <p className="text-[10px] text-slate-400 font-mono">Snipping Tool - يمكنك تحميل أو نسخ الصورة</p>
                                </div>
                            </div>
                            <button onClick={() => setSnippingPreviewUrl(null)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        {/* Image Preview */}
                        <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-950/30 custom-scrollbar">
                            <img src={snippingPreviewUrl} className="max-w-full rounded-lg shadow-2xl border border-slate-700" alt="Lesson Preview" />
                        </div>
                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-center gap-4 flex-none">
                            <button
                                onClick={handleSnippingCopy}
                                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                            >
                                <Copy size={16} />
                                نسخ إلى الحافظة
                            </button>
                            <button
                                onClick={handleSnippingDownload}
                                className="px-6 py-3 rounded-xl border border-slate-600 bg-slate-800/50 text-slate-300 font-bold flex items-center gap-2 hover:bg-slate-700 hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                <Download size={16} />
                                تحميل كصورة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
            `}</style>
        </div>
    );
};