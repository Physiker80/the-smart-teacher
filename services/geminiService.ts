
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_PROMPT, LESSON_PLAN_SCHEMA, GAME_SCHEMA, CURRICULUM_AGENT_PROMPT, CURRICULUM_SCHEMA } from "../constants";
import { LessonPlan, SlideContent, GameScenario, SongItem, StoryItem, QuizQuestion, Flashcard, PodcastScript, InfographicSection, VideoScriptScene, TokenUsageRecord, CurriculumBook } from "../types";

/**
 * Helper to track token usage and cost
 */
const trackUsage = (modelName: string, usage: any) => {
    if (!usage) return;

    // Pricing for Gemini 2.5 Flash (Estimated based on 1.5 Flash tiers, using generic upper bound for safety)
    // Input: $0.075 / 1M tokens -> $0.000000075
    // Output: $0.30 / 1M tokens -> $0.0000003
    // We use slightly higher estimates to be safe: $0.10 input / $0.40 output per 1M
    const INPUT_COST_PER_TOKEN = 0.0000001;
    const OUTPUT_COST_PER_TOKEN = 0.0000004;

    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || (inputTokens + outputTokens);

    const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);

    const record: TokenUsageRecord = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        date: new Date().toISOString(),
        model: modelName,
        inputTokens,
        outputTokens,
        totalTokens,
        cost
    };

    try {
        const history = JSON.parse(localStorage.getItem('st_token_usage_history') || '[]');
        history.push(record);
        // Keep last 5000 records to support annual checks
        if (history.length > 5000) history.shift();
        localStorage.setItem('st_token_usage_history', JSON.stringify(history));

        // Dispatch event for UI updates
        window.dispatchEvent(new Event('token-usage-updated'));
        console.log(`[Token Usage] ${inputTokens} in / ${outputTokens} out. Cost: $${cost.toFixed(6)}`);
    } catch (e) {
        console.error("Failed to save token usage", e);
    }
};

// Initialize Gemini Client
// In Vite, use import.meta.env.VITE_GEMINI_API_KEY
// In Vercel, it might also be process.env.VITE_GEMINI_API_KEY if configured that way
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

// Only initialize if key exists to prevent crashing immediately
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' }); 

if (!apiKey) {
    console.warn("⚠️ API Key is missing! AI features will not work.");
}

/**
 * Smart Algorithm to distribute exactly 40 minutes across slides based on content interaction type.
 */
