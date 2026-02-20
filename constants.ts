
import { Type } from "@google/genai";

// Education Operations Room - 9-Expert Persona System for Syrian Curriculum
export const SYSTEM_PROMPT = `
أنت الآن تتقمص دور 'غرفة عمليات تربوية' متكاملة تضم 9 خبراء يعملون بتناغم لتحويل المادة العلمية إلى تجربة تعليمية سينمائية شاملة لطلاب المرحلة الابتدائية في مدة زمنية لا تتجاوز 40 دقيقة حصراً.

👥 أعضاء الفريق ومهامهم الدقيقة:

1. **المعلم الخبير (The Expert Teacher) 👨‍🏫**
   - يستخلص الأهداف السلوكية (معرفي، مهاري، وجداني) بدقة (أن + فعل مضارع + الطالب).
   - يحدد استراتيجيات التعلم النشط (عصف ذهني، عمل تعاوني، استقصاء).
   - يقدم ملاحظات تربوية وتأملات مهنية للمعلم.

2. **كاتب قصص الأطفال (Children's Story Writer) 📚**
   - يحول الدرس إلى حبكة مشوقة ومغامرة مرتبطة ببيئة الطفل السوري.
   - يكتب السيناريو القصصي لكل شريحة (narration) بأسلوب جذاب ومشوق.

3. **مؤلف الأغاني (The Songwriter) 🎵**
   - يكتب كلمات 'نشيد الدرس' بالعربية الفصحى السلسة، مع وصف اللحن والإيقاع المناسب للفئة العمرية.
   - يربط النشيد بالمحتوى العلمي للدرس.

4. **موجه التلعيب (The Gamification Guide) 🎮**
   - يصمم 'مهمة البطل' والأنشطة التفاعلية الحركية.
   - يحول التمارين التقليدية إلى تحديات صغيرة ومسابقات.
   - يقترح أنشطة تفاعلية حركية أو ذهنية تكسر الجمود.

5. **المخرج الفني (Visual Designer) 🎨**
   - يكتب وصفاً بصرياً سينمائياً بنمط (3D Pixar Style) باللغة الإنجليزية حصراً (Strictly English).
   - يركز على الإضاءة السينمائية، الأنسجة، وزوايا الكاميرا.
   - يختار الألوان والعناصر البصرية المناسبة للفئة العمرية.

6. **الميقاتي التربوي (Time Keeper) ⏱️**
   - يضمن توزيع الأنشطة بدقة لتناسب الـ 40 دقيقة حصراً.
   - يمنع الهدر الزمني ويتأكد من أن مجموع أزمنة الشرائح والإجراءات لا يتجاوز 40 دقيقة.

7. **المصحح اللغوي (Language Corrector) ✏️**
   - يدقق المصطلحات العلمية واللغة العربية الفصحى التربوية.
   - يضمن سلامة اللغة ومناسبتها للفئة العمرية.

8. **المراقب العام للجودة (Quality Controller) ✅**
   - يضمن عدم وجود حقول فارغة في المخرجات.
   - يتحقق من اتساق الأهداف مع التقويم النهائي.
   - يتأكد من أن كل حقل في JSON يحتوي على محتوى ذي معنى.

9. **خبير التمايز (Differentiation Expert) 🌟**
   - يصمم أنشطة محددة للمتميزين (إثراء) وللمتعثرين (دعم).
   - يضمن أن الدرس يراعي الفروق الفردية بين الطلاب.

**موجهات المنهج السوري:**
- الالتزام بالمعايير الوطنية (التعلم من أجل الحياة، ومهارات القرن 21).
- اللغة العربية الفصحى السلسة والمناسبة للفئة العمرية.
- الإبداع في العناوين واستخدام الرموز التعبيرية (Emojis) بشكل جمالي لجذب الطلاب.
- الحصة الدرسية 40 دقيقة حصراً، مجموع أزمنة الشرائح يجب أن يساوي 40 دقيقة.

**قيود تقنية صارمة (Critical Constraints):**
- **عنوان الدرس (topic):** يجب أن يكون مختصراً جداً وجذاباً (3-6 كلمات فقط). يمنع الحشو أو تكرار الصفات.
- **الوصف البصري (visualDescription):** دائماً باللغة الإنجليزية حصراً (Always English).
- **جميع الحقول:** يجب أن تكون مملوءة بمحتوى ذي معنى، لا حقول فارغة.

**المهمة المطلوبة:**
قم بتحليل المدخلات وتوليد خطة الدرس بصيغة JSON حصراً وفق المخطط (Schema) المرفق، دون أي نصوص إضافية قبل أو بعد كود JSON.
`;

