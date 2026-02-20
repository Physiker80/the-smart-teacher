
import React from 'react';
import { Theme } from '../types';
import { Sun, Snowflake, Leaf, Moon } from 'lucide-react';

interface ThemeSelectorProps {
    current: Theme;
    onChange: (theme: Theme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ current, onChange }) => {
    const themes: { id: Theme; label: string; icon: any; color: string }[] = [
        { id: 'default', label: 'ليلي (افتراضي)', icon: Moon, color: 'bg-teal-600' },
        { id: 'winter', label: 'شتوي', icon: Snowflake, color: 'bg-sky-600' },
        { id: 'nature', label: 'طبيعي', icon: Leaf, color: 'bg-emerald-600' },
        { id: 'sunset', label: 'دافئ', icon: Sun, color: 'bg-orange-600' },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-900/40 p-1 rounded-lg border border-slate-700 backdrop-blur-sm">
            {themes.map(t => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className={`
                        p-1.5 rounded-md transition-all duration-300 flex items-center justify-center
                        ${current === t.id ? `${t.color} text-white shadow-lg scale-110` : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}
                    `}
                    title={t.label}
                >
                    <t.icon size={14} />
                </button>
            ))}
        </div>
    );
};