const distributeTimeSmartly = (slides: SlideContent[]): SlideContent[] => {
    const TOTAL_MINUTES = 40;
    if (!slides || slides.length === 0) return slides;

    // 1. Identify Fixed Slides (First and Last)
    const titleSlideIndex = 0;
    const closureSlideIndex = slides.length - 1;

    let allocatedTime = 0;

    // Rule: Title Slide is always 1 minute
    if (slides[titleSlideIndex]) {
        slides[titleSlideIndex].duration = 1;
        allocatedTime += 1;
    }

    // Rule: Closure Slide is always 2 minutes
    if (slides.length > 1 && slides[closureSlideIndex]) {
        slides[closureSlideIndex].duration = 2;
        allocatedTime += 2;
    }

    // 2. Calculate "Interaction Weight" for middle slides
    const contentSlides: { index: number, weight: number }[] = [];
    let totalWeight = 0;

    for (let i = 1; i < slides.length - 1; i++) {
        const slide = slides[i];
        let weight = 1.0; // Base weight for standard content

        // Factor A: Text Length (Reading Time)
        // Avg reading speed for teaching is slower (~100 wpm) + explanation buffer
        const textLength = (slide.title?.length || 0) + (slide.narration?.length || 0);
        weight += textLength / 300;

        // Factor B: Interaction Keywords (The "Smart" part)
        const contentText = (slide.title + " " + slide.narration + " " + slide.visualDescription).toLowerCase();

        if (contentText.includes("لعبة") || contentText.includes("مسابقة") || contentText.includes("تحدي")) {
            weight += 3.5; // Games need significantly more time
        } else if (contentText.includes("نشاط") || contentText.includes("ورقة عمل") || contentText.includes("رسم") || contentText.includes("طبق")) {
            weight += 3.0; // Hands-on activities
        } else if (contentText.includes("ناقش") || contentText.includes("تحاور") || contentText.includes("ماذا تشاهد") || contentText.includes("؟")) {
            weight += 2.0; // Discussions / Q&A
        } else if (contentText.includes("فيديو") || contentText.includes("استمع") || contentText.includes("قصة")) {
            weight += 2.5; // Media consumption / Storytelling
        } else if (contentText.includes("مثال") || contentText.includes("شرح")) {
            weight += 1.5; // Direct instruction
        }

        contentSlides.push({ index: i, weight });
        totalWeight += weight;
    }

    // 3. Distribute Remaining Time (approx 37 minutes) proportionally
    const remainingTime = TOTAL_MINUTES - allocatedTime;

    contentSlides.forEach(item => {
        // Calculate raw share
        let rawDuration = (item.weight / totalWeight) * remainingTime;
        // Round to nearest integer, ensuring at least 1 minute
        let duration = Math.max(1, Math.round(rawDuration));

        slides[item.index].duration = duration;
    });

    // 4. Balancing Step: Fix Rounding Errors to ensure exactly 40 mins
    // Re-calculate total
    const currentTotal = slides.reduce((sum, s) => sum + (s.duration || 0), 0);
    let difference = TOTAL_MINUTES - currentTotal;

    if (difference !== 0 && contentSlides.length > 0) {
        // Sort slides by weight (heaviest first) to add/remove time where it impacts most/least
        // If adding time, add to heaviest. If removing, remove from heaviest (as they have buffer)
        contentSlides.sort((a, b) => b.weight - a.weight);

        let i = 0;
        while (difference !== 0) {
            const targetIndex = contentSlides[i % contentSlides.length].index;
            const currentDur = slides[targetIndex].duration || 0;

            if (difference > 0) {
                slides[targetIndex].duration = currentDur + 1;
                difference -= 1;
            } else if (difference < 0) {
                // Don't reduce below 2 minutes for heavy slides, or 1 minute for light slides
                if (currentDur > 1) {
                    slides[targetIndex].duration = currentDur - 1;
                    difference += 1;
                }
            }
            i++;
            // Safety break to prevent infinite loops if constraints are too tight (unlikely with 40 mins)
            if (i > 100) break;
        }
    }

    return slides;
};