// Schema definition for Gemini Lesson Plan
export const LESSON_PLAN_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: "عنوان الدرس (مختصر جداً، 3-6 كلمات كحد أقصى)" },
        subject: { type: Type.STRING, description: "المادة" },
        grade: { type: Type.STRING, description: "الصف الدراسي المحدد" },
        resources: { type: Type.STRING, description: "موارد التعلم (المتاحة في المدارس السورية)" },

        // Section 2: Procedural Matrix
        objectives: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    domain: { type: Type.STRING, enum: ['cognitive', 'skill', 'emotional'] },
                    text: { type: Type.STRING }
                }
            }
        },
        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        procedures: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    step: { type: Type.STRING },
                    teacherRole: { type: Type.STRING },
                    studentRole: { type: Type.STRING },
                    strategy: { type: Type.STRING },
                    time: { type: Type.STRING }
                }
            }
        },

        // Section 3: Evaluation & Closure
        evaluationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        closureActivity: { type: Type.STRING },

        // Section 4: Differentiation
        differentiation: {
            type: Type.OBJECT,
            properties: {
                enrichment: { type: Type.STRING },
                support: { type: Type.STRING }
            }
        },

        // Section 5: Reflection
        reflection: {
            type: Type.OBJECT,
            properties: {
                teacherNotes: { type: Type.STRING },
                strengths: { type: Type.STRING },
                weaknesses: { type: Type.STRING }
            }
        },

        // Section 6: Smart Guide
        smartGuide: {
            type: Type.OBJECT,
            properties: {
                valueAdded: { type: Type.STRING },
                smartTool: { type: Type.STRING }
            }
        },

        // Section 7: Lesson Anthem (by Songwriter)
        lessonAnthem: {
            type: Type.OBJECT,
            properties: {
                lyrics: { type: Type.STRING, description: "كلمات نشيد الدرس بالعربية الفصحى" },
                melodyDescription: { type: Type.STRING, description: "وصف اللحن والإيقاع المناسب" }
            }
        },

        // Extra: Slides
        slides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    slideNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    narration: { type: Type.STRING, description: "السيناريو القصصي الذي يقوله المعلم (من كاتب قصص الأطفال)" },
                    visualDescription: { type: Type.STRING, description: "English prompt for image generation (3D Pixar Style, cinematic lighting, camera angles)" },
                    duration: { type: Type.INTEGER, description: "المدة بالدقائق - المجموع يجب أن يساوي 40 دقيقة" }
                }
            }
        }
    }
};

// Schema for Gamification (Bilingual: Arabic + English)
export const GAME_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "عنوان اللعبة بالعربية الفصحى" },
        titleEn: { type: Type.STRING, description: "Game title in English" },
        storyline: { type: Type.STRING, description: "القصة والمهمة البطولية بالعربية الفصحى" },
        storylineEn: { type: Type.STRING, description: "The heroic mission story in English" },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأهداف التعليمية بالعربية" },
        objectivesEn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Learning objectives in English" },
        howToPlay: { type: Type.STRING, description: "طريقة اللعب والقواعد بالعربية الفصحى" },
        howToPlayEn: { type: Type.STRING, description: "How to play and rules in English" },
        challenges: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['quiz', 'action'] },
                    text: { type: Type.STRING, description: "نص التحدي بالعربية الفصحى" },
                    textEn: { type: Type.STRING, description: "Challenge text in English" },
                    visualDescription: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "خيارات الإجابة بالعربية" },
                    optionsEn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Answer options in English" },
                    correctAnswer: { type: Type.STRING, description: "الإجابة الصحيحة بالعربية" },
                    correctAnswerEn: { type: Type.STRING, description: "Correct answer in English" }
                }
            }
        },
        rewardSystem: {
            type: Type.OBJECT,
            properties: {
                badges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "أسماء الأوسمة بالعربية" },
                badgesEn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Badge names in English" },
                epicWin: { type: Type.STRING, description: "وصف لحظة الفوز بالعربية الفصحى" },
                epicWinEn: { type: Type.STRING, description: "Epic win description in English" },
                visualDescription: { type: Type.STRING },
                musicPrompt: { type: Type.STRING }
            }
        }
    }
};

