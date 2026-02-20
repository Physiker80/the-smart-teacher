
import React, { useState } from 'react';
import { GamificationGenerator } from './GamificationGenerator';
import { GameForge } from './GameForge';
import { FileText, Gamepad2, ArrowRight } from 'lucide-react';

interface GamificationHubProps {
    onBack: () => void;
    initialTopic?: string;
    initialGrade?: string;
}

export const GamificationHub: React.FC<GamificationHubProps> = ({ onBack, initialTopic, initialGrade }) => {
    const [mode, setMode] = useState<'menu' | 'generator' | 'forge'>('menu');

    if (mode === 'generator') {
        return (
            <GamificationGenerator
                onBack={() => setMode('menu')}
                initialTopic={initialTopic}
                initialGrade={initialGrade}
            />
        );
    }

    if (mode === 'forge') {
        return (
            <GameForge
                onBack={() => setMode('menu')}
                initialTopic={initialTopic}
                initialGrade={initialGrade}
            />
        );
    }

    return (
        <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4c1d95 0%, transparent 50%)' }}
            />

            <button onClick={onBack} className="absolute top-6 right-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-20">
                <ArrowRight size={20} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                <span>عودة للرئيسية</span>
            </button>

            <div className="text-center mb-12 relative z-10 animate-in slide-in-from-bottom-4 fade-in duration-700">
                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                    مركز التلعيب
                </h1>
                <p className="text-slate-400 text-lg">اختر الأداة المناسبة لهدفك التعليمي</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full relative z-10">
                {/* Document Generator Card */}
                <button
                    onClick={() => setMode('generator')}
                    className="group relative bg-slate-900/60 border border-slate-700 hover:border-purple-500 rounded-3xl p-8 text-right transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <FileText size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">مصمم الوثائق</h2>
                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                        توليد سيناريوهات ألعاب مكتوبة، ملفات PDF/PPTX، وأوراق عمل جاهزة للطباعة.
                    </p>
                </button>

                {/* Game Forge Card */}
                <button
                    onClick={() => setMode('forge')}
                    className="group relative bg-slate-900/60 border border-slate-700 hover:border-pink-500 rounded-3xl p-8 text-right transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-400 mb-6 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                        <Gamepad2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">مصنع الألعاب (Game Forge)</h2>
                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                        تجربة تفاعلية مباشرة! حول درسك إلى مغامرة رقمية يلعبها الطلاب فوراً.
                    </p>
                    <div className="absolute top-4 left-4 px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full animate-pulse">
                        جديد
                    </div>
                </button>
            </div>
        </div>
    );
};