export const generateLessonPlan = async (
    inputText: string,
    gradeLevel: string,
    media?: { mimeType: string, data: string }
): Promise<LessonPlan> => {
    try {
        const parts: any[] = [];

        // Add media if provided (Image or PDF)
        if (media) {
            parts.push({
                inlineData: {
                    mimeType: media.mimeType,
                    data: media.data
                }
            });
            parts.push({
                text: `
                **مهمة تحليل بصري وتعرف على المحتوى (Advanced OCR & Vision Analysis):**
                
                قم بتحليل صورة صفحة الكتاب المدرسي المرفقة بدقة متناهية لتنفيذ ما يلي:
                1. استخرج عنوان الدرس والنصوص الرئيسية.
                2. استنبط الأهداف الضمنية.
                3. حول الأنشطة الجامدة إلى تفاعلية تتناسب مع المناهج السورية الحديثة.
                `
            });
        }

        // Dynamic Prompt Injection - Balanced (Creative but Strict on Length)
        const promptInstruction = `
        قم بتوليد خطة درس وعرض تقديمي بناءً على:
        - الموضوع/الملاحظات: ${inputText || "استنتجه من الملف"}
        - الصف الدراسي المستهدف: "${gradeLevel}"
        
        **التعليمات الخاصة:**
        - الالتزام التام بمعايير المناهج السورية (التعلم النشط، ربط التعليم بالحياة).
        - تطبيق معايير "فريق الأحلام التربوي" في التصميم والتخطيط.
        - كن مبدعاً في السيناريو القصصي، ولكن **اجعل عنوان الدرس (topic) قصيراً ومباشراً (لا يتجاوز 6 كلمات)** لتجنب الأخطاء.
        `;

        parts.push({ text: promptInstruction });

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: {
                parts: parts
            },
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseSchema: LESSON_PLAN_SCHEMA,
                temperature: 0.5,
                maxOutputTokens: 8192,
                // Add safety settings to prevent blocking
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Track Usage
        if (response.usageMetadata) {
            trackUsage('gemini-2.5-flash', response.usageMetadata);
        }

        let jsonText = response.text;

        if (!jsonText) {
            const candidate = response.candidates?.[0];
            console.warn("Gemini Response Candidate:", candidate);
            if (candidate?.finishReason) {
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error("تم حظر المحتوى لأسباب تتعلق بالسلامة (Safety Filter). يرجى صياغة الموضوع بشكل مختلف.");
                }
                if (candidate.finishReason === 'RECITATION') {
                    throw new Error("تم حظر المحتوى بسبب حقوق النشر (Recitation).");
                }
            }
            throw new Error("لم يتم استلام رد من الذكاء الاصطناعي (No Response from AI).");
        }

        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

        // --- Sanitization Logic ---
        // Replace sequences of 5 or more identical non-word characters (like infinite emojis or symbols)
        jsonText = jsonText.replace(/([^\w\s])\1{5,}/g, '$1');

        // Remove specific variation selectors if they are causing issues
        jsonText = jsonText.replace(/[\uFE0F]/g, '');

        try {
            const parsedData = JSON.parse(jsonText);

            if (parsedData.slides && Array.isArray(parsedData.slides)) {
                parsedData.slides = distributeTimeSmartly(parsedData.slides);
            }

            return {
                ...parsedData,
                grade: gradeLevel, // Ensure grade matches user selection
                id: Date.now().toString()
            } as LessonPlan;
        } catch (jsonError) {
            console.error("JSON Parsing Error:", jsonError);
            console.error("Raw JSON Text (Sanitized):", jsonText);
            throw new Error("فشل في معالجة استجابة الذكاء الاصطناعي (Invalid JSON - Title Loop Detected). يرجى المحاولة مرة أخرى.");
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

export const generateGame = async (topic: string, gradeLevel: string, theme: string): Promise<GameScenario> => {
    try {
        const prompt = `
        Create an educational game scenario about "${topic}" for "${gradeLevel}" students.
        Theme: "${theme}" (e.g., Treasure Hunt, Space Mission, Detective).
        
        Return ONLY a JSON object matching this structure:
        {
            "id": "generated_id",
            "title": "Exciting Game Title in Arabic",
            "description": "Brief description in Arabic",
            "grade": "${gradeLevel}",
            "subject": "General",
            "theme": "${theme}",
            "introStory": "A short, engaging hook story in Arabic (max 3 sentences) that sets the scene.",
            "winCondition": "What needs to be done to win? (Arabic)",
            "reward": {
                "badgeName": "Creative Badge Name in Arabic",
                "visualDescription": "English prompt for a 3D badge image"
            },
            "challenges": [
                {
                    "id": "c1",
                    "type": "quiz",
                    "question": "Multiple choice question in Arabic",
                    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                    "correctAnswer": "Option 1",
                    "points": 10,
                    "hint": "Optional hint in Arabic"
                },
                {
                    "id": "c2",
                    "type": "puzzle",
                    "question": "A logic puzzle or riddle in Arabic relating to the topic",
                    "correctAnswer": "The answer",
                    "points": 20,
                    "hint": "Optional hint"
                },
                {
                    "id": "c3",
                    "type": "quiz",
                    "question": "Another question",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "A",
                    "points": 15
                }
            ]
        }
        
        Rules:
        - Content must be educational and accurate.
        - Tone should be fun and adventurous.
        - Strict JSON format.
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.7 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "{}";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(json);

        return {
            ...data,
            id: Date.now().toString()
        } as GameScenario;

    } catch (error) {
        console.error("Game Gen Error:", error);
        throw error;
    }
};

export const generateSlideImage = async (description: string): Promise<string | null> => {
    try {
        // 1. Try Nano Banana (Gemini 2.5 Flash Image) - Faster & Specialized
        try {
            // Enhance prompt for Nano Banana (Gemini 2.5 Flash Image)
            // It prefers concise, descriptive prompts for best results.
            const enhancedPrompt = description.length > 800 ? description.substring(0, 800) : description;
            const finalPrompt = `High quality, 3D Pixar style illustration. ${enhancedPrompt}. Bright colors, soft lighting, cute characters, educational context, detailed, 8k resolution.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Nano Banana
                contents: {
                    parts: [{ text: finalPrompt }]
                }
            });

            if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                return `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;
            }
        } catch (apiError: any) {
            console.warn("Nano Banana (Gemini 2.5 Flash Image) Failed, switching to fallback:", apiError.message);
            // Continue to fallback...
        }

        // 2. Fallback: Pollinations.ai (Free, High Quality, No Key)
        // We use a seed to make it deterministic if needed, or random for variety.

        // Truncate description to ensure stability (max ~250 chars for English)
        const safeDescription = description.length > 250 ? description.substring(0, 250) : description;
        const encodedPrompt = encodeURIComponent(safeDescription + " 3D Disney Pixar style, cute, bright colors, high quality");
        const randomSeed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&seed=${randomSeed}&nologo=true&model=flux`;

        // We return the URL directly. The <img> tag will handle loading it.
        return imageUrl;

    } catch (error) {
        console.error("All Image Gen methods failed:", error);
        // Return a safe placeholder if everything fails
        return "/fallback-slide.svg";
    }
};

