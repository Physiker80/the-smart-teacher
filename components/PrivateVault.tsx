
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Archive, BookHeart, Trophy, Plus, Trash2, FileText, Music, BookOpen, Image, Video, Type, Search, CalendarDays, Smile, Frown, Zap, Meh, X, Upload, ChevronDown, Sparkles, Lock } from 'lucide-react';
import { JournalEntry, StudentWork, Resource } from '../types';

interface PrivateVaultProps {
    onBack: () => void;
}

const MOODS = [
    { id: 'happy' as const, emoji: '😊', label: 'سعيد', color: 'bg-emerald-500' },
    { id: 'inspired' as const, emoji: '✨', label: 'مُلهَم', color: 'bg-amber-500' },
    { id: 'neutral' as const, emoji: '😐', label: 'عادي', color: 'bg-slate-500' },
    { id: 'stressed' as const, emoji: '😓', label: 'مُرهَق', color: 'bg-rose-500' },
];

const TABS = [
    { id: 'archive' as const, label: 'الأرشيف الإبداعي', icon: Archive },
    { id: 'journal' as const, label: 'مذكراتي', icon: BookHeart },
    { id: 'gallery' as const, label: 'لوحة الشرف', icon: Trophy },
];

const LS_JOURNAL = 'st_private_journal';
const LS_GALLERY = 'st_student_gallery';

