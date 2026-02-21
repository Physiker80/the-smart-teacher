
// Define the structure of the AI response
export interface LessonObjective {
    domain: 'cognitive' | 'skill' | 'emotional'; // المعرفي، المهاري، الوجداني
    text: string;
}

export interface LessonProcedure {
    step: string;
    teacherRole: string;
    studentRole: string;
    strategy: string; // e.g., العصف الذهني
    time: string;
}

export interface SlideContent {
    slideNumber: number;
    title: string;
    narration: string; // السيناريو القصصي للمعلم
    visualDescription: string; // وصف الصورة للذكاء الاصطناعي
    imageUrl?: string; // Optional generated image URL
    iconUrl?: string; // Optional custom user-uploaded icon
    duration?: number; // Duration in minutes
}

export interface LessonDifferentiation {
    enrichment: string; // نشاط للمتميزين
    support: string; // نشاط للمتعثرين
}

export interface LessonReflection {
    teacherNotes: string; // ملاحظات المعلم
    strengths: string; // نقاط القوة
    weaknesses: string; // نقاط للمعالجة
}

export interface LessonSmartGuide {
    valueAdded: string; // القيمة المضافة
    smartTool: string; // أداة ذكية
}

export interface LessonAnthem {
    lyrics: string; // كلمات نشيد الدرس
    melodyDescription: string; // وصف اللحن والإيقاع
}

export interface LessonPlan {
    id: string;
    topic: string;
    grade: string;
    subject: string;
    part?: string; // الفصل الدراسي: الفصل الأول / الفصل الثاني
    teacherName?: string; // Added teacher name field

    // Section 1: Administrative Data handled by context, but generated partly
    date?: string;
    resources?: string; // موارد التعلم

    // Section 2: Procedural Matrix
    objectives: LessonObjective[];
    prerequisites: string[]; // التعلم القبلي
    procedures: LessonProcedure[];

    // Section 3: Evaluation & Closure
    evaluationQuestions: string[];
    closureActivity: string; // التقويم النهائي

    // Section 4: Differentiation (New)
    differentiation?: LessonDifferentiation;

    // Section 5: Reflection (New)
    reflection?: LessonReflection;

    // Section 6: Smart Guide (New from Dream Team Prompt)
    smartGuide?: LessonSmartGuide;

    // Section 7: Lesson Anthem (by Songwriter)
    lessonAnthem?: LessonAnthem;
    assets?: SmartAssets;

    // Extra: Slides
    slides: SlideContent[];
}

// Gamification Types (Bilingual: Arabic + English)
// Game Forge Interfaces
export interface GameChallenge {
    id: string;
    type: 'quiz' | 'puzzle' | 'riddle' | 'challenge' | 'activity'; // Added activity
    question?: string; // For New Game Forge
    text?: string; // For Legacy GamificationGenerator
    textEn?: string;
    imageUrl?: string;
    options?: string[];
    optionsEn?: string[];
    correctAnswer?: string;
    hint?: string;
    points: number;
}

export interface GameScenario {
    id: string;
    title: string;
    description: string;
    grade: string;
    subject: string;
    theme: 'treasure_hunt' | 'space_mission' | 'detective' | 'jungle_adventure' | 'custom'; // Added custom

    // New Game Forge Fields
    introStory: string;
    winCondition: string;
    reward: {
        badgeName: string;
        visualDescription: string;
    };

    // Legacy GamificationGenerator Fields (Optional)
    targetGrade?: string; // Mapped to grade
    storyline?: string; // Mapped to introStory
    howToPlay?: string;
    objectives?: string[];
    rewardSystem?: {
        badges: string[];
        epicWin: string;
        visualDescription?: string;
        musicPrompt?: string;
        imageUrl?: string;
    };

    challenges: GameChallenge[];

    // Shared Optional
    titleEn?: string;
    storylineEn?: string;
    howToPlayEn?: string;
    objectivesEn?: string[];
}


export interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // 0-indexed
    explanation: string;
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
}