export const generateSongOrStory = async (topic: string, type: 'song' | 'story', grade: string, fileData?: { mimeType: string, data: string }): Promise<SongItem | StoryItem> => {
    try {
        const isSong = type === 'song';
        const imageContext = fileData ? `
        ⚠️ تم إرفاق صورة/ملف من صفحة كتاب مدرسي.
        قم بتحليل محتوى الصورة المرفقة أولاً، ثم استخدم المعلومات الموجودة فيها لتأليف ${isSong ? 'النشيد' : 'القصة'}.
        إذا كان الموضوع محدداً أدناه، اجمع بين محتوى الصورة والموضوع المطلوب.
        ` : '';

        const prompt = `
        أنت مؤلف مبدع للأطفال ومعلم خبير.
        المطلوب: تأليف ${isSong ? 'نشيد تعليمي (أغنية)' : 'قصة قصيرة مشوقة'} للأطفال.
        ${imageContext}
        المعطيات:
        - الموضوع: "${topic || 'استخرج الموضوع من الصورة المرفقة'}"
        - الفئة المستهدفة: "${grade}"
        
        ${isSong ? `
        الشروط للنشيد:
        1. كلمات موزونة وسهلة الحفظ (قافية بسيطة).
        2. تتضمن قيماً تربوية أو مفاهيم تعليمية حول الموضوع.
        3. اقترح "مجازاً" لحنياً (مثلاً: على وزن "ماما زمنها جاية" أو مقام العجم).
        4. قم بتأليف "نوتة موسيقية" (Musical Score) تتضمن:
           - الكوردات (Chords) فوق الكلمات.
           - النوتة الحرفية (Solfège: Do, Re, Mi...) لللحن الأساسي.
           - الإيقاع المقترح (Rhythm).
        5. المخرجات يجب أن تكون بصيغة JSON حصراً.
        ` : `
        الشروط للقصة:
        1. قصة قصيرة (حوالي 200 كلمة) مشوقة جداً.
        2. بطل القصة شخصية محبوبة (حيوان، طفل ذكي، كائن فضائي...).
        3. حبكة بسيطة: مشكلة وحل يتعلق بالموضوع.
        4. المخرجات يجب أن تكون بصيغة JSON حصراً.
        `}

        بنية JSON المطلوبة:
        {
            "title": "عنوان جذاب",
            "description": "وصف مختصر جداً (سطر واحد)",
            "content": "${isSong ? 'كلمات النشيد كاملة مع توزيع المقاطع' : 'نص القصة كاملاً'}",
            "${isSong ? 'musicalStyle' : 'readTime'}": "${isSong ? 'وصف اللحن المقترح والمقام' : 'وقت القراءة المقدر (مثلاً: 3 دقائق)'}",
            "visualDescription": "High quality English prompt for 3D Pixar style image generation. (Strictly English, no Arabic).",
            "color": "اقتراح للون الخلفية (CSS gradient class like 'from-blue-500/20 to-purple-500/20')",
            "emoji": "إيموجي معبر"${isSong ? `,
            "musicalNotation": "النوتة الموسيقية الكاملة: (1) الكوردات فوق الكلمات، (2) نوتة الصولفيج (Solfège/Notes) لللحن، (3) الإيقاع."` : ''}
        }
        `;

        const parts: any[] = [{ text: prompt }];
        if (fileData) {
            parts.push({
                inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.data,
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                temperature: 0.8,
            }
        });

        if (response.usageMetadata) {
            trackUsage('gemini-2.5-flash', response.usageMetadata);
        }

        let jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");

        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonText);

        const id = Date.now().toString();

        if (isSong) {
            return {
                id,
                title: data.title,
                subject: 'عام',
                grade,
                duration: '2:00',
                emoji: data.emoji || '🎵',
                color: data.color || 'from-indigo-500/20 to-purple-500/20',
                description: data.description,
                musicalStyle: data.musicalStyle,
                content: data.content, // FIX: Ensure content is returned (Critical for MelodyStudio split)
                notes: data.notes || data.content, // Lyrics only
                musicalNotation: data.musicalNotation || 'No notation generated.', // Professional musical notation (Chords, Key, Rhythm, Notes in text format)
                imageUrl: undefined, // Will be generated later
                downloadUrl: '#'
            } as SongItem;
        } else {
            return {
                id,
                subject: 'عام',
                grade,
                readTime: data.readTime || '3 دقائق',
                emoji: data.emoji || '📚',
                color: data.color || 'from-amber-500/20 to-orange-500/20',
                preview: data.content.substring(0, 100) + '...',
                // Using content as description/full text for now
                description: data.content,
                imageUrl: undefined,
                downloadUrl: '#'
            } as StoryItem;
        }

    } catch (error) {
        console.error("Song/Story Gen Error:", error);
        throw error;
    }
};

