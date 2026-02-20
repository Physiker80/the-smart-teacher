
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent } from '../types';
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../services/syncService';
import {
    ArrowLeft, ChevronRight, ChevronLeft, Plus, X, CalendarDays,
    BookOpen, Gamepad2, GraduationCap, PartyPopper, Clock, Trash2,
    Save, Sparkles, Upload, Globe, FileText, Image as ImageIcon
} from 'lucide-react';

interface SchoolCalendarProps {
    onBack: () => void;
    initialEvent?: { title: string; subject?: string; grade?: string; planId?: string };
}

type CalendarView = 'day' | 'week' | 'month' | 'year';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAYS_SHORT = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const MONTHS_AR = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const EVENT_TYPES: { value: CalendarEvent['type']; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    { value: 'lesson', label: 'درس', icon: <BookOpen size={14} />, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
    { value: 'game', label: 'نشاط/لعبة', icon: <Gamepad2 size={14} />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
    { value: 'exam', label: 'اختبار', icon: <GraduationCap size={14} />, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
    { value: 'event', label: 'مناسبة', icon: <PartyPopper size={14} />, color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
];

const getEventColor = (type: CalendarEvent['type']) => {
    switch (type) {
        case 'lesson': return { dot: 'bg-blue-500', bg: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-400/50', text: 'text-blue-300' };
        case 'game': return { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/50', text: 'text-emerald-300' };
        case 'exam': return { dot: 'bg-red-500', bg: 'bg-red-500/10 border-red-500/20 hover:border-red-400/50', text: 'text-red-300' };
        case 'event': return { dot: 'bg-amber-500', bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/50', text: 'text-amber-300' };
        default: return { dot: 'bg-slate-500', bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-300' };
    }
};

const getSyrianHolidays = (year: number): { title: string; date: string }[] => [
    { title: 'رأس السنة الميلادية', date: `${year}-01-01` },
    { title: 'عيد المعلم', date: `${year}-03-03` },
    { title: 'عيد الثورة', date: `${year}-03-08` },
    { title: 'عيد الأم', date: `${year}-03-21` },
    { title: 'عيد الجلاء', date: `${year}-04-17` },
    { title: 'عيد العمال', date: `${year}-05-01` },
    { title: 'عيد الشهداء', date: `${year}-05-06` },
    { title: 'عيد الاستقلال', date: `${year}-10-06` },
    { title: 'عيد الميلاد المجيد', date: `${year}-12-25` },
];

const fmtDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ onBack, initialEvent }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentDay, setCurrentDay] = useState(today.getDate());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
    const [view, setView] = useState<CalendarView>('month');
    const [importToast, setImportToast] = useState<string | null>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<CalendarEvent['type']>('lesson');
    const [newTime, setNewTime] = useState('08:00');
    const [newSubject, setNewSubject] = useState('');
    const [newGrade, setNewGrade] = useState('');
    const [newNotes, setNewNotes] = useState('');

    useEffect(() => {
        fetchCalendarEvents().then(setEvents).catch(console.error);
    }, []);

    const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

    useEffect(() => {
        if (initialEvent) {
            setNewTitle(initialEvent.title); setNewSubject(initialEvent.subject || '');
            setNewGrade(initialEvent.grade || ''); setNewType('lesson');
            setSelectedDate(todayStr); setShowAddModal(true);
        }
    }, [initialEvent]);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    const getDayStr = (d: number) => fmtDate(currentYear, currentMonth, d);
    const evtsFor = (ds: string) => events.filter(e => e.date === ds);

    const navigate = (dir: number) => {
        setAnimDir(dir > 0 ? 'left' : 'right');
        setTimeout(() => {
            if (view === 'day') { const d = new Date(currentYear, currentMonth, currentDay + dir); setCurrentDay(d.getDate()); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); }
            else if (view === 'week') { const d = new Date(currentYear, currentMonth, currentDay + dir * 7); setCurrentDay(d.getDate()); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); }
            else if (view === 'month') { let m = currentMonth + dir, y = currentYear; if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; } setCurrentMonth(m); setCurrentYear(y); }
            else setCurrentYear(currentYear + dir);
            setAnimDir(null);
        }, 200);
    };

    const goToToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setCurrentDay(today.getDate()); setSelectedDate(todayStr); };

    const openAddModal = () => {
        if (!selectedDate) setSelectedDate(todayStr);
        if (!initialEvent) { setNewTitle(''); setNewSubject(''); setNewGrade(''); setNewNotes(''); setNewType('lesson'); setNewTime('08:00'); }
        setShowAddModal(true);
    };

    const handleAddEvent = async () => {
        if (!newTitle.trim() || !selectedDate) return;
        try {
            const added = await createCalendarEvent({
                title: newTitle.trim(), date: selectedDate, time: newTime, type: newType,
                subject: newSubject.trim() || undefined, grade: newGrade.trim() || undefined,
                notes: newNotes.trim() || undefined
            });
            const localEvt: CalendarEvent = {
                 id: added.id,
                 title: added.title,
                 date: added.date,
                 time: added.time,
                 type: added.type,
                 subject: added.details?.subject,
                 grade: added.details?.grade,
                 notes: added.details?.notes,
                 relatedClassId: added.related_class_id
            };
            setEvents([...events, localEvt]);
        } catch(e) { console.error(e); }
        setShowAddModal(false); setNewTitle(''); setNewNotes('');
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            await deleteCalendarEvent(id);
            setEvents(events.filter(e => e.id !== id));
        } catch(e) { console.error(e); }
    };

    // ===== IMPORT =====
    const toast = (msg: string, ms = 3000) => { setImportToast(msg); setTimeout(() => setImportToast(null), ms); };

    const bulkCreateEvents = async (newEvents: CalendarEvent[]) => {
        try {
            const added: CalendarEvent[] = [];
            for (const e of newEvents) {
                const res = await createCalendarEvent({
                    title: e.title, date: e.date, time: e.time, type: e.type,
                    subject: e.subject, grade: e.grade, notes: e.notes
                });
                added.push({
                    id: res.id,
                    title: res.title,
                    date: res.date,
                    time: res.time,
                    type: res.type,
                    subject: res.details?.subject,
                    grade: res.details?.grade,
                    notes: res.details?.notes,
                    relatedClassId: res.related_class_id
                } as CalendarEvent);
            }
            if(added.length > 0) setEvents(prev => [...prev, ...added]);
        } catch (e) {
            console.error(e);
            toast('حدث خطأ أثناء حفظ الأحداث', 3000);
        }
    };

    const handleImportHolidays = () => {
        const hols = getSyrianHolidays(currentYear);
        const existing = new Set(events.map(e => e.title + e.date));
        const nw: CalendarEvent[] = hols.filter(h => !existing.has(h.title + h.date)).map(h => ({
            id: `evt-hol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: h.title, date: h.date, time: '', type: 'event' as CalendarEvent['type'], notes: 'عطلة رسمية 🎌',
        }));
        if (nw.length === 0) toast('العطل الرسمية موجودة بالفعل ✅');
        else { bulkCreateEvents(nw); toast(`تم استيراد ${nw.length} عطلة رسمية ✅`); }
        setShowImportModal(false);
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                let imp: CalendarEvent[] = [];
                if (f.name.endsWith('.json')) {
                    const d = JSON.parse(text);
                    imp = (Array.isArray(d) ? d : d.events || []).map((it: any, i: number) => ({
                        id: `evt-imp-${Date.now()}-${i}`, title: it.title || it.name || 'حدث',
                        date: it.date || todayStr, time: it.time || '', type: it.type || 'event', notes: it.notes || it.description || '',
                    }));
                } else if (f.name.endsWith('.csv')) {
                    const lines = text.split('\n').filter(l => l.trim());
                    const hdr = lines[0]?.split(',').map(h => h.trim().toLowerCase());
                    for (let i = 1; i < lines.length; i++) {
                        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const o: any = {}; hdr?.forEach((h, idx) => { o[h] = vals[idx]; });
                        imp.push({ id: `evt-imp-${Date.now()}-${i}`, title: o.title || o.name || 'حدث', date: o.date || todayStr, time: o.time || '', type: o.type || 'event', notes: o.notes || '' });
                    }
                } else if (f.name.endsWith('.ics')) {
                    text.split('BEGIN:VEVENT').slice(1).forEach((blk, i) => {
                        const gf = (n: string) => { const m = blk.match(new RegExp(`${n}[^:]*:(.*)`)); return m?.[1]?.trim() || ''; };
                        const dt = gf('DTSTART');
                        const ds = dt.length >= 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : todayStr;
                        imp.push({ id: `evt-imp-${Date.now()}-${i}`, title: gf('SUMMARY') || 'حدث', date: ds, time: dt.length >= 13 ? `${dt.slice(9, 11)}:${dt.slice(11, 13)}` : '', type: 'event', notes: gf('DESCRIPTION') });
                    });
                }
                if (imp.length > 0) { bulkCreateEvents(imp); toast(`تم استيراد ${imp.length} حدث ✅`); }
                else toast('لم يتم العثور على أحداث في الملف ⚠️');
            } catch { toast('خطأ في قراءة الملف ❌'); }
            setShowImportModal(false);
        };
        reader.readAsText(f); e.target.value = '';
    };

    const handleImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setImportToast('جاري تحليل الصورة... ⏳');
        try {
            // @ts-ignore
            const Tesseract = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
            const worker = await Tesseract.createWorker('ara+eng');
            const { data } = await worker.recognize(f);
            await worker.terminate();
            const lines = data.text.split('\n').filter((l: string) => l.trim());
            const dp = /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/;
            const ext: CalendarEvent[] = [];
            lines.forEach((line: string, i: number) => {
                const m = line.match(dp);
                if (m) {
                    let ds = m[1].replace(/\//g, '-');
                    const p = ds.split('-'); if (p[0].length <= 2) ds = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                    ext.push({ id: `evt-ocr-${Date.now()}-${i}`, title: line.replace(dp, '').replace(/[-\/,;:|]+/g, ' ').trim() || `حدث ${i + 1}`, date: ds, time: '', type: 'event' });
                }
            });
            if (ext.length > 0) { bulkCreateEvents(ext); toast(`تم استخراج ${ext.length} حدث من الصورة ✅`, 5000); }
            else toast(`تم قراءة النص لكن لم يُعثر على تواريخ`, 5000);
        } catch { toast('تعذر تحليل الصورة — تأكد من اتصالك بالإنترنت ❌', 5000); }
        setShowImportModal(false); e.target.value = '';
    };

    const selectedDayEvents = selectedDate ? evtsFor(selectedDate) : [];
    const selDayNum = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
    const selMonNum = selectedDate ? parseInt(selectedDate.split('-')[1]) : null;

    const getWeekDays = () => {
        const d = new Date(currentYear, currentMonth, currentDay);
        const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
        return Array.from({ length: 7 }, (_, i) => { const wd = new Date(sun); wd.setDate(sun.getDate() + i); return { date: wd, str: fmtDate(wd.getFullYear(), wd.getMonth(), wd.getDate()) }; });
    };

    const calCells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) calCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

    const navTitle = (() => {
        if (view === 'day') { const d = new Date(currentYear, currentMonth, currentDay); return `${WEEKDAYS_AR[d.getDay()]} — ${currentDay} ${MONTHS_AR[currentMonth]} ${currentYear}`; }
        if (view === 'week') { const wk = getWeekDays(); return `${wk[0].date.getDate()} ${MONTHS_AR[wk[0].date.getMonth()]} — ${wk[6].date.getDate()} ${MONTHS_AR[wk[6].date.getMonth()]} ${currentYear}`; }
        if (view === 'year') return `${currentYear}`;
        return `${MONTHS_AR[currentMonth]} ${currentYear}`;
    })();

    const renderEventCard = (evt: CalendarEvent) => {
        const c = getEventColor(evt.type); const ti = EVENT_TYPES.find(et => et.value === evt.type);
        return (
            <div key={evt.id} className={`relative border rounded-xl p-3.5 ${c.bg} transition-all group`}>
                <button onClick={() => handleDeleteEvent(evt.id)} className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={12} /></button>
                <div className="flex items-center gap-2 mb-2">
                    <span className={c.text}>{ti?.icon}</span>
                    <span className={`text-[10px] font-bold ${c.text} uppercase`}>{ti?.label}</span>
                    {evt.time && <span className="text-[10px] text-slate-500 flex items-center gap-0.5 mr-auto"><Clock size={10} />{evt.time}</span>}
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{evt.title}</h4>
                {(evt.subject || evt.grade) && <div className="flex flex-wrap gap-1.5 mt-2">
                    {evt.subject && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{evt.subject}</span>}
                    {evt.grade && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{evt.grade}</span>}
                </div>}
                {evt.notes && <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{evt.notes}</p>}
            </div>
        );
    };

    // ===== RENDER =====
    return (
        <div className="relative w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 20% 80%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 50%)` }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            {/* Header */}
            <div className="relative z-10 p-6 md:p-8 pb-4 border-b border-white/5 bg-gradient-to-b from-slate-900/60 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all"><ArrowLeft size={18} /></button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3"><CalendarDays className="text-indigo-400" size={28} /> التقويم المدرسي</h1>
                            <p className="text-xs text-slate-500 mt-1">خطط دروسك وأنشطتك بسهولة</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold hover:border-pink-500/50 hover:text-pink-300 transition-all"><Upload size={16} /> استيراد</button>
                        <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"><Plus size={16} /> إضافة حدث</button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {([{ v: 'day' as CalendarView, l: 'يوم' }, { v: 'week' as CalendarView, l: 'أسبوع' }, { v: 'month' as CalendarView, l: 'شهر' }, { v: 'year' as CalendarView, l: 'سنة' }]).map(vt => (
                        <button key={vt.v} onClick={() => setView(vt.v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === vt.v ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>{vt.l}</button>
                    ))}
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        {/* Nav */}
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all"><ChevronRight size={18} /></button>
                            <div className="text-center">
                                <h2 className={`text-2xl font-bold text-white transition-all duration-200 ${animDir ? 'opacity-0 translate-y-2' : ''}`}>{navTitle}</h2>
                                <button onClick={goToToday} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono mt-1">▶ العودة لليوم</button>
                            </div>
                            <button onClick={() => navigate(1)} className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all"><ChevronLeft size={18} /></button>
                        </div>

                        {/* MONTH */}
                        {view === 'month' && (<>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {WEEKDAYS_AR.map((d, i) => <div key={i} className={`text-center text-xs font-bold py-2 rounded-lg ${i === 5 ? 'text-emerald-400 bg-emerald-500/5' : i === 6 ? 'text-red-400 bg-red-500/5' : 'text-slate-500'}`}>{d}</div>)}
                            </div>
                            <div className={`grid grid-cols-7 gap-1 transition-all duration-200 ${animDir === 'left' ? 'opacity-0 -translate-x-4' : animDir === 'right' ? 'opacity-0 translate-x-4' : ''}`}>
                                {calCells.map((day, idx) => {
                                    if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
                                    const ds = getDayStr(day), de = evtsFor(ds), isT = ds === todayStr, isSel = ds === selectedDate, dow = new Date(currentYear, currentMonth, day).getDay();
                                    return (
                                        <button key={day} onClick={() => setSelectedDate(ds)} className={`relative aspect-square rounded-xl border p-1.5 flex flex-col items-center justify-start transition-all group cursor-pointer
                                            ${isT ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : ''} ${isSel && !isT ? 'border-amber-500/50 bg-amber-500/5' : ''} ${!isT && !isSel ? 'border-slate-800 hover:border-slate-600 hover:bg-slate-900/50' : ''} ${dow === 5 ? 'bg-emerald-500/[0.03]' : ''} ${dow === 6 ? 'bg-red-500/[0.03]' : ''}`}>
                                            <span className={`text-sm font-bold mt-1 ${isT ? 'text-indigo-300' : dow === 5 ? 'text-emerald-400/70' : dow === 6 ? 'text-red-400/70' : 'text-slate-400 group-hover:text-white'}`}>{day}</span>
                                            {isT && <span className="text-[8px] text-indigo-400 font-bold mt-0.5">اليوم</span>}
                                            {de.length > 0 && <div className="flex gap-0.5 mt-auto mb-1 flex-wrap justify-center">
                                                {de.slice(0, 4).map((evt, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${getEventColor(evt.type).dot}`} />)}
                                                {de.length > 4 && <span className="text-[8px] text-slate-500">+{de.length - 4}</span>}
                                            </div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </>)}

                        {/* WEEK */}
                        {view === 'week' && (
                            <div className={`transition-all duration-200 ${animDir ? 'opacity-0' : ''}`}>
                                <div className="grid grid-cols-8 gap-px bg-slate-800 rounded-xl overflow-hidden border border-slate-800">
                                    <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-600 font-bold">الوقت</div>
                                    {getWeekDays().map((wd, i) => {
                                        const isT = wd.str === todayStr;
                                        return <div key={i} className={`p-2 text-center text-xs font-bold ${isT ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-400'}`}>
                                            <div>{WEEKDAYS_SHORT[i]}</div><div className={`text-lg font-black ${isT ? 'text-indigo-300' : 'text-white'}`}>{wd.date.getDate()}</div>
                                        </div>;
                                    })}
                                    {HOURS.map(hr => (<React.Fragment key={hr}>
                                        <div className="bg-slate-950 p-1.5 text-[10px] text-slate-600 text-center font-mono border-t border-slate-800/50">{String(hr).padStart(2, '0')}:00</div>
                                        {getWeekDays().map((wd, i) => {
                                            const evts = evtsFor(wd.str).filter(e => e.time && parseInt(e.time.split(':')[0]) === hr);
                                            return <div key={i} onClick={() => { setSelectedDate(wd.str); setNewTime(`${String(hr).padStart(2, '0')}:00`); }}
                                                className="bg-slate-950 p-1 min-h-[48px] border-t border-slate-800/50 cursor-pointer hover:bg-slate-900/50 transition-colors">
                                                {evts.map(evt => { const col = getEventColor(evt.type); return <div key={evt.id} className={`text-[9px] px-1.5 py-1 rounded ${col.bg} ${col.text} font-bold truncate mb-0.5 border`}>{evt.title}</div>; })}
                                            </div>;
                                        })}
                                    </React.Fragment>))}
                                </div>
                            </div>
                        )}

                        {/* DAY */}
                        {view === 'day' && (
                            <div className={`transition-all duration-200 ${animDir ? 'opacity-0' : ''}`}>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                    {HOURS.map(hr => {
                                        const ds = fmtDate(currentYear, currentMonth, currentDay);
                                        const evts = evtsFor(ds).filter(e => e.time && parseInt(e.time.split(':')[0]) === hr);
                                        return (
                                            <div key={hr} onClick={() => { setSelectedDate(ds); setNewTime(`${String(hr).padStart(2, '0')}:00`); }}
                                                className="flex border-b border-slate-800/50 hover:bg-slate-900/80 cursor-pointer transition-colors min-h-[56px]">
                                                <div className="w-16 flex-none p-2 text-xs text-slate-600 font-mono text-center border-r border-slate-800/50">{String(hr).padStart(2, '0')}:00</div>
                                                <div className="flex-1 p-2 space-y-1">
                                                    {evts.map(evt => {
                                                        const col = getEventColor(evt.type); const ti = EVENT_TYPES.find(et => et.value === evt.type);
                                                        return <div key={evt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${col.bg} group/evt`}>
                                                            <span className={col.text}>{ti?.icon}</span><span className="text-sm font-bold text-white flex-1">{evt.title}</span>
                                                            {evt.time && <span className="text-[10px] text-slate-500">{evt.time}</span>}
                                                            <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(evt.id); }} className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center text-red-400 opacity-0 group-hover/evt:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={10} /></button>
                                                        </div>;
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* YEAR */}
                        {view === 'year' && (
                            <div className={`grid grid-cols-3 md:grid-cols-4 gap-4 transition-all duration-200 ${animDir ? 'opacity-0' : ''}`}>
                                {Array.from({ length: 12 }, (_, mi) => {
                                    const dim = new Date(currentYear, mi + 1, 0).getDate();
                                    const fdm = new Date(currentYear, mi, 1).getDay();
                                    const isCur = mi === today.getMonth() && currentYear === today.getFullYear();
                                    return (
                                        <div key={mi} onClick={() => { setCurrentMonth(mi); setView('month'); }}
                                            className={`bg-slate-900/50 border rounded-xl p-3 cursor-pointer hover:border-indigo-500/50 transition-all ${isCur ? 'border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'border-slate-800'}`}>
                                            <h4 className={`text-xs font-bold mb-2 ${isCur ? 'text-indigo-300' : 'text-slate-400'}`}>{MONTHS_AR[mi]}</h4>
                                            <div className="grid grid-cols-7 gap-px">
                                                {WEEKDAYS_SHORT.map((wd, i) => <div key={i} className="text-[7px] text-slate-700 text-center">{wd.charAt(0)}</div>)}
                                                {Array.from({ length: fdm }, (_, i) => <div key={`e-${i}`} />)}
                                                {Array.from({ length: dim }, (_, i) => {
                                                    const d = i + 1, ds = fmtDate(currentYear, mi, d), hasE = events.some(e => e.date === ds), isT = ds === todayStr;
                                                    return <div key={d} className={`text-[8px] text-center rounded-sm py-0.5 ${isT ? 'bg-indigo-500 text-white font-bold' : hasE ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-600'}`}>{d}</div>;
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        {view !== 'year' && <div className="flex flex-wrap gap-4 mt-6 px-2">
                            {EVENT_TYPES.map(et => <div key={et.value} className="flex items-center gap-1.5 text-xs text-slate-500"><div className={`w-2.5 h-2.5 rounded-full ${getEventColor(et.value).dot}`} />{et.label}</div>)}
                        </div>}
                    </div>

                    {/* Sidebar */}
                    {view !== 'year' && (
                        <div className="w-full lg:w-80 flex-none">
                            <div className="sticky top-6 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur overflow-hidden">
                                <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Sparkles size={16} className="text-indigo-400" />
                                        {selectedDate ? <>{selDayNum && selMonNum && <span>{selDayNum} {MONTHS_AR[(selMonNum || 1) - 1]}</span>}</> : <span>اختر يوماً</span>}
                                    </h3>
                                    {selectedDate && <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedDate}</p>}
                                </div>
                                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                                    {selectedDate && selectedDayEvents.length === 0 && (
                                        <div className="text-center py-8">
                                            <CalendarDays size={32} className="text-slate-700 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500">لا توجد أحداث</p>
                                            <button onClick={openAddModal} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 mx-auto"><Plus size={12} /> إضافة حدث جديد</button>
                                        </div>
                                    )}
                                    {!selectedDate && <div className="text-center py-8"><CalendarDays size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-sm text-slate-500">اضغط على أي يوم لعرض الأحداث</p></div>}
                                    {selectedDayEvents.map(evt => renderEventCard(evt))}
                                </div>
                                {selectedDate && <div className="p-4 border-t border-slate-800">
                                    <button onClick={openAddModal} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-bold hover:bg-indigo-600/30 transition-all"><Plus size={14} /> إضافة حدث</button>
                                </div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarDays size={20} className="text-indigo-400" /> إضافة حدث جديد</h3>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700"><CalendarDays size={14} className="text-indigo-400" /><span className="font-mono">{selectedDate}</span></div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-2 block">نوع الحدث</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {EVENT_TYPES.map(et => <button key={et.value} onClick={() => setNewType(et.value)} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${newType === et.value ? `${et.bgColor} ${et.color}` : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{et.icon}{et.label}</button>)}
                                </div>
                            </div>
                            <div><label className="text-xs text-slate-500 font-bold mb-2 block">عنوان الحدث *</label><input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: درس الرياضيات" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" dir="rtl" /></div>
                            <div><label className="text-xs text-slate-500 font-bold mb-2 block">الوقت</label><input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-slate-500 font-bold mb-2 block">المادة</label><input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="العلوم" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" dir="rtl" /></div>
                                <div><label className="text-xs text-slate-500 font-bold mb-2 block">الصف</label><input type="text" value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="الثالث" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" dir="rtl" /></div>
                            </div>
                            <div><label className="text-xs text-slate-500 font-bold mb-2 block">ملاحظات</label><textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none" dir="rtl" /></div>
                        </div>
                        <div className="p-5 pt-0 flex gap-3">
                            <button onClick={handleAddEvent} disabled={!newTitle.trim()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all shadow-lg disabled:shadow-none"><Save size={16} /> حفظ الحدث</button>
                            <button onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-all">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowImportModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-pink-500/10 to-purple-500/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Upload size={20} className="text-pink-400" /> استيراد أحداث</h3>
                            <button onClick={() => setShowImportModal(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <button onClick={handleImportHolidays} className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all text-right">
                                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-none"><Globe size={20} className="text-pink-400" /></div>
                                <div className="flex-1"><h4 className="font-bold text-white text-sm">العطل الرسمية السورية</h4><p className="text-[10px] text-slate-500 mt-0.5">استيراد العطل والمناسبات لسنة {currentYear}</p></div>
                            </button>
                            <label className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-right cursor-pointer">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-none"><FileText size={20} className="text-blue-400" /></div>
                                <div className="flex-1"><h4 className="font-bold text-white text-sm">استيراد من ملف</h4><p className="text-[10px] text-slate-500 mt-0.5">CSV, JSON, أو ICS (تقويم Google)</p></div>
                                <input type="file" accept=".csv,.json,.ics" onChange={handleFileImport} className="hidden" />
                            </label>
                            <label className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-right cursor-pointer">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-none"><ImageIcon size={20} className="text-amber-400" /></div>
                                <div className="flex-1"><h4 className="font-bold text-white text-sm">قراءة من صورة أو PDF</h4><p className="text-[10px] text-slate-500 mt-0.5">تحليل ذكي لاستخراج التواريخ (تجريبي)</p></div>
                                <input type="file" accept="image/*,.pdf" onChange={handleImageImport} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {importToast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-sm font-bold backdrop-blur-md shadow-2xl flex items-center gap-2 animate-pulse"><Upload size={16} /> {importToast}</div>}

            <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        </div>
    );
};