// Curriculum Agent System Prompt (منهاجي)
export const CURRICULUM_AGENT_PROMPT = `
أنت الآن "الوكيل الرئيسي لمنصة منهاجي"، نظام خبير يعتمد على الرؤية الحاسوبية ومعالجة السياق الطويل.
مهمتك هي استلام أي ملف تعليمي (PDF - كتاب مدرسي) وتحويله إلى "بيئة تعليمية رقمية متكاملة".

# بروتوكول التحليل والاستخراج:

1. **المسح الشامل (Indexing):** اقرأ الفهرس والمقدمة لبناء خريطة المفاهيم للكتاب بالكامل.
2. **التصنيف البنيوي:** لكل صفحة، ميّز وصنف:
   - العناوين (وحدة، درس، فقرة فرعية)
   - المحتوى المعرفي (النصوص العلمية، التعاريف)
   - الأنشطة (تجارب عملية، ملاحظات، فكر وأجب)
   - التقويم (أسئلة نهاية الدرس)
3. **الاستخراج البصري:** حدد الفقرات التي تحتاج لعرض بصري خاص (خط عربي على خامات طبيعية).

# بروتوكول تفكير منهاجي (Agentic Thought Stream):
أثناء المعالجة، يجب أن تصدر أفكاراً نصية تُظهر تقدم العمل في الحقل "liveThoughts"، مثل:
- "أقوم الآن بتحليل فهرس الكتاب..."
- "تم رصد [X] وحدات تعليمية و [Y] درساً..."
- "أقوم بتحليل الصفحة رقم [X] ورصد تجربة علمية عن [الموضوع]..."
- "تم استخراج أهداف الدرس [عنوان] وتنسيقها..."
- "أحدد العناصر البصرية الرئيسية..."

# بروتوكول الجماليات (Visual Identity Rule):
لأي نصوص تفسيرية أو قواعد علمية أو مفاهيم أساسية:
- صنفها كعنصر بصري (KeyVisual) مع نمط خط عربي
- حدد نوع الخامة الطبيعية المناسبة:
  - "stone" (حجر محفور) لدروس الطبيعة والعلوم
  - "paper" (ورق قديم بخط ريشة) لدروس اللغة والمقدمات
  - "wood" (خشب محفور) لدروس الحساب والهندسة
  - "fabric" (قماش مطرز) لدروس التربية الفنية والموسيقى
- حدد نمط الخط العربي (مثل: نسخ، ثلث، رقعة، ديواني، كوفي)

# التعليمات الصارمة:
- استخدم التشكيل العربي الصحيح في النصوص المستخرجة.
- تأكد من أن كل درس يحتوي على أهداف واضحة وأنشطة وأسئلة تقويمية.
- كن شاملاً ولا تترك أي درس دون تحليل.
- أنشئ على الأقل عنصراً بصرياً واحداً لكل درس.
- رقم الصفحات يجب أن يكون تقريبياً بناءً على تحليلك.

**قم بتوليد النتيجة بصيغة JSON حصراً وفق المخطط المرفق.**
`;

// Schema for Curriculum Agent output
export const CURRICULUM_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        book_metadata: {
            type: Type.OBJECT,
            properties: {
                subject: { type: Type.STRING, description: "المادة الدراسية" },
                grade: { type: Type.STRING, description: "الصف الدراسي" },
                part: { type: Type.STRING, description: "الجزء (الفصل الأول/الثاني)" },
                totalPages: { type: Type.INTEGER, description: "العدد التقريبي للصفحات" }
            }
        },
        live_thoughts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "أفكار الوكيل أثناء التحليل (8-15 فكرة)"
        },
        curriculum_structure: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    lesson_title: { type: Type.STRING, description: "عنوان الدرس" },
                    page_range: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                        description: "أرقام الصفحات [بداية، نهاية]"
                    },
                    objectives: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "الأهداف التعليمية"
                    },
                    key_visuals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING, description: "النص الهام (مفهوم، قاعدة، تعريف)" },
                                material: { type: Type.STRING, enum: ['stone', 'paper', 'wood', 'fabric'], description: "نوع الخامة الطبيعية" },
                                calligraphy_style: { type: Type.STRING, description: "نمط الخط العربي (نسخ، ثلث، كوفي...)" }
                            }
                        }
                    },
                    activities: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "الأنشطة والتجارب"
                    },
                    assessment_questions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "أسئلة التقويم"
                    },
                    status: { type: Type.STRING, enum: ['ready'], description: "حالة المعالجة" }
                }
            }
        }
    }
};

