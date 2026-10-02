// Server-side Gemini API Handler for FitBuddy
// Executed in Node.js environment via Vite API middleware.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function callGeminiApi(apiKey, contents, systemInstruction = '', responseJson = false) {
  // Multi-model fallback sequence to handle model-specific free tier quota limits
  // gemini-1.5-flash was removed: it has been shut down and always returns 404.
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash']
  const maxRetries = 2
  let lastError = null
  let notFoundError = null // "model not found" is kept separately so it never hides a quota/busy error

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = Math.pow(2, attempt - 1) * 1000
        console.warn(`[FitBuddy AI] Retrying request on model ${model} (Attempt ${attempt + 1}/${maxRetries + 1}) after ${delayMs}ms...`)
        await sleep(delayMs)
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const bodyPayload = { contents }

        if (systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: systemInstruction }]
          }
        }

        if (responseJson) {
          bodyPayload.generationConfig = {
            responseMimeType: 'application/json'
          }
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const errMsg = errData?.error?.message || `Gemini API returned status ${res.status}`
          
          const is429 = res.status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('resource_exhausted')
          const is503 = res.status === 503 || res.status === 500 || errMsg.includes('503') || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('overloaded')

          if (is429) {
            console.warn(`[FitBuddy AI] Quota limit reached for model ${model}.`)
            lastError = new Error('AI usage limit reached. Please try again later.')
            break // Break attempt loop to try NEXT model in array; do NOT retry 429
          }

          if (is503) {
            lastError = new Error('AI is temporarily busy. Please try again in a few minutes.')
            if (attempt < maxRetries) continue
            else break
          }

          throw new Error(errMsg)
        }

        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('No response text received from Gemini API.')
        return text
      } catch (err) {
        const errMsg = err?.message || ''
        const isModelGone = /is not found|not supported for generateContent/i.test(errMsg)
        if (isModelGone) {
          console.warn(`[FitBuddy AI] Model ${model} is unavailable; skipping.`)
          notFoundError = err
          break // try the next model
        }
        const is429 = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('resource_exhausted') || errMsg.toLowerCase().includes('usage limit')
        const is503 = errMsg.includes('503') || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('temporarily busy')

        if (is429) {
          lastError = new Error('AI usage limit reached. Please try again later.')
          break // Never retry 429 — try next model immediately
        }

        if (is503) {
          lastError = new Error('AI is temporarily busy. Please try again in a few minutes.')
          if (attempt < maxRetries) continue
          else break
        }

        lastError = err
        break
      }
    }
  }

  if (lastError) throw lastError
  if (notFoundError) throw new Error('No configured Gemini model is available. Update the model list in server/aiHandler.js.')
  throw new Error('AI usage limit reached. Please try again later.')
}

export async function handleDailyPlanRequest(reqBody, apiKey) {
  if (!apiKey) {
    return { status: 400, body: { error: 'Gemini API key is not configured on server. Please add GEMINI_API_KEY to your .env file.' } }
  }

  const { profile, recentWorkouts } = reqBody
  if (!profile) {
    return { status: 400, body: { error: 'User profile is required to generate AI plan.' } }
  }

  const workoutContext = recentWorkouts && recentWorkouts.length > 0
    ? recentWorkouts.map(w => `- ${w.logged_on}: ${w.custom_name || w.type} (${w.duration_min} min, ${w.calories_burned || 0} kcal)`).join('\n')
    : 'No recent workout history logged yet.'

  const prompt = `User Profile:
- Age: ${profile.age}
- Height: ${profile.height_cm} cm
- Current Weight: ${profile.weight_kg} kg
- Target Weight: ${profile.target_weight_kg} kg
- Primary Goal: ${profile.goal}
- Fitness Level: ${profile.fitness_level}
- Preferred Workouts: ${(profile.preferred_workouts || []).join(', ')}

Recent Activity History:
${workoutContext}

Generate a comprehensive daily fitness plan tailored specifically to this user.
Respond ONLY with a valid JSON object following this schema:
{
  "workout": {
    "title": "String",
    "durationMinutes": 30,
    "intensity": "Moderate",
    "summary": "Brief explanation of today's workout focus",
    "exercises": [
      { "name": "Exercise Name", "sets": "3", "reps": "12", "instructions": "Safe technique instruction" }
    ],
    "safetyTip": "General workout safety tip"
  },
  "nutrition": {
    "healthySuggestions": ["Suggestion 1", "Suggestion 2"],
    "hydrationGoalLiters": 2.5,
    "hydrationTip": "Hydration advice for today",
    "mealIdeas": [
      { "meal": "Breakfast", "description": "Healthy meal description" },
      { "meal": "Lunch", "description": "Healthy meal description" },
      { "meal": "Dinner", "description": "Healthy meal description" }
    ],
    "goalAlignmentTip": "Explanation of how these food choices support the user's goal"
  },
  "recovery": {
    "restAdvice": "Sleep and rest recommendation",
    "sleepTip": "Practical sleep quality tip",
    "stretchingRoutine": ["Stretch 1", "Stretch 2"],
    "wellnessAdvice": "General stress relief / wellness tip"
  },
  "weeklySummary": {
    "summary": "Overview of user's recent activity consistency",
    "consistencyAssessment": "Positive feedback on workout frequency",
    "progressAssessment": "Progress evaluation toward target weight",
    "encouragement": "Motivational message",
    "nextWeekSuggestions": ["Suggestion for next week", "Suggestion 2"]
  }
}`

  const systemInstruction = `You are FitBuddy AI, a certified personal trainer and nutritionist. 
SAFETY GUARDRAILS:
- Do not diagnose medical conditions.
- Do not recommend extreme/dangerous diets or rapid starvation.
- Do not recommend unsafe exercises or poor technique.
- Always encourage listening to one's body.`

  try {
    const rawJson = await callGeminiApi(apiKey, [{ parts: [{ text: prompt }] }], systemInstruction, true)
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJson)
    return { status: 200, body: { data: parsed } }
  } catch (err) {
    const isBusy = err.message.includes('503') || err.message.toLowerCase().includes('high demand') || err.message.toLowerCase().includes('busy')
    const errorMsg = isBusy ? 'AI is temporarily busy. Please try again in a few minutes.' : (err.message || 'AI Plan Generation Error')
    return { status: 500, body: { error: errorMsg } }
  }
}

