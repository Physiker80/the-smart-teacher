
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateGameScenario, generateSlideImage } from '../services/geminiService';
import { GameScenario } from '../types';
// @ts-ignore
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun } from "docx";
// @ts-ignore
import FileSaver from "file-saver";
// @ts-ignore
import PptxGenJS from "pptxgenjs";
// @ts-ignore
import html2pdf from "html2pdf.js";

import { Gamepad2, Loader2, Sparkles, Send, ArrowRight, Target, HelpCircle, Trophy, Play, Check, GraduationCap, Image as ImageIcon, RefreshCw, FileText, Presentation, FileDown, Download, Medal, Crown, ZoomIn, X, Music, Upload, ExternalLink, Copy, BadgeCheck, Camera, CameraOff, RotateCcw, Languages, MapPin, Flag, Zap, Brain, Footprints } from 'lucide-react';

interface GamificationGeneratorProps {
    onBack: () => void;
    initialTopic?: string;
    initialGrade?: string;
}

export const GamificationGenerator: React.FC<GamificationGeneratorProps> = ({ onBack, initialTopic, initialGrade }) => {
    const [topic, setTopic] = useState(initialTopic || '');
    const [gradeLevel, setGradeLevel] = useState(initialGrade || 'الصف الثالث الابتدائي');
    const [isLoading, setIsLoading] = useState(false);
    const [gameData, setGameData] = useState<GameScenario | null>(null);

    // Auto-generate if topic is provided
    React.useEffect(() => {
        if (initialTopic && initialGrade && !gameData) {
            handleGenerate();
        }
    }, [initialTopic]);
    const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
    const [generatingRewardImage, setGeneratingRewardImage] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [showEnglish, setShowEnglish] = useState(false);

    // Audio State (User Uploaded)
    const [victoryAudioUrl, setVictoryAudioUrl] = useState<string | null>(null);

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

    const grades = [
        "الروضة", "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
        "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
        "الصف السابع الإعدادي", "الصف الثامن الإعدادي", "الصف التاسع الإعدادي"
    ];

    const handleGenerate = async () => {
        if ((!topic && !capturedImage)) return;
        setIsLoading(true);
        try {
            const fileData = capturedImage ? { mimeType: capturedImage.mimeType, data: capturedImage.data } : undefined;
            const data = await generateGameScenario(topic, gradeLevel, fileData);

            // Safety Validation to prevent White Screen (Crash)
            if (!data.rewardSystem) {
                data.rewardSystem = {
                    badges: ["بطل اللعبة", "المستكشف الذكي", "قائد الفريق"],
                    epicWin: "لقد أتممت المهمة بنجاح باهر!",
                    visualDescription: "Golden trophy cup with confetti",
                    musicPrompt: "Victory music"
                };
            }
            if (!data.challenges) data.challenges = [];

            setGameData(data);
            setVictoryAudioUrl(null); // Reset audio on new game
            setCapturedImage(null);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء توليد اللعبة. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsLoading(false);
        }
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

    const handleGenerateImage = async (index: number, description: string) => {
        if (!gameData) return;
        setGeneratingImageIndex(index);
        try {
            const imageUrl = await generateSlideImage(description);
            if (imageUrl) {
                const updatedChallenges = [...gameData.challenges];
                updatedChallenges[index] = { ...updatedChallenges[index], imageUrl };
                setGameData({ ...gameData, challenges: updatedChallenges });
            } else {
                alert("تعذر توليد الصورة حالياً (قد يكون بسبب ضغط الخدمة).");
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء توليد الصورة.");
        } finally {
            setGeneratingImageIndex(null);
        }
    };

    const handleGenerateRewardImage = async () => {
        if (!gameData || !gameData.rewardSystem.visualDescription) return;
        setGeneratingRewardImage(true);
        try {
            const imageUrl = await generateSlideImage(gameData.rewardSystem.visualDescription);
            if (imageUrl) {
                setGameData({
                    ...gameData,
                    rewardSystem: {
                        ...gameData.rewardSystem,
                        imageUrl: imageUrl
                    }
                });
            } else {
                alert("تعذر توليد صورة المكافأة حالياً.");
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء توليد صورة المكافأة.");
        } finally {
            setGeneratingRewardImage(false);
        }
    };

    const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setVictoryAudioUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadImage = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            FileSaver.saveAs(blob, filename);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء تحميل الصورة.");
        }
    };

    // --- Helper to Generate Music Prompt ---
    const getMusicPrompt = () => {
        if (!gameData) return "";
        // Create a rich prompt for the music generator
        return `Cinematic orchestral victory music for a game called "${gameData.title}". Context: ${gameData.rewardSystem.epicWin}. Mood: Triumphant, Energetic, Disney Style, Celebration. Instruments: Brass, Strings, Percussion.`;
    };

    const handleCopyMusicPrompt = () => {
        const prompt = getMusicPrompt();
        navigator.clipboard.writeText(prompt);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    // --- Export Functions ---

    const handleExportPPTX = async () => {
        if (!gameData) return;
        setIsExporting(true);
        try {
            const pres = new PptxGenJS();
            pres.rtlMode = true;
            pres.layout = 'LAYOUT_16x9';

            // Master Slide
            pres.defineSlideMaster({
                title: "MASTER", background: { color: "1e293b" }, // Slate 900
                objects: [
                    { rect: { x: 0, y: "90%", w: "100%", h: "10%", fill: { color: "a855f7" } } }, // Purple bar
                    { text: { text: "المعلم الذكي - نظام التلعيب (وفق المعايير السورية)", options: { x: 0.5, y: "92%", fontSize: 12, color: "ffffff" } } }
                ]
            });

            // 1. Title Slide
            const slide1 = pres.addSlide({ masterName: "MASTER" });
            slide1.addText(gameData.title, { x: 0, y: 1.5, w: "100%", fontSize: 44, bold: true, align: "center", color: "ffffff", rtl: true });
            slide1.addText(gameData.targetGrade, { x: 0, y: 2.5, w: "100%", fontSize: 24, color: "a855f7", align: "center", rtl: true });
            slide1.addText(gameData.storyline, { x: "10%", y: 3.5, w: "80%", fontSize: 18, color: "cbd5e1", align: "center", rtl: true });

            // 2. Instructions Slide
            const slide2 = pres.addSlide({ masterName: "MASTER" });
            slide2.addText("طريقة اللعب والأهداف", { x: "5%", y: 0.5, w: "90%", fontSize: 32, bold: true, color: "a855f7", align: "right", rtl: true });

            let instructionsText = `طريقة اللعب:\n${gameData.howToPlay}\n\nالأهداف التعليمية:\n`;
            (gameData.objectives || []).forEach(obj => instructionsText += `• ${obj}\n`);

            slide2.addText(instructionsText, { x: "5%", y: 1.5, w: "90%", h: 4, fontSize: 18, color: "ffffff", align: "right", rtl: true, valign: "top" });

            // 3. Challenge Slides
            (gameData.challenges || []).forEach((challenge, index) => {
                const slide = pres.addSlide({ masterName: "MASTER" });

                // Header
                slide.addText(`المحطة ${index + 1}: ${challenge.type === 'quiz' ? 'سؤال معرفي' : 'نشاط حركي'}`, {
                    x: "5%", y: 0.5, w: "90%", fontSize: 24, bold: true, color: "fbbf24", align: "right", rtl: true
                });

                // Content Layout (Text Right, Image Left if exists)
                if (challenge.imageUrl) {
                    slide.addText(challenge.text, { x: "50%", y: 1.5, w: "45%", h: 4, fontSize: 20, color: "ffffff", align: "right", rtl: true, valign: "top" });
                    slide.addImage({ data: challenge.imageUrl, x: "5%", y: 1.5, w: "40%", h: 3.5, sizing: { type: "contain", w: "40%", h: 3.5 } });
                } else {
                    slide.addText(challenge.text, { x: "10%", y: 1.5, w: "80%", h: 3, fontSize: 24, color: "ffffff", align: "center", rtl: true });
                }

                // Options if Quiz
                if (challenge.type === 'quiz' && challenge.options) {
                    let yPos = 5.5;
                    challenge.options.forEach(opt => {
                        const isCorrect = opt === challenge.correctAnswer;
                        const color = isCorrect ? "22c55e" : "94a3b8"; // Green if correct
                        slide.addText((isCorrect ? "✔ " : "• ") + opt, {
                            x: "10%", y: yPos, w: "80%", fontSize: 16, color: color, align: "right", rtl: true
                        });
                        yPos += 0.4;
                    });
                }
            });

            // 4. Rewards Slide
            const rewardSlide = pres.addSlide({ masterName: "MASTER" });
            rewardSlide.addText("لوحة الشرف والمكافآت", { x: "5%", y: 0.5, w: "90%", fontSize: 32, bold: true, color: "eab308", align: "right", rtl: true });

            // Badges
            let badgesText = "الأوسمة المتاحة:\n";
            (gameData.rewardSystem.badges || []).forEach(b => badgesText += `🏅 ${b}\n`);
            rewardSlide.addText(badgesText, { x: "50%", y: 1.5, w: "45%", h: 4, fontSize: 20, color: "ffffff", align: "right", rtl: true });

            // Epic Win
            rewardSlide.addText(`لحظة الفوز:\n${gameData.rewardSystem.epicWin}`, { x: "50%", y: 4, w: "45%", h: 2, fontSize: 16, color: "cbd5e1", align: "right", rtl: true });

            // Reward Image
            if (gameData.rewardSystem.imageUrl) {
                rewardSlide.addImage({ data: gameData.rewardSystem.imageUrl, x: "5%", y: 1.5, w: "40%", h: 4, sizing: { type: "contain", w: "40%", h: 4 } });
            }

            // Reward Audio (If uploaded)
            if (victoryAudioUrl) {
                // Check if victoryAudioUrl is a base64 string
                if (victoryAudioUrl.startsWith('data:audio')) {
                    rewardSlide.addMedia({ type: "audio", data: victoryAudioUrl, x: "5%", y: 5.5, w: "40%", h: 0.5 });
                }
            }

            await pres.writeFile({ fileName: `Game-${topic}.pptx` });
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء تصدير ملف PowerPoint.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportDOCX = async () => {
        if (!gameData) return;
        setIsExporting(true);
        try {
            const tableRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: "رقم المحطة", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "نوع التحدي", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "نص التحدي / السؤال", alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "الإجابة الصحيحة", alignment: AlignmentType.CENTER })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                    ]
                })
            ];

            (gameData.challenges || []).forEach((c, i) => {
                tableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: `${i + 1}`, alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: c.type === 'quiz' ? "معرفي" : "حركي", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: c.text, alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: c.correctAnswer || "-", alignment: AlignmentType.CENTER })] }),
                        ]
                    })
                );
            });

            // Reward Section for Doc
            const badgesParagraphs = (gameData.rewardSystem.badges || []).map(b => new Paragraph({ text: `• ${b}`, alignment: AlignmentType.RIGHT }));

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ text: gameData.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: `الصف: ${gameData.targetGrade}`, alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "قصة اللعبة:", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: gameData.storyline, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "الأهداف وطريقة اللعب:", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: gameData.howToPlay, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "جدول التحديات والمراحل:", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
                        new Table({
                            rows: tableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            bidiVisual: true,
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "نظام المكافآت:", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "الأوسمة المقترحة:", heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT }),
                        ...badgesParagraphs,
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "لحظة الفوز (Epic Win):", heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: gameData.rewardSystem.epicWin, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "تم التصميم بواسطة منصة المعلم الذكي - المعايير السورية", alignment: AlignmentType.CENTER, style: "Disabled" }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            FileSaver.saveAs(blob, `Game-${topic}.docx`);

        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء تصدير ملف Word.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('game-export-container');
        if (!element) return;
        setIsExporting(true);

        const opt = {
            margin: [10, 10],
            filename: `Game-${topic}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsExporting(false);
        }).catch((err: any) => {
            console.error(err);
            setIsExporting(false);
            alert("حدث خطأ أثناء تصدير PDF.");
        });
    };

    return (
        <div className="w-full min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden relative">

            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-purple-500/20 bg-slate-900/60 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30">
                        <Gamepad2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">محاكي الألعاب التعليمية</h1>
                        <p className="text-xs text-purple-400 font-mono flex items-center gap-1">
                            <BadgeCheck size={12} className="text-emerald-500" />
                            متوافق مع المعايير السورية - Gamification Core
                        </p>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <span>عودة للرئيسية</span>
                    <ArrowRight size={20} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 flex flex-col items-center">

                {!gameData ? (
                    // Input View
                    <div className="w-full max-w-xl space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                صمم مغامرة تعليمية
                            </h2>
                            <p className="text-slate-400">حول درسك الجاف إلى قصة وتحديات ممتعة في ثوانٍ.</p>
                        </div>

                        <div className="bg-slate-900/80 border border-purple-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.1)] relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>

                            {/* Mode Tabs */}
                            {!initialTopic && (
                                <div className="flex gap-2 mb-6 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
                                    <button
                                        onClick={() => { setScanMode('text'); stopCamera(); }}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${scanMode === 'text' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Sparkles size={16} /> كتابة موضوع
                                    </button>
                                    <button
                                        onClick={() => { setScanMode('upload'); stopCamera(); }}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${scanMode === 'upload' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Upload size={16} /> رفع ملف
                                    </button>
                                    <button
                                        onClick={() => { setScanMode('camera'); startCamera(); }}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${scanMode === 'camera' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Camera size={16} /> كاميرا
                                    </button>
                                </div>
                            )}

                            {/* Grade Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                                    <GraduationCap size={16} /> الفئة العمرية / الصف الدراسي
                                </label>
                                <select
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] outline-none transition-all cursor-pointer hover:bg-slate-900 appearance-none"
                                >
                                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            {/* Inputs based on Mode */}
                            {scanMode === 'text' && (
                                <>
                                    <label className="block text-sm font-bold text-purple-300 mb-2">موضوع اللعبة أو الدرس</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="مثال: جدول الضرب، الحروف الشمسية، دورة حياة الفراشة..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pl-12 text-white focus:border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] outline-none transition-all text-lg"
                                        />
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 opacity-50" />
                                    </div>
                                </>
                            )}

                            {scanMode === 'upload' && (
                                <div className="bg-slate-950 border border-slate-700 rounded-xl p-6">
                                    {capturedImage ? (
                                        <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-emerald-500/30">
                                            {capturedImage.mimeType.startsWith('image/') ? (
                                                <img src={capturedImage.previewUrl} className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
                                            ) : (
                                                <div className="w-20 h-20 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/30"><FileText className="text-red-400" size={32} /></div>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-white font-bold truncate mb-1">{capturedImage.name}</p>
                                                <p className="text-xs text-emerald-400 flex items-center gap-1"><Check size={12} /> تم التحميل جاهز للتحليل</p>
                                            </div>
                                            <button onClick={clearCapturedImage} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"><X size={20} /></button>
                                        </div>
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl cursor-pointer transition-colors group bg-slate-900/50 hover:bg-slate-900">
                                            <div className="p-4 bg-slate-800 rounded-full group-hover:bg-purple-900/30 transition-colors">
                                                <Upload size={32} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-slate-300 font-bold mb-1">اضغط لرفع صورة أو ملف PDF</p>
                                                <p className="text-xs text-slate-500">من الكتاب المدرسي أو ورقة العمل (Max 10MB)</p>
                                            </div>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                                </div>
                            )}

                            {scanMode === 'camera' && (
                                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 overflow-hidden">
                                    {capturedImage ? (
                                        <div className="relative">
                                            <img src={capturedImage.previewUrl} className="w-full max-h-[300px] object-contain rounded-lg border border-emerald-500/30" />
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <button onClick={() => { clearCapturedImage(); startCamera(); }} className="p-2 bg-slate-900/80 backdrop-blur rounded-lg text-slate-300 hover:text-white border border-slate-600 shadow-xl" title="إعادة التقاط"><RotateCcw size={18} /></button>
                                                <button onClick={clearCapturedImage} className="p-2 bg-slate-900/80 backdrop-blur rounded-lg text-red-400 hover:text-red-300 border border-slate-600 shadow-xl" title="إلغاء"><X size={18} /></button>
                                            </div>
                                            <div className="absolute bottom-3 right-3 px-3 py-1 bg-emerald-500/90 backdrop-blur rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1">
                                                <Check size={12} /> تم التقاط الصورة
                                            </div>
                                        </div>
                                    ) : isCameraOpen ? (
                                        <div className="relative">
                                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-[300px] object-cover rounded-lg border border-purple-500/30" />
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6 items-center">
                                                <button onClick={capturePhoto} className="p-5 bg-white rounded-full text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform"><Camera size={28} /></button>
                                                <button onClick={stopCamera} className="p-4 bg-red-500/80 backdrop-blur rounded-full text-white shadow-xl hover:bg-red-500 hover:scale-105 transition-all"><CameraOff size={24} /></button>
                                            </div>
                                            <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-white text-xs border border-white/10 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> مباشر
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 py-12 bg-slate-900/50 rounded-lg">
                                            {cameraError ? (
                                                <div className="text-red-400 text-sm text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20 max-w-xs">{cameraError}</div>
                                            ) : (
                                                <div className="p-4 bg-slate-800 rounded-full">
                                                    <Camera size={40} className="text-slate-500" />
                                                </div>
                                            )}
                                            <p className="text-slate-400 text-sm">قم بتوجيه الكاميرا نحو صفحة الكتاب</p>
                                            <button onClick={startCamera} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/30 hover:scale-105 transform"><Camera size={18} /> تشغيل الكاميرا</button>
                                        </div>
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || (!topic && !capturedImage)}
                                className={`w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isLoading || (!topic && !capturedImage)
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/50 hover:shadow-purple-600/50 transform hover:-translate-y-1'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" /> جاري تصميم اللعبة...
                                    </>
                                ) : (
                                    <>
                                        <Play className="fill-current" size={20} /> ابدأ المحاكاة
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    // Result View - Enhanced Bilingual Timeline
                    <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500 space-y-6">

                        {/* Toolbar: Language Toggle + Actions */}
                        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-700 rounded-2xl px-5 py-3 sticky top-0 z-20 backdrop-blur-xl">
                            <button onClick={() => setGameData(null)} className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
                                <ArrowRight size={16} className={document.dir === 'rtl' ? '' : 'rotate-180'} /> لعبة جديدة
                            </button>
                            <button
                                onClick={() => setShowEnglish(!showEnglish)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showEnglish
                                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                                    }`}
                            >
                                <Languages size={16} />
                                {showEnglish ? 'إخفاء الإنجليزية' : 'عرض الترجمة'}
                            </button>
                        </div>

                        {/* Container for PDF Export targeting */}
                        <div id="game-export-container" className="space-y-8 p-2">

                            {/* ===== Game Title Card ===== */}
                            <div className="bg-gradient-to-br from-purple-900/50 via-slate-900 to-pink-900/30 border border-purple-500/40 rounded-3xl p-10 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.15),transparent_70%)]" />
                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold mb-5">
                                        <GraduationCap size={14} /> {gameData.targetGrade}
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] leading-tight">
                                        🎮 {gameData.title}
                                    </h2>
                                    {showEnglish && gameData.titleEn && (
                                        <p className="text-lg text-indigo-300/70 font-medium mb-4 italic">{gameData.titleEn}</p>
                                    )}
                                    <div className="max-w-2xl mx-auto bg-slate-950/40 backdrop-blur rounded-2xl p-5 border border-slate-800 mt-4">
                                        <p className="text-lg text-purple-100 leading-relaxed font-medium">
                                            {gameData.storyline}
                                        </p>
                                        {showEnglish && gameData.storylineEn && (
                                            <p className="text-sm text-indigo-300/60 mt-3 pt-3 border-t border-slate-700/50 italic leading-relaxed">{gameData.storylineEn}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ===== How to Play + Objectives ===== */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* How to Play */}
                                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-pink-500/30 transition-colors">
                                    <h3 className="flex items-center gap-2 text-xl font-bold text-pink-400 mb-4">
                                        <Target size={22} /> طريقة اللعب
                                        {showEnglish && <span className="text-xs text-pink-400/50 font-normal mr-2">How to Play</span>}
                                    </h3>
                                    <p className="text-slate-300 leading-loose whitespace-pre-line text-sm">
                                        {gameData.howToPlay}
                                    </p>
                                    {showEnglish && gameData.howToPlayEn && (
                                        <p className="text-xs text-indigo-300/50 mt-3 pt-3 border-t border-slate-800 italic leading-relaxed">{gameData.howToPlayEn}</p>
                                    )}
                                </div>

                                {/* Objectives */}
                                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
                                    <h3 className="flex items-center gap-2 text-xl font-bold text-blue-400 mb-4">
                                        <Trophy size={22} /> الأهداف التعليمية
                                        {showEnglish && <span className="text-xs text-blue-400/50 font-normal mr-2">Objectives</span>}
                                    </h3>
                                    <ul className="space-y-3">
                                        {(gameData.objectives || []).map((obj, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm">
                                                <span className="flex-none w-6 h-6 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold mt-0.5">{i + 1}</span>
                                                <div>
                                                    <span className="text-slate-200">{obj}</span>
                                                    {showEnglish && gameData.objectivesEn?.[i] && (
                                                        <p className="text-xs text-indigo-300/50 mt-1 italic">{gameData.objectivesEn[i]}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* ===== Timeline Challenges ===== */}
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                        <MapPin className="text-yellow-400" size={24} />
                                    </div>
                                    خريطة المغامرة
                                    {showEnglish && <span className="text-sm text-yellow-400/50 font-normal">Adventure Map</span>}
                                    <span className="text-xs text-slate-500 font-normal mr-auto">({(gameData.challenges || []).length} محطات)</span>
                                </h3>

                                <div className="relative">
                                    {/* Timeline Line */}
                                    <div className="absolute top-0 bottom-0 right-[23px] w-[3px] bg-gradient-to-b from-purple-500 via-pink-500 via-yellow-500 to-emerald-500 rounded-full opacity-30" />

                                    <div className="space-y-0">
                                        {(gameData.challenges || []).map((challenge, idx) => {
                                            const isQuiz = challenge.type === 'quiz';
                                            const nodeColor = isQuiz ? 'from-blue-500 to-cyan-500' : 'from-emerald-500 to-green-500';
                                            const borderColor = isQuiz ? 'border-blue-500/30 hover:border-blue-400/60' : 'border-emerald-500/30 hover:border-emerald-400/60';
                                            const iconBg = isQuiz ? 'bg-blue-500' : 'bg-emerald-500';

                                            return (
                                                <div key={idx} className="relative flex gap-6 group page-break-inside-avoid pb-8">
                                                    {/* Timeline Node */}
                                                    <div className="flex-none relative z-10">
                                                        <div className={`w-[46px] h-[46px] rounded-xl ${iconBg} shadow-lg flex items-center justify-center text-white font-black text-sm border-2 border-white/20 group-hover:scale-110 transition-transform`}>
                                                            {isQuiz ? <Brain size={20} /> : <Footprints size={20} />}
                                                        </div>
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                            {idx + 1}
                                                        </div>
                                                    </div>

                                                    {/* Challenge Card */}
                                                    <div className={`flex-1 bg-slate-900/70 border ${borderColor} rounded-2xl p-6 transition-all duration-300 hover:bg-slate-900 relative overflow-hidden`}>
                                                        {/* Card Header */}
                                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${isQuiz ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                                                                {isQuiz ? '🧠 سؤال معرفي' : '🏃 نشاط حركي'}
                                                            </span>
                                                            {showEnglish && (
                                                                <span className="text-[10px] text-slate-500 italic">
                                                                    {isQuiz ? 'Knowledge Quiz' : 'Physical Activity'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col lg:flex-row gap-6">
                                                            {/* Content */}
                                                            <div className="flex-1">
                                                                {/* Arabic Text */}
                                                                <div className="text-[15px] text-slate-100 mb-4 whitespace-pre-line leading-loose font-medium">
                                                                    {challenge.text}
                                                                </div>
                                                                {/* English Text */}
                                                                {showEnglish && challenge.textEn && (
                                                                    <div className="text-xs text-indigo-300/50 mb-4 whitespace-pre-line leading-relaxed italic border-r-2 border-indigo-500/20 pr-3">
                                                                        {challenge.textEn}
                                                                    </div>
                                                                )}

                                                                {/* Quiz Options */}
                                                                {isQuiz && challenge.options && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                        {challenge.options.map((opt, i) => {
                                                                            const isCorrect = opt === challenge.correctAnswer;
                                                                            return (
                                                                                <div key={i} className={`relative p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 ${isCorrect
                                                                                        ? 'bg-green-900/20 border-green-500/40 text-green-300 shadow-[0_0_15px_rgba(22,163,74,0.1)]'
                                                                                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                                                                    }`}>
                                                                                    <span className={`flex-none w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                                        {String.fromCharCode(1571 + i)}
                                                                                    </span>
                                                                                    <div className="flex-1">
                                                                                        <span className="font-bold text-sm block">{opt}</span>
                                                                                        {showEnglish && challenge.optionsEn?.[i] && (
                                                                                            <span className="text-[10px] text-indigo-300/40 italic">{challenge.optionsEn[i]}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {isCorrect && <Check size={16} className="text-green-400 flex-none" />}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Image Area */}
                                                            <div className="w-full lg:w-56 flex-none flex flex-col gap-2" data-html2canvas-ignore="true">
                                                                <div className="w-full aspect-[4/3] bg-black/30 rounded-xl border border-slate-700/50 overflow-hidden relative flex items-center justify-center group/image">
                                                                    {challenge.imageUrl ? (
                                                                        <img src={challenge.imageUrl} alt="Stage visual" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="text-center p-3">
                                                                            <ImageIcon className="mx-auto mb-1 text-slate-700" size={28} />
                                                                            <p className="text-[9px] text-slate-600">صورة المحطة</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button
                                                                            onClick={() => handleGenerateImage(idx, challenge.visualDescription)}
                                                                            disabled={generatingImageIndex !== null}
                                                                            className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all"
                                                                        >
                                                                            {generatingImageIndex === idx ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                                                            {challenge.imageUrl ? 'إعادة' : 'توليد'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Finish Flag */}
                                        <div className="relative flex gap-6">
                                            <div className="flex-none relative z-10">
                                                <div className="w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg flex items-center justify-center text-white border-2 border-white/20">
                                                    <Flag size={20} />
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-gradient-to-r from-amber-900/20 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                                                <Trophy className="text-amber-400" size={20} />
                                                <span className="text-amber-300 font-bold">خط النهاية - لحظة الفوز الملحمية!</span>
                                                {showEnglish && <span className="text-xs text-amber-400/40 italic">Finish Line - Epic Win!</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ===== Rewards System ===== */}
                            <div className="bg-gradient-to-br from-amber-900/20 via-slate-900 to-purple-900/20 border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden page-break-inside-avoid">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.08),transparent_60%)]" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                            <Medal className="text-amber-400" size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-amber-300">نظام المكافآت</h3>
                                            {showEnglish && <p className="text-xs text-amber-400/40 italic">Reward System</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Badges & Epic Win */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                                                    <Crown size={16} /> أوسمة الشرف
                                                    {showEnglish && <span className="text-xs text-purple-400/40 font-normal">Honor Badges</span>}
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(gameData.rewardSystem?.badges || []).map((badge, idx) => (
                                                        <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
                                                            <span className="text-amber-300 text-sm font-bold block">🏅 {badge}</span>
                                                            {showEnglish && gameData.rewardSystem?.badgesEn?.[idx] && (
                                                                <span className="text-[10px] text-indigo-300/40 italic block">{gameData.rewardSystem.badgesEn[idx]}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                                                    <Sparkles size={16} /> لحظة الفوز الملحمية
                                                    {showEnglish && <span className="text-xs text-purple-400/40 font-normal">Epic Win</span>}
                                                </h4>
                                                <p className="text-slate-200 text-sm leading-relaxed border-r-2 border-amber-500 pr-4">
                                                    {gameData.rewardSystem?.epicWin}
                                                </p>
                                                {showEnglish && gameData.rewardSystem?.epicWinEn && (
                                                    <p className="text-xs text-indigo-300/40 mt-2 italic pr-4">{gameData.rewardSystem.epicWinEn}</p>
                                                )}
                                            </div>

                                            {/* Music & Audio */}
                                            <div className="flex flex-col gap-3" data-html2canvas-ignore="true">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <a
                                                        href={`https://makebestmusic.com/app/create-music-new?prompt=${encodeURIComponent(getMusicPrompt())}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:shadow-lg transition-all border border-purple-400/50"
                                                    >
                                                        <ExternalLink size={14} /> تأليف موسيقى
                                                    </a>
                                                    <button
                                                        onClick={handleCopyMusicPrompt}
                                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-600 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        {copiedPrompt ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                    </button>
                                                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:text-white">
                                                        <Upload size={14} /> رفع صوت
                                                        <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
                                                    </label>
                                                </div>
                                                {victoryAudioUrl && (
                                                    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-3 animate-in fade-in">
                                                        <Music size={16} className="text-purple-400" />
                                                        <audio controls src={victoryAudioUrl} className="w-full h-8" />
                                                        <button onClick={() => setVictoryAudioUrl(null)} className="text-red-400 hover:text-red-300 p-1 rounded-full transition-colors"><X size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Visual Gen for Reward */}
                                        <div className="flex flex-col gap-3" data-html2canvas-ignore="true">
                                            <div className="w-full aspect-square md:aspect-video bg-black/40 rounded-xl border border-amber-500/30 overflow-hidden relative flex items-center justify-center group/image cursor-pointer">
                                                {gameData.rewardSystem?.imageUrl ? (
                                                    <img
                                                        src={gameData.rewardSystem.imageUrl}
                                                        alt="Reward Visual"
                                                        className="w-full h-full object-contain p-4"
                                                        onClick={() => setZoomedImage(gameData.rewardSystem?.imageUrl || null)}
                                                    />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Trophy className="mx-auto mb-2 text-amber-600/50" size={48} />
                                                        <p className="text-xs text-amber-500/50 font-bold">وسام الفوز</p>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                    <button
                                                        onClick={handleGenerateRewardImage}
                                                        disabled={generatingRewardImage}
                                                        className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
                                                    >
                                                        {generatingRewardImage ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                                        {gameData.rewardSystem?.imageUrl ? 'إعادة تصميم' : 'توليد صورة الوسام'}
                                                    </button>
                                                    {gameData.rewardSystem?.imageUrl && (
                                                        <div className="flex gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); setZoomedImage(gameData.rewardSystem?.imageUrl || null); }} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-all border border-slate-600"><ZoomIn size={16} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(gameData.rewardSystem.imageUrl!, `reward-${Date.now()}.png`); }} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg shadow-lg hover:scale-110 transition-all border border-slate-600"><Download size={16} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex flex-wrap justify-center gap-4 pt-8 pb-12 border-t border-slate-800 mt-8">
                            <button onClick={() => setGameData(null)} className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors">
                                تصميم لعبة جديدة
                            </button>
                            <div className="h-12 w-px bg-slate-700 mx-4 hidden md:block" />
                            <button onClick={handleExportPPTX} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50">
                                <Presentation size={18} /> {isExporting ? 'جاري التصدير...' : 'تحميل PowerPoint'}
                            </button>
                            <button onClick={handleExportDOCX} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                                <FileText size={18} /> {isExporting ? 'جاري التصدير...' : 'تحميل Word'}
                            </button>
                            <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 active:scale-95 disabled:opacity-50">
                                <FileDown size={18} /> {isExporting ? 'جاري التحويل...' : 'تحميل PDF'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Lightbox/Modal */}
            {zoomedImage && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex items-center justify-center p-8 animate-in fade-in" onClick={() => setZoomedImage(null)}>
                    <button className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                        <X size={24} />
                    </button>
                    <img
                        src={zoomedImage}
                        className="max-w-full max-h-full rounded shadow-2xl border border-amber-500/50 object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <style>{`
                .page-break-inside-avoid {
                    page-break-inside: avoid;
                }
            `}</style>
        </div>
    );
};