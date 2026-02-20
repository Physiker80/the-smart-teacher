import React, { useState, useEffect } from 'react';
import { Database, Zap, Calendar, DollarSign, HardDrive, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import * as geminiService from '../services/geminiService';
import { TokenUsageRecord } from '../types';

export const TokenUsageWidget: React.FC = () => {
    const [history, setHistory] = useState<TokenUsageRecord[]>([]);
    const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
    const [isExpanded, setIsExpanded] = useState(false);

    const loadHistory = () => {
        try {
            const data = JSON.parse(localStorage.getItem('st_token_usage_history') || '[]');
            setHistory(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadHistory();
        window.addEventListener('token-usage-updated', loadHistory);
        return () => window.removeEventListener('token-usage-updated', loadHistory);
    }, []);

    const calculateStats = (records: TokenUsageRecord[]) => {
        const now = new Date();
        const stats = {
            today: { cost: 0, tokens: 0 },
            month: { cost: 0, tokens: 0 },
            quarter: { cost: 0, tokens: 0 },
            year: { cost: 0, tokens: 0 },
            total: { cost: 0, tokens: 0 }
        };

        records.forEach(r => {
            const date = new Date(r.date);
            const isToday = date.toDateString() === now.toDateString();
            const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            const isThisYear = date.getFullYear() === now.getFullYear();
            const isThisQuarter = isThisYear && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);

            if (isToday) {
                stats.today.cost += r.cost;
                stats.today.tokens += r.totalTokens;
            }
            if (isThisMonth) {
                stats.month.cost += r.cost;
                stats.month.tokens += r.totalTokens;
            }
            if (isThisQuarter) {
                stats.quarter.cost += r.cost;
                stats.quarter.tokens += r.totalTokens;
            }
            if (isThisYear) {
                stats.year.cost += r.cost;
                stats.year.tokens += r.totalTokens;
            }
            stats.total.cost += r.cost;
            stats.total.tokens += r.totalTokens;
        });

        return stats;
    };

    const stats = calculateStats(history);

    const formatCost = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 6 }).format(amount);
    };

    const formatTokens = (count: number) => {
        return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(count);
    };

    // If no history, don't show unless it's just initialized (empty array is fine, but if we want to hide it initially?)
    // Actually we always want to show it.

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-3 flex items-center justify-between transition-all group backdrop-blur-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <Database size={16} className="text-emerald-500/70 group-hover:text-emerald-400" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200">مراقبة الموارد</span>
                        <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Health: 100%
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500 group-hover:text-emerald-400 transition-colors">
                        {formatCost(stats.today.cost)}
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-500 group-hover:text-white group-hover:bg-slate-800 transition-colors">
                        <Maximize2 size={14} />
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="relative group animate-in slide-in-from-bottom-2 duration-300 fade-in">
            {/* Collapse Trigger */}
            <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-6 left-6 z-20 p-2 bg-slate-950/50 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors border border-slate-800 backdrop-blur-md"
                title="تصغير"
            >
                <Minimize2 size={16} />
            </button>

            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Decorative Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                            <Database size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">استهلاك الموارد</h2>
                            <p className="text-[10px] text-emerald-400/80 font-mono tracking-wider">LIVE MONITORING</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/50 border border-slate-800 shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">Gemini 2.5 Flash</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Today */}
                    <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between group/card hover:border-emerald-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 group-hover/card:text-white transition-colors">اليوم</span>
                            <Zap size={14} className="text-emerald-500/50 group-hover/card:text-emerald-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover/card:from-emerald-300 group-hover/card:to-teal-200 transition-all">
                                {formatCost(stats.today.cost)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-1 group-hover/card:text-emerald-500/60 transition-colors">
                                {formatTokens(stats.today.tokens)} Tokens
                            </div>
                        </div>
                    </div>

                    {/* Month */}
                    <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between group/card hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 group-hover/card:text-white transition-colors">هذا الشهر</span>
                            <Calendar size={14} className="text-blue-500/50 group-hover/card:text-blue-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover/card:from-blue-300 group-hover/card:to-cyan-200 transition-all">
                                {formatCost(stats.month.cost)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-1 group-hover/card:text-blue-500/60 transition-colors">
                                {formatTokens(stats.month.tokens)} Tokens
                            </div>
                        </div>
                    </div>

                    {/* Quarter */}
                    <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between group/card hover:border-amber-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 group-hover/card:text-white transition-colors">ربع سنوي</span>
                            <DollarSign size={14} className="text-amber-500/50 group-hover/card:text-amber-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover/card:from-amber-300 group-hover/card:to-yellow-200 transition-all">
                                {formatCost(stats.quarter.cost)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-1 group-hover/card:text-amber-500/60 transition-colors">
                                {formatTokens(stats.quarter.tokens)} Tokens
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between group/card hover:border-purple-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 group-hover/card:text-white transition-colors">إجمالي</span>
                            <HardDrive size={14} className="text-purple-500/50 group-hover/card:text-purple-400 transition-colors" />
                        </div>
                        <div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover/card:from-purple-300 group-hover/card:to-pink-200 transition-all">
                                {formatCost(stats.total.cost)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-1 group-hover/card:text-purple-500/60 transition-colors">
                                {formatTokens(stats.total.tokens)} Tokens
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 pt-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <p className="flex items-center gap-1.5">
                        <AlertCircle size={10} className="text-emerald-500" />
                        التكلفة تقديرية بناءً على تسعير Gemini Flash ($0.10/Input, $0.40/Output لكل مليون توكن).
                    </p>
                    <p className="opacity-50">Last flush: just now</p>
                </div>
            </div>
        </div>
    );
};
