
import React, { useState, useEffect } from 'react';
import { generateGame } from '../services/geminiService';
import { GameScenario, GameChallenge } from '../types';
import {
    Gamepad2, Map, Search, Rocket, Trees, ArrowRight, Star,
    Trophy, Crown, Zap, CheckCircle, XCircle, ArrowLeft,
    Loader2, Save, RotateCcw, Volume2
} from 'lucide-react';

interface GameForgeProps {
    onBack: () => void;
    initialTopic?: string;
    initialGrade?: string;
}

const THEMES = [
    { id: 'treasure_hunt', name: 'البحث عن الكنز', icon: Map, color: 'from-amber-500 to-orange-600', description: 'رحلة استكشافية للعثور على الكنز المفقود' },
    { id: 'space_mission', name: 'مهمة فضاء', icon: Rocket, color: 'from-indigo-500 to-purple-600', description: 'انطلاق نحو الكواكب المجهولة' },
    { id: 'detective', name: 'المحقق الذكي', icon: Search, color: 'from-slate-600 to-slate-800', description: 'حل الألغاز وكشف الغموض' },
    { id: 'jungle_adventure', name: 'مغامرة الغابة', icon: Trees, color: 'from-emerald-500 to-green-600', description: 'استكشاف الطبيعة والحيوانات' },
];

