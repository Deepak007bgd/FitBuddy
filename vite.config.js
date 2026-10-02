import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleDailyPlanRequest, handleProgressAnalysisRequest, handleChatRequest } from './server/aiHandler.js'

function aiApiPlugin() {
  let env = {}
  return {
    name: 'ai-api-plugin',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '')
    },
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || ''

        let bodyStr = ''
        req.on('data', (chunk) => { bodyStr += chunk })
        req.on('end', async () => {
          let reqBody = {}
          try { if (bodyStr) reqBody = JSON.parse(bodyStr) } catch (e) {}

          let result
          if (req.url === '/daily-plan' || req.url === '/daily-plan/') {
            result = await handleDailyPlanRequest(reqBody, apiKey)
          } else if (req.url === '/progress-analysis' || req.url === '/progress-analysis/') {
            result = await handleProgressAnalysisRequest(reqBody, apiKey)
          } else if (req.url === '/chat' || req.url === '/chat/') {
            result = await handleChatRequest(reqBody, apiKey)
          } else {
            result = { status: 404, body: { error: 'API endpoint not found' } }
          }

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || ''

        let bodyStr = ''
        req.on('data', (chunk) => { bodyStr += chunk })
        req.on('end', async () => {
          let reqBody = {}
          try { if (bodyStr) reqBody = JSON.parse(bodyStr) } catch (e) {}

          let result
          if (req.url === '/daily-plan' || req.url === '/daily-plan/') {
            result = await handleDailyPlanRequest(reqBody, apiKey)
          } else if (req.url === '/progress-analysis' || req.url === '/progress-analysis/') {
            result = await handleProgressAnalysisRequest(reqBody, apiKey)
          } else if (req.url === '/chat' || req.url === '/chat/') {
            result = await handleChatRequest(reqBody, apiKey)
          } else {
            result = { status: 404, body: { error: 'API endpoint not found' } }
          }

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aiApiPlugin()],
})
