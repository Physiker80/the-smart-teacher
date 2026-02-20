
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, User, School, Fingerprint, ChevronRight, Loader2, Lock, Zap, BookOpen } from 'lucide-react';

interface LoginProps {
    onLogin: (user: UserProfile) => void;
    userType: 'teacher' | 'student';
    onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, userType, onBack }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState(userType === 'teacher' ? 'معلم صف' : 'طالب');
    const [school, setSchool] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Theme Config based on User Type
    const isTeacher = userType === 'teacher';
    const themeColor = isTeacher ? 'blue' : 'amber';
    const accentColor = isTeacher ? 'text-blue-500' : 'text-amber-500';
    const borderColor = isTeacher ? 'border-blue-500' : 'border-amber-500';
    const bgGlow = isTeacher ? 'bg-blue-500/5' : 'bg-amber-500/5';
    const buttonBg = isTeacher ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (isTeacher && (!name || !school || !secretCode)) return;
        if (!isTeacher && (!name || !secretCode)) return; // Student might not need school

        setIsScanning(true);
        // Simulate biometric scan/server delay
        setTimeout(() => {
            onLogin({ 
                name, 
                role: isTeacher ? role : 'طالب', 
                school: school || 'مدرسة المستقبل', // Default for student if not entered
                id: Date.now().toString() 
            });
        }, 2000);
    };

    return (
        <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
            
            {/* Background Animation */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 opacity-20" 
                     style={{
                         backgroundImage: `linear-gradient(${isTeacher ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)'} 1px, transparent 1px), linear-gradient(90deg, ${isTeacher ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)'} 1px, transparent 1px)`, 
                         backgroundSize: '40px 40px'
                     }}>
                </div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] ${bgGlow} rounded-full blur-[100px] pointer-events-none`}></div>
            </div>

            {/* Back Button */}
            <button onClick={onBack} className="absolute top-6 right-6 text-slate-500 hover:text-white flex items-center gap-2 z-20">
                <ChevronRight size={16} /> عودة
            </button>

            {/* Login HUD Panel */}
            <div className={`w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-2xl p-1 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden group`}>
                
                {/* Scanner Line Animation */}
                {isScanning && (
                    <div className={`absolute inset-0 z-20 pointer-events-none ${isTeacher ? 'bg-blue-500/10' : 'bg-amber-500/10'} animate-pulse`}>
                        <div className={`w-full h-1 ${isTeacher ? 'bg-blue-400 shadow-[0_0_20px_#60a5fa]' : 'bg-amber-400 shadow-[0_0_20px_#fbbf24]'} absolute top-0 animate-scan-fast`}></div>
                    </div>
                )}

                {/* Inner Content */}
                <div className="bg-slate-950/80 rounded-xl p-8 border border-slate-800 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <div className={`w-16 h-16 bg-slate-900 border ${isTeacher ? 'border-blue-500/50' : 'border-amber-500/50'} rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,0,0,0.2)] relative`}>
                            {isTeacher ? <Fingerprint size={32} className={`text-blue-500 ${isScanning ? 'animate-ping' : ''}`} /> : <Zap size={32} className={`text-amber-500 ${isScanning ? 'animate-ping' : ''}`} />}
                            <div className={`absolute inset-0 border-2 ${isTeacher ? 'border-blue-500/30' : 'border-amber-500/30'} rounded-full animate-spin-slow border-t-transparent`}></div>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-wider">
                            {isTeacher ? 'بوابة المعلمين' : 'واحة التلميذ'}
                        </h1>
                        <p className={`text-xs font-mono mt-1 ${isTeacher ? 'text-blue-500/80' : 'text-amber-500/80'}`}>
                            {isTeacher ? 'SECURE ACCESS v4.2' : 'STUDENT PORTAL'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Input */}
                        <div className="space-y-1 group/input">
                            <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2 group-focus-within/input:${accentColor} transition-colors`}>
                                <User size={12} /> {isTeacher ? 'اسم المعلم' : 'اسم الطالب'}
                            </label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="الاسم الثلاثي..."
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:${borderColor} focus:shadow-[0_0_15px_rgba(0,0,0,0.1)] outline-none transition-all placeholder-slate-600 font-bold`}
                            />
                        </div>

                        {/* School Input (Teacher Only) */}
                        {isTeacher && (
                            <div className="space-y-1 group/input">
                                <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2 group-focus-within/input:${accentColor} transition-colors`}>
                                    <School size={12} /> المؤسسة / المدرسة
                                </label>
                                <input 
                                    type="text" 
                                    value={school}
                                    onChange={(e) => setSchool(e.target.value)}
                                    placeholder="اسم المدرسة..."
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:${borderColor} outline-none transition-all placeholder-slate-600`}
                                />
                            </div>
                        )}

                        {/* Secret Code Input */}
                        <div className="space-y-1 group/input">
                            <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2 group-focus-within/input:${accentColor} transition-colors`}>
                                <Lock size={12} /> {isTeacher ? 'الرقم السري للتسجيل' : 'كود الفصل / كلمة السر'}
                            </label>
                            <input 
                                type="password" 
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                placeholder="****"
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:${borderColor} outline-none transition-all placeholder-slate-600 tracking-widest`}
                            />
                        </div>

                        {/* Role Selection (Teacher Only) */}
                        {isTeacher && (
                            <div className="space-y-1 group/input">
                                <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2 group-focus-within/input:${accentColor} transition-colors`}>
                                    <ShieldCheck size={12} /> مستوى الصلاحية
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['معلم صف', 'موجه تربوي', 'مدير مدرسة', 'مشرف'].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                                                role === r 
                                                ? `bg-blue-500/20 border-blue-500 text-blue-400` 
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button 
                            type="submit"
                            disabled={!name || !secretCode || isScanning}
                            className={`w-full py-4 mt-4 rounded-xl font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn ${
                                (!name || !secretCode)
                                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                                : `${buttonBg} text-slate-900 border ${borderColor} shadow-lg`
                            }`}
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>جاري الدخول...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10 flex items-center gap-2 text-white">
                                        {isTeacher ? 'تسجيل الدخول' : 'انطلق إلى الواحة'} <ChevronRight size={16} className="rotate-180"/>
                                    </span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes scan-fast {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-fast {
                    animation: scan-fast 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
            `}</style>
        </div>
    );
};
