import React, { useState } from 'react';
import { ArrowRight, Beaker, Music, BookOpen, Gamepad2, Sparkles } from 'lucide-react';
import { InteractiveSimulation } from './InteractiveSimulation';
import { MelodyStudio } from './MelodyStudio';
import { SongsStories } from './SongsStories';
import { GamificationHub } from './GamificationHub';

export type CreativityTab = 'simulation' | 'melody' | 'songs' | 'gamification';

interface CreativityStudioProps {
    onBack: () => void;
    initialTopic?: string;
    initialGrade?: string;
    initialSubject?: string;
    initialTab?: CreativityTab;
}

const TABS: { id: CreativityTab; label: string; icon: React.ReactNode; color: string; borderColor: string; desc: string }[] = [
    { id: 'simulation', label: 'محاكاة تفاعلية', icon: <Beaker size={28} />, color: 'from-purple-500/20 to-violet-500/20', borderColor: 'border-purple-500/30', desc: 'تجارب افتراضية تفاعلية لتعزيز الفهم العلمي' },
    { id: 'melody', label: 'استوديو الألحان', icon: <Music size={28} />, color: 'from-pink-500/20 to-rose-500/20', borderColor: 'border-pink-500/30', desc: 'تأليف أناشيد تعليمية مع ألحان وكاراوكي تفاعلي' },
    { id: 'songs', label: 'أغاني وقصص', icon: <BookOpen size={28} />, color: 'from-rose-500/20 to-pink-500/20', borderColor: 'border-rose-500/30', desc: 'أناشيد تعليمية وقصص مشوقة لتعزيز التعلم والمتعة' },
    { id: 'gamification', label: 'التلعيب التعليمي', icon: <Gamepad2 size={28} />, color: 'from-emerald-500/20 to-teal-500/20', borderColor: 'border-emerald-500/30', desc: 'توليد سيناريوهات وألعاب تعليمية ممتعة للطلاب' },
];

export const CreativityStudio: React.FC<CreativityStudioProps> = ({
    onBack,
    initialTopic,
    initialGrade,
    initialSubject,
    initialTab
}) => {
    const [activeTab, setActiveTab] = useState<CreativityTab | null>(initialTab ?? null);

    if (activeTab === 'simulation') {
        return (
            <InteractiveSimulation
                onBack={() => setActiveTab(null)}
                initialTopic={initialTopic}
                initialSubject={initialSubject}
            />
        );
    }
    if (activeTab === 'melody') {
        return (
            <MelodyStudio
                onBack={() => setActiveTab(null)}
            />
        );
    }
    if (activeTab === 'songs') {
        return (
            <SongsStories
                onBack={() => setActiveTab(null)}
                initialTopic={initialTopic}
                initialGrade={initialGrade}
            />
        );
    }
    if (activeTab === 'gamification') {
        return (
            <GamificationHub
                onBack={() => setActiveTab(null)}
                initialTopic={initialTopic}
                initialGrade={initialGrade}
            />
        );
    }

    return (
        <div className="w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100" dir="rtl">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(236,72,153,0.08) 0%, transparent 50%),
                        linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/6 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-white/5 bg-gradient-to-b from-slate-900/60 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowRight size={20} className="rotate-180" />
                        <span>العودة للرئيسية</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Sparkles size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-emerald-300">
                                استوديو الإبداع التربوي
                            </h1>
                            <p className="text-slate-400 text-sm">محاكاة • ألحان • أغاني • قصص • تلعيب</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-5xl mx-auto">
                    <p className="text-slate-400 text-center mb-10 text-lg">
                        اختر أداتك الإبداعية لتصميم محتوى تعليمي ممتع يبهر الطلاب
                    </p>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group relative bg-slate-900/50 backdrop-blur-sm border ${tab.borderColor} rounded-2xl p-8 text-right overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className="relative z-10 flex flex-col items-start gap-4">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tab.color} border ${tab.borderColor} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                                        {tab.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-1 group-hover:text-white">{tab.label}</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300">{tab.desc}</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 group-hover:text-white flex items-center gap-1 mt-2">
                                        افتح
                                        <ArrowRight size={16} className="rotate-180" />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
