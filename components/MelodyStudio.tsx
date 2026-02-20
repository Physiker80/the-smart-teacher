import React, { useState, useEffect, useRef } from 'react';
import { Mic, Music, Play, Pause, Save, Share2, Sparkles, ArrowRight, Disc, Volume2, SkipBack, SkipForward, FileText, Edit2, Check, Download } from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { createResource, fetchResourcesByType } from '../services/syncService';
import { SongItem } from '../types';

interface MelodyStudioProps {
    onBack: () => void;
}

export const MelodyStudio: React.FC<MelodyStudioProps> = ({ onBack }) => {
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('الصف الرابع');
    const [style, setStyle] = useState('مرح وإيقاعي (Upbeat)');
    const [isGenerating, setIsGenerating] = useState(false);
    const [song, setSong] = useState<SongItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [file, setFile] = useState<File | null>(null);
    const [fileData, setFileData] = useState<{ mimeType: string; data: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [recentSongs, setRecentSongs] = useState<SongItem[]>([]);

    useEffect(() => {
        const loadSongs = async () => {
            try {
                const res = await fetchResourcesByType('song');
                if (res) {
                    const sorted = res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    const mapped = sorted.map(r => r.data as SongItem).filter(Boolean);
                    setRecentSongs(mapped.slice(0, 10));
                }
            } catch (e) {
                console.error("Failed to load songs", e);
            }
        };
        loadSongs();
    }, []);

    const saveSongToStorage = async (newSong: SongItem) => {
        try {
            await createResource({
                title: newSong.title,
                type: 'song',
                tags: ['melody-studio', newSong.musicalStyle, grade],
                data: newSong
            });
            // Update local state immediately (optimistic)
            setRecentSongs(prev => [newSong, ...prev].slice(0, 10));
        } catch (e) {
            console.error("Failed to save song", e);
            alert("حدث خطأ أثناء الحفظ.");
        }
    };

    // TTS Playback Effect
    useEffect(() => {
        if (!isPlaying || !song) {
            window.speechSynthesis.cancel();
            return;
        }

        // Initialize index if starting
        if (currentLineIndex === -1) {
            setCurrentLineIndex(0);
            return;
        }

        const lines = songLines;
        if (currentLineIndex >= lines.length) {
            setIsPlaying(false);
            setCurrentLineIndex(-1);
            return;
        }

        // Speak the current line
        const text = lines[currentLineIndex];
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA'; // Arabic
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;

        utterance.onend = () => {
            if (isPlaying) {
                setCurrentLineIndex(prev => prev + 1);
            }
        };

        utterance.onerror = (e) => {
            console.error("Speech Error:", e);
            setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [isPlaying, currentLineIndex, song]); // Re-run when line changes

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64Data = base64String.split(',')[1];
                setFileData({
                    mimeType: selectedFile.type,
                    data: base64Data
                });
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleGenerate = async () => {
        // Allow generation if only file is present, defaulting topic to "Lesson Content" if empty
        if (!topic && !file) return;

        setIsGenerating(true);
        setSong(null);
        setIsPlaying(false);

        // Augment topic with style
        const effectiveTopic = topic || (file ? `Lesson Content from ${file.name}` : 'General Topic');
        const augmentedTopic = `${effectiveTopic}. Musical Style: ${style}`;

        try {
            const result = await geminiService.generateSongOrStory(augmentedTopic, 'song', grade, fileData || undefined);
            if (result) {
                const songResult = result as SongItem;
                setSong(songResult);
                setEditedContent(songResult.content || '');
            }
        } catch (error) {
            console.error("Melody Gen Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };



    const handleSaveEdit = () => {
        if (song) {
            const updatedSong = { ...song, content: editedContent };
            setSong(updatedSong);
            setIsEditing(false);
            // Auto-save on edit confirmation
            saveSongToStorage(updatedSong);
        }
    };

    const handleDownload = () => {
        if (!song) return;
        const textToSave = `Title: ${song.title}\nStyle: ${song.musicalStyle}\n\n${song.content}`;
        const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${song.title.replace(/\s+/g, '_')}_lyrics.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const songLines = (song && song.content) ? song.content.split('\n').filter(line => line.trim() !== '') : [];

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden flex flex-col">
            {/* Background Studio Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-6 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowRight className="text-slate-300" />
                </button>
                <div className="flex items-center gap-3">
                    <Music className="text-pink-500 animate-pulse" />
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400">
                        استوديو الألحان
                    </h1>
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                    {/* Left Panel: Controls */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-violet-500" />

                            <div className="flex justify-center mb-6">
                                <div className={`w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-950 shadow-inner relative ${isGenerating ? 'animate-spin' : ''}`}>
                                    <Disc size={64} className={`text-slate-700 ${isPlaying ? 'animate-spin-slow text-pink-500' : ''}`} />
                                    {/* Center Hole */}
                                    <div className="absolute w-8 h-8 bg-slate-800 rounded-full border-2 border-slate-600" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-right">عنوان النشيد (الموضوع)</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="مثال: الحروف الشمسية"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-right"
                                    />
                                </div>

                                {/* File Upload Area */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-right">مصدر المحتوى (درس/صورة)</label>
                                    <div className="relative group/upload">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${file ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 hover:border-pink-500/50 hover:bg-slate-800'}`}>
                                            {file ? (
                                                <>
                                                    <div className="p-2 bg-pink-500/20 rounded-full mb-2">
                                                        <FileText size={16} className="text-pink-400" />
                                                    </div>
                                                    <span className="text-xs text-pink-400 font-bold truncate max-w-full px-2" dir="ltr">{file.name}</span>
                                                    <button onClick={(e) => { e.preventDefault(); setFile(null); setFileData(null); }} className="text-[10px] text-red-400 hover:underline mt-1 z-20 relative">إزالة الملف</button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-2 bg-slate-800 rounded-full mb-2 group-hover/upload:bg-pink-500/20 transition-colors">
                                                        <Sparkles size={16} className="text-slate-400 group-hover/upload:text-pink-400" />
                                                    </div>
                                                    <span className="text-xs text-slate-400 text-center">ارفع صورة الدرس أو ملف PDF</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-right">النمط الموسيقي</label>
                                        <select
                                            value={style}
                                            onChange={(e) => setStyle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none appearance-none text-right cursor-pointer text-sm"
                                        >
                                            <option>مرح وإيقاعي (Upbeat)</option>
                                            <option>هادئ وتأملي (Calm)</option>
                                            <option>راب تعليمي (Educational Rap)</option>
                                            <option>نشيد كلاسيكي (Anthem)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block text-right">الصف</label>
                                        <select
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none appearance-none text-right cursor-pointer text-sm"
                                        >
                                            <option>الصف الأول</option>
                                            <option>الصف الثاني</option>
                                            <option>الصف الثالث</option>
                                            <option>الصف الرابع</option>
                                            <option>الصف الخامس</option>
                                            <option>الصف السادس</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={(!topic && !file) || isGenerating}
                                    className="w-full bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 mt-4"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Sparkles size={18} className="animate-spin" />
                                            جاري التأليف...
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={18} />
                                            تأليف النشيد
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Recent Tracks */}
                        <div className="bg-slate-900/50 border border-slate-700/30 rounded-2xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-right">أناشيد سابقة</h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {recentSongs.length === 0 ? (
                                    <div className="opacity-50 text-center text-sm text-slate-600 py-4">
                                        لا توجد تسجيلات سابقة
                                    </div>
                                ) : (
                                    recentSongs.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => { setSong(s); setEditedContent(s.content || ''); setIsPlaying(false); }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                                                <Music size={16} className="text-slate-500 group-hover:text-pink-400" />
                                            </div>
                                            <div className="flex-1 text-right">
                                                <h4 className="text-sm font-bold text-slate-200 truncate">{s.title}</h4>
                                                <p className="text-[10px] text-slate-500">{s.musicalStyle}</p>
                                            </div>
                                            <button className="text-slate-600 hover:text-white p-1">
                                                <Play size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Lyrics & Karaoke */}
                    <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl">
                            {/* Visualizer Background */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none flex items-end justify-center gap-1 pb-4">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-3 bg-pink-500 rounded-t-sm transition-all duration-300 ease-in-out"
                                        style={{
                                            height: isPlaying ? `${Math.random() * 80 + 20}%` : '10%'
                                        }}
                                    />
                                ))}
                            </div>

                            {!song ? (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <Music size={64} className="mb-4 opacity-20" />
                                    <p className="text-lg">كلمات النشيد ستظهر هنا</p>
                                    <p className="text-sm opacity-60">جاهز للإبداع؟</p>
                                </div>
                            ) : (
                                <div className="relative z-10 w-full max-w-2xl">
                                    <h2 className="text-3xl font-black text-white mb-2">{song.title}</h2>
                                    <h2 className="text-3xl font-black text-white mb-2">{song.title}</h2>
                                    <div className="flex items-center justify-center gap-2 mb-8">
                                        <p className="text-pink-400 text-sm font-mono">{song.musicalStyle}</p>
                                        <span className="text-slate-600">•</span>
                                        <p className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Volume2 size={10} /> معاينة صوتية (TTS)
                                        </p>
                                    </div>

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar px-4 py-2 text-xl md:text-2xl font-bold leading-relaxed" dir="rtl">
                                        {isEditing ? (
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                className="w-full h-[300px] bg-slate-800/50 text-white rounded-xl p-4 text-right leading-loose resize-none focus:ring-2 focus:ring-pink-500 outline-none"
                                            />
                                        ) : (
                                            songLines.map((line, idx) => (
                                                <p
                                                    key={idx}
                                                    className={`transition-all duration-500 ${idx === currentLineIndex
                                                        ? 'text-pink-400 scale-105 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                        }`}
                                                >
                                                    {line}
                                                </p>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Playback Controls */}
                        {song && (
                            <div className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-2">
                                    <button className="p-3 text-slate-400 hover:text-white transition-colors"><Volume2 size={20} /></button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button className="p-2 text-slate-400 hover:text-white transition-colors"><SkipBack size={24} /></button>
                                    <button
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className="w-14 h-14 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-500/30 transition-transform transform hover:scale-105"
                                    >
                                        {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-white transition-colors"><SkipForward size={24} /></button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => song && saveSongToStorage(song)}
                                        className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-slate-700 rounded-lg"
                                        title="حفظ في السجل"
                                    >
                                        <Save size={20} />
                                    </button>
                                    <button
                                        onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                                        className={`p-3 transition-colors hover:bg-slate-700 rounded-lg ${isEditing ? 'text-green-400' : 'text-slate-400 hover:text-white'}`}
                                        title={isEditing ? "حفظ التعديلات" : "تعديل الكلمات"}
                                    >
                                        {isEditing ? <Check size={20} /> : <Edit2 size={20} />}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-slate-700 rounded-lg"
                                        title="تحميل كملف نصي"
                                    >
                                        <Download size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
