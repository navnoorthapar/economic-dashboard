import type { Metric } from '../data/economics';

export interface Indicator {
    id: string;
    name: string;
    description: string;
    fullDefinition: string;
    metricKey: Metric;
    unit?: string;
    dataSource?: string;
    examples?: string[];
}

export interface Perspective {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    tags: string[];
    indicators: Indicator[];
}

export const PERSPECTIVES: Perspective[] = [
    {
        id: 'industrial-activity',
        title: 'Industrial Activity',
        description: 'How much is the economy producing and selling?',
        icon: 'Factory',
        color: 'indigo',
        tags: ['PMI', 'IIP', 'RETAIL SALES', 'GDP GROWTH'],
        indicators: [
            {
                id: 'pmi-proxy', name: 'Purchasing Managers Index (PMI)',
                description: 'Manufacturing activity direction — World Bank manufacturing growth proxy',
                fullDefinition: 'True PMI is a proprietary monthly survey (S&P Global / ISM) with no free comparable API across all 5 countries. The best available free public proxy is World Bank Manufacturing Value Added (annual % growth) — indicator NV.IND.MANF.KD.ZG. A positive value indicates expansion; negative indicates contraction.',
                metricKey: 'PMI',
                unit: '% (annual growth)',
                dataSource: 'World Bank WDI — Manufacturing Value Added (annual % growth) — NV.IND.MANF.KD.ZG. Note: True monthly PMI survey data is proprietary (S&P Global / ISM); this is the best free comparable proxy across India, China, Japan, USA, Germany.',
                examples: ['Factory output direction', 'Manufacturing sector expansion/contraction']
            },
            {
                id: 'iip', name: 'Index of Industrial Production (IIP)',
                description: 'Industry value added growth — World Bank industry output proxy',
                fullDefinition: 'True IIP is a high-frequency monthly series from national stats offices with no clean common free API across all 5 countries. The best available free public proxy is World Bank Industry (including construction) Value Added annual % growth — indicator NV.IND.TOTL.KD.ZG.',
                metricKey: 'IIP',
                unit: '% (annual growth)',
                dataSource: 'World Bank WDI — Industry (incl. construction) Value Added (annual % growth) — NV.IND.TOTL.KD.ZG. Note: True monthly IIP from national stats offices (MoSPI India, NBS China, etc.) has no free common API; this is the best comparable public proxy.',
                examples: ['Factory output growth', 'Mining and electricity sector activity']
            },
            {
                id: 'retail-sales', name: 'Retail Sales',
                description: 'Household consumption growth — World Bank consumer spending proxy',
                fullDefinition: 'True retail sales monthly data from Census Bureaus has no common free API across all 5 countries. The best available public proxy is World Bank Household Final Consumption Expenditure annual % growth — indicator NE.CON.PRVT.KD.ZG. This captures the same underlying consumer demand dynamic.',
                metricKey: 'Retail Sales',
                unit: '% (annual growth)',
                dataSource: 'World Bank WDI — Household Final Consumption Expenditure (annual % growth) — NE.CON.PRVT.KD.ZG. Note: Monthly retail sales data from national census bureaus has no common free API; this is the best comparable public proxy.',
                examples: ['Consumer spending trends', 'E-commerce and in-store demand']
            },
            {
                id: 'gdp-growth', name: 'GDP Growth Rate',
                description: 'Annual percentage growth of GDP',
                fullDefinition: 'Measures the rate at which a country\'s economy is growing or shrinking from year to year, adjusted for inflation.',
                metricKey: 'Growth Rate',
                unit: '%',
                dataSource: 'World Bank WDI — NY.GDP.MKTP.KD.ZG — Real GDP growth (annual %)',
                examples: ['Quarterly GDP reports', 'Annual economic forecasts']
            }
        ]
    },
    {
        id: 'cost-of-living',
        title: 'Cost of Living',
        description: 'How do prices move for consumers and producers?',
        icon: 'Tag',
        color: 'amber',
        tags: ['CPI', 'PPI', 'IMPORT PRICES', 'PRICE PRESSURE'],
        indicators: [
            {
                id: 'cpi', name: 'Consumer Price Index (CPI)',
                description: 'Changes in the price level of consumer goods — World Bank all 5 countries',
                fullDefinition: 'A measure that examines the weighted average of prices of a basket of consumer goods and services, such as transportation, food, and medical care.',
                metricKey: 'CPI',
                unit: 'Index (2010=100)',
                dataSource: 'World Bank WDI — FP.CPI.TOTL — Consumer price index (2010=100) for India, China, Japan, USA, Germany',
                examples: ['Grocery prices', 'Housing rent', 'Fuel costs']
            },
            {
                id: 'ppi', name: 'Producer Price Index (PPI) — USA',
                description: 'U.S. BLS PPI Final Demand — live monthly data (USA only)',
                fullDefinition: 'Measures the average changes in prices received by domestic producers for their output. USA data is live from U.S. BLS series WPUFD4 (Final Demand PPI). For multi-country comparison, see the GDP Deflator (Price Proxy) indicator.',
                metricKey: 'PPI',
                unit: 'Index (Nov 2009=100)',
                dataSource: 'U.S. Bureau of Labor Statistics — Series WPUFD4 — PPI Final Demand (USA only). Multi-country PPI: see GDP Deflator indicator.',
                examples: ['Wholesale goods', 'Raw material costs']
            },
            {
                id: 'import-prices', name: 'Import Price Index',
                description: 'Import unit value — World Bank all 5 countries',
                fullDefinition: 'Measures the changes in the prices of goods and services purchased from abroad.',
                metricKey: 'Import Price Index',
                unit: 'Index (2015=100)',
                dataSource: 'World Bank WDI — TM.UVI.MRCH.XD.WD — Import merchandise unit value index (2015=100) for India, China, Japan, USA, Germany',
                examples: ['Imported oil prices', 'Foreign machinery costs']
            },
            {
                id: 'ppi-all', name: 'GDP Deflator (Price Proxy — All Countries)',
                description: 'Broad price pressure proxy — World Bank all 5 countries',
                fullDefinition: 'No single comparable free public PPI API exists for India, China, Japan, USA, and Germany together. The GDP Deflator (annual % change) from World Bank is the best available cross-country price pressure proxy. It reflects overall price level changes in an economy and closely tracks producer price dynamics.',
                metricKey: 'PPI',
                unit: '% (annual)',
                dataSource: 'World Bank WDI — NY.GDP.DEFL.KD.ZG — GDP deflator (annual %) for India, China, Japan, USA, Germany. Note: True cross-country PPI has no free common API; GDP deflator is the best comparable proxy.',
                examples: ['Overall price level change', 'Producer price direction across countries']
            }
        ]
    },
    {
        id: 'jobs-incomes',
        title: 'Jobs and Incomes',
        description: 'Labour market health and household income viability',
        icon: 'Users',
        color: 'red',
        tags: ['UNEMPLOYMENT', 'WAGE GROWTH', 'DISPOSABLE INCOME'],
        indicators: [
            {
                id: 'unemployment', name: 'Unemployment Rate',
                description: 'Percentage of labor force looking for work',
                fullDefinition: 'The percentage of the total labor force that is jobless and actively seeking employment.',
                metricKey: 'Unemployment Rate',
                unit: '%',
                dataSource: 'World Bank WDI — SL.UEM.TOTL.ZS — ILO modelled estimates, all ages, % of labour force',
                examples: ['Youth unemployment', 'Long-term joblessness']
            },
            {
                id: 'wage-growth', name: 'Wage Growth',
                description: 'Labor productivity (GDP per worker) — World Bank wage proxy',
                fullDefinition: 'True wage growth (hourly/weekly earnings growth) has no clean free cross-country API for all 5 countries. The best available World Bank proxy is GDP per person employed (constant 2021 PPP USD) — indicator SL.GDP.PCAP.EM.KD. Higher values mean workers are producing more per hour, which closely tracks real wage trends.',
                metricKey: 'Wage Growth',
                unit: 'PPP USD',
                dataSource: 'World Bank WDI — SL.GDP.PCAP.EM.KD — GDP per person employed (constant 2021 PPP $). Note: True wage growth from national labor departments has no common free API; labor productivity is the best comparable proxy.',
                examples: ['Worker output per hour', 'Real wage trend direction']
            },
            {
                id: 'real-income', name: 'Real Disposable Income',
                description: 'Household consumption per capita — World Bank real income proxy',
                fullDefinition: 'True real disposable income data from BEA/national stats has no common free API across all 5 countries. The best available public proxy is World Bank Household Final Consumption Expenditure per capita in constant 2015 USD — indicator NE.CON.PRVT.PC.KD. This directly reflects what households are actually spending in real terms.',
                metricKey: 'Real Disposable Income',
                unit: 'Const. 2015 USD',
                dataSource: 'World Bank WDI — NE.CON.PRVT.PC.KD — Household final consumption per capita (constant 2015 USD). Note: BEA real disposable income has no cross-country free API; this is the best comparable public proxy.',
                examples: ['Household purchasing power', 'Real consumption per person']
            },
            {
                id: 'gdp-per-capita', name: 'GDP per Capita',
                description: 'Economic output per person',
                fullDefinition: 'A metric that breaks down a country\'s economic output per person and is calculated by dividing the GDP of a country by its population.',
                metricKey: 'GDP per Capita',
                unit: 'USD',
                dataSource: 'World Bank WDI — NY.GDP.PCAP.CD — GDP per capita (current USD)',
                examples: ['Average individual wealth', 'Standard of living indicator']
            }
        ]
    },
    {
        id: 'global-trade',
        title: 'Global Trade & Currency',
        description: 'External flows, currency moves, and foreign demand',
        icon: 'Globe',
        color: 'emerald',
        tags: ['CURRENT ACCOUNT', 'TRADE BALANCE', 'EXCHANGE RATE'],
        indicators: [
            {
                id: 'current-account', name: 'Current Account (% of GDP)',
                description: 'Balance of trade, net income, and direct transfers',
                fullDefinition: 'A record of a country\'s international transactions with the rest of the world. A positive balance indicates the nation is a net lender to the rest of the world.',
                metricKey: 'Current Account',
                unit: '% of GDP',
                dataSource: 'World Bank WDI — BN.CAB.XOKA.GD.ZS — Current account balance (% of GDP)',
                examples: ['Export revenues', 'Foreign aid', 'Remittances']
            },
            {
                id: 'trade-balance', name: 'Trade Balance',
                description: 'External balance on goods and services (% of GDP)',
                fullDefinition: 'The calculation of a country\'s exports minus its imports. A positive number indicates a trade surplus, while a negative number indicates a trade deficit.',
                metricKey: 'Trade Balance',
                unit: '% of GDP',
                dataSource: 'World Bank WDI — NE.RSB.GNFS.ZS — External balance on goods and services (% of GDP)',
                examples: ['Manufacturing exports', 'Oil imports']
            },
            {
                id: 'exchange-rate', name: 'Exchange Rate',
                description: 'Value of local currency against USD',
                fullDefinition: 'The rate at which one national currency will be exchanged for another. It is also regarded as the value of one country\'s currency in relation to another currency.',
                metricKey: 'Exchange Rate',
                unit: 'vs USD',
                dataSource: 'World Bank WDI — PA.NUS.FCRF — Official exchange rate (LCU per USD, period average)',
                examples: ['Currency depreciation', 'Import purchasing power']
            },
            {
                id: 'neer', name: 'Nominal Effective Exchange Rate (NEER)',
                description: 'Real Effective Exchange Rate (REER) — closest available public proxy for NEER',
                fullDefinition: 'True NEER from BIS has no free comparable API across all 5 countries. The closest available free public proxy is World Bank Real Effective Exchange Rate (REER) — indicator PX.REX.REER — index 2010=100. REER adjusts for relative inflation and is the standard comparable measure available freely.',
                metricKey: 'NEER',
                unit: 'Index (2010=100)',
                dataSource: 'World Bank WDI — PX.REX.REER — Real effective exchange rate (2010=100). Note: True BIS NEER has no free cross-country API; REER is the best comparable public proxy.',
                examples: ['Broad currency strength', 'Export competitiveness']
            },
            {
                id: 'total-wealth', name: 'Total Wealth (GDP)',
                description: 'Total economic output in trillion USD',
                fullDefinition: 'Gross Domestic Product (GDP) represents the total value of all goods and services produced over a specific time period.',
                metricKey: 'GDP',
                unit: 'Trillion USD',
                dataSource: 'World Bank WDI — NY.GDP.MKTP.CD — GDP (current USD)',
                examples: ['Total national output']
            }
        ]
    }
];