export interface MindMapNode {
    id: string;
    label: string;
    children?: MindMapNode[];
}

export interface PodcastScript {
    title: string;
    duration: string;
    script: { speaker: string; text: string }[];
}

export interface InfographicSection {
    title: string;
    content: string;
    icon: string; // Lucide icon name or emoji
    color: string;
    visualDescription?: string; // English prompt for Disney/Pixar style image
    imageUrl?: string; // Generated image URL/base64
}

export interface VideoScriptScene {
    sceneNumber: number;
    visual: string;
    audio: string;
    duration: string;
}

/** ورقة عمل — لتقييم فهم الطلاب */
export type WorksheetItemType = 'mcq' | 'fill_blank' | 'short_answer' | 'true_false';

export interface WorksheetItem {
    id: string;
    type: WorksheetItemType;
    /** نص السؤال أو الجملة (للمتكامل: استخدم ___ للفراغ) */
    text: string;
    /** خيارات لـ mcq و true_false */
    options?: string[];
    /** 0-based index للخيار الصحيح */
    correctAnswer?: number;
    /** الإجابة الصحيحة للنص المفتوح أو الفراغ */
    answer?: string;
    /** للتقييم الذاتي — تفسير موجز */
    explanation?: string;
}

export interface Worksheet {
    title: string;
    instructions?: string;
    topic: string;
    grade: string;
    items: WorksheetItem[];
}

export interface SmartAssets {
    quiz?: QuizQuestion[];
    flashcards?: Flashcard[];
    mindMap?: string; // Mermaid syntax
    podcast?: PodcastScript;
    infographic?: InfographicSection[];
    videoScript?: VideoScriptScene[];
}



export interface SongItem {
    id: string;
    title: string;
    subject: string;
    grade: string;
    duration: string;
    emoji: string;
    color: string;
    description: string;
    musicalStyle: string;
    content?: string; // Full lyrics content
    notes: string; // Lyrics or musical notes text
    musicalNotation?: string; // Professional ABC notation or chords
    downloadUrl: string;
}

export interface StoryItem {
    id: string;
    title: string;
    subject: string;
    grade: string;
    readTime: string;
    emoji: string;
    color: string;
    preview: string;
    description: string;
    imageUrl?: string;
    downloadUrl: string;
}

// Calendar Event (School Planner)
export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO format: YYYY-MM-DD
    time?: string; // e.g. '08:00'
    type: 'lesson' | 'game' | 'exam' | 'event';
    subject?: string;
    grade?: string;
    color?: string;
    relatedPlanId?: string; // Link to a LessonPlan
    relatedClassId?: string; // Link to a ClassRoom
    notes?: string;
}

// Class Management System
export interface ClassAssessment {
    id: string;
    title: string; // e.g. "اختبار الوحدة 1"
    date: string; // ISO format: YYYY-MM-DD
    type: 'exam' | 'homework' | 'participation' | 'game' | 'midterm' | 'final';
    maxScore: number;
    relatedCalendarEventId?: string; // Link to CalendarEvent
}

export interface StudentGrade {
    id: string;
    title: string; // e.g. "اختبار الوحدة 1"
    score: number;
    maxScore: number;
    date: string;
    type: 'exam' | 'homework' | 'participation' | 'game' | 'midterm' | 'final';
    assessmentId?: string; // Link to ClassAssessment
}

export interface Student {
    id: string;
    name: string;
    /** رقم التسجيل — الرقم الذي يدخله الطالب عند التسجيل للانضمام للفصل */
    registrationCode?: string;
    dob?: string;
    avatar?: string;
    behaviorNotes?: string;
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | '';
    grades: StudentGrade[];
    participationCount: number;
    parentContact?: string;
}

export interface Announcement {
    id: string;
    text: string;
    date: string;
    type: 'info' | 'warning' | 'celebration';
}


export interface StudentGroup {
    id: string;
    name: string; // e.g., "الصف الثاني - شعبة أ"
    gradeLevel: string;
    students: Student[];
}