export const PrivateVault: React.FC<PrivateVaultProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'archive' | 'journal' | 'gallery'>('archive');

    // --- Archive State ---
    const [resources, setResources] = useState<Resource[]>([]);
    const [archiveFilter, setArchiveFilter] = useState<string>('all');
    const [archiveSearch, setArchiveSearch] = useState('');

    // --- Journal State ---
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [journalMood, setJournalMood] = useState<JournalEntry['mood']>('happy');
    const [journalContent, setJournalContent] = useState('');
    const [journalTags, setJournalTags] = useState('');

    // --- Gallery State ---
    const [studentWorks, setStudentWorks] = useState<StudentWork[]>([]);
    const [showGalleryForm, setShowGalleryForm] = useState(false);
    const [galleryStudentName, setGalleryStudentName] = useState('');
    const [galleryTitle, setGalleryTitle] = useState('');
    const [galleryNotes, setGalleryNotes] = useState('');
    const [galleryFilePreview, setGalleryFilePreview] = useState<string | null>(null);
    const [galleryFileType, setGalleryFileType] = useState<'image' | 'video' | 'text'>('image');
    const galleryFileRef = useRef<HTMLInputElement>(null);

    // Load data from localStorage
    useEffect(() => {
        try {
            const storedResources = localStorage.getItem('st_resources');
            if (storedResources) setResources(JSON.parse(storedResources));
        } catch (e) { console.error(e); }

        try {
            const storedJournal = localStorage.getItem(LS_JOURNAL);
            if (storedJournal) setJournalEntries(JSON.parse(storedJournal));
        } catch (e) { console.error(e); }

        try {
            const storedGallery = localStorage.getItem(LS_GALLERY);
            if (storedGallery) setStudentWorks(JSON.parse(storedGallery));
        } catch (e) { console.error(e); }
    }, []);

    // --- ARCHIVE LOGIC ---
    const filteredResources = resources.filter(r => {
        const matchesType = archiveFilter === 'all' || r.type === archiveFilter;
        const matchesSearch = archiveSearch === '' || r.title.toLowerCase().includes(archiveSearch.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'lesson-plan': return <FileText size={20} className="text-violet-400" />;
            case 'song': return <Music size={20} className="text-pink-400" />;
            default: return <BookOpen size={20} className="text-amber-400" />;
        }
    };

    const handleDeleteResource = (id: string) => {
        const updated = resources.filter(r => r.id !== id);
        setResources(updated);
        localStorage.setItem('st_resources', JSON.stringify(updated));
    };

    // --- JOURNAL LOGIC ---
    const handleSaveJournal = () => {
        if (!journalContent.trim()) return;
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            mood: journalMood,
            content: journalContent.trim(),
            tags: journalTags.split(',').map(t => t.trim()).filter(Boolean),
        };
        const updated = [entry, ...journalEntries];
        setJournalEntries(updated);
        localStorage.setItem(LS_JOURNAL, JSON.stringify(updated));
        setJournalContent('');
        setJournalTags('');
        setShowJournalForm(false);
    };

    const handleDeleteJournal = (id: string) => {
        const updated = journalEntries.filter(e => e.id !== id);
        setJournalEntries(updated);
        localStorage.setItem(LS_JOURNAL, JSON.stringify(updated));
    };

    // --- GALLERY LOGIC ---
    const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            setGalleryFileType('image');
        } else if (file.type.startsWith('video/')) {
            setGalleryFileType('video');
        } else {
            setGalleryFileType('text');
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setGalleryFilePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveStudentWork = () => {
        if (!galleryStudentName.trim() || !galleryTitle.trim() || !galleryFilePreview) return;
        const work: StudentWork = {
            id: Date.now().toString(),
            studentName: galleryStudentName.trim(),
            title: galleryTitle.trim(),
            type: galleryFileType,
            url: galleryFilePreview,
            date: new Date().toISOString(),
            notes: galleryNotes.trim(),
        };
        const updated = [work, ...studentWorks];
        setStudentWorks(updated);
        localStorage.setItem(LS_GALLERY, JSON.stringify(updated));
        setGalleryStudentName('');
        setGalleryTitle('');
        setGalleryNotes('');
        setGalleryFilePreview(null);
        setShowGalleryForm(false);
    };

    const handleDeleteWork = (id: string) => {
        const updated = studentWorks.filter(w => w.id !== id);
        setStudentWorks(updated);
        localStorage.setItem(LS_GALLERY, JSON.stringify(updated));
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return iso; }
    };

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    // ====================== RENDER ======================
    return (
        <div className="w-full min-h-screen bg-slate-950 text-white relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowRight size={20} />
                    <span>العودة</span>
                </button>
                <div className="flex items-center gap-3">
                    <Lock size={22} className="text-amber-400" />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">الخزانة الخاصة</h1>
                </div>
                <div className="w-20" /> {/* Spacer */}
            </header>

            {/* Tab Bar */}
            <nav className="relative z-10 flex items-center justify-center gap-2 px-4 py-3 border-b border-slate-800/30 bg-slate-900/40 backdrop-blur-sm">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
                {/* ==================== TAB 1: ARCHIVE ==================== */}
                {activeTab === 'archive' && (
                    <div className="space-y-6">
                        {/* Search & Filter */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="ابحث في أرشيفك..."
                                    value={archiveSearch}
                                    onChange={(e) => setArchiveSearch(e.target.value)}
                                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { id: 'all', label: 'الكل' },
                                    { id: 'lesson-plan', label: 'دروس' },
                                    { id: 'song', label: 'أناشيد' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setArchiveFilter(f.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${archiveFilter === f.id
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resource Grid */}
                        {filteredResources.length === 0 ? (
                            <div className="text-center py-20">
                                <Archive size={48} className="mx-auto text-slate-600 mb-4" />
                                <p className="text-slate-500 text-lg">الأرشيف فارغ حالياً</p>
                                <p className="text-slate-600 text-sm mt-1">قم بحفظ الدروس والأناشيد من صفحاتها لتظهر هنا</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredResources.map(resource => (
                                    <div key={resource.id} className="group bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {getResourceIcon(resource.type)}
                                                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{resource.type}</span>
                                            </div>
                                            <button onClick={() => handleDeleteResource(resource.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h3 className="text-white font-semibold mb-1 line-clamp-2">{resource.title}</h3>
                                        {resource.tags && resource.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {resource.tags.map((tag, i) => (
                                                    <span key={i} className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                                            <CalendarDays size={12} />
                                            {formatDate(resource.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== TAB 2: JOURNAL ==================== */}
                {activeTab === 'journal' && (
                    <div className="space-y-6">
                        {/* Add Entry Button */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-300">سجل تأملاتك اليومية</h2>
                            <button onClick={() => setShowJournalForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-sm">
                                <Plus size={18} />
                                إدخال جديد
                            </button>
                        </div>

                        {/* Journal Form Modal */}
                        {showJournalForm && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowJournalForm(false)}>
                                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-lg font-bold text-white">📝 تأمل جديد</h3>
                                        <button onClick={() => setShowJournalForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                                    </div>

                                    {/* Mood Selector */}
                                    <label className="text-sm text-slate-400 mb-2 block">كيف كان يومك؟</label>
                                    <div className="flex gap-3 mb-5">
                                        {MOODS.map(mood => (
                                            <button
                                                key={mood.id}
                                                onClick={() => setJournalMood(mood.id)}
                                                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all ${journalMood === mood.id
                                                        ? `border-white/40 ${mood.color}/20 scale-110 shadow-lg`
                                                        : 'border-slate-700 hover:border-slate-500'
                                                    }`}
                                            >
                                                <span className="text-2xl">{mood.emoji}</span>
                                                <span className="text-xs text-slate-400">{mood.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <label className="text-sm text-slate-400 mb-2 block">ماذا تريد أن تكتب؟</label>
                                    <textarea
                                        value={journalContent}
                                        onChange={(e) => setJournalContent(e.target.value)}
                                        placeholder="ملاحظات اليوم... ما الذي نجح؟ ما الذي أحتاج لتحسينه؟"
                                        rows={5}
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none mb-4"
                                    />

                                    {/* Tags */}
                                    <label className="text-sm text-slate-400 mb-2 block">وسوم (اختياري، افصل بفاصلة)</label>
                                    <input
                                        type="text"
                                        value={journalTags}
                                        onChange={(e) => setJournalTags(e.target.value)}
                                        placeholder="رياضيات, الصف الثالث, نشاط ناجح"
                                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors mb-5"
                                    />

                                    <button onClick={handleSaveJournal} disabled={!journalContent.trim()} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        💾 حفظ التأمل
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Journal Timeline */}
                        {journalEntries.length === 0 ? (
                            <div className="text-center py-20">
                                <BookHeart size={48} className="mx-auto text-slate-600 mb-4" />
                                <p className="text-slate-500 text-lg">لم تكتب أي تأملات بعد</p>
                                <p className="text-slate-600 text-sm mt-1">ابدأ بكتابة تأمل يومي لتتبع رحلتك المهنية</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {journalEntries.map(entry => {
                                    const moodData = MOODS.find(m => m.id === entry.mood);
                                    return (
                                        <div key={entry.id} className="group relative bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                                            {/* Date & Mood */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{moodData?.emoji || '😐'}</span>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{formatDate(entry.date)}</p>
                                                        <p className="text-xs text-slate-500">{formatTime(entry.date)}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteJournal(entry.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                                            {/* Tags */}
                                            {entry.tags && entry.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {entry.tags.map((tag, i) => (
                                                        <span key={i} className="text-xs text-indigo-300/80 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">#{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== TAB 3: GALLERY ==================== */}
                {activeTab === 'gallery' && (
                    <div className="space-y-6">
                        {/* Add Work Button */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-300">اعرض إبداعات طلابك المميزة</h2>
                            <button onClick={() => setShowGalleryForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-amber-500/20 transition-all text-sm">
                                <Upload size={18} />
                                إضافة عمل
                            </button>
                        </div>

                        {/* Gallery Form Modal */}
                        {showGalleryForm && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowGalleryForm(false)}>
                                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-lg font-bold text-white">🏆 إضافة عمل طالب</h3>
                                        <button onClick={() => setShowGalleryForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-slate-400 mb-1 block">اسم الطالب</label>
                                            <input type="text" value={galleryStudentName} onChange={e => setGalleryStudentName(e.target.value)} placeholder="أحمد محمد" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
                                        </div>
                                        <div>
                                            <label className="text-sm text-slate-400 mb-1 block">عنوان العمل</label>
                                            <input type="text" value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} placeholder="لوحة عن فصل الربيع" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
                                        </div>
                                        <div>
                                            <label className="text-sm text-slate-400 mb-1 block">رفع الملف (صورة، فيديو، أو مستند)</label>
                                            <input
                                                ref={galleryFileRef}
                                                type="file"
                                                accept="image/*,video/*,.txt,.pdf"
                                                onChange={handleGalleryFile}
                                                className="hidden"
                                            />
                                            <button onClick={() => galleryFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-amber-500/50 hover:text-amber-400 transition-all">
                                                <Upload size={20} />
                                                {galleryFilePreview ? '✅ تم الرفع — اضغط لتغيير' : 'اضغط لاختيار ملف'}
                                            </button>
                                            {galleryFilePreview && galleryFileType === 'image' && (
                                                <img src={galleryFilePreview} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-xl border border-slate-700" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm text-slate-400 mb-1 block">ملاحظات (اختياري)</label>
                                            <textarea value={galleryNotes} onChange={e => setGalleryNotes(e.target.value)} placeholder="عمل متميز في..." rows={2} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none" />
                                        </div>
                                    </div>

                                    <button onClick={handleSaveStudentWork} disabled={!galleryStudentName.trim() || !galleryTitle.trim() || !galleryFilePreview} className="w-full mt-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        🏅 حفظ في لوحة الشرف
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Gallery Grid */}
                        {studentWorks.length === 0 ? (
                            <div className="text-center py-20">
                                <Trophy size={48} className="mx-auto text-slate-600 mb-4" />
                                <p className="text-slate-500 text-lg">لوحة الشرف فارغة</p>
                                <p className="text-slate-600 text-sm mt-1">أضف أعمال طلابك المميزة ليكون لديك أرشيف إبداعي</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {studentWorks.map(work => (
                                    <div key={work.id} className="group bg-slate-900/60 border border-slate-700/60 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5">
                                        {/* Preview */}
                                        {work.type === 'image' && (
                                            <div className="w-full h-48 overflow-hidden">
                                                <img src={work.url} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            </div>
                                        )}
                                        {work.type === 'video' && (
                                            <div className="w-full h-48 bg-slate-800 flex items-center justify-center">
                                                <Video size={40} className="text-slate-500" />
                                            </div>
                                        )}
                                        {work.type === 'text' && (
                                            <div className="w-full h-48 bg-slate-800/50 flex items-center justify-center">
                                                <Type size={40} className="text-slate-500" />
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="text-white font-semibold">{work.title}</h3>
                                                    <p className="text-sm text-amber-400/80">👤 {work.studentName}</p>
                                                </div>
                                                <button onClick={() => handleDeleteWork(work.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {work.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{work.notes}</p>}
                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                <CalendarDays size={12} /> {formatDate(work.date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