export async function handleProgressAnalysisRequest(reqBody, apiKey) {
  if (!apiKey) {
    return { status: 400, body: { error: 'Gemini API key is not configured on server. Please add GEMINI_API_KEY to your .env file.' } }
  }

  const { profile, recentWorkouts, weightLogs, streakInfo } = reqBody
  if (!profile) {
    return { status: 400, body: { error: 'User profile is required.' } }
  }

  const workoutContext = recentWorkouts && recentWorkouts.length > 0
    ? recentWorkouts.map(w => `- ${w.logged_on}: ${w.custom_name || w.type} (${w.duration_min} min, ${w.calories_burned || 0} kcal)`).join('\n')
    : 'No workouts logged yet.'

  const weightContext = weightLogs && weightLogs.length > 0
    ? weightLogs.slice(0, 10).map(w => `- ${w.logged_on}: ${w.weight_kg} kg`).join('\n')
    : `Current weight: ${profile.weight_kg} kg`

  const prompt = `User Profile:
- Goal: ${profile.goal}
- Fitness Level: ${profile.fitness_level}
- Current Weight: ${profile.weight_kg} kg | Target Weight: ${profile.target_weight_kg} kg
- Current Streak: ${streakInfo?.currentStreak || 0} days | Longest Streak: ${streakInfo?.longestStreak || 0} days

Weight Logs History:
${weightContext}

Recent Workouts Logged:
${workoutContext}

Analyze the user's progress and habit consistency.
Respond ONLY with a JSON object following this schema:
{
  "summary": "Detailed overall progress summary",
  "consistency": "Observation on activity consistency and habit building",
  "positiveAchievements": ["Achievement 1", "Achievement 2"],
  "areasToImprove": ["Area to focus on 1", "Area to focus on 2"],
  "nextSteps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}`

  const systemInstruction = `You are FitBuddy AI Progress Analyst. Be objective, supportive, and practical. 
SAFETY GUARDRAILS:
- Do not provide medical diagnoses or treatment advice.
- Do not recommend unsafe weight loss speed (safe weight loss is ~0.5-1kg per week).`

  try {
    const rawJson = await callGeminiApi(apiKey, [{ parts: [{ text: prompt }] }], systemInstruction, true)
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJson)
    return { status: 200, body: { data: parsed } }
  } catch (err) {
    const isBusy = err.message.includes('503') || err.message.toLowerCase().includes('high demand') || err.message.toLowerCase().includes('busy')
    const errorMsg = isBusy ? 'AI is temporarily busy. Please try again in a few minutes.' : (err.message || 'AI Analysis Error')
    return { status: 500, body: { error: errorMsg } }
  }
}

export async function handleChatRequest(reqBody, apiKey) {
  if (!apiKey) {
    return { status: 400, body: { error: 'Gemini API key is not configured on server. Please add GEMINI_API_KEY to your .env file.' } }
  }

  const { messages, profile, userPrompt } = reqBody
  if (!userPrompt) {
    return { status: 400, body: { error: 'Message prompt is required.' } }
  }

  const systemInstruction = `You are FitBuddy AI Assistant, an encouraging and expert fitness, workout, nutrition, and recovery coach.
User Profile:
- Name: ${profile?.display_name || 'Fitness Friend'}
- Goal: ${profile?.goal || 'general fitness'}
- Level: ${profile?.fitness_level || 'beginner'}

SAFETY RULES:
1. DO NOT diagnose medical conditions or offer medical treatments.
2. DO NOT recommend extreme diets, dangerous supplements, or severe calorie restriction.
3. DO NOT provide unsafe exercise instructions.
4. Include a general health/safety reminder when appropriate.
Keep your answers clear, helpful, structured with short bullet points, and under 300 words.`

  const contents = []
  if (Array.isArray(messages)) {
    for (const msg of messages.slice(-6)) { // keep last 6 turns context
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })
    }
  }
  contents.push({ role: 'user', parts: [{ text: userPrompt }] })

  try {
    const replyText = await callGeminiApi(apiKey, contents, systemInstruction, false)
    return { status: 200, body: { reply: replyText } }
  } catch (err) {
    const isBusy = err.message.includes('503') || err.message.toLowerCase().includes('high demand') || err.message.toLowerCase().includes('busy')
    const errorMsg = isBusy ? 'AI is temporarily busy. Please try again in a few minutes.' : (err.message || 'AI Assistant Error')
    return { status: 500, body: { error: errorMsg } }
  }
}