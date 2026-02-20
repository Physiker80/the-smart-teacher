
export const generateSongOrStory = async (topic: string, type: 'song' | 'story', grade: string): Promise<SongItem | StoryItem> => {
    try {
        const isSong = type === 'song';
        const prompt = `
        أنت مؤلف مبدع للأطفال ومعلم خبير.
        المطلوب: تأليف ${isSong ? 'نشيد تعليمي (أغنية)' : 'قصة قصيرة مشوقة'} للأطفال.
        
        المعطيات:
        - الموضوع: "${topic}"
        - الفئة المستهدفة: "${grade}"
        
        ${isSong ? `
        الشروط للنشيد:
        1. كلمات موزونة وسهلة الحفظ (قافية بسيطة).
        2. تتضمن قيماً تربوية أو مفاهيم تعليمية حول الموضوع.
        3. اقترح "مجازاً" لحنياً (مثلاً: على وزن "ماما زمنها جاية" أو مقام العجم).
        4. المخرجات يجب أن تكون بصيغة JSON حصراً.
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
            "visualDescription": "وصف دقيق باللغة الإنجليزية لمشهد بصري يعبر عن العمل (للتوليد بالذكاء الاصطناعي - 3D Pixar Style)",
            "color": "اقتراح للون الخلفية (CSS gradient class like 'from-blue-500/20 to-purple-500/20')",
            "emoji": "إيموجي معبر"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                // We use a loose schema here or just trust the prompt for now as schema definition is verbose
                temperature: 0.8,
            }
        });

        let jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");

        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonText);

        const id = Date.now().toString();

        if (isSong) {
            return {
                id,
                title: data.title,
                subject: 'عام', // Can be inferred but fixed for now
                grade,
                duration: '2:00',
                emoji: data.emoji || '🎵',
                color: data.color || 'from-indigo-500/20 to-purple-500/20',
                description: data.description,
                musicalStyle: data.musicalStyle,
                notes: data.content,
                downloadUrl: '#'
            } as SongItem;
        } else {
            return {
                id,
                title: data.title,
                subject: 'عام',
                grade,
                readTime: data.readTime,
                emoji: data.emoji || '📖',
                color: data.color || 'from-emerald-500/20 to-teal-500/20',
                preview: data.content.substring(0, 100) + '...',
                description: data.description, // Use full text as description or separate? Actually 'notes' in SongItem is content. StoryItem has 'description' and 'preview'.
                // Let's use 'description' for short logic, and I might need to store full text somewhere. 
                // Wait, StoryItem definition in SongsStories.tsx had 'description' but where is the CONTENT?
                // It seems StoryItem in my previous read check didn't have 'content' field!
                // Let's re-check StoryItem definition I added to types.ts.
                // It matches what was in SongsStories.tsx.
                // Ah, in SongsStories.tsx, the content might be display in a modal using 'description' or maybe it was missing?
                // Let's check SongsStories.tsx usages.
                // Re-reading SongsStories.tsx (from memory or file view):
                // Stories loop: <p className="text-slate-400 text-xs mb-3 line-clamp-2">{story.description}</p>
                // It seems 'description' holds the summary.
                // BUT where is the full story text?
                // The interface has: id, title, subject, grade, readTime, emoji, color, preview, description, imageUrl, downloadUrl.
                // It seems `description` IS the full text or `preview` is part of it. 
                // Let's map 'content' to 'description' for now as it's the closest fit for "Text of the story".
                // Actually, let's map 'content' to a new field if possible, or overload 'description'.
                // Let's overload 'description' to hold the FULL story for now, and 'preview' for the snippet.
                description: data.content,
                imageUrl: undefined, // Will be generated later
                downloadUrl: '#'
            } as StoryItem;
        }

    } catch (error) {
        console.error("Song/Story Gen Error:", error);
        throw error;
    }
};