export interface ClassRoom {
    id: string;
    name: string; // e.g. "الصف الثاني - فصل أ"
    gradeLevel: string;
    subject?: string;
    classCode?: string; // Added Class Code
    students: Student[];
    studentGroupId?: string; // Link to the original group if applicable
    announcements: Announcement[];
    assessments: ClassAssessment[]; // Class-level exams/assignments
    color: string; // Accent color for the class card
}

export interface LearningUnit {
    id: string;
    title: string;
    classId: string;
    objectives: string[];
    relatedLessonIds: string[];
    resourceIds: string[];
}

export interface Resource {
    id: string;
    title: string;
    type: 'pdf' | 'image' | 'video' | 'link' | 'template' | 'lesson-plan' | 'song' | 'game' | 'story' | 'simulation' | 'worksheet' | 'certificate';
    url?: string;
    tags: string[];
    content?: any; // Flexible content field for song/story/game data
    classId?: string;
    unitId?: string;
    createdAt: string;
    data?: LessonPlan | SongItem | StoryItem | any;
}

// Private Vault Types
export interface JournalEntry {
    id: string;
    date: string; // ISO
    mood: 'happy' | 'neutral' | 'stressed' | 'inspired';
    content: string;
    tags: string[];
}

export interface StudentWork {
    id: string;
    studentName: string;
    title: string;
    type: 'image' | 'video' | 'text';
    url: string; // Base64 data URL or external link
    date: string;
    notes: string;
}

export type AppView = 'welcome' | 'login-teacher' | 'login-student' | 'dashboard' | 'create-lesson' | 'view-lesson' | 'gamification' | 'simulation' | 'songs' | 'profile' | 'calendar' | 'class-manager' | 'story-weaver' | 'melody-studio' | 'private-vault' | 'curriculum-agent' | 'student-oasis' | 'oasis-command-center' | 'creativity-studio';

// Curriculum Agent Types (منهاجي)
export interface KeyVisual {
    text: string;
    material: 'stone' | 'paper' | 'wood' | 'fabric';
    calligraphyStyle: string;
}

export interface CurriculumLesson {
    lessonTitle: string;
    pageRange: [number, number];
    objectives: string[];
    keyVisuals: KeyVisual[];
    activities: string[];
    assessmentQuestions: string[];
    status: 'processing' | 'ready' | 'error';
    resources?: { id: string; name: string; type: 'pdf' | 'image'; date: string }[];
}

export interface CurriculumBook {
    id: string;
    analyzedAt: string;
    fileName: string;
    bookMetadata: {
        subject: string;
        grade: string;
        part: string;
        totalPages?: number;
    };
    linkedClassId?: string; // Optional: Link to specific ClassRoom
    liveThoughts: string[];
    curriculumStructure: CurriculumLesson[];
}

/** Returns display name for curriculum book - uses metadata when fileName is generic */
export const getCurriculumBookDisplayName = (book: CurriculumBook): string => {
    const generic = !book.fileName || book.fileName === 'Uploaded Book' || book.fileName === 'كتاب محلل';
    if (generic && book.bookMetadata) {
        const parts = [book.bookMetadata.subject, book.bookMetadata.grade, book.bookMetadata.part].filter(Boolean);
        if (parts.length > 0) return parts.join(' - ');
    }
    return book.fileName || 'كتاب محلل';
};

export interface UserStats {
    level: number;
    xp: number;
    nextLevelXp: number;
    achievements: number;
    points: number;
}

export type Theme = 'default' | 'winter' | 'nature' | 'sunset';

export interface TokenUsageRecord {
    id: string;
    date: string; // ISO string
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number; // In USD
}

export interface UserProfile {
    name: string;
    role: string;
    school: string;
    subject?: string; // المادة التي يدرسها
    bio?: string; // نبذة مختصرة
    themePreference?: Theme;
    stats?: UserStats; // إحصائيات التلعيب
}
