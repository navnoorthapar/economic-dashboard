import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Perspective, Indicator } from '../../types/perspective';
import { PERSPECTIVES } from '../../types/perspective';
import { Layout } from '../Layout';
import { AICard } from '../AICard';
import { economicData, getCountryColor } from '../../data/economics';
import type { Country } from '../../data/economics';
import { BLS_INDICATORS, fetchBlsIndicatorData, isCostOfLivingBlsIndicator } from '../../services/bls';
import type { BlsObservation, CostOfLivingIndicatorId } from '../../services/bls';
import { WORLD_BANK_INDICATORS, fetchWorldBankIndicatorData, isWorldBankCostIndicator } from '../../services/worldBank';
import type { WorldBankIndicatorId, WorldBankObservation } from '../../services/worldBank';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { BarChart2, LineChart as LineChartIcon, Activity, Check, LayoutGrid, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

interface AppDashboardScreenProps {
    perspective: Perspective;
    onBack: () => void;
    onSwitchPerspective: (p: Perspective) => void;
    isDark: boolean;
    toggleTheme: () => void;
}

const COUNTRIES: Country[] = ['India', 'China', 'Japan', 'USA', 'Germany'];
type ChartType = 'line' | 'bar';
type ChangeMetric = 'yoy' | 'mom' | 'qoq' | 'ytd';
type BlsChartDataPoint = { label: string; value: number; yoy: number | null };
type WorldBankChartDataPoint = { year: number } & Partial<Record<Country, number>>;

interface ProcessedBlsObservation extends BlsObservation {
    numericValue: number | null;
    yoy: number | null;
    mom: number | null;
    qoq: number | null;
    ytd: number | null;
    zScores: Record<ChangeMetric, number | null>;
}

export const AppDashboardScreen: React.FC<AppDashboardScreenProps> = ({ perspective, onSwitchPerspective, isDark, toggleTheme }) => {
    const [selectedCountries, setSelectedCountries] = useState<Country[]>(['USA', 'India']);
    const [selectedIndicator, setSelectedIndicator] = useState<Indicator>(perspective.indicators[0]);
    const [chartType, setChartType] = useState<ChartType>('line');
    const [isPerspectiveOpen, setIsPerspectiveOpen] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const [apiData, setApiData] = useState<BlsObservation[]>([]);
    const [isLoadingApiData, setIsLoadingApiData] = useState(false);
    const [apiDataError, setApiDataError] = useState<string | null>(null);
    const [worldBankData, setWorldBankData] = useState<WorldBankObservation[]>([]);
    const [isLoadingWorldBankData, setIsLoadingWorldBankData] = useState(false);
    const [worldBankDataError, setWorldBankDataError] = useState<string | null>(null);

    const selectedBlsIndicatorId: CostOfLivingIndicatorId | null = selectedIndicator.id === 'ppi' && isCostOfLivingBlsIndicator(selectedIndicator.id) ? selectedIndicator.id : null;
    const activeBlsConfig = selectedBlsIndicatorId ? BLS_INDICATORS[selectedBlsIndicatorId] : null;
    const shouldUseBlsTable = perspective.id === 'cost-of-living' && activeBlsConfig !== null && selectedBlsIndicatorId !== null;
    const shouldUseBlsChart = shouldUseBlsTable;
    const selectedWorldBankIndicatorId: WorldBankIndicatorId | null = isWorldBankCostIndicator(selectedIndicator.id) ? selectedIndicator.id : null;
    const activeWorldBankConfig = selectedWorldBankIndicatorId ? WORLD_BANK_INDICATORS[selectedWorldBankIndicatorId] : null;
    const shouldUseWorldBankData = activeWorldBankConfig !== null && selectedWorldBankIndicatorId !== null;

    useEffect(() => {
        if (!shouldUseBlsTable || !selectedBlsIndicatorId) {
            return;
        }

        let isCancelled = false;

        const loadBlsData = async () => {
            setIsLoadingApiData(true);
            setApiDataError(null);

            try {
                const data = await fetchBlsIndicatorData(selectedBlsIndicatorId);
                if (isCancelled) return;

                const series = data.Results?.series?.[0];

                if (data.status === 'REQUEST_SUCCEEDED' && series) {
                    const monthlyData = series.data.filter(row => /^M(0[1-9]|1[0-2])$/.test(row.period));
                    setApiData(monthlyData);
                } else {
                    const message = data.message?.join(' ') || 'BLS did not return usable series data.';
                    setApiData([]);
                    setApiDataError(message);
                }
            } catch (error) {
                if (isCancelled) return;

                console.error('Error fetching BLS data:', error);
                setApiData([]);
                setApiDataError('Unable to load BLS data right now.');
            } finally {
                if (!isCancelled) setIsLoadingApiData(false);
            }
        };

        void loadBlsData();

        return () => {
            isCancelled = true;
        };
    }, [selectedBlsIndicatorId, shouldUseBlsTable]);

    useEffect(() => {
        if (!shouldUseWorldBankData || !selectedWorldBankIndicatorId) {
            return;
        }

        let isCancelled = false;

        const loadWorldBankData = async () => {
            setIsLoadingWorldBankData(true);
            setWorldBankDataError(null);

            try {
                const data = await fetchWorldBankIndicatorData(selectedWorldBankIndicatorId, COUNTRIES);
                if (isCancelled) return;

                setWorldBankData(data);
            } catch (error) {
                if (isCancelled) return;

                console.error('Error fetching World Bank data:', error);
                setWorldBankData([]);
                setWorldBankDataError('Unable to load World Bank data right now.');
            } finally {
                if (!isCancelled) setIsLoadingWorldBankData(false);
            }
        };

        void loadWorldBankData();

        return () => {
            isCancelled = true;
        };
    }, [selectedWorldBankIndicatorId, shouldUseWorldBankData]);

    const processedApiData = useMemo(() => {
        if (!apiData || apiData.length === 0) return [];

        const getValue = (y: string | number, p: string) => {
            const row = apiData.find(d => String(d.year) === String(y) && d.period === p);
            if (!row || !row.value || row.value === '-' || isNaN(parseFloat(row.value))) return null;
            return parseFloat(row.value);
        };

        const calcPercentChange = (current: number | null, previous: number | null) => {
            if (current === null || previous === null || previous === 0) return null;
            return ((current - previous) / previous) * 100;
        };

        const getOffsetPeriod = (currentYear: number, currentPeriodStr: string, monthOffset: number) => {
            if (!currentPeriodStr.startsWith('M')) return { year: currentYear, period: currentPeriodStr };
            let month = parseInt(currentPeriodStr.slice(1), 10);
            let year = currentYear;
            month -= monthOffset;
            while (month <= 0) {
                month += 12;
                year -= 1;
            }
            return { year, period: `M${month.toString().padStart(2, '0')}` };
        };

        const extendedData = apiData.map(row => {
            const currentYear = parseInt(row.year, 10);
            const currentVal = (!row.value || row.value === '-' || isNaN(parseFloat(row.value))) ? null : parseFloat(row.value);
            
            const yoyRowVal = getValue(currentYear - 1, row.period);
            const yoy = calcPercentChange(currentVal, yoyRowVal);

            const pm = getOffsetPeriod(currentYear, row.period, 1);
            const momRowVal = getValue(pm.year, pm.period);
            const mom = calcPercentChange(currentVal, momRowVal);

            const pq = getOffsetPeriod(currentYear, row.period, 3);
            const qoqRowVal = getValue(pq.year, pq.period);
            const qoq = calcPercentChange(currentVal, qoqRowVal);

            const ytdRowVal = getValue(currentYear - 1, 'M12');
            const ytd = calcPercentChange(currentVal, ytdRowVal);

            return { ...row, yoy, mom, qoq, ytd };
        });

        const metrics: ChangeMetric[] = ['yoy', 'mom', 'qoq', 'ytd'];
        const stats: Record<string, { mean: number, std: number }> = {};

        metrics.forEach(m => {
            const validValues = extendedData.map(d => d[m]).filter(v => v !== null && !isNaN(v)) as number[];
            if (validValues.length > 0) {
                const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
                const std = Math.sqrt(variance) || 1;
                stats[m] = { mean, std };
            } else {
                stats[m] = { mean: 0, std: 1 };
            }
        });

        return extendedData.map(row => {
            const zScores = {
                yoy: row.yoy !== null ? (row.yoy - stats.yoy.mean) / stats.yoy.std : null,
                mom: row.mom !== null ? (row.mom - stats.mom.mean) / stats.mom.std : null,
                qoq: row.qoq !== null ? (row.qoq - stats.qoq.mean) / stats.qoq.std : null,
                ytd: row.ytd !== null ? (row.ytd - stats.ytd.mean) / stats.ytd.std : null,
            };
            const numericValue = row.value && !isNaN(parseFloat(row.value)) ? parseFloat(row.value) : null;
            return { ...row, numericValue, zScores };
        }) satisfies ProcessedBlsObservation[];
    }, [apiData]);

    const getHeatMapColor = (zScore: number | null) => {
        if (zScore === null) return 'transparent';
        const z = Math.max(-2, Math.min(2, zScore));
        const hue = 120 - ((z + 2) / 4) * 120;
        return `hsla(${hue}, 70%, 50%, 0.15)`;
    };

    const getHeatMapTextColor = (zScore: number | null, isDark: boolean) => {
        if (zScore === null) return isDark ? '#e2e8f0' : '#1e293b'; // slate-200 or 800
        const z = Math.max(-2, Math.min(2, zScore));
        const hue = 120 - ((z + 2) / 4) * 120;
        return isDark ? `hsl(${hue}, 80%, 75%)` : `hsl(${hue}, 90%, 30%)`;
    };

    const toggleCountry = (c: Country) => {
        if (selectedCountries.includes(c)) {
            if (selectedCountries.length > 1) setSelectedCountries(prev => prev.filter(item => item !== c));
        } else {
            if (selectedCountries.length < 5) setSelectedCountries(prev => [...prev, c]);
        }
    };

    const themeClasses = {
        indigo: { text: 'text-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-600/20', text400: 'text-blue-400', bg400: 'bg-blue-400', hexRGBAHead: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)' },
        red: { text: 'text-red-500', border: 'border-red-500', shadow: 'shadow-red-600/20', text400: 'text-red-400', bg400: 'bg-red-400', hexRGBAHead: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)' },
        emerald: { text: 'text-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-600/20', text400: 'text-emerald-400', bg400: 'bg-emerald-400', hexRGBAHead: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)' },
        amber: { text: 'text-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-600/20', text400: 'text-amber-400', bg400: 'bg-amber-400', hexRGBAHead: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)' },
    };
    const t = themeClasses[perspective.color as keyof typeof themeClasses] || themeClasses.amber;

    const getBlsChartData = (): BlsChartDataPoint[] => {
        return processedApiData
            .slice(0, 36)
            .reverse()
            .filter(row => row.numericValue !== null)
            .map(row => ({
                label: `${row.periodName.slice(0, 3)} ${row.year}`,
                value: row.numericValue as number,
                yoy: row.yoy,
            }));
    };

    const getWorldBankValue = (country: Country, year: number) => {
        return worldBankData.find(row => row.country === country && row.year === year)?.value ?? null;
    };

    const calcWorldBankYoY = (country: Country, year: number) => {
        const current = getWorldBankValue(country, year);
        const previous = getWorldBankValue(country, year - 1);

        if (current === null || previous === null || previous === 0) return null;
        return ((current - previous) / previous) * 100;
    };

    const getWorldBankYears = () => {
        return Array.from(new Set(worldBankData.map(row => row.year))).sort((a, b) => a - b);
    };

    const getWorldBankChartData = (): WorldBankChartDataPoint[] => {
        return getWorldBankYears().map(year => {
            const dataPoint: WorldBankChartDataPoint = { year };

            selectedCountries.forEach(country => {
                const value = getWorldBankValue(country, year);
                if (value !== null) dataPoint[country] = value;
            });

            return dataPoint;
        });
    };

    const formatOfficialValue = (value: number, unit?: string) => {
        if (unit === 'USD') return `$${Math.round(value).toLocaleString()}`;
        if (unit === 'Trillion USD') return `$${value.toFixed(2)}T`;
        if (unit?.includes('%')) return `${value.toFixed(2)}%`;
        if (unit === 'LCU per USD') return value.toFixed(2);
        return `${value.toFixed(2)} ${unit ?? ''}`.trim();
    };

    const renderUnavailableDataState = (surface: 'chart' | 'table' | 'leaderboard') => (
        <div className="flex flex-col justify-center items-center h-full px-4 text-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${t.text400}`}>Real source pending</span>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                A reliable comparable public API has not been wired for {selectedIndicator.name} across India, China, Japan, USA, and Germany yet.
                This {surface} is intentionally not showing dummy values.
            </p>
        </div>
    );

    const renderOfficialLeaderboard = () => {
        if (shouldUseWorldBankData && activeWorldBankConfig) {
            if (isLoadingWorldBankData) {
                return (
                    <div className="p-6 rounded-lg bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05]">
                        <span className={`text-sm ${t.text}`}>Loading World Bank data...</span>
                    </div>
                );
            }

            const latestYear = Math.max(...getWorldBankYears());
            const rows = selectedCountries
                .map(country => ({ country, value: getWorldBankValue(country, latestYear) }))
                .filter((row): row is { country: Country; value: number } => row.value !== null)
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);

            if (!Number.isFinite(latestYear) || rows.length === 0) {
                return (
                    <div className="p-6 rounded-lg bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05]">
                        {renderUnavailableDataState('leaderboard')}
                    </div>
                );
            }

            return (
                <div className="relative overflow-hidden p-6 rounded-lg transition-all duration-500 bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05] shadow-sm">
                    <div className={`absolute top-0 left-0 w-full h-0.5 ${perspective.color === 'red' ? 'bg-red-500/30' : perspective.color === 'amber' ? 'bg-amber-500/30' : perspective.color === 'emerald' ? 'bg-emerald-500/30' : 'bg-blue-500/30'}`} />
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className={`w-3.5 h-3.5 ${t.text400}`} />
                        <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-[#8c7b60] dark:text-slate-200">Top 3 {activeWorldBankConfig.valueLabel} ({latestYear})</h3>
                    </div>
                    <div className="space-y-4">
                        {rows.map((row, index) => (
                            <div key={row.country} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-black bg-[#433422]/10 dark:bg-slate-700/50 text-[#8c7b60] dark:text-slate-400">{index + 1}</div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#433422] dark:text-slate-100">{row.country}</span>
                                        <div className="h-0.5 w-10 rounded-full mt-1.5 opacity-40" style={{ backgroundColor: getCountryColor(row.country) }}></div>
                                    </div>
                                </div>
                                <span className="font-bold text-[#8c7b60] dark:text-slate-400 text-base tracking-tight">
                                    {formatOfficialValue(row.value, activeWorldBankConfig.unit)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (shouldUseBlsTable && activeBlsConfig) {
            const latest = processedApiData.find(row => row.numericValue !== null);

            return (
                <div className="relative overflow-hidden p-6 rounded-lg transition-all duration-500 bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05] shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500/30" />
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className={`w-3.5 h-3.5 ${t.text400}`} />
                        <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-[#8c7b60] dark:text-slate-200">Latest {activeBlsConfig.valueLabel}</h3>
                    </div>
                    {latest ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#433422] dark:text-slate-100">USA ({latest.periodName} {latest.year})</span>
                            <span className="font-bold text-[#8c7b60] dark:text-slate-400 text-base tracking-tight">{latest.numericValue?.toFixed(3)}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500">Loading BLS data...</span>
                    )}
                </div>
            );
        }

        return (
            <div className="p-6 rounded-lg bg-black/5 dark:bg-slate-900/40 border border-[#433422]/10 dark:border-white/[0.05] min-h-[180px]">
                {renderUnavailableDataState('leaderboard')}
            </div>
        );
    };

    const getInsightText = () => {
        const indiaData = economicData.find(d => d.country === 'India' && d.year === 2025);
        const chinaData = economicData.find(d => d.country === 'China' && d.year === 2025);

        if (perspective.id === 'growth') {
            return `India represents the highest potential in the world stage with ${indiaData?.growthRate}% growth, while China faces a slower trajectory at ${chinaData?.growthRate}%. The G7 nations, led by the USA, are maintaining stability but struggle to match the velocity of emerging markets. Strategic pivot towards Southeast Asian corridors is recommended.`;
        } else if (perspective.id === 'poverty') {
            return `Poverty alleviation remains a critical challenge. India has shown remarkable progress in reducing extreme poverty, though wealth inequality persists. The USA maintains high living standards but faces rising costs for essential services. Targeted social safety nets and education reform are key levers for parity.`;
        } else {
            return `The Global South is emerging as the primary engine for consumer demand. While Western economies deal with aging demographics, countries like India and China are investing heavily in domestic infrastructure and technology sectors. Expect a significant shift in GDP contribution by 2030 as middle-class expansion accelerates.`;
        }
    };

    const renderChart = () => {
        if (shouldUseWorldBankData && activeWorldBankConfig) {
            if (isLoadingWorldBankData) return <div className="flex justify-center items-center h-full"><span className={`text-sm ${t.text}`}>Loading World Bank data...</span></div>;
            if (worldBankDataError) return <div className="flex justify-center items-center h-full px-4 text-center"><span className="text-sm text-red-500 dark:text-red-300">{worldBankDataError}</span></div>;

            const data = getWorldBankChartData();

            if (data.length === 0) return <div className="flex justify-center items-center h-full"><span className="text-sm text-slate-500">No World Bank data available for this chart.</span></div>;

            if (chartType === 'bar') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                            <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                            <RechartsTooltip formatter={(value: number | undefined) => [formatOfficialValue(Number(value ?? 0), activeWorldBankConfig.unit), activeWorldBankConfig.valueLabel]} labelStyle={{ color: '#0f172a' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            {selectedCountries.map(c => (
                                <Bar key={c} dataKey={c} fill={getCountryColor(c)} radius={[4, 4, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            }

            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                        <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <RechartsTooltip formatter={(value: number | undefined) => [formatOfficialValue(Number(value ?? 0), activeWorldBankConfig.unit), activeWorldBankConfig.valueLabel]} labelStyle={{ color: '#0f172a' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        {selectedCountries.map(c => (
                            <Line key={c} type="monotone" dataKey={c} stroke={getCountryColor(c)} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        if (shouldUseBlsChart && activeBlsConfig) {
            if (isLoadingApiData) return <div className="flex justify-center items-center h-full"><span className={`text-sm ${t.text}`}>Loading BLS API data...</span></div>;
            if (apiDataError) return <div className="flex justify-center items-center h-full px-4 text-center"><span className="text-sm text-red-500 dark:text-red-300">{apiDataError}</span></div>;

            const data = getBlsChartData();

            if (data.length === 0) return <div className="flex justify-center items-center h-full"><span className="text-sm text-slate-500">No BLS data available for this chart.</span></div>;

            if (chartType === 'bar') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                            <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                            <RechartsTooltip
                                formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(3)} Index`, activeBlsConfig.valueLabel]}
                                labelStyle={{ color: '#0f172a' }}
                            />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            }

            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                        <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <RechartsTooltip
                            formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(3)} Index`, activeBlsConfig.valueLabel]}
                            labelStyle={{ color: '#0f172a' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Line name={activeBlsConfig.valueLabel} type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        return renderUnavailableDataState('chart');
    }

    const renderTable = () => {
        if (shouldUseWorldBankData && activeWorldBankConfig) {
            if (isLoadingWorldBankData) return <div className="flex justify-center items-center h-full"><span className={`text-sm ${t.text}`}>Loading World Bank data...</span></div>;
            if (worldBankDataError) return <div className="flex justify-center items-center h-full px-4 text-center"><span className="text-sm text-red-500 dark:text-red-300">{worldBankDataError}</span></div>;

            const years = getWorldBankYears().reverse();

            if (years.length === 0) return <div className="flex justify-center items-center h-full"><span className="text-sm text-slate-500">No World Bank data available for this table.</span></div>;

            return (
                <div className="overflow-auto h-full pr-2 pb-2 custom-scrollbar border border-black/5 dark:border-white/5 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead className={`sticky top-0 bg-white/95 dark:bg-[#1a1c23]/95 backdrop-blur-md z-10 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                            <tr>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400">Year</th>
                                {selectedCountries.map(country => (
                                    <th key={`${country}-value`} className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">{country} Value</th>
                                ))}
                                {selectedCountries.map(country => (
                                    <th key={`${country}-yoy`} className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">{country} YoY %</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {years.map(year => (
                                <tr key={year} className={`border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}>
                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{year}</td>
                                    {selectedCountries.map(country => {
                                        const value = getWorldBankValue(country, year);
                                        return (
                                            <td key={`${country}-${year}-value`} className="p-3 font-bold text-slate-800 dark:text-slate-200 text-right">
                                                {value !== null ? value.toFixed(2) : '-'}
                                            </td>
                                        );
                                    })}
                                    {selectedCountries.map(country => {
                                        const yoy = calcWorldBankYoY(country, year);
                                        return (
                                            <td key={`${country}-${year}-yoy`} className="p-3 font-bold text-slate-800 dark:text-slate-200 text-right">
                                                {yoy !== null ? (yoy > 0 ? '+' : '') + yoy.toFixed(2) + '%' : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <caption className="caption-bottom p-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#8c7b60] dark:text-slate-500">
                            Source: {activeWorldBankConfig.sourceName} | {activeWorldBankConfig.indicatorCode} | {activeWorldBankConfig.basePeriod}. Annual data, so QoQ/YTD is not applicable.
                        </caption>
                    </table>
                </div>
            );
        }

        if (shouldUseBlsTable && activeBlsConfig) {
            if (isLoadingApiData) return <div className="flex justify-center items-center h-full"><span className={`text-sm ${t.text}`}>Loading BLS API data...</span></div>;
            if (apiDataError) return <div className="flex justify-center items-center h-full px-4 text-center"><span className="text-sm text-red-500 dark:text-red-300">{apiDataError}</span></div>;
            if (processedApiData.length === 0) return <div className="flex justify-center items-center h-full"><span className="text-sm text-slate-500">No BLS data available for this indicator.</span></div>;

            return (
                <div className="overflow-auto h-full pr-2 pb-2 custom-scrollbar border border-black/5 dark:border-white/5 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead className={`sticky top-0 bg-white/95 dark:bg-[#1a1c23]/95 backdrop-blur-md z-10 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                            <tr>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400">Year</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400">Period</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">{activeBlsConfig.valueLabel}</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">MoM %</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">QoQ %</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">YoY %</th>
                                <th className="p-3 font-semibold uppercase tracking-wider text-[#8c7b60] dark:text-slate-400 text-right">YTD %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedApiData.map((row, i) => (
                                <tr key={i} className={`border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}>
                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{row.year}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">{row.periodName}</td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200 text-right">{row.numericValue !== null ? row.numericValue.toFixed(3) : '-'}</td>
                                    <td className="p-3 font-bold text-right" style={{ backgroundColor: getHeatMapColor(row.zScores?.mom), color: getHeatMapTextColor(row.zScores?.mom, isDark) }}>
                                        {row.mom !== null ? (row.mom > 0 ? '+' : '') + row.mom.toFixed(2) + '%' : '-'}
                                    </td>
                                    <td className="p-3 font-bold text-right" style={{ backgroundColor: getHeatMapColor(row.zScores?.qoq), color: getHeatMapTextColor(row.zScores?.qoq, isDark) }}>
                                        {row.qoq !== null ? (row.qoq > 0 ? '+' : '') + row.qoq.toFixed(2) + '%' : '-'}
                                    </td>
                                    <td className="p-3 font-bold text-right" style={{ backgroundColor: getHeatMapColor(row.zScores?.yoy), color: getHeatMapTextColor(row.zScores?.yoy, isDark) }}>
                                        {row.yoy !== null ? (row.yoy > 0 ? '+' : '') + row.yoy.toFixed(2) + '%' : '-'}
                                    </td>
                                    <td className="p-3 font-bold text-right" style={{ backgroundColor: getHeatMapColor(row.zScores?.ytd), color: getHeatMapTextColor(row.zScores?.ytd, isDark) }}>
                                        {row.ytd !== null ? (row.ytd > 0 ? '+' : '') + row.ytd.toFixed(2) + '%' : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <caption className="caption-bottom p-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#8c7b60] dark:text-slate-500">
                            Source: {activeBlsConfig.sourceName} | Series {activeBlsConfig.seriesId} | {activeBlsConfig.basePeriod}
                        </caption>
                    </table>
                </div>
            );
        }

        return renderUnavailableDataState('table');
    }

    return (
        <Layout accentColor={perspective.color} perspectiveName={perspective.title} isDark={isDark} toggleTheme={toggleTheme}>
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10 px-4 md:px-8">
                <div className="group sticky top-14 z-40 py-4 md:py-5 px-8 -mx-8 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-[#433422]/5 dark:border-white/[0.05] shadow-2xl md:rounded-xl">
                    <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12 max-w-[1600px] mx-auto">
                        <div className="flex flex-col gap-4 flex-shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c7b60] dark:text-slate-500">Global Markets</span>
                            <div className="flex flex-wrap gap-2">
                                {COUNTRIES.map(c => {
                                    const isSelected = selectedCountries.includes(c);
                                    return (
                                        <button
                                            key={c}
                                            onClick={(e) => { e.stopPropagation(); toggleCountry(c); }}
                                            style={isSelected ? { borderColor: getCountryColor(c), color: getCountryColor(c) } : {}}
                                            className={clsx(
                                                "px-5 py-2 text-[10px] rounded-lg font-black transition-all border uppercase tracking-widest whitespace-nowrap",
                                                isSelected ?
                                                    `bg-transparent border-2 shadow-lg ${t.shadow}` :
                                                    'bg-black/5 dark:bg-white/[0.03] border-[#433422]/10 dark:border-white/[0.05] text-[#433422]/60 dark:text-slate-500 hover:text-[#433422] dark:hover:text-slate-200 shadow-sm'
                                            )}
                                        >
                                            {c}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="hidden md:block w-px h-12 bg-[#433422]/10 dark:bg-white/[0.05]"></div>

                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c7b60] dark:text-slate-500">Active Indicators</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {perspective.indicators.map(ind => {
                                    const isSelected = selectedIndicator.id === ind.id;

                                    return (
                                        <button
                                            key={ind.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedIndicator(ind); }}
                                            className={clsx(
                                                "px-5 py-2 text-[10px] rounded-lg font-black transition-all border uppercase tracking-widest whitespace-nowrap",
                                                isSelected ?
                                                    `bg-transparent border-2 ${t.border} ${t.text} shadow-lg ${t.shadow}` :
                                                    'bg-black/5 dark:bg-white/[0.03] border-[#433422]/10 dark:border-white/[0.05] text-[#433422]/60 dark:text-slate-500 hover:text-[#433422] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/[0.08] shadow-sm'
                                            )}
                                        >
                                            {ind.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        {renderOfficialLeaderboard()}

                        <div className="p-5 md:p-6 rounded-lg bg-white/40 dark:bg-white/[0.03] border border-[#433422]/10 dark:border-slate-800 shadow-sm transition-all duration-500">
                            <div className={`flex items-center gap-3 mb-3 ${t.text400}`}>
                                <Activity className="w-3.5 h-3.5" />
                                <h3 className="text-[9px] font-black uppercase tracking-widest">About this indicator</h3>
                            </div>
                            <h4 className="text-base md:text-lg font-bold mb-3 leading-tight">{selectedIndicator.description}</h4>

                            <AnimatePresence>
                                {isAboutExpanded && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                            className="w-full max-w-2xl bg-[#f5f2e9] dark:bg-black border border-[#433422]/10 dark:border-white/10 rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[80vh] mt-12"
                                        >
                                            <div
                                                className="p-6 md:p-8 border-b border-[#433422]/10 dark:border-white/10 flex justify-between items-center"
                                                style={{ backgroundColor: t.hexRGBAHead }}
                                            >
                                                <div className={`flex items-center gap-3 ${t.text400}`}>
                                                    <Activity className="w-5 h-5" />
                                                    <h3 className="text-sm font-black uppercase tracking-widest">{selectedIndicator.name}</h3>
                                                </div>
                                                <button onClick={() => setIsAboutExpanded(false)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 transition-colors">
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 1L1 13M1 1l12 12" /></svg>
                                                </button>
                                            </div>
                                            <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.text400}`}>Definition</p>
                                                    <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{selectedIndicator.fullDefinition}</p>
                                                </div>
                                                {selectedIndicator.dataSource && (
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.text400}`}>Data Source</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium italic">{selectedIndicator.dataSource}</p>
                                                    </div>
                                                )}
                                                {selectedIndicator.examples && (
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.text400}`}>Examples</p>
                                                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 gap-3 flex flex-col pt-1">
                                                            {selectedIndicator.examples.map((ex, i) => (
                                                                <li key={i}>{ex}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="pt-6 mt-6 border-t border-[#433422]/10 dark:border-white/10 space-y-6">
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.text400}`}>Historical Context (Placeholder)</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                            Historically, this indicator has been a primary metric used by central banks and global financial institutions to gauge the underlying momentum of economic cycles. During periods of rapid expansion, anomalous spikes in the dataset often precede inflationary pressures or subsequent monetary tightening. Conversely, prolonged stagnation typically triggers quantitative easing measures. Analysts continue to monitor minute deviances from the 10-year rolling average as an early warning system for broader market recessions.
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.text400}`}>Methodology & Calculation (Placeholder)</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                            The underlying data aggregation relies on a stratified random sampling technique across thousands of municipal and corporate reporting nodes. Values are seasonally adjusted using the X-13ARIMA-SEATS algorithm to remove recurrent intra-year volatility patterns. It is important to note that the raw indices are subject to retroactive revisions up to three quarters post-publication, meaning preliminary figures should be treated with statistical caution. The baseline index value is typically normalized to 100 based on the reference year 2015.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => setIsAboutExpanded(true)}
                                className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform mt-4 ${t.text400}`}
                            >
                                See full definition & examples
                                <ArrowRight className="w-3 h-3 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-9 flex flex-col gap-4">
                        <div className="p-4 md:p-8 rounded-lg bg-white/40 dark:bg-white/[0.02] border border-[#433422]/10 dark:border-white/[0.05] shadow-sm transition-all duration-500">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className={`w-12 h-px ${t.bg400}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${t.text400}`}>
                                            {selectedIndicator.name}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {(
                                        <div className="flex bg-black/5 dark:bg-white/[0.03] p-1 rounded-lg border border-[#433422]/10 dark:border-white/[0.05]">
                                            <button 
                                                onClick={() => setViewMode('chart')}
                                                className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all", viewMode === 'chart' ? "bg-[#433422] dark:bg-white/10 text-white shadow-sm" : "text-[#8c7b60] dark:text-slate-500 hover:text-[#433422] dark:hover:text-white")}
                                            >Chart</button>
                                            <button 
                                                onClick={() => setViewMode('table')}
                                                className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all", viewMode === 'table' ? "bg-[#433422] dark:bg-white/10 text-white shadow-sm" : "text-[#8c7b60] dark:text-slate-500 hover:text-[#433422] dark:hover:text-white")}
                                            >Table</button>
                                        </div>
                                    )}
                                    <div className="flex p-1 rounded-lg bg-black/5 dark:bg-white/[0.03] border border-[#433422]/10 dark:border-white/[0.05]">
                                        {([
                                            { id: 'line', icon: LineChartIcon },
                                            { id: 'bar', icon: BarChart2 }
                                        ] as const).map(({ id, icon: Icon }) => {
                                            const isSelected = chartType === id;
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => setChartType(id)}
                                                    className={clsx(
                                                        "p-2 rounded-md transition-all",
                                                        isSelected ? "bg-[#433422] dark:bg-white/10 text-white dark:text-white shadow-lg" : "text-[#8c7b60] dark:text-slate-500 hover:text-[#433422] dark:hover:text-white"
                                                    )}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-2 transition-all h-[280px] md:h-[320px]">
                                {viewMode === 'table' ? renderTable() : renderChart()}
                            </div>
                        </div>

                        <AICard insight={getInsightText()} color={perspective.color} />
                    </div>
                </div>

                <div className="fixed bottom-8 left-8 z-[100] flex flex-col gap-4 items-start">
                    <AnimatePresence>
                        {isPerspectiveOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6 rounded-lg w-[260px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]"
                            >
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Switch Perspective</h5>
                                <div className="flex flex-col gap-4">
                                    {PERSPECTIVES.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                onSwitchPerspective(p);
                                                setIsPerspectiveOpen(false);
                                            }}
                                            className="flex items-center justify-between group p-2 rounded-lg hover:bg-white/[0.05] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${p.color === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : p.color === 'amber' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : p.color === 'emerald' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(74,114,255,0.4)]'}`}></div>
                                                <span className={`text-sm font-bold ${perspective.id === p.id ? 'text-[#433422] dark:text-slate-100' : 'text-[#8c7b60] dark:text-slate-400 group-hover:text-[#433422] dark:group-hover:text-slate-200'}`}>{p.title}</span>
                                            </div>
                                            {perspective.id === p.id && <Check className={`w-4 h-4 ${t.text}`} />}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsPerspectiveOpen(!isPerspectiveOpen)}
                        className={`w-16 h-16 rounded-xl text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 backdrop-blur-xl border border-white/20 dark:border-white/[0.1] ${perspective.color === 'red' ? 'bg-red-600/80 dark:bg-red-600/30 hover:bg-red-500 dark:hover:bg-red-500/40 shadow-red-600/20' :
                            perspective.color === 'amber' ? 'bg-amber-600/80 dark:bg-amber-600/30 hover:bg-amber-500 dark:hover:bg-amber-500/40 shadow-amber-600/20' :
                                perspective.color === 'emerald' ? 'bg-emerald-600/80 dark:bg-emerald-600/30 hover:bg-emerald-500 dark:hover:bg-emerald-500/40 shadow-emerald-600/20' :
                                    'bg-blue-600/80 dark:bg-blue-600/30 hover:bg-blue-500 dark:hover:bg-blue-500/40 shadow-blue-600/20'
                            }`}
                    >
                        <LayoutGrid className="w-7 h-7" />
                    </button>
                </div>
            </div>
        </Layout>
    );
};