// --- Smart Asset Generators (NotebookLM Style) ---

export const generateQuiz = async (topic: string, grade: string): Promise<QuizQuestion[]> => {
    try {
        const prompt = `
        Create a 5-question multiple choice quiz for "${grade}" students about "${topic}".
        Return ONLY a JSON array of objects.
        Each object must have:
        - id: string (unique)
        - text: string (question text in Arabic)
        - options: string[] (4 options in Arabic)
        - correctAnswer: number (0-3 index of correct option)
        - explanation: string (brief explanation in Arabic why it's correct)
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.4 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "[]";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json) as QuizQuestion[];
    } catch (e) { console.error(e); return []; }
};

export const generateFlashcards = async (topic: string, grade: string): Promise<Flashcard[]> => {
    try {
        const prompt = `
        Create 8 educational flashcards for "${grade}" students about "${topic}".
        Return ONLY a JSON array of objects.
        Each object must have:
        - id: string (unique)
        - front: string (Key concept/Term in Arabic)
        - back: string (Definition/Fact in Arabic - keep it concise)
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.4 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "[]";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json) as Flashcard[];
    } catch (e) { console.error(e); return []; }
};

export const generateMindMap = async (topic: string): Promise<string> => {
    try {
        const prompt = `
        Create a Mermaid.js mindmap syntax for the topic: "${topic}".
        Structure:
        mindmap
          root((${topic}))
            Branch1
              Leaf1
              Leaf2
            Branch2
              Leaf3
        
        Rules:
        - Use Arabic text for labels.
        - Return ONLY the raw Mermaid code starting with 'mindmap'.
        - Do not include markdown code blocks.
        - Keep it hierarchical and balanced (3-4 main branches).
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: 0.3 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let text = response.text || "";
        text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        return text;
    } catch (e) { console.error(e); return "mindmap\n root((Error))\n  Error(Try Again)"; }
};

export const generatePodcastScript = async (topic: string, grade: string): Promise<PodcastScript> => {
    try {
        const prompt = `
        Write a short, engaging 2-minute podcast script explaining "${topic}" to "${grade}" students.
        Format: Two hosts (Host A and Host B) discussing the topic in a fun, conversational Arabic style.
        Return ONLY JSON:
        {
          "title": "Catchy Podcast Title",
          "duration": "2:00",
          "script": [
            { "speaker": "Host A", "text": "..." },
            { "speaker": "Host B", "text": "..." }
          ]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.7 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "{}";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json) as PodcastScript;
    } catch (e) { console.error(e); return { title: "Error", duration: "0:00", script: [] }; }
};

