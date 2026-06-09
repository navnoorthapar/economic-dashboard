import type { Country } from '../data/economics';

export type WorldBankIndicatorId = 'cpi' | 'import-prices';

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
    },
    'import-prices': {
        id: 'import-prices',
        indicatorCode: 'TM.UVI.MRCH.XD.WD',
        valueLabel: 'Import Unit Value',
        sourceName: 'World Bank WDI / UNCTAD',
        basePeriod: '2015=100',
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
            value: row.value as number,
        }))
        .sort((a, b) => a.year - b.year || a.country.localeCompare(b.country));
};
