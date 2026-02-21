import React, { useState, useRef } from 'react';
import { Award, Loader2, Download, Sparkles } from 'lucide-react';
import { generateCertificatePrompt, generateCertificateImage, CertificateStyle } from '../services/geminiService';
import { saveCertificate } from '../services/syncService';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import FileSaver from 'file-saver';

const STYLES: { value: CertificateStyle | 'custom'; label: string }[] = [
    { value: 'disney', label: 'ديزني' },
    { value: 'mickey', label: 'ميكي ماوس' },
    { value: 'pixar', label: 'بيكسار' },
    { value: 'custom', label: 'برومبت احترافي (AI)' },
];

interface CertificateCreatorProps {
    studentName?: string;
    lessonTopic?: string;
    /** أسماء طلاب للاختيار السريع (مثلاً من المراقبة الحية) */
    studentOptions?: { name: string }[];
    onClose?: () => void;
    compact?: boolean;
}

export const CertificateCreator: React.FC<CertificateCreatorProps> = ({
    studentName: initialName = '',
    lessonTopic: initialTopic = '',
    studentOptions = [],
    onClose,
    compact = false
}) => {
    const [studentName, setStudentName] = useState(initialName);
    const [lessonTopic, setLessonTopic] = useState(initialTopic);
    const [style, setStyle] = useState<CertificateStyle | 'custom'>('pixar');
    const [certificateImage, setCertificateImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const certRef = useRef<HTMLDivElement>(null);

    const handleGenerate = async () => {
        if (!studentName.trim()) {
            setError('الرجاء إدخال اسم الطالب');
            return;
        }
        if (!lessonTopic.trim()) {
            setError('الرجاء إدخال الدرس أو الموضوع');
            return;
        }
        setGenerating(true);
        setError(null);
        setCertificateImage(null);
        try {
            let prompt: string;
            if (style === 'custom') {
                prompt = await generateCertificatePrompt(studentName.trim(), lessonTopic.trim());
            } else {
                prompt = style;
            }
            const imgUrl = await generateCertificateImage(prompt, lessonTopic.trim());
            if (imgUrl) {
                setCertificateImage(imgUrl);
                try {
                    await saveCertificate({
                        studentName: studentName.trim(),
                        lessonTopic: lessonTopic.trim(),
                        imageUrl: imgUrl,
                        style: String(style)
                    });
                } catch (_) { /* مزامنة صامتة عند فشل DB */ }
            } else setError('فشل توليد الصورة');
        } catch (e) {
            setError('حدث خطأ. حاول مرة أخرى.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!certRef.current) return;
        try {
            const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: '#1e293b' });
            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b: Blob | null) => resolve(b || new Blob()), 'image/png'));
            FileSaver.saveAs(blob, `شهادة-ابداع_${studentName.replace(/\s+/g, '-')}.png`);
        } catch (e) {
            alert('فشل التصدير');
        }
    };

    return (
        <div className="flex flex-col gap-4" dir="rtl">
            <div className="flex items-center gap-2 text-amber-400">
                <Award size={18} />
                <h2 className="font-bold">شهادة إبداع للطالب المتميز</h2>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">اسم الطالب المتميز</label>
                    {studentOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {studentOptions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setStudentName(s.name)}
                                    className={`px-2 py-1 rounded text-xs ${studentName === s.name ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="مثال: أحمد محمد"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500/50"
                        dir="rtl"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">الدرس / الموضوع الذي تفوق به</label>
                    <input
                        type="text"
                        value={lessonTopic}
                        onChange={(e) => setLessonTopic(e.target.value)}
                        placeholder="مثال: الماء في حياتنا"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500/50"
                        dir="rtl"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">نمط الشهادة</label>
                    <div className="flex flex-wrap gap-2">
                        {STYLES.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => setStyle(s.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    style === s.value
                                        ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300'
                                        : 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
            >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {generating ? 'جاري التوليد...' : 'توليد الشهادة'}
            </button>

            {certificateImage && (
                <>
                    <div
                        ref={certRef}
                        className="relative w-full aspect-[3/4] max-h-[320px] rounded-xl overflow-hidden border-2 border-amber-500/30 bg-slate-900"
                        style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                    >
                        <img src={certificateImage} alt="شهادة" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <div className="bg-gradient-to-b from-black/30 to-black/50 backdrop-blur-[2px] rounded-3xl px-8 py-6 border-2 border-amber-400/40 shadow-2xl">
                                <p className="text-amber-300 text-2xl font-bold mb-3 tracking-wide" style={{ fontFamily: "'Amiri', serif", textShadow: '0 0 20px rgba(251,191,36,0.4)' }}>
                                    🏆 شهادة إبداع
                                </p>
                                <p className="text-white text-3xl font-bold mb-3" style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                    {studentName}
                                </p>
                                <p className="text-amber-100 text-lg" style={{ fontFamily: "'Amiri', serif" }}>
                                    تفوق في درس: {lessonTopic}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
                    >
                        <Download size={18} /> تنزيل الشهادة
                    </button>
                </>
            )}

            {onClose && (
                <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300">
                    إغلاق
                </button>
            )}
        </div>
    );
};
