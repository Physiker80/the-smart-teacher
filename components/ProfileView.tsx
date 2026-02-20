import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Save, ArrowRight, User, School, Book, ShieldCheck, Award, TrendingUp, Fingerprint } from 'lucide-react';

interface ProfileViewProps {
    user: UserProfile;
    onUpdateUser: (updatedUser: UserProfile) => void;
    onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onBack }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        school: user.school,
        subject: user.subject || '',
        role: user.role,
        bio: user.bio || ''
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            onUpdateUser({
                ...user,
                ...formData
            });
            setIsSaving(false);
        }, 1000);
    };

    // Default Stats if missing
    const stats = user.stats || {
        level: 12,
        xp: 1250,
        nextLevelXp: 2000,
        achievements: 14,
        points: 480
    };

    const xpPercentage = (stats.xp / stats.nextLevelXp) * 100;

    return (
        <div className="w-full min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 overflow-hidden relative">
            
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
            
            {/* Header */}
            <div className="relative z-10 p-6 border-b border-blue-500/20 bg-slate-900/60 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                        <Fingerprint size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">الملف الشخصي</h1>
                        <p className="text-xs text-blue-400 font-mono">بيانات المعلم / الهوية الرقمية</p>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <span>عودة للرئيسية</span>
                    <ArrowRight size={20} className={document.dir === 'rtl' ? 'rotate-180' : ''}/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 flex flex-col md:flex-row gap-8 max-w-7xl mx-auto w-full">
                
                {/* Left Col: Identity Card */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                        {/* Holographic Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <ShieldCheck className="text-slate-600" size={100} strokeWidth={0.5} />
                        </div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 p-1 mb-4 relative">
                                <img 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}&backgroundColor=1e293b`}
                                    alt="Avatar" 
                                    className="w-full h-full object-cover rounded-full bg-slate-800"
                                />
                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border border-slate-900">
                                    LVL {stats.level}
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-1">{formData.name || 'مستخدم جديد'}</h2>
                            <p className="text-blue-400 font-mono text-sm mb-4">{formData.role}</p>

                            <div className="w-full bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                                <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                                    <span>التقدم للمستوى {stats.level + 1}</span>
                                    <span>{stats.xp} / {stats.nextLevelXp} XP</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[65%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${xpPercentage}%`}}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-amber-500"/> الإحصائيات
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                                <Award className="mx-auto text-amber-500 mb-2" size={24} />
                                <div className="text-xl font-bold text-white">{stats.achievements}</div>
                                <div className="text-[10px] text-slate-500">وسام مكتسب</div>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                                <School className="mx-auto text-blue-500 mb-2" size={24} />
                                <div className="text-xl font-bold text-white">{stats.points}</div>
                                <div className="text-[10px] text-slate-500">نقطة تعليمية</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Edit Form */}
                <div className="flex-1 bg-slate-900/60 border border-slate-700 rounded-2xl p-8 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
                    
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-white mb-2">تعديل البيانات</h3>
                        <p className="text-slate-400 text-sm">قم بتحديث معلوماتك الشخصية والمهنية لتخصيص خطط الدروس.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-2">
                                    <User size={14} /> الاسم الكامل
                                </label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-2">
                                    <ShieldCheck size={14} /> الصلاحية / الدور
                                </label>
                                <select 
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none appearance-none"
                                >
                                    <option>معلم صف</option>
                                    <option>موجه تربوي</option>
                                    <option>مدير مدرسة</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-2">
                                    <School size={14} /> المدرسة / المؤسسة
                                </label>
                                <input 
                                    type="text" 
                                    name="school"
                                    value={formData.school}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] outline-none transition-all"
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-400 uppercase font-mono flex items-center gap-2">
                                    <Book size={14} /> المادة (الاختصاص)
                                </label>
                                <input 
                                    type="text" 
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    placeholder="مثال: الرياضيات، العلوم..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-400 uppercase font-mono">نبذة تعريفية (Bio)</label>
                            <textarea 
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                rows={4}
                                placeholder="اكتب نبذة قصيرة عن خبراتك..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-800 flex justify-end">
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-all active:scale-95"
                            >
                                {isSaving ? 'جاري الحفظ...' : <><Save size={18} /> حفظ التغييرات</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};