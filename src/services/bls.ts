export type CostOfLivingIndicatorId = 'cpi' | 'ppi' | 'import-prices';

export interface BlsObservation {
    year: string;
    period: string;
    periodName: string;
    value: string;
    latest?: string;
    footnotes?: Array<Record<string, string>>;
}

export interface BlsApiResponse {
    status: string;
    message?: string[];
    Results?: {
        series: Array<{
            seriesID: string;
            data: BlsObservation[];
        }>;
    };
}

interface BlsIndicatorConfig {
    id: CostOfLivingIndicatorId;
    seriesId: string;
    title: string;
    valueLabel: string;
    sourceName: string;
    sourceUrl: string;
    basePeriod: string;
}

export const BLS_INDICATORS: Record<CostOfLivingIndicatorId, BlsIndicatorConfig> = {
    cpi: {
        id: 'cpi',
        seriesId: 'CUUR0000SA0',
        title: 'Consumer Price Index for All Urban Consumers: All Items, U.S. city average',
        valueLabel: 'CPI Value',
        sourceName: 'U.S. Bureau of Labor Statistics, Consumer Price Index',
        sourceUrl: 'https://data.bls.gov/timeseries/CUUR0000SA0',
        basePeriod: '1982-84=100',
    },
    ppi: {
        id: 'ppi',
        seriesId: 'WPUFD4',
        title: 'Producer Price Index: Final Demand',
        valueLabel: 'PPI Value',
        sourceName: 'U.S. Bureau of Labor Statistics, Producer Price Index',
        sourceUrl: 'https://data.bls.gov/timeseries/WPUFD4',
        basePeriod: 'Nov 2009=100',
    },
    'import-prices': {
        id: 'import-prices',
        seriesId: 'EIUIR',
        title: 'Import Price Index: BEA End Use, All Commodities',
        valueLabel: 'Import Index',
        sourceName: 'U.S. Bureau of Labor Statistics, Import/Export Price Indexes',
        sourceUrl: 'https://data.bls.gov/timeseries/EIUIR',
        basePeriod: '2000=100',
    },
};

export const isCostOfLivingBlsIndicator = (id: string): id is CostOfLivingIndicatorId => {
    return Object.prototype.hasOwnProperty.call(BLS_INDICATORS, id);
};

const getDefaultYearWindow = () => {
    const endyear = new Date().getFullYear();
    return {
        startyear: String(endyear - 9),
        endyear: String(endyear),
    };
};

const parseBlsResponse = async (response: Response): Promise<BlsApiResponse> => {
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`BLS endpoint returned ${response.status}`);
    }

    return response.json() as Promise<BlsApiResponse>;
};

const fetchFromNetlifyFunction = async (indicatorId: CostOfLivingIndicatorId): Promise<BlsApiResponse> => {
    const response = await fetch(`/.netlify/functions/bls?indicator=${indicatorId}`);
    return parseBlsResponse(response);
};

const fetchFromLocalBackend = async (indicatorId: CostOfLivingIndicatorId): Promise<BlsApiResponse> => {
    const response = await fetch(`http://localhost:8080/api/bls/${indicatorId}`);
    return parseBlsResponse(response);
};

const fetchDirectlyFromBls = async (indicatorId: CostOfLivingIndicatorId): Promise<BlsApiResponse> => {
    const config = BLS_INDICATORS[indicatorId];
    const yearWindow = getDefaultYearWindow();

    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            seriesid: [config.seriesId],
            ...yearWindow,
        }),
    });

    return parseBlsResponse(response);
};

export const fetchBlsIndicatorData = async (indicatorId: CostOfLivingIndicatorId): Promise<BlsApiResponse> => {
    const fetchers = [fetchFromNetlifyFunction, fetchFromLocalBackend, fetchDirectlyFromBls];
    let lastError: Error | null = null;

    for (const fetcher of fetchers) {
        try {
            return await fetcher(indicatorId);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown BLS fetch error');
        }
    }

    throw lastError ?? new Error('Unable to fetch BLS data');
};
