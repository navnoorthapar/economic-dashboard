import type { Country } from '../data/economics';

export type WorldBankIndicatorId =
    | 'cpi'
    | 'import-prices'
    | 'gdp-growth'
    | 'gdp-per-capita'
    | 'total-wealth'
    | 'unemployment'
    | 'current-account'
    | 'trade-balance'
    | 'exchange-rate';

export interface WorldBankObservation {
    country: Country;
    iso3: string;
    year: number;
    value: number;
}

interface WorldBankConfig {
    id: WorldBankIndicatorId;
    indicatorCode: string;
    valueLabel: string;
    sourceName: string;
    basePeriod: string;
    unit: string;
    valueDivisor?: number;
}

const COUNTRY_CODES: Record<Country, string> = {
    India: 'IND',
    China: 'CHN',
    Japan: 'JPN',
    USA: 'USA',
    Germany: 'DEU',
};

const COUNTRY_BY_ISO3: Record<string, Country> = {
    IND: 'India',
    CHN: 'China',
    JPN: 'Japan',
    USA: 'USA',
    DEU: 'Germany',
};

export const WORLD_BANK_INDICATORS: Record<WorldBankIndicatorId, WorldBankConfig> = {
    cpi: {
        id: 'cpi',
        indicatorCode: 'FP.CPI.TOTL',
        valueLabel: 'CPI Index',
        sourceName: 'World Bank WDI / IMF International Financial Statistics',
        basePeriod: '2010=100',
        unit: 'Index',
    },
    'import-prices': {
        id: 'import-prices',
        indicatorCode: 'TM.UVI.MRCH.XD.WD',
        valueLabel: 'Import Unit Value',
        sourceName: 'World Bank WDI / UNCTAD',
        basePeriod: '2015=100',
        unit: 'Index',
    },
    'gdp-growth': {
        id: 'gdp-growth',
        indicatorCode: 'NY.GDP.MKTP.KD.ZG',
        valueLabel: 'GDP Growth',
        sourceName: 'World Bank WDI / national accounts data',
        basePeriod: 'Annual real GDP growth',
        unit: '%',
    },
    'gdp-per-capita': {
        id: 'gdp-per-capita',
        indicatorCode: 'NY.GDP.PCAP.CD',
        valueLabel: 'GDP per Capita',
        sourceName: 'World Bank WDI / national accounts data',
        basePeriod: 'Current US$',
        unit: 'USD',
    },
    'total-wealth': {
        id: 'total-wealth',
        indicatorCode: 'NY.GDP.MKTP.CD',
        valueLabel: 'GDP',
        sourceName: 'World Bank WDI / national accounts data',
        basePeriod: 'Current US$',
        unit: 'Trillion USD',
        valueDivisor: 1_000_000_000_000,
    },
    unemployment: {
        id: 'unemployment',
        indicatorCode: 'SL.UEM.TOTL.ZS',
        valueLabel: 'Unemployment Rate',
        sourceName: 'World Bank WDI / ILO estimates',
        basePeriod: 'Total unemployment as % of labour force',
        unit: '%',
    },
    'current-account': {
        id: 'current-account',
        indicatorCode: 'BN.CAB.XOKA.GD.ZS',
        valueLabel: 'Current Account',
        sourceName: 'World Bank WDI / IMF Balance of Payments Statistics',
        basePeriod: '% of GDP',
        unit: '% of GDP',
    },
    'trade-balance': {
        id: 'trade-balance',
        indicatorCode: 'NE.RSB.GNFS.ZS',
        valueLabel: 'External Balance',
        sourceName: 'World Bank WDI / national accounts data',
        basePeriod: 'Goods and services external balance as % of GDP',
        unit: '% of GDP',
    },
    'exchange-rate': {
        id: 'exchange-rate',
        indicatorCode: 'PA.NUS.FCRF',
        valueLabel: 'Official Exchange Rate',
        sourceName: 'World Bank WDI / IMF International Financial Statistics',
        basePeriod: 'Local currency per US$',
        unit: 'LCU per USD',
    },
};

export const isWorldBankCostIndicator = (id: string): id is WorldBankIndicatorId => {
    return Object.prototype.hasOwnProperty.call(WORLD_BANK_INDICATORS, id);
};

export const fetchWorldBankIndicatorData = async (
    indicatorId: WorldBankIndicatorId,
    countries: Country[],
): Promise<WorldBankObservation[]> => {
    const config = WORLD_BANK_INDICATORS[indicatorId];
    const countryPath = countries.map(country => COUNTRY_CODES[country]).join(';');
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    const url = `https://api.worldbank.org/v2/country/${countryPath}/indicator/${config.indicatorCode}?format=json&per_page=500&date=${startYear}:${currentYear}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`World Bank endpoint returned ${response.status}`);
    }

    const payload = await response.json() as [unknown, Array<{
        countryiso3code: string;
        date: string;
        value: number | null;
    }>];
    const rows = payload[1] ?? [];

    return rows
        .filter(row => row.value !== null && COUNTRY_BY_ISO3[row.countryiso3code])
        .map(row => ({
            country: COUNTRY_BY_ISO3[row.countryiso3code],
            iso3: row.countryiso3code,
            year: Number(row.date),
            value: (row.value as number) / (config.valueDivisor ?? 1),
        }))
        .sort((a, b) => a.year - b.year || a.country.localeCompare(b.country));
};
