import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'node:http'

const SERIES_BY_INDICATOR: Record<string, string> = {
  cpi: 'CUUR0000SA0',
  ppi: 'WPUFD4',
  'import-prices': 'EIUIR',
}

const writeJsonResponse = (response: ServerResponse, statusCode: number, body: string) => {
  response.statusCode = statusCode
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Content-Type', 'application/json')
  response.end(body)
}

const blsDevProxy = () => ({
  name: 'bls-dev-proxy',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/.netlify/functions/bls', async (request, response) => {
      if (request.method === 'OPTIONS') {
        writeJsonResponse(response, 200, '')
        return
      }

      const url = new URL(request.url ?? '', 'http://localhost')
      const indicator = url.searchParams.get('indicator') ?? 'cpi'
      const seriesId = SERIES_BY_INDICATOR[indicator]

      if (!seriesId) {
        writeJsonResponse(response, 400, JSON.stringify({ error: `Unsupported BLS indicator: ${indicator}` }))
        return
      }

      const currentYear = new Date().getFullYear()
      const startyear = url.searchParams.get('startyear') ?? String(currentYear - 9)
      const endyear = url.searchParams.get('endyear') ?? String(currentYear)

      try {
        const blsResponse = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seriesid: [seriesId],
            startyear,
            endyear,
          }),
        })

        writeJsonResponse(response, blsResponse.ok ? 200 : blsResponse.status, await blsResponse.text())
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown BLS proxy error'
        writeJsonResponse(response, 502, JSON.stringify({ status: 'REQUEST_FAILED', message: [message] }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), blsDevProxy()],
})
