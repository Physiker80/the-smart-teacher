
import React, { useState, useEffect } from 'react';
import { Wind, Heart, Coffee, Sun, Moon } from 'lucide-react';

export const WellnessWidget: React.FC = () => {
    const [quote, setQuote] = useState('');
    const [isBreathing, setIsBreathing] = useState(false);
    const [breathInst, setBreathInst] = useState('شهيق');

    const quotes = [
        "التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم. - نيلسون مانديلا",
        "المعلم يؤثر في الأبدية؛ لا يمكنه أبداً معرفة أين يتوقف تأثيره.",
        "التدريس هو فن المساعدة على الاكتشاف.",
        "لا تقلق، أنت تقوم بعمل رائع! 🌟",
        "كل طفل يحتاج إلى بطل، وذلك البطل هو أنت.",
        "مهنتك هي الوحيدة التي تخلق باقي المهن.",
        "خذ نفساً عميقاً، طلابك يحبونك.",
        "ازرع اليوم، لتحصد غداً مستقبلاً مشرقاً."
    ];

    useEffect(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    useEffect(() => {
        let interval: any;
        if (isBreathing) {
            setBreathInst('شهيق...');
            let state = 0; // 0: In, 1: Hold, 2: Out, 3: Hold
            interval = setInterval(() => {
                state = (state + 1) % 4;
                if (state === 0) setBreathInst('شهيق (4ث)...');
                if (state === 1) setBreathInst('احبس (4ث)...');
                if (state === 2) setBreathInst('زفير (4ث)...');
                if (state === 3) setBreathInst('راحة...');
            }, 4000);

            // Stop after 3 cycles (48s) or manual
            setTimeout(() => {
                setIsBreathing(false);
                setBreathInst('تنفس');
            }, 48000);
        } else {
            setBreathInst('تنفس');
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isBreathing]);

    const toggleBreathing = () => {
        setIsBreathing(!isBreathing);
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'سهرة سعيدة';
    const Icon = hour < 12 ? Sun : hour < 17 ? Sun : Moon;

    return (
        <div className="bg-gradient-to-r from-[var(--color-primary-800)] to-[var(--color-primary-900)] rounded-2xl p-6 text-white relative overflow-hidden shadow-xl border border-[var(--color-primary-600)]">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>

            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Icon className="text-secondary-400" />
                        {greeting}، يا معلم الأجيال!
                    </h2>
                    <p className="text-[var(--color-primary-100)] text-sm italic opacity-90 leading-relaxed max-w-md">
                        "{quote}"
                    </p>
                </div>

                <button
                    onClick={toggleBreathing}
                    className={`
                        flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 
                        transition-all duration-[4000ms] ease-in-out cursor-pointer hover:bg-white/10
                        ${isBreathing ? 'scale-110 border-secondary-400 bg-white/10 shadow-[0_0_40px_rgba(250,204,21,0.3)]' : 'scale-100 border-white/20'}
                    `}
                >
                    <Wind size={24} className={isBreathing ? 'animate-pulse text-secondary-400' : 'text-white/80'} />
                    <span className={`text-[10px] mt-1 font-bold ${isBreathing ? 'text-secondary-400' : 'text-white/60'}`}>
                        {breathInst}
                    </span>
                </button>
            </div>

            {isBreathing && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary-500/50 animate-[pulse_4s_infinite]"></div>
            )}
        </div>
    );
};
