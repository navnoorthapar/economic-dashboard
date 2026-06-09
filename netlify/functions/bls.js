const SERIES_BY_INDICATOR = {
  cpi: 'CUUR0000SA0',
  ppi: 'WPUFD4',
  'import-prices': 'EIUIR',
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const indicator = event.queryStringParameters?.indicator ?? 'cpi';
  const seriesId = SERIES_BY_INDICATOR[indicator];

  if (!seriesId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unsupported BLS indicator: ${indicator}` }),
    };
  }

  const currentYear = new Date().getFullYear();
  const startyear = event.queryStringParameters?.startyear ?? String(currentYear - 9);
  const endyear = event.queryStringParameters?.endyear ?? String(currentYear);

  const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      seriesid: [seriesId],
      startyear,
      endyear,
    }),
  });

  return {
    statusCode: response.ok ? 200 : response.status,
    headers,
    body: await response.text(),
  };
};