export const generateInfographic = async (topic: string, grade: string): Promise<InfographicSection[]> => {
    try {
        const prompt = `
        Create content for a vertical infographic about "${topic}" for "${grade}".
        Return ONLY a JSON array of sections (4-5 sections).
        Each object:
        {
          "title": "Section Header (Arabic)",
          "content": "Brief impact bullet points or summary (Arabic)",
          "icon": "Name of a Lucide icon that fits (e.g. 'Zap', 'Book', 'Globe', 'Cpu', 'Users')",
          "color": "Tailwind color class for background (e.g. 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500')"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.5 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "[]";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json) as InfographicSection[];
    } catch (e) { console.error(e); return []; }
};

export const generateVideoScript = async (topic: string, grade: string): Promise<VideoScriptScene[]> => {
    try {
        const prompt = `
        Create a 6-scene video script for an educational video about "${topic}" (${grade}).
        Return ONLY a JSON array of scenes.
        Each object:
        {
          "sceneNumber": number,
          "visual": "Description of the visual/animation (English for AI generation later)",
          "audio": "Voiceover script (Arabic)",
          "duration": "Duration string (e.g. '10s')"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", temperature: 0.6 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "[]";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json) as VideoScriptScene[];
    } catch (e) { console.error(e); return []; }
};

export const generateGameScenario = async (topic: string, gradeLevel: string, fileData?: { mimeType: string, data: string }): Promise<GameScenario> => {
    try {
        const filePrompt = fileData ? `
        ⚠️ Attached is a textbook page or worksheet.
        Analyze the image content deeply.
        1. Extract the core lesson/topic perfectly.
        2. Create challenges based EXACTLY on the content found in the image.
        3. If the image contains questions, gamify them.
        ` : '';

        const prompt = `
        Act as an expert educational gamification designer.
        Create a "Gamified Lesson Adventure" for "${gradeLevel}" students about "${topic}".
        ${filePrompt}

        Return ONLY a JSON object with this exact structure (No markdown):
        {
            "id": "generated_id",
            "title": "Arabic Title",
            "titleEn": "English Title",
            "description": "Brief Arabic Description",
            "grade": "${gradeLevel}",
            "targetGrade": "${gradeLevel}",
            "subject": "General",
            "theme": "custom",
            "storyline": "Engaging backstory in Arabic (The Mission)",
            "storylineEn": "English translation of storyline",
            "introStory": "Same as storyline",
            "howToPlay": "Instructions in Arabic",
            "howToPlayEn": "Instructions in English",
            "objectives": ["Obj 1 Arabic", "Obj 2 Arabic"],
            "objectivesEn": ["Obj 1 English", "Obj 2 English"],
            "winCondition": "Complete all challenges",
            "rewardSystem": {
                "badges": ["Badge 1", "Badge 2"],
                "epicWin": "Description of the victory moment (Arabic)",
                "visualDescription": "English prompt for 3D reward image"
            },
            "reward": {
                "badgeName": "Champion",
                "visualDescription": "English prompt for 3D reward image"
            },
            "challenges": [
                {
                    "id": "c1",
                    "type": "quiz",
                    "text": "Question in Arabic",
                    "textEn": "Question in English",
                    "options": ["Op1", "Op2", "Op3", "Op4"],
                    "optionsEn": ["Op1", "Op2", "Op3", "Op4"],
                    "correctAnswer": "Op1",
                    "points": 10
                },
                {
                    "id": "c2",
                    "type": "activity",
                    "text": "Physical or creative activity instruction in Arabic",
                    "textEn": "Instruction in English",
                    "points": 20
                }
            ]
        }
        `;

        const parts: any[] = [{ text: prompt }];
        if (fileData) {
            parts.push({
                inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.data
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: [{ parts }],
            config: { responseMimeType: "application/json", temperature: 0.7 }
        });

        if (response.usageMetadata) trackUsage('gemini-2.5-flash', response.usageMetadata);

        let json = response.text || "{}";
        json = json.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(json);

        return {
            ...data,
            id: Date.now().toString()
        } as GameScenario;

    } catch (error) {
        console.error("Legacy Game Gen Error:", error);
        throw error;
    }
};

/**
 * Curriculum Agent: Analyze an entire textbook PDF and extract structured curriculum data.
 * Emits "live thoughts" via the onThought callback for real-time UI streaming.
 */
export const analyzeCurriculum = async (
    pdfData: { mimeType: string; data: string },
    onThought?: (thought: string) => void
): Promise<CurriculumBook> => {
    try {
        const parts: any[] = [
            {
                inlineData: {
                    mimeType: pdfData.mimeType,
                    data: pdfData.data
                }
            },
            {
                text: `
                قم بتحليل الكتاب المدرسي المرفق بالكامل وفق بروتوكولات منهاجي.
                استخرج جميع الدروس والوحدات التعليمية.
                أنشئ تدفق أفكار "تفكير منهاجي" يوضح تقدم التحليل.
                طبق بروتوكول الجماليات على المفاهيم الأساسية.
                `
            }
        ];

        // Emit initial thought
        onThought?.("جاري تحميل الملف وتهيئة محرك التحليل الذكي...");

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: { parts },
            config: {
                systemInstruction: CURRICULUM_AGENT_PROMPT,
                responseMimeType: "application/json",
                responseSchema: CURRICULUM_SCHEMA,
                temperature: 0.4,
                maxOutputTokens: 65536,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Track usage
        if (response.usageMetadata) {
            trackUsage('gemini-2.5-flash (curriculum)', response.usageMetadata);
        }

        let jsonText = response.text;
        if (!jsonText) {
            throw new Error("لم يتم استلام رد من منهاجي.");
        }

        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonText = jsonText.replace(/([^\w\s])\1{5,}/g, '$1');
        jsonText = jsonText.replace(/[\uFE0F]/g, '');

        const parsed = JSON.parse(jsonText);

        // Stream the live thoughts with delays for UI effect
        const thoughts: string[] = parsed.live_thoughts || [];
        for (let i = 0; i < thoughts.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
            onThought?.(thoughts[i]);
        }

        // Map the response to our typed interface
        const result: CurriculumBook = {
            bookMetadata: {
                subject: parsed.book_metadata?.subject || 'غير محدد',
                grade: parsed.book_metadata?.grade || 'غير محدد',
                part: parsed.book_metadata?.part || 'غير محدد',
                totalPages: parsed.book_metadata?.totalPages
            },
            liveThoughts: thoughts,
            curriculumStructure: (parsed.curriculum_structure || []).map((lesson: any) => ({
                lessonTitle: lesson.lesson_title || 'درس بدون عنوان',
                pageRange: lesson.page_range || [0, 0],
                objectives: lesson.objectives || [],
                keyVisuals: (lesson.key_visuals || []).map((kv: any) => ({
                    text: kv.text || '',
                    material: kv.material || 'paper',
                    calligraphyStyle: kv.calligraphy_style || 'نسخ'
                })),
                activities: lesson.activities || [],
                assessmentQuestions: lesson.assessment_questions || [],
                status: 'ready' as const
            }))
        };

        onThought?.("✅ اكتمل التحليل بنجاح! تم استخراج " + result.curriculumStructure.length + " درساً.");

        return result;

    } catch (error) {
        console.error("Curriculum Agent Error:", error);
        onThought?.("❌ حدث خطأ أثناء التحليل: " + (error instanceof Error ? error.message : 'خطأ غير معروف'));
        throw error;
    }
};
