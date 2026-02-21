import React, { useState, useEffect } from 'react';
import { UserProfile, LessonPlan, CalendarEvent, ClassRoom, Student, Theme } from '../types';
import { Sparkles, Camera, BookOpen, Star, Trophy, Crown, ScrollText, PlayCircle, Cpu, Activity, Clock, ChevronLeft, LogOut, Settings, Music, Beaker, CalendarDays, GraduationCap, Users, TrendingUp, AlertTriangle, FileText, BarChart3, Lock, Brain } from 'lucide-react';
import { WellnessWidget } from './WellnessWidget';
import { ThemeSelector } from './ThemeSelector';
import { TokenUsageWidget } from './TokenUsageWidget';
import { fetchCalendarEvents } from '../services/syncService';
import { fetchTeacherClasses } from '../services/classService';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
    user: UserProfile;
    recentPlans: LessonPlan[];
    onNewLesson: () => void;
    onViewLesson: (plan: LessonPlan) => void;
    onCreativityStudio: () => void;
    onCalendar: () => void;
    onClassManager: () => void;
    onProfile: () => void;
    onLogout: () => void;
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
    onStoryWeaver: () => void;
    onPrivateVault: () => void;
    onCurriculumAgent: () => void;
    onStudentOasis: () => void;
    onOasisCommandCenter: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, recentPlans, onNewLesson, onViewLesson, onCreativityStudio, onCalendar, onClassManager, onProfile, onLogout, currentTheme, onThemeChange, onStoryWeaver, onPrivateVault, onCurriculumAgent, onStudentOasis, onOasisCommandCenter }) => {
    // Default stats if not present
    const stats = user.stats || {
        level: 12,
        xp: 1250,
        nextLevelXp: 2000,
        achievements: 14,
        points: 480
    };

    const xpPercentage = (stats.xp / stats.nextLevelXp) * 100;

    // --- REAL DATA FROM SUPABASE ---
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [bottomTab, setBottomTab] = useState<'recent' | 'upcoming'>('upcoming');

    useEffect(() => {
        const loadDashboardData = async () => {
             try {
                // Get current user ID
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;

                // 1. Fetch Calendar Events
                const allEvents = await fetchCalendarEvents();
                if (allEvents) {
                     const today = new Date().toISOString().split('T')[0];
                     const future = allEvents.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
                     setUpcomingEvents(future.slice(0, 5));
                }

                // 2. Fetch Classes
                const remoteClasses = await fetchTeacherClasses(authUser.id);
                if (remoteClasses) {
                    setClasses(remoteClasses);
                }

            } catch (e) { 
                console.error('Dashboard data load error:', e); 
            }
        };
        
        loadDashboardData();
    }, []);

    // --- COMPUTED STATS ---
    const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
    const allGrades = classes.flatMap(c => c.students.flatMap(s => s.grades));
    const overallAvg = allGrades.length > 0 ? Math.round(allGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / allGrades.length) : 0;
    const totalParticipation = classes.reduce((sum, c) => sum + c.students.reduce((s2, st) => s2 + st.participationCount, 0), 0);
    const atRiskCount = classes.reduce((sum, c) => sum + c.students.filter(s => {
        if (s.grades.length === 0) return false;
        const avg = Math.round(s.grades.reduce((a, g) => a + (g.score / g.maxScore) * 100, 0) / s.grades.length);
        return avg < 60;
    }).length, 0);

    const getEventTypeInfo = (type: CalendarEvent['type']) => {
        switch (type) {
            case 'lesson': return { label: 'درس', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
            case 'exam': return { label: 'اختبار', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
            case 'game': return { label: 'لعبة', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
            case 'event': return { label: 'حدث', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
            default: return { label: 'حدث', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100">

            {/* 1. Background Effects (The Grid) */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}>
            </div>
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            {/* 2. Header Section (Commander Profile) */}
            <div className="relative z-10 p-6 md:p-10 pb-6 flex flex-col md:flex-row justify-between items-end border-b border-white/5 bg-gradient-to-b from-slate-900/50 to-transparent backdrop-blur-sm">

                <div className="flex items-center gap-6" onClick={onProfile}>
                    {/* Avatar HUD - Clickable */}
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-amber-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-amber-500/50 p-1 relative z-10 bg-slate-900/80 transition-transform group-hover:scale-105">
                            <div className="w-full h-full rounded-full overflow-hidden relative">
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=1e293b`}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                                {/* Edit Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Settings className="text-white" size={24} />
                                </div>
                            </div>
                            {/* Level Badge */}
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-amber-500 text-amber-500 text-xs font-bold px-2 py-1 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                المستوى {stats.level}
                            </div>
                        </div>
                    </div>

                    {/* Text Info - Clickable */}
                    <div className="cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-blue-500/30 text-blue-400 bg-blue-500/10">
                                المستخدم: {user.role}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight group-hover:text-amber-500 transition-colors">
                            أهلاً بك، {user.name}
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                            {user.school} - النظام جاهز
                        </p>

                        {/* XP Bar */}
                        <div className="mt-4 w-64">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                                <span>نقاط الخبرة</span>
                                <span>{stats.xp} / {stats.nextLevelXp}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] relative transition-all duration-1000"
                                    style={{ width: `${xpPercentage}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats HUD & Actions */}
                <div className="flex flex-col items-end gap-4 mt-6 md:mt-0">
                    <div className="flex items-center gap-2">
                        <ThemeSelector current={currentTheme} onChange={onThemeChange} />
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                        >
                            <LogOut size={14} />
                            خروج
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 custom-scrollbar">

                {/* Resource Monitor (Top) */}
                <div className="mb-6">
                    <TokenUsageWidget />
                </div>

                {/* Wellness Widget */}
                <div className="mb-8">
                    <WellnessWidget />
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-2 mb-6">
                    <Cpu size={20} className="text-amber-500" />
                    <h2 className="text-xl font-bold text-slate-200">وحدات التحكم</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-slate-700 to-transparent ml-4"></div>
                </div>

                {/* Grid of Modules — Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">

                    {/* Module 1: Create Lesson — PRIMARY */}
                    <button
                        onClick={onNewLesson}
                        className="group relative h-56 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-amber-500/60 hover:shadow-[0_8px_40px_rgba(245,158,11,0.15)]"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-all duration-300">
                                    <BookOpen size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">ابدأ الآن</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-amber-400 transition-colors">تحضير درس جديد</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">استخدم الذكاء الاصطناعي لتوليد خطة درس كاملة ومتكاملة.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 2: Class Manager */}
                    <button
                        onClick={onClassManager}
                        className="group relative h-56 bg-gradient-to-br from-violet-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-violet-500/60 hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-violet-500/8 rounded-full blur-3xl group-hover:bg-violet-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-violet-400/5 rounded-full blur-2xl group-hover:bg-violet-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300">
                                    <GraduationCap size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">إدارة</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-violet-400 transition-colors">إدارة فصولي</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">تنظيم الفصول والطلاب والدرجات والمصادر التعليمية.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 3: School Calendar */}
                    <button
                        onClick={onCalendar}
                        className="group relative h-56 bg-gradient-to-br from-teal-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-teal-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-teal-500/60 hover:shadow-[0_8px_40px_rgba(20,184,166,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-teal-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-teal-500/8 rounded-full blur-3xl group-hover:bg-teal-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-teal-400/5 rounded-full blur-2xl group-hover:bg-teal-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-all duration-300">
                                    <CalendarDays size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">تنظيم</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-teal-400 transition-colors">التقويم المدرسي</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">تنظيم الدروس والأنشطة والاختبارات في تقويم شامل.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 4: استوديو الإبداع التربوي (محاكاة • ألحان • أغاني • تلعيب) */}
                    <button
                        onClick={onCreativityStudio}
                        className="group relative h-56 md:col-span-2 bg-gradient-to-br from-purple-950/40 via-pink-950/30 to-emerald-950/30 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_8px_40px_rgba(168,85,247,0.2)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all duration-500"></div>
                        <div className="absolute right-1/2 bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col md:flex-row h-full justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all duration-300">
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-emerald-300 transition-colors">استوديو الإبداع التربوي</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">محاكاة تفاعلية • استوديو الألحان • أغاني وقصص • التلعيب التعليمي — في مكان واحد</p>
                                </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2">
                                <Beaker size={12} /> <Music size={12} /> <PlayCircle size={12} /> افتح
                            </span>
                        </div>
                    </button>

                    {/* Module 8: Private Vault */}
                    <button
                        onClick={onPrivateVault}
                        className="group relative h-56 bg-gradient-to-br from-orange-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-orange-500/60 hover:shadow-[0_8px_40px_rgba(249,115,22,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-orange-500/8 rounded-full blur-3xl group-hover:bg-orange-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-orange-400/5 rounded-full blur-2xl group-hover:bg-orange-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all duration-300">
                                    <Lock size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">خاص</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-orange-400 transition-colors">الخزانة الخاصة</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">أرشيفك الإبداعي، مذكراتك اليومية، ولوحة شرف طلابك.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 9: Curriculum Agent (منهاجي) */}
                    <button
                        onClick={onCurriculumAgent}
                        className="group relative h-56 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-cyan-500/60 hover:shadow-[0_8px_40px_rgba(6,182,212,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-500/8 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl group-hover:bg-cyan-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300">
                                    <Brain size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">وكيل AI</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-cyan-400 transition-colors">منهاجي</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">تحليل الكتب المدرسية واستخراج المنهج بالذكاء الاصطناعي.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 10: Student Oasis (واحة التلميذ) */}
                    <button
                        onClick={onStudentOasis}
                        className="group relative h-56 bg-gradient-to-br from-amber-800/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-amber-500/60 hover:shadow-[0_8px_40px_rgba(245,158,11,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-all duration-300">
                                    <Trophy size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">للطالب</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-amber-400 transition-colors">واحة التلميذ</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">رحلة الطالب التعليمية، الكنوز، والتحديات الممتعة.</p>
                            </div>
                        </div>
                    </button>

                    {/* Module 11: Oasis Command Center (Teacher View) */}
                    <button
                        onClick={onOasisCommandCenter}
                        className="group relative h-56 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/40 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-7 text-right overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-emerald-500/60 hover:shadow-[0_8px_40px_rgba(16,185,129,0.15)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/8 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500"></div>
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-emerald-400/5 rounded-full blur-2xl group-hover:bg-emerald-400/10 transition-all duration-500"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300">
                                    <Activity size={26} />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300">التحكم</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-1.5 group-hover:text-emerald-400 transition-colors">مركز قيادة الواحة</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">إدارة الفصل التفاعلي وإرسال المهام للطلاب لحظياً.</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Secondary Actions */}
                <div className="flex gap-4 mb-10">
                    <button className="flex-1 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all">
                        <ScrollText size={16} />
                        سجل العمليات (الأرشيف)
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-amber-600/20 to-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-500 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all">
                        <Crown size={16} />
                        ترقية النظام (Pro)
                    </button>
                </div>

                {/* Bottom Section: Activity/Upcoming + Quick Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Tabbed: Recent / Upcoming */}
                    <div className="lg:col-span-2 border border-slate-800 rounded-2xl bg-slate-900/30 backdrop-blur overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
                                <button onClick={() => setBottomTab('upcoming')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${bottomTab === 'upcoming' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                    <CalendarDays size={12} className="inline ml-1" /> الجدول القادم
                                </button>
                                <button onClick={() => setBottomTab('recent')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${bottomTab === 'recent' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                    <Activity size={12} className="inline ml-1" /> الدروس الأخيرة
                                </button>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">{bottomTab === 'upcoming' ? 'الأحداث القادمة' : 'سجل مباشر'}</span>
                        </div>

                        <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {bottomTab === 'recent' ? (
                                recentPlans.length > 0 ? recentPlans.map(plan => (
                                    <div key={plan.id} onClick={() => onViewLesson(plan)} className="flex items-center p-4 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                                        <div className="w-10 h-10 rounded bg-slate-950 border border-slate-700 flex items-center justify-center text-slate-400 font-bold font-mono group-hover:text-white group-hover:border-amber-500 transition-colors">
                                            {plan.subject?.[0] || '؟'}
                                        </div>
                                        <div className="flex-1 mr-4">
                                            <h4 className="font-bold text-slate-300 text-sm group-hover:text-amber-400 transition-colors">{plan.topic}</h4>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{plan.grade} • ID: {plan.id.slice(-4)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                <Clock size={10} />
                                                {plan.date || 'اليوم'}
                                            </div>
                                            <ChevronLeft size={16} className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center p-12 text-slate-600 font-mono text-sm">
                                        [لا توجد بيانات] -&gt; ابدأ مهمة جديدة
                                    </div>
                                )
                            ) : (
                                upcomingEvents.length > 0 ? upcomingEvents.map(evt => {
                                    const info = getEventTypeInfo(evt.type);
                                    return (
                                        <div key={evt.id} onClick={onCalendar} className="flex items-center p-4 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-xs ${info.bg} ${info.color}`}>
                                                {info.label}
                                            </div>
                                            <div className="flex-1 mr-4">
                                                <h4 className="font-bold text-slate-300 text-sm group-hover:text-blue-400 transition-colors">{evt.title}</h4>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    {evt.subject && `${evt.subject} • `}{evt.grade || ''}{evt.notes ? ` — ${evt.notes}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                    <CalendarDays size={10} />
                                                    {evt.date}
                                                </div>
                                                {evt.time && <span className="text-[10px] text-slate-600 font-mono">{evt.time}</span>}
                                                <ChevronLeft size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center p-12 text-slate-600 text-sm">
                                        <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
                                        <p>لا توجد أحداث مجدولة قادمة</p>
                                        <button onClick={onCalendar} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                            افتح التقويم لإضافة أحداث &laquo;
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Quick Reports — Real Student Data */}
                    <div className="border border-slate-800 rounded-2xl bg-slate-900/30 backdrop-blur overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" />
                                تقارير سريعة
                            </h3>
                            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Live</span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col gap-4">
                            {classes.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-sm">
                                    <Users size={32} className="mb-2 opacity-40" />
                                    <p>أنشئ فصولاً لعرض التقارير</p>
                                    <button onClick={onClassManager} className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors">
                                        إدارة الفصول &laquo;
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <Users size={18} className="text-blue-400 mx-auto mb-1" />
                                            <div className="text-2xl font-black text-white">{totalStudents}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">إجمالي الطلاب</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <TrendingUp size={18} className={`mx-auto mb-1 ${overallAvg >= 70 ? 'text-emerald-400' : overallAvg >= 50 ? 'text-amber-400' : 'text-red-400'}`} />
                                            <div className="text-2xl font-black text-white">{overallAvg}%</div>
                                            <div className="text-[10px] text-slate-500 font-bold">المعدل العام</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <Star size={18} className="text-amber-400 mx-auto mb-1" />
                                            <div className="text-2xl font-black text-white">{totalParticipation}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">المشاركات</div>
                                        </div>
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                                            <AlertTriangle size={18} className={`mx-auto mb-1 ${atRiskCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                                            <div className="text-2xl font-black text-white">{atRiskCount}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">طلاب متعثرون</div>
                                        </div>
                                    </div>

                                    {/* Average Progress Bar */}
                                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-bold">
                                            <span>المعدل العام للفصول</span>
                                            <span className={overallAvg >= 70 ? 'text-emerald-400' : overallAvg >= 50 ? 'text-amber-400' : 'text-red-400'}>{overallAvg}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${overallAvg >= 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : overallAvg >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                                                style={{ width: `${overallAvg}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Per-Class Breakdown */}
                                    <div className="space-y-2 mt-auto">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">أداء الفصول</div>
                                        {classes.slice(0, 4).map(cls => {
                                            const clsGrades = cls.students.flatMap(s => s.grades);
                                            const clsAvg = clsGrades.length > 0 ? Math.round(clsGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / clsGrades.length) : 0;
                                            return (
                                                <div key={cls.id} className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-300 truncate flex-1 font-bold">{cls.name}</span>
                                                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${clsAvg >= 70 ? 'bg-emerald-500' : clsAvg >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${clsAvg}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono w-8 text-left">{clsAvg}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};
