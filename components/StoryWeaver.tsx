import React, { useState } from 'react';
import { Scroll, Sparkles, Send, BookOpen, Feather, History, ArrowRight } from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { createResource } from '../services/syncService';
import { StoryItem } from '../types';

interface StoryWeaverProps {
    onBack: () => void;
}

export const StoryWeaver: React.FC<StoryWeaverProps> = ({ onBack }) => {
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('الصف الرابع');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState<StoryItem | null>(null);

    const handleGenerate = async () => {
        if (!topic) return;
        setIsGenerating(true);
        try {
            // We'll use a specific prompt for the "Grandfather & Mansour" mystery
            // ensuring it returns a StoryItem structure but effectively tailored.
            // For now, using standard service with modified instructions via topic augmentation?
            // Or better, add a specific method in geminiService later.
            // For MVP, we'll use the existing generateSongOrStory but strictly requesting 'story' and 'mystery' style

            const promptContext = `
                اكتب قصة قصيرة تعليمية بأسلوب "الجد ومنصور" (تراثي سوري).
                الموضوع: ${topic}.
                الصف: ${grade}.
                النمط: لغز / أحجية.
                يجب أن يكون المفهوم العلمي هو الحل للغز.
                استخدم كلمات تراثية بسيطة وأجواء دافئة.
                تنسيق الإخراج: JSON مطابق لواجهة StoryItem.
            `;

            // NOTE: Ideally we should update geminiService to have a specific 'generateMysteryStory' method.
            // For now, reusing generateSongOrStory which calls the generic endpoint.
            // We might need to override the prompt internally or add a flag.
            // Let's call generateSongOrStory with type='story' and detailed topic.

            const result = await geminiService.generateSongOrStory(promptContext, 'story', grade);
            if (result) {
                setGeneratedStory(result as StoryItem);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveStory = async () => {
        if (!generatedStory) return;
        try {
            await createResource({
                title: generatedStory.title,
                type: 'story',
                tags: [grade, 'heritage', 'mystery'],
                data: generatedStory
            });
            alert('تم حفظ الحكاية في المصادر بنجاح!');
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الحفظ.');
        }
    };

    return (
        <div className="min-h-screen bg-[#f3eacb] text-slate-900 font-sans relative overflow-hidden flex flex-col items-center p-6">
            {/* Background Texture (Simulated Parchment) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `url("https://www.transparenttextures.com/patterns/aged-paper.png")`,
                    filter: 'sepia(100%) contrast(120%)'
                }}
            />

            {/* Header */}
            <div className="relative z-10 w-full max-w-4xl flex items-center justify-between mb-12">
                <button onClick={onBack} className="p-3 rounded-full hover:bg-amber-900/10 text-amber-900 transition-colors">
                    <ArrowRight size={24} />
                </button>
                <div className="text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-amber-900 mb-2 drop-shadow-sm font-amiri">
                        حكايا الجد
                    </h1>
                    <p className="text-amber-800/80 text-lg font-amiri">
                        بوابة التراث والمعرفة
                    </p>
                </div>
                <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl">
                {!generatedStory ? (
                    <div className="bg-[#fffdf5] border-2 border-amber-900/20 shadow-xl rounded-2xl p-8 md:p-12 relative">
                        {/* Corner Ornaments */}
                        <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-amber-900/30 rounded-tr-3xl" />
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-amber-900/30 rounded-bl-3xl" />

                        <div className="text-center mb-10">
                            <Feather size={48} className="mx-auto text-amber-600 mb-4 opacity-80" />
                            <h2 className="text-2xl font-bold text-amber-900 mb-3 font-amiri">أدخل موضوع الدرس لتحويله إلى حكاية</h2>
                            <p className="text-amber-800/60">سيقوم "الجد" بصياغة لغز مشوق يساعد الطلاب على اكتشاف المفهوم بأنفسهم.</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-amber-900 font-bold mb-2 text-right">عنوان الدرس</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="مثال: دورة الماء في الطبيعة"
                                    className="w-full bg-[#fcf9ee] border-2 border-amber-900/10 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-amber-600/50 transition-colors placeholder:text-amber-900/30 text-amber-900 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-amber-900 font-bold mb-2 text-right">الصف الدراسي</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full bg-[#fcf9ee] border-2 border-amber-900/10 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-amber-600/50 transition-colors text-amber-900 appearance-none cursor-pointer"
                                >
                                    <option>الصف الأول</option>
                                    <option>الصف الثاني</option>
                                    <option>الصف الثالث</option>
                                    <option>الصف الرابع</option>
                                    <option>الصف الخامس</option>
                                    <option>الصف السادس</option>
                                </select>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!topic || isGenerating}
                                className="w-full bg-amber-800 hover:bg-amber-900 text-[#f3eacb] font-bold text-xl py-5 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="animate-spin" />
                                        جاري نسج الحكاية...
                                    </>
                                ) : (
                                    <>
                                        <BookOpen />
                                        اسرد الحكاية يا جدي
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#fffdf5] border-4 border-double border-amber-900/20 shadow-2xl rounded rounded-tr-[3rem] rounded-bl-[3rem] p-8 md:p-16 relative min-h-[600px] flex flex-col">
                        {/* Story Paper Texture */}
                        <div className="absolute inset-0 rounded-tr-[3rem] rounded-bl-[3rem] opacity-50 pointer-events-none"
                            style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/paper-fibers.png")` }}
                        />

                        <h2 className="text-4xl font-black text-amber-900 text-center mb-8 font-amiri leading-normal relative z-10">
                            {generatedStory.title}
                        </h2>

                        <div className="flex-1 text-xl md:text-2xl text-amber-900/90 leading-loose text-justify font-amiri relative z-10 whitespace-pre-line px-4">
                            {generatedStory.description}
                            {/* Assuming generic story returns content in description. 
                                Ideally we structure it better with 'content' field. */}
                        </div>

                        <div className="mt-12 pt-8 border-t-2 border-amber-900/10 flex justify-between items-center relative z-10">
                            <button
                                onClick={() => setGeneratedStory(null)}
                                className="text-amber-800 hover:text-amber-600 font-bold flex items-center gap-2 transition-colors"
                            >
                                <History size={20} />
                                حكاية أخرى
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveStory}
                                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-6 py-2 rounded-full font-bold transition-colors text-sm"
                                >
                                    حفظ في المصادر
                                </button>
                                <button className="bg-amber-800 hover:bg-amber-900 text-[#f3eacb] px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2">
                                    <Send size={16} />
                                    شارك
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Decoration */}
            <div className="fixed bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#e6dbc0] to-transparent pointer-events-none z-0" />
        </div>
    );
};
