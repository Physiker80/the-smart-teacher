import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Brain, ChevronDown, ChevronUp, Target, FlaskConical, HelpCircle, CheckCircle2, PenTool } from 'lucide-react';
import { analyzeCurriculum } from '../services/geminiService';
import type { Resource, CurriculumLesson, CurriculumBook } from '../types';

interface ResourceExplorerModalProps {
  resource: Resource | null;
  onClose: () => void;
  onGenerate: (topic: string, grade: string, pagesOrTitles: string[], subject?: string, part?: string) => void;
  onSaveResource?: (resourceId: string, updates: { data?: any }) => void;
  defaultGrade?: string;
  gradeOptions?: string[];
}

const CURRICULUM_CACHE_KEY = 'st_resource_curriculum_cache';

function getCachedCurriculum(resourceId: string): { curriculumStructure: CurriculumLesson[]; bookMetadata?: any; analyzedAt?: string } | null {
  try {
    const raw = localStorage.getItem(`${CURRICULUM_CACHE_KEY}_${resourceId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.curriculumStructure?.length ? parsed : null;
  } catch { return null; }
}

function setCachedCurriculum(resourceId: string, data: { curriculumStructure: CurriculumLesson[]; bookMetadata?: any; analyzedAt?: string }) {
  try {
    localStorage.setItem(`${CURRICULUM_CACHE_KEY}_${resourceId}`, JSON.stringify(data));
  } catch { /* quota or disabled */ }
}

const MATERIAL_CONFIG: Record<string, { label: string; bg: string; border: string; textColor: string; emoji: string }> = {
  paper: { label: 'ورقة', bg: 'bg-amber-500/10', border: 'border-amber-500/20', textColor: 'text-amber-200', emoji: '📜' },
  stone: { label: 'حجر', bg: 'bg-stone-500/10', border: 'border-stone-500/20', textColor: 'text-stone-300', emoji: '🪨' },
  wood: { label: 'خشب', bg: 'bg-orange-800/20', border: 'border-orange-700/30', textColor: 'text-orange-200', emoji: '🪵' },
  fabric: { label: 'قماش', bg: 'bg-pink-500/10', border: 'border-pink-500/20', textColor: 'text-pink-200', emoji: '🧵' },
};

async function fetchFileAsBase64(url: string): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('فشل تحميل الملف');
  const blob = await res.blob();
  const mimeType = blob.type || (url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string || '').replace(/^data:[^;]+;base64,/, ''));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return { mimeType, data };
}

export const ResourceExplorerModal: React.FC<ResourceExplorerModalProps> = ({
  resource,
  onClose,
  onGenerate,
  onSaveResource,
  defaultGrade = 'الصف الثالث الابتدائي',
  gradeOptions = ["الروضة", "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي", "الصف السابع الإعدادي", "الصف الثامن الإعدادي", "الصف التاسع الإعدادي"]
}) => {
  const [curriculum, setCurriculum] = useState<CurriculumBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState('');
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Record<number, string[]>>({});
  const [grade, setGrade] = useState(defaultGrade);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  const loadCurriculum = useCallback(async () => {
    if (!resource?.url || !['pdf', 'image'].includes(resource.type)) return;
    setLoadedFromCache(false);
    // 1. استرداد من resource.data (محفوظ في Supabase)
    const fromResource = resource.data as { curriculumStructure?: CurriculumLesson[]; bookMetadata?: CurriculumBook['bookMetadata'] } | undefined;
    // 2. أو من localStorage (تخزين مؤقت محلي)
    const fromLocal = resource.id ? getCachedCurriculum(resource.id) : null;
    const cached = fromResource?.curriculumStructure?.length ? fromResource : fromLocal;
    if (cached?.curriculumStructure?.length) {
      setCurriculum({
        id: resource.id,
        analyzedAt: cached.analyzedAt || new Date().toISOString(),
        fileName: resource.title,
        bookMetadata: cached.bookMetadata || { subject: resource.title, grade: defaultGrade, part: '' },
        liveThoughts: [],
        curriculumStructure: cached.curriculumStructure,
      });
      setGrade(cached.bookMetadata?.grade || defaultGrade);
      setLoadedFromCache(true);
      return;
    }
    setLoading(true);
    setError(null);
    setLoadStatus('جاري تحميل الملف...');
    try {
      const fileData = await fetchFileAsBase64(resource.url);
      setLoadStatus('جاري تحليل المصدر بالذكاء الاصطناعي...');
      const result = await analyzeCurriculum(fileData, (t) => setLoadStatus(t));
      setCurriculum(result);
      setGrade(result.bookMetadata?.grade || defaultGrade);
      const toSave = { curriculumStructure: result.curriculumStructure, bookMetadata: result.bookMetadata, analyzedAt: result.analyzedAt };
      if (resource.id) {
        setCachedCurriculum(resource.id, toSave);
        if (onSaveResource) onSaveResource(resource.id, { data: toSave });
      }
    } catch (e: any) {
      setError(e?.message || 'فشل تحليل المصدر. تأكد من توفر الملف ومفتاح Gemini.');
      setCurriculum(null);
    } finally {
      setLoading(false);
      setLoadStatus('');
    }
  }, [resource?.id, resource?.url, resource?.title, resource?.type, resource?.data, defaultGrade, onSaveResource]);

  useEffect(() => {
    if (resource) loadCurriculum();
  }, [resource, loadCurriculum]);

  const toggleActivity = (lessonIndex: number, act: string) => {
    const current = selectedActivities[lessonIndex] || [];
    const isSelected = current.includes(act);
    setSelectedActivities({
      ...selectedActivities,
      [lessonIndex]: isSelected ? current.filter(a => a !== act) : [...current, act],
    });
  };

  const handleGenerateForLesson = (lesson: CurriculumLesson, lessonIndex: number) => {
    const acts = selectedActivities[lessonIndex] ?? lesson.activities;
    onGenerate(lesson.lessonTitle, grade, acts.length ? acts : lesson.activities, curriculum?.bookMetadata?.subject, curriculum?.bookMetadata?.part);
    onClose();
  };

  const supportsCurriculum = resource && ['pdf', 'image'].includes(resource.type);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-cyan-400" />
            استعراض المصدر (هيكلية منهاجي)
            {loadedFromCache && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                من الذاكرة — بدون توكنز
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-cyan-400">
              <Loader2 size={24} className="animate-spin" />
              <span>{loadStatus || 'جاري التحليل...'}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!supportsCurriculum && !loading && resource && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
              نوع المصدر (فيديو/رابط) لا يدعم التحليل بهيكلية منهاجي. أضف ملف PDF أو صورة.
            </div>
          )}

          {!loading && !error && curriculum && curriculum.curriculumStructure.length > 0 && (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div>
                  <h3 className="font-bold text-white">{curriculum.fileName}</h3>
                  <p className="text-xs text-slate-500">{curriculum.bookMetadata?.subject} • {curriculum.bookMetadata?.grade} • {curriculum.curriculumStructure.length} درس</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">الصف</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white" dir="rtl">
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {curriculum.curriculumStructure.map((lesson, index) => {
                  const isExpanded = expandedLesson === index;
                  return (
                    <div key={index} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 hover:border-cyan-500/30 transition-all">
                      <button
                        onClick={() => setExpandedLesson(isExpanded ? null : index)}
                        className="w-full flex items-center justify-between p-4 text-right hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 text-right">
                            <h4 className="text-white font-bold text-sm">{lesson.lessonTitle}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              الصفحات: {lesson.pageRange[0]} — {lesson.pageRange[1]} • {lesson.objectives.length} أهداف • {lesson.activities.length} أنشطة
                            </p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-800 p-5 space-y-5">
                          {lesson.objectives.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Target size={14} className="text-blue-400" />
                                <h5 className="text-sm font-bold text-blue-400">الأهداف التعليمية</h5>
                              </div>
                              <div className="space-y-2">
                                {lesson.objectives.map((obj, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                    <span>{obj}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {lesson.keyVisuals.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <PenTool size={14} className="text-amber-400" />
                                <h5 className="text-sm font-bold text-amber-400">العناصر البصرية</h5>
                              </div>
                              <div className="space-y-2">
                                {lesson.keyVisuals.map((kv, i) => {
                                  const cfg = MATERIAL_CONFIG[kv.material] || MATERIAL_CONFIG.paper;
                                  return (
                                    <div key={i} className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                                      <span className={`text-sm ${cfg.textColor}`}>{kv.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {lesson.activities.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <FlaskConical size={14} className="text-emerald-400" />
                                  <h5 className="text-sm font-bold text-emerald-400">الأنشطة</h5>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedActivities({ ...selectedActivities, [index]: [...lesson.activities] }); }}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold"
                                  >تحديد الكل</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); const next = { ...selectedActivities }; delete next[index]; setSelectedActivities(next); }}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-400 font-bold"
                                  >إلغاء</button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {lesson.activities.map((act, actIndex) => {
                                  const isSelected = selectedActivities[index]?.includes(act);
                                  return (
                                    <div
                                      key={actIndex}
                                      onClick={(e) => { e.stopPropagation(); toggleActivity(index, act); }}
                                      className={`cursor-pointer rounded-lg p-3 text-sm flex items-start gap-2 transition-colors ${
                                        isSelected ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10'
                                      }`}
                                    >
                                      {isSelected ? <CheckCircle2 size={12} className="text-emerald-400 mt-1 shrink-0" /> : <FlaskConical size={12} className="text-emerald-500 mt-1 shrink-0" />}
                                      <span className={isSelected ? 'text-white font-medium' : 'text-slate-300'}>{act}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {lesson.assessmentQuestions.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <HelpCircle size={14} className="text-violet-400" />
                                <h5 className="text-sm font-bold text-violet-400">أسئلة التقويم</h5>
                              </div>
                              <div className="space-y-2">
                                {lesson.assessmentQuestions.map((q, i) => (
                                  <div key={i} className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-sm text-slate-300">
                                    <span className="text-violet-400 font-bold">س{i + 1}:</span> {q}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateForLesson(lesson, index); }}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                          >
                            <Brain size={16} /> توليد درس من هذا الدرس
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <button onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
