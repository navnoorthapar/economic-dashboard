import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import type { EconomicData, Metric } from '../data/economics';
import { getCountryColor } from '../data/economics';

interface LeaderboardCardProps {
    metric: Metric;
    data: EconomicData[]; // Should be data for a specific year (2025)
    color?: string;
}

export const LeaderboardCard = ({ metric, data, color = 'indigo' }: LeaderboardCardProps) => {

    const getRawValue = (d: EconomicData, m: Metric): number => {
        const keyMap: Record<Metric, keyof EconomicData> = {
            'GDP': 'gdp',
            'GDP per Capita': 'gdpPerCapita',
            'Growth Rate': 'growthRate',
            'PMI': 'pmi',
            'IIP': 'iip',
            'Retail Sales': 'retailSales',
            'CPI': 'cpi',
            'PPI': 'ppi',
            'Import Price Index': 'importPriceIndex',
            'Unemployment Rate': 'unemployment',
            'Wage Growth': 'wageGrowth',
            'Real Disposable Income': 'realDisposableIncome',
            'Current Account': 'currentAccount',
            'Trade Balance': 'tradeBalance',
            'Exchange Rate': 'exchangeRate',
            'NEER': 'neer'
        };
        const value = d[keyMap[m]];
        return typeof value === 'number' ? value : 0;
    }

    const sortedData = useMemo(() => {
        // Sort by value descending
        return [...data].sort((a, b) => {
            return getRawValue(b, metric) - getRawValue(a, metric);
        }).slice(0, 3); // Take top 3
    }, [data, metric]);

    const formatValue = (d: EconomicData) => {
        const val = getRawValue(d, metric);
        switch (metric) {
            case 'GDP': return `$${val}T`;
            case 'GDP per Capita': return `$${val.toLocaleString()}`;
            case 'Growth Rate': return `${val}%`;
            case 'CPI':
            case 'PPI':
            case 'Unemployment Rate':
            case 'Wage Growth':
            case 'Real Disposable Income':
            case 'Current Account': return `${val}%`;
            case 'Trade Balance': return `$${val}B`;
            case 'Exchange Rate': return `${val}`;
            case 'PMI':
            case 'IIP':
            case 'Import Price Index':
            case 'NEER': return `${val} Index`;
            default: return `${val}`;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden p-6 rounded-lg transition-all duration-500 bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05] shadow-sm ${color === 'red' ? 'hover:border-red-500/20' : color === 'amber' ? 'hover:border-amber-500/20' : color === 'indigo' ? 'hover:border-blue-500/20' : 'hover:border-blue-500/20'}`}
        >
            {/* Perspective Accent Bar */}
            <div className={`absolute top-0 left-0 w-full h-0.5 ${color === 'red' ? 'bg-red-500/30' : color === 'amber' ? 'bg-amber-500/30' : 'bg-blue-500/30'
                }`} />

            <div className="flex items-center gap-2 mb-6 text-amber-500">
                <Trophy className="w-3.5 h-3.5" />
                <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-[#8c7b60] dark:text-slate-200">Top 3 {metric}</h3>
            </div>

            <div className="space-y-4">
                {sortedData.map((d, index) => (
                    <div key={d.country} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "flex items-center justify-center w-8 h-8 rounded-full text-xs font-black",
                                index === 0 ? (
                                    color === 'red' ? 'bg-red-500/20 text-red-500' :
                                        color === 'amber' ? 'bg-amber-500/20 text-amber-500' :
                                            'bg-blue-500/20 text-blue-500'
                                ) :
                                    index === 1 ? "bg-[#433422]/10 dark:bg-slate-700/50 text-[#8c7b60] dark:text-slate-400" :
                                        "bg-[#433422]/5 dark:bg-orange-950/40 text-[#8c7b60] dark:text-orange-500"
                            )}>
                                {index + 1}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#433422] dark:text-slate-100">{d.country}</span>
                                <div className="h-0.5 w-10 rounded-full mt-1.5 opacity-40" style={{ backgroundColor: getCountryColor(d.country) }}></div>
                            </div>
                        </div>
                        <span className="font-bold text-[#8c7b60] dark:text-slate-400 text-base tracking-tight">
                            {formatValue(d)}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
