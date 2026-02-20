import React from 'react';
import { Shield, User, Globe, ChevronRight, Zap, Hexagon, Terminal } from 'lucide-react';

interface WelcomeScreenProps {
    onStartLogin: () => void;
    onStudentLogin: () => void;
    onGuestAccess: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartLogin, onStudentLogin, onGuestAccess }) => {
    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex flex-col items-center justify-center font-sans text-slate-100">
            
            {/* 1. Animated Background Grid */}
            <div className="absolute inset-0 z-0 opacity-30" 
                 style={{ 
                     backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                     backgroundSize: '60px 60px',
                     transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)'
                 }}>
            </div>
            
            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

            {/* 2. Main Holographic Card */}
            <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
                
                {/* Logo / Icon Area */}
                <div className="mb-6 relative group">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
                    <div className="relative w-20 h-20 bg-slate-900 border-2 border-blue-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <Hexagon size={40} className="text-blue-400" />
                        <div className="absolute inset-0 border border-blue-400/20 rounded-2xl scale-110"></div>
                    </div>
                </div>

                {/* Typography */}
                <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 mb-2 tracking-tight text-center">
                    المعلم الذكي
                </h1>
                <p className="text-blue-400/80 font-mono text-sm tracking-[0.2em] mb-10 uppercase" dir="ltr">
                    بوابة التعليم المستقبلية - v2.1
                </p>

                {/* 3. Action Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-6 md:px-0">
                    
                    {/* A. Teacher Oasis Card */}
                    <button 
                        onClick={onStartLogin}
                        className="group relative bg-slate-900/60 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 text-right overflow-hidden transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:-translate-y-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col h-full items-center md:items-start text-center md:text-right">
                            <div className="w-12 h-12 rounded-full bg-slate-950 border border-blue-500/50 flex items-center justify-center mb-4 text-blue-400 group-hover:text-white group-hover:bg-blue-600 transition-colors shadow-lg">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">واحة المعلم</h3>
                            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                بوابة المعلمين للتخطيط، إدارة الفصول، وتوليد المحتوى الذكي.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-blue-400 text-[10px] font-mono font-bold group-hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                                <ChevronRight size={12} className="rotate-180" />
                                <span>تسجيل دخول للكادر</span>
                            </div>
                        </div>
                    </button>

                    {/* B. Student Oasis Card */}
                    <button 
                        onClick={onStudentLogin}
                        className="group relative bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 text-right overflow-hidden transition-all duration-300 hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:-translate-y-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col h-full items-center md:items-start text-center md:text-right">
                            <div className="w-12 h-12 rounded-full bg-slate-950 border border-emerald-500/50 flex items-center justify-center mb-4 text-emerald-400 group-hover:text-white group-hover:bg-emerald-600 transition-colors shadow-lg">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">واحة التلميذ</h3>
                            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                مساحة الطالب للتعلم الممتع، الكنوز، والمختبرات التفاعلية.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-emerald-400 text-[10px] font-mono font-bold group-hover:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                                <ChevronRight size={12} className="rotate-180" />
                                <span>دخول الطالب</span>
                            </div>
                        </div>
                    </button>

                    {/* C. Guest Card */}
                    <button 
                        onClick={onGuestAccess}
                        className="group relative bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6 text-right overflow-hidden transition-all duration-300 hover:border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:-translate-y-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10 flex flex-col h-full items-center md:items-start text-center md:text-right">
                            <div className="w-12 h-12 rounded-full bg-slate-950 border border-amber-500/50 flex items-center justify-center mb-4 text-amber-500 group-hover:text-white group-hover:bg-amber-600 transition-colors shadow-lg">
                                <Globe size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">دخول زائر</h3>
                            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                جولة سريعة لاستكشاف ميزات النظام والذكاء الاصطناعي.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-amber-500 text-[10px] font-mono font-bold group-hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded">
                                <Terminal size={12} />
                                <span>وضع المعاينة</span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer Status */}
                <div className="mt-16 flex items-center gap-6 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        الخوادم: متصلة
                    </span>
                    <span className="hidden md:inline">|</span>
                    <span className="flex items-center gap-2">
                        <Zap size={10} className="text-yellow-500"/>
                        الاستجابة: 12ms
                    </span>
                    <span className="hidden md:inline">|</span>
                    <span>النطاق: دمشق-SY</span>
                </div>
            </div>
        </div>
    );
};