export const GameForge: React.FC<GameForgeProps> = ({ onBack, initialTopic, initialGrade }) => {
    // State
    const [topic, setTopic] = useState(initialTopic || '');
    const [grade, setGrade] = useState(initialGrade || 'الصف الرابع');
    const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [gameScenario, setGameScenario] = useState<GameScenario | null>(null);

    // Gameplay State
    const [currentStep, setCurrentStep] = useState<'intro' | 'playing' | 'win'>('intro');
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // TTS
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const handleGenerateGame = async () => {
        if (!topic) return;
        setIsGenerating(true);
        try {
            const scenario = await generateGame(topic, grade, selectedTheme.id);
            setGameScenario(scenario);
            setCurrentStep('intro');
            setCurrentChallengeIndex(0);
            setScore(0);
        } catch (error) {
            console.error("Game Gen Failed", error);
            alert("عذراً، حدث خطأ أثناء توليد اللعبة. حاول مرة أخرى.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswer = (option: string) => {
        if (!gameScenario) return;
        const challenge = gameScenario.challenges[currentChallengeIndex];

        if (option === challenge.correctAnswer) {
            setFeedback({ type: 'success', message: '🎉 إجابة صحيحة! أحسنت!' });
            const points = challenge.points || 10;
            setScore(prev => prev + points);
            speak('إجابة صحيحة! أحسنت!');

            setTimeout(() => {
                setFeedback(null);
                if (currentChallengeIndex < gameScenario.challenges.length - 1) {
                    setCurrentChallengeIndex(prev => prev + 1);
                } else {
                    setCurrentStep('win');
                    // Auto-save history potentially
                }
            }, 1500);
        } else {
            setFeedback({ type: 'error', message: '❌ حاول مرة أخرى!' });
            speak('حاول مرة أخرى');
        }
    };

    const handleSaveGame = () => {
        if (!gameScenario) return;
        const saved = JSON.parse(localStorage.getItem('st_saved_games') || '[]');
        saved.push({
            ...gameScenario,
            savedAt: new Date().toISOString()
        });
        localStorage.setItem('st_saved_games', JSON.stringify(saved));
        alert('تم حفظ اللعبة في الأرشيف!');
    };

    // --- Renders ---

    if (isGenerating) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-6 animate-pulse">
                <Loader2 size={64} className="animate-spin text-purple-500" />
                <h2 className="text-2xl font-bold">جاري بناء عالم المغامرة...</h2>
                <p className="text-slate-400">يتم الآن تصميم التحديات وتجهيز المكافآت</p>
            </div>
        );
    }

    if (!gameScenario) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            مصنع الألعاب (Game Forge)
                        </h1>
                        <p className="text-slate-400 mt-2">حول درسك إلى مغامرة ملحمية في ثوانٍ</p>
                    </div>
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <span>عودة</span>
                        <ArrowRight size={20} className="rotate-180" />
                    </button>
                </div>

                {/* Configuration Card */}
                <div className="bg-slate-900/60 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-xl">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-slate-300 font-bold mb-2">موضوع الدرس</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="مثال: الفاعل والمفعول به، المجموعة الشمسية..."
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none text-right"
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-2">الصف الدراسي</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white outline-none text-right"
                                    dir="rtl"
                                >
                                    <option>الروضة</option>
                                    <option>الصف الأول</option>
                                    <option>الصف الثاني</option>
                                    <option>الصف الثالث</option>
                                    <option>الصف الرابع</option>
                                    <option>الصف الخامس</option>
                                    <option>الصف السادس</option>
                                </select>
                            </div>
                        </div>

                        {/* Theme Selection */}
                        <div className="space-y-4">
                            <label className="block text-slate-300 font-bold">اختر طابع المغامرة</label>
                            <div className="grid grid-cols-2 gap-3">
                                {THEMES.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme)}
                                        className={`p-4 rounded-xl border text-right transition-all group relative overflow-hidden ${selectedTheme.id === theme.id
                                                ? `bg-gradient-to-br ${theme.color} border-transparent shadow-lg scale-[1.02]`
                                                : 'bg-slate-950/30 border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="relative z-10 flex flex-col items-center gap-2">
                                            <theme.icon size={28} className={selectedTheme.id === theme.id ? 'text-white' : 'text-slate-500'} />
                                            <span className={`font-bold text-sm ${selectedTheme.id === theme.id ? 'text-white' : 'text-slate-300'}`}>
                                                {theme.name}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateGame}
                        disabled={!topic}
                        className={`w-full mt-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${topic
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-[1.01] shadow-xl shadow-purple-900/20 text-white'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        <Zap size={20} className="fill-current" />
                        <span>إنشاء اللعبة الآن</span>
                    </button>
                </div>
            </div>
        );
    }

    // --- GAMEPLAY VIEWS ---

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center bg-slate-950">
            {/* Dynamic Background based on theme */}
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${selectedTheme.color}`} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />

            {/* Top Bar */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-slate-900/50 backdrop-blur">
                <div className="flex items-center gap-4">
                    <button onClick={() => setGameScenario(null)} className="text-slate-400 hover:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h2 className="font-bold text-white text-lg">{gameScenario.title}</h2>
                        <span className="text-xs text-slate-400">{currentStep === 'win' ? 'تمت المهمة!' : `المرحلة ${currentChallengeIndex + 1} من ${gameScenario.challenges.length}`}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
                    <Star className="text-yellow-400 fill-yellow-400" size={18} />
                    <span className="font-mono font-bold text-yellow-400 text-lg">{score}</span>
                </div>
            </div>

            {/* Main Game Container */}
            <div className="relative z-10 w-full max-w-3xl p-6 perspective-1000">

                {currentStep === 'intro' && (
                    <div className="bg-slate-900/90 border-2 border-purple-500/50 rounded-3xl p-8 text-center space-y-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-purple-500/30">
                            <Gamepad2 size={48} className="text-purple-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white leading-tight">
                            مرحباً بك في {gameScenario.title}
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                            {gameScenario.introStory}
                        </p>

                        <div className="pt-4">
                            <button
                                onClick={() => { setCurrentStep('playing'); speak(gameScenario.introStory); }}
                                className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl font-bold text-xl shadow-lg hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                            >
                                <Zap className="fill-current" /> ابدأ المغامرة
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'playing' && (
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentChallengeIndex) / gameScenario.challenges.length) * 100}%` }}
                            />
                        </div>

                        {/* Challenge Card */}
                        <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-center">
                            {/* Feedback Overlay */}
                            {feedback && (
                                <div className={`absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`}>
                                    <div className={`text-center animate-in zoom-in spin-in-3 cursor-default`}>
                                        {feedback.type === 'success' ? (
                                            <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
                                        ) : (
                                            <XCircle size={80} className="text-red-500 mx-auto mb-4" />
                                        )}
                                        <h3 className={`text-3xl font-black ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {feedback.message}
                                        </h3>
                                    </div>
                                </div>
                            )}

                            <div className="text-center space-y-8">
                                <div className="inline-block px-4 py-1 bg-slate-800 rounded-full text-xs text-slate-400 font-mono mb-2">
                                    التحدي رقم {currentChallengeIndex + 1}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed dir-rtl" dir="rtl">
                                    {gameScenario.challenges[currentChallengeIndex].question}
                                </h2>

                                <button onClick={() => speak(gameScenario.challenges[currentChallengeIndex].question)} className="mx-auto p-2 text-slate-500 hover:text-white transition-colors">
                                    <Volume2 size={20} />
                                </button>

                                {/* Options */}
                                {gameScenario.challenges[currentChallengeIndex].options && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                        {gameScenario.challenges[currentChallengeIndex].options!.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(opt)}
                                                className="p-6 bg-slate-800/50 hover:bg-indigo-600/20 border-2 border-slate-700 hover:border-indigo-500 text-white rounded-2xl text-xl font-bold transition-all hover:scale-[1.02] active:scale-95 text-center dir-rtl"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 'win' && (
                    <div className="text-center space-y-8 animate-in zoom-in-90 duration-700">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-yellow-500/30 blur-[60px] rounded-full animate-pulse" />
                            <Trophy size={120} className="text-yellow-400 relative z-10 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mx-auto animate-bounce" />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300">
                                نصر ملحمي!
                            </h1>
                            <p className="text-2xl text-white font-bold">
                                {gameScenario.winCondition}
                            </p>
                            <div className="bg-slate-900/80 p-6 rounded-2xl border border-yellow-500/30 inline-block">
                                <p className="text-slate-400 text-sm mb-2 uppercase tracking-widest">لقب الشرف</p>
                                <h3 className="text-3xl font-bold text-yellow-400 flex items-center justify-center gap-2">
                                    <Crown size={32} /> {gameScenario.reward.badgeName}
                                </h3>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 pt-8">
                            <button
                                onClick={handleSaveGame}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                            >
                                <Save size={20} /> حفظ الإنجاز
                            </button>
                            <button
                                onClick={() => { setCurrentStep('intro'); setScore(0); setCurrentChallengeIndex(0); }}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                            >
                                <RotateCcw size={20} /> العب مجدداً
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
