import React, { useState } from 'react';
import { ArrowRight, Beaker, Atom, Zap, Lightbulb, Play, RotateCcw, Sparkles, FlaskConical, Orbit, Calculator } from 'lucide-react';

interface InteractiveSimulationProps {
    onBack: () => void;
    initialTopic?: string;
    initialSubject?: string;
}

interface Simulation {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    color: string;
    borderColor: string;
}

export const InteractiveSimulation: React.FC<InteractiveSimulationProps> = ({ onBack, initialTopic, initialSubject }) => {
    const [activeSimulation, setActiveSimulation] = useState<string | null>(null);

    // Filter/Highlight Logic based on initialTopic/Subject
    const getRelevanceScore = (sim: Simulation) => {
        if (!initialTopic && !initialSubject) return 0;
        let score = 0;
        if (initialSubject && sim.category.includes(initialSubject)) score += 2;
        if (initialTopic) {
            const topicWords = initialTopic.split(' ');
            if (topicWords.some(w => sim.title.includes(w) || sim.description.includes(w))) score += 5;
        }
        return score;
    };

    const simulations: Simulation[] = [
        {
            id: 'solar-system',
            title: '🪐 المجموعة الشمسية',
            description: 'استكشاف الكواكب وأحجامها النسبية ومساراتها حول الشمس.',
            icon: <Orbit size={28} />,
            category: 'علوم',
            color: 'from-blue-500/20 to-indigo-500/20',
            borderColor: 'border-blue-500/30'
        },
        {
            id: 'water-cycle',
            title: '💧 دورة المياه',
            description: 'محاكاة تبخر الماء وتكثفه وهطوله كأمطار.',
            icon: <FlaskConical size={28} />,
            category: 'علوم',
            color: 'from-cyan-500/20 to-blue-500/20',
            borderColor: 'border-cyan-500/30'
        },
        {
            id: 'electricity',
            title: '⚡ الدائرة الكهربائية',
            description: 'بناء دائرة كهربائية بسيطة وتشغيل مصباح.',
            icon: <Zap size={28} />,
            category: 'فيزياء',
            color: 'from-yellow-500/20 to-amber-500/20',
            borderColor: 'border-yellow-500/30'
        },
        {
            id: 'math-shapes',
            title: '📐 الأشكال الهندسية',
            description: 'اكتشاف المساحات والمحيطات بشكل تفاعلي.',
            icon: <Calculator size={28} />,
            category: 'رياضيات',
            color: 'from-emerald-500/20 to-green-500/20',
            borderColor: 'border-emerald-500/30'
        },
        {
            id: 'plant-growth',
            title: '🌱 نمو النبات',
            description: 'محاكاة مراحل نمو النبات من البذرة إلى الشجرة.',
            icon: <Sparkles size={28} />,
            category: 'علوم',
            color: 'from-green-500/20 to-lime-500/20',
            borderColor: 'border-green-500/30'
        },
        {
            id: 'volcano',
            title: '🌋 البركان',
            description: 'محاكاة ثوران بركاني ومعرفة طبقات الأرض.',
            icon: <Atom size={28} />,
            category: 'جغرافيا',
            color: 'from-red-500/20 to-orange-500/20',
            borderColor: 'border-red-500/30'
        }
    ];

    // Sort simulations by relevance if context is provided
    const sortedSimulations = [...simulations].sort((a, b) => getRelevanceScore(b) - getRelevanceScore(a));

    return (
        <div className="relative w-full min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-100">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 p-6 md:p-10 pb-6 border-b border-white/5 bg-gradient-to-b from-slate-900/50 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                            <Beaker size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">المحاكاة التفاعلية</h1>
                            <p className="text-slate-400 text-sm">تجارب افتراضية تفاعلية لتعزيز الفهم العلمي</p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
                    >
                        العودة <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-10 relative z-10">
                {!activeSimulation ? (
                    <>
                        {/* Category Chips */}
                        <div className="flex gap-2 mb-8 flex-wrap">
                            {['الكل', 'علوم', 'فيزياء', 'رياضيات', 'جغرافيا'].map(cat => (
                                <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:border-purple-500/50 transition-all">
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Simulations Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedSimulations.map(sim => (
                                <button
                                    key={sim.id}
                                    onClick={() => setActiveSimulation(sim.id)}
                                    className={`relative bg-gradient-to-br ${sim.color} backdrop-blur border ${sim.borderColor} rounded-2xl p-6 text-right hover:scale-[1.02] transition-all group overflow-hidden ${getRelevanceScore(sim) > 0 ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : ''}`}
                                >
                                    {getRelevanceScore(sim) > 0 && (
                                        <div className="absolute top-2 left-2 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-20">
                                            مقترح
                                        </div>
                                    )}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>

                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="p-2 bg-slate-950/50 rounded-lg text-slate-300">
                                            {sim.icon}
                                        </div>
                                        <span className="text-[10px] font-mono bg-slate-950/50 px-2 py-1 rounded text-slate-400">{sim.category}</span>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 relative z-10">{sim.title}</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed relative z-10">{sim.description}</p>

                                    <div className="mt-4 flex items-center gap-2 text-purple-400 text-xs font-bold relative z-10">
                                        <Play size={14} /> ابدأ المحاكاة
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Active Simulation View */
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-full max-w-3xl bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden">
                            {/* Simulation Header */}
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-white">
                                    {simulations.find(s => s.id === activeSimulation)?.title}
                                </h3>
                                <div className="flex gap-2">
                                    <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" title="إعادة التشغيل">
                                        <RotateCcw size={16} />
                                    </button>
                                    <button
                                        onClick={() => setActiveSimulation(null)}
                                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>

                            {/* Simulation Canvas Area */}
                            <div className="h-96 bg-slate-950 flex flex-col items-center justify-center gap-4 relative">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                <div className="p-4 bg-purple-500/10 rounded-full text-purple-400 relative z-10">
                                    <Lightbulb size={48} />
                                </div>
                                <p className="text-slate-400 text-center relative z-10">
                                    <span className="block text-lg font-bold text-white mb-2">قريباً...</span>
                                    <span className="text-sm">جاري تطوير هذه المحاكاة التفاعلية</span>
                                </p>
                                <div className="flex gap-2 relative z-10">
                                    <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono">HTML5 Canvas</span>
                                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">WebGL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
