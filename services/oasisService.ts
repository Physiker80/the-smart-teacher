import { supabase } from './supabaseClient';
import { generateContent } from './geminiService'; // Assuming a generic generate function or specific ones
import { LessonPlan, CurriculumLesson } from '../types';

export interface OasisTask {
    id: string;
    title: string;
    content: string; // The text content
    type: 'explorer' | 'quiz' | 'treasure_hunt';
    visualStyle: 'paper' | 'wood' | 'stone' | 'hologram';
    status: 'pending' | 'active' | 'completed';
    studentId?: string; // If assigned to specific student
    classId?: string;
    lessonId?: string;
    feedback?: string;
    score?: number;
    createdAt: string;
}

export const sendTaskToOasis = async (
    lessonId: string, 
    content: string, 
    type: 'explorer' | 'quiz' | 'treasure_hunt',
    target: { classId?: string, studentId?: string }
): Promise<OasisTask | null> => {
    
    // 1. Prepare "Learning Card" via Gemini (simulated or real call if needed for formatting)
    // For now, we assume content is passed ready or we do a quick format
    
    const newTask: Omit<OasisTask, 'id'> = {
        title: "مهمة اكتشاف جديدة",
        content: content,
        type: type,
        visualStyle: 'paper', // Default "Grandfather/Mansour" style
        status: 'active',
        createdAt: new Date().toISOString(),
        lessonId: lessonId,
        ...target
    };

    const { data, error } = await supabase
        .from('oasis_tasks')
        .insert([newTask])
        .select()
        .single();

    if (error) {
        console.error("Error sending task to Oasis:", error);
        return null;
    }

    return data as OasisTask;
};

export const getStudentTasks = async (studentId: string): Promise<OasisTask[]> => {
    const { data, error } = await supabase
        .from('oasis_tasks')
        .select('*')
        .eq('status', 'active')
        .or(`studentId.eq.${studentId},classId.not.is.null`) // Simplification: get personal or class tasks
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
    return data as OasisTask[];
};

export const completeTask = async (taskId: string, score: number, feedback?: string) => {
    const { error } = await supabase
        .from('oasis_tasks')
        .update({ status: 'completed', score, feedback })
        .eq('id', taskId);
        
    if (error) console.error("Error completing task:", error);
};

export const oasisBuddyChat = async (history: {role: string, text: string}[], userContext: {grade: string, topic: string}): Promise<string> => {
    // Call Gemini with specific pedagogical persona
    const systemPrompt = `
    أنت "رفيق الواحة" (Oasis Buddy)، مساعد ذكي ودود للطلاب في المرحلة ${userContext.grade}.
    مهمتك: مساعدة الطالب على فهم درس "${userContext.topic}" واستكشاف الكنوز المعرفية.
    الأسلوب: مشجع، مبسط، يستخدم أمثلة من البيئة، ويمتدح المحاولة.
    لا تعطِ الإجابة مباشرة، بل قدّم تلميحات ذكية.
    `;
    
    // This is a placeholder for the actual Gemini call using existing service
    // We'll construct the prompt and call generateContent
    try {
        // Implementation depends on geminiService capabilities exposed
        // For now returning a mock to show structure
        return "أهلاً بك يا بطل! سؤالك ذكي جداً. هل لاحظت أن..."; 
    } catch (e) {
        return "يبدو أن الاتصال بالواحة ضعيف قليلاً، هل يمكنك إعادة السؤال؟";
    }
}
