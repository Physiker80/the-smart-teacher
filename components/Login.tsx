
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';
import { ShieldCheck, User, School, Phone, Mail, ChevronRight, Loader2, Lock, Zap, BookOpen, Fingerprint } from 'lucide-react';

interface LoginProps {
    onLogin: (user: UserProfile) => void;
    userType: 'teacher' | 'student';
    onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, userType, onBack }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [className, setClassName] = useState(''); // For Teacher (Class Name/Grade)
    const [sectionName, setSectionName] = useState(''); // For Teacher (Section)
    const [classCode, setClassCode] = useState(''); // For Student (Join Code)
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Theme Config based on User Type
    const isTeacher = userType === 'teacher';
    const themeColor = isTeacher ? 'blue' : 'amber';
    const accentColor = isTeacher ? 'text-blue-500' : 'text-amber-500';
    const borderColor = isTeacher ? 'border-blue-500' : 'border-amber-500';
    const bgGlow = isTeacher ? 'bg-blue-500/5' : 'bg-amber-500/5';
    const buttonBg = isTeacher ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500';

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (!email || !password || !fullName || !phone) {
                    throw new Error('يرجى ملء جميع الحقول المطلوبة');
                }

                if (isTeacher && (!className || !sectionName)) {
                     throw new Error('يرجى تحديد الصف والشعبة لإنشاء فصلك الدراسي');
                }
                
                if (!isTeacher && !classCode) {
                     throw new Error('يجب إدخال كود الفصل للانضمام للمعلم');
                }

                // --- 1. PRE-CHECK VALIDATION ---
                // For Student: Verify Class Code exists
                let targetClassId = null;
                if (!isTeacher) {
                    const { data: foundClass, error: classError } = await supabase
                        .from('classes')
                        .select('id, teacher_id')
                        .eq('class_code', classCode)
                        .single();
                    
                    if (classError || !foundClass) {
                        throw new Error('كود الفصل غير صحيح! تأكد من الكود مع معلمك.');
                    }
                    targetClassId = foundClass.id;
                }

                // --- 2. SIGN UP ---
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: isTeacher ? 'teacher' : 'student',
                            phone: phone,
                            // Store metadata for teacher class creation logic later if needed
                            initial_class_name: className,
                            initial_section_name: sectionName
                        },
                    },
                });

                if (error) throw error;
                
                // --- 3. POST-REGISTRATION ACTIONS ---
                if (data.user) {
                    const userId = data.user.id;

                    if (isTeacher) {
                        // Create Class for Teacher automatically
                        const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        const { error: createClassError } = await supabase
                            .from('classes')
                            .insert([
                                { 
                                    teacher_id: userId,
                                    grade: className,
                                    section: sectionName,
                                    class_code: generatedCode 
                                }
                            ]);
                            
                        if (createClassError) console.error("Auto-class creation failed:", createClassError);
                        else alert(`تم إنشاء فصلك بنجاح! كود الانضمام للطلاب هو: ${generatedCode}`);
                    } 
                    else if (targetClassId) {
                        // Enroll Student in Class automatically
                        const { error: enrollError } = await supabase
                            .from('class_enrollments')
                            .insert([
                                { 
                                    class_id: targetClassId,
                                    student_id: userId
                                }
                            ]);
                        
                        if (enrollError) console.error("Auto-enrollment failed:", enrollError);
                    }

                    alert('تم التسجيل بنجاح! إذا ظهرت رسالة تفعيل البريد، يرجى التحقق منه.');
                    setMode('login'); // Switch back to login
                }
            } else {
                // LOGIN
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    // Fetch extended profile data
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    // Check role match
                    const userRole = profile?.role || (isTeacher ? 'teacher' : 'student');
                    if (isTeacher && userRole !== 'teacher') {
                        throw new Error('هذا الحساب ليس لمعلم.');
                    }
                    if (!isTeacher && userRole !== 'student') {
                        throw new Error('هذا الحساب ليس لطالب.');
                    }

                    // Success
                    onLogin({
                        id: data.user.id,
                        name: profile?.full_name || data.user.email?.split('@')[0] || 'User',
                        role: isTeacher ? 'معلم صف' : 'طالب', // Map back to internal types
                        school: profile?.school || 'مدرسة المستقبل',
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`
                    });
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'حدث خطأ غير متوقع');
        } finally {
            setLoading(false);
        }
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
                
                {/* Inner Content */}
                <div className="bg-slate-950/80 rounded-xl p-8 border border-slate-800 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="text-center mb-6 relative">
                        <div className={`w-14 h-14 bg-slate-900 border ${isTeacher ? 'border-blue-500/50' : 'border-amber-500/50'} rounded-full mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,0,0,0.2)] relative`}>
                            {isTeacher ? <Fingerprint size={28} className={`text-blue-500 ${loading ? 'animate-pulse' : ''}`} /> : <Zap size={28} className={`text-amber-500 ${loading ? 'animate-pulse' : ''}`} />}
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-wider">
                            {isTeacher ? 'بوابة المعلمين' : 'واحة التلميذ'}
                        </h1>
                        
                        {/* Toggle Login/Register */}
                        <div className="flex bg-slate-900 rounded-lg p-1 mt-4 border border-slate-800">
                            <button 
                                onClick={() => setMode('login')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded ${mode === 'login' ? (isTeacher ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                تسجيل دخول
                            </button>
                            <button 
                                onClick={() => setMode('register')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded ${mode === 'register' ? (isTeacher ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white') : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                حساب جديد
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-3 rounded-lg mb-4 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        
                        {/* Full Name (Register Only) */}
                        {mode === 'register' && (
                            <div className="space-y-1 group/input">
                                <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                    <User size={12} /> الاسم الكامل
                                </label>
                                <input 
                                    type="text" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="الاسم الثلاثي..."
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600`}
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-1 group/input">
                            <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                <Mail size={12} /> البريد الإلكتروني
                            </label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600 ltr`}
                                dir="ltr"
                            />
                        </div>

                        {/* Phone (Register Only) */}
                        {mode === 'register' && (
                            <div className="space-y-1 group/input">
                                <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                    <Phone size={12} /> رقم الهاتف
                                </label>
                                <input 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="09xxxxxxxx"
                                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600 ltr`}
                                    dir="ltr"
                                />
                            </div>
                        )}

                        {/* Teacher: School/Class Info */}
                        {mode === 'register' && isTeacher && (
                            <div className="flex gap-2">
                                <div className="space-y-1 group/input flex-1">
                                    <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                        <School size={12} /> الصف (مثال: الرابع)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={className}
                                        onChange={(e) => setClassName(e.target.value)}
                                        placeholder="الصف الرابع..."
                                        className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600`}
                                    />
                                </div>
                                <div className="space-y-1 group/input w-1/3">
                                    <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                        <BookOpen size={12} /> الشعبة
                                    </label>
                                    <input 
                                        type="text" 
                                        value={sectionName}
                                        onChange={(e) => setSectionName(e.target.value)}
                                        placeholder="الأولى..."
                                        className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Student: Class Code */}
                        {mode === 'register' && !isTeacher && (
                            <div className="space-y-1 group/input">
                                <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2 text-amber-500`}>
                                    <Zap size={12} /> كود الانضمام (من المعلم)
                                </label>
                                <input 
                                    type="text" 
                                    value={classCode}
                                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                    placeholder="AB1234"
                                    className={`w-full bg-slate-900 border border-amber-500/50 rounded-lg p-2.5 text-sm text-white focus:border-amber-400 focus:shadow-[0_0_10px_rgba(251,191,36,0.2)] outline-none transition-all placeholder-slate-600 tracking-widest text-center uppercase font-mono font-bold`}
                                />
                                <p className="text-[10px] text-slate-500 text-center mt-1">
                                    اطلب من معلمك "كود الفصل" لتنضم تلقائياً لقائمته.
                                </p>
                            </div>
                        )}

                        {/* Password */}
                        <div className="space-y-1 group/input">
                            <label className={`text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2`}>
                                <Lock size={12} /> كلمة المرور
                            </label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:${borderColor} outline-none transition-all placeholder-slate-600 tracking-widest`}
                            />
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit"
                            disabled={loading || !email || !password}
                            className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn ${
                                (loading || !email || !password)
                                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                                : `${buttonBg} text-slate-900 border ${borderColor} shadow-lg hover:shadow-${themeColor}-500/20`
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>جاري المعالجة...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10 flex items-center gap-2 text-white">
                                        {mode === 'login' ? (isTeacher ? 'دخول للمعلم' : 'دخول للطالب') : 'إنشاء حساب جديد'} <ChevronRight size={16} className="rotate-180"/>
                                    </span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .ltr { direction: ltr; text-align: left; }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
            `}</style>
        </div>
    );
};
