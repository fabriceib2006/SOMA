import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { google } from "googleapis";
import { getCATDateComponents, getCATPromptContext, DAY_END_HOUR_CAT } from "./src/lib/catTime";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

async function callGeminiWithRetry(params: any, retries = 2, delay = 600) {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'dummy_key') {
    return {
      text: `SOMA Academic Intelligence (Default Mode): I have successfully received your query. Because a custom GEMINI_API_KEY is not currently configured in this environment, SOMA is operating in curriculum assistant mode. 

To enable advanced AI synthesis, please add your GEMINI_API_KEY in the project settings menu.

How else can I assist you with your modules, topic mastery, or schedule today?`
    };
  }

  const initialModel = params.model || "gemini-3.5-flash";
  const modelQueue = [initialModel, ...FALLBACK_MODELS.filter(m => m !== initialModel)];

  for (let mIdx = 0; mIdx < modelQueue.length; mIdx++) {
    const currentModel = modelQueue[mIdx];
    for (let i = 0; i <= retries; i++) {
      try {
        return await ai.models.generateContent({ ...params, model: currentModel });
      } catch (err: any) {
        const errStr = String(err?.message || '');
        if (errStr.includes('API_KEY_INVALID') || errStr.includes('API key not valid')) {
          return {
            text: `SOMA Academic Intelligence (Fallback Mode): The configured Gemini API key was rejected by the API. SOMA is continuing in local curriculum mode. Please update your valid GEMINI_API_KEY in project settings.

How can I help you with your studies today?`
          };
        }
        const isTransient = err?.status === 503 || err?.status === 429 || errStr.includes('high demand') || errStr.includes('UNAVAILABLE') || errStr.includes('quota') || errStr.includes('resource_exhausted');
        if (isTransient) {
          if (i < retries) {
            console.warn(`Gemini transient error on ${currentModel} (${err?.status}), retrying in ${delay * (i + 1)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            continue;
          } else if (mIdx < modelQueue.length - 1) {
            console.warn(`Gemini ${currentModel} exhausted, falling back to ${modelQueue[mIdx + 1]}...`);
            break;
          } else {
            return {
              text: `SOMA Academic Intelligence (Quota Limit Exceeded): Your Gemini API quota limit has been temporarily reached. SOMA is operating in local curriculum and study planning mode while your API quota resets. You can continue managing your modules, assessments, and study schedule!`
            };
          }
        }
        throw err;
      }
    }
  }
}

function parseGeminiJSON(rawText: string) {
  if (!rawText) throw new Error("Empty response from AI");
  let cleaned = rawText.trim();
  if (cleaned.startsWith("SOMA Academic Intelligence")) {
    throw new Error(cleaned);
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Normalizer middleware: support CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// API routes
  app.post("/api/process-note", async (req, res) => {
    try {
      const { content, fileUrl, mimeType } = req.body;
      
      let contents: any = [`Analyze these study notes and extract the following: module, lecture number, topic, subtopics, difficulty, importance.
        Context: ${content}`];

      if (fileUrl && mimeType) {
        // If it's an image, we can try to fetch it and pass to Gemini
        if (mimeType.startsWith('image/')) {
          const fileRes = await fetch(fileUrl);
          const buffer = await fileRes.arrayBuffer();
          contents.push({
            inlineData: {
              mimeType,
              data: Buffer.from(buffer).toString('base64')
            }
          });
        }
        // For PDFs, the server might need more complex processing or pass to Gemini 1.5 Pro if available
      }

      const response = await callGeminiWithRetry({
        model: "gemini-flash-latest",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              module: { type: Type.STRING },
              lecture: { type: Type.STRING },
              topic: { type: Type.STRING },
              subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING },
              importance: { type: Type.STRING },
            },
            required: ["module", "lecture", "topic", "subtopics", "difficulty", "importance"]
          },
        },
      });
      
      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error in /api/process-note:", err);
      const isQuota = err?.message?.includes('resource_exhausted') || err?.status === 429;
      res.status(isQuota ? 429 : 500).json({ 
        error: isQuota 
          ? "Gemini API quota exceeded. Please wait a moment before trying again." 
          : (err?.message || "SOMA AI note processing failed.") 
      });
    }
  });

  app.post("/api/generate-plan", async (req, res) => {
    try {
      const { modules, topics, assessments, existingTimetable, date, studyHistory, studentRisk, masteryScores, externalCalendarEvents } = req.body;
      const cat = getCATDateComponents();
      const catContext = getCATPromptContext(cat);
      
      const response = await callGeminiWithRetry({
        model: "gemini-flash-latest",
        contents: `You are SOMA's Intelligence Engine. Generate a persistent, adaptive daily study plan for ${date}.
        
        Current System Reality (Central Africa Time - CAT, UTC+2):
        ${catContext}
        
        STUDENT CONTEXT:
        - Modules & Credit Weights: ${JSON.stringify(modules)}
        - Topic Mastery & Trends: ${JSON.stringify(topics)}
        - Mastery Scores: ${JSON.stringify(masteryScores)}
        - Academic Risk Profile: ${JSON.stringify(studentRisk)}
        - Upcoming Assessments (Prioritize these): ${JSON.stringify(assessments)}
        - Existing Timetable Today: ${JSON.stringify(existingTimetable)}
        - Google Calendar External Commitments (ABSOLUTE BLOCKERS): ${JSON.stringify(externalCalendarEvents)}
        - Actual Study History (Sessions completed/skipped/rescheduled): ${JSON.stringify(studyHistory)}
        
        SOMA SCHEDULING CONSTRAINTS:
        1. SOMA operates strictly in Central Africa Time (CAT).
        2. The academic day concludes at 23:00 CAT. NO sessions after 23:00.
        3. Do NOT schedule study sessions during fixed classes in ${JSON.stringify(existingTimetable)} OR during any Google Calendar external commitments: ${JSON.stringify(externalCalendarEvents)}.
        4. Prioritize topics with high academic risk, low mastery, and imminent assessments.
        5. Module Credit Factor: Consider module credits (e.g. 4-6 credits) as an input for academic importance and workload reasoning (higher credit courses require more foundational study blocks), while NEVER overriding urgent impending assessments or critical mastery deficits.
        6. Session "reason" must be specific: e.g., "Recursion mastery is Developing (45%); CAT is in 3 days; 4-credit core module."
        7. Use Task Types: Review Lecture, Active Recall, Practice, Problem Solving, Assignment, Revision, Exam Preparation, Mistake Review, Tutor Session, Notes Processing.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    start: { type: Type.STRING, description: "Start time in HH:mm format" },
                    end: { type: Type.STRING, description: "End time in HH:mm format" },
                    module: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    taskType: { type: Type.STRING, enum: ["Review Lecture", "Active Recall", "Practice", "Problem Solving", "Assignment", "Revision", "Exam Preparation", "Mistake Review", "Tutor Session", "Notes Processing"] },
                    duration: { type: Type.NUMBER, description: "Duration in minutes" },
                    reason: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] }
                  },
                  required: ["start", "end", "module", "topic", "activity", "taskType", "duration", "reason", "priority"]
                }
              }
            }
          }
        }
      });
      
      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error in /api/generate-plan:", err);
      const isQuota = err?.message?.includes('resource_exhausted') || err?.status === 429;
      res.status(isQuota ? 429 : 500).json({ 
        error: isQuota 
          ? "Gemini API quota exceeded. Please wait a moment before generating a new study plan." 
          : (err?.message || "SOMA study plan generation failed.") 
      });
    }
  });

  app.post("/api/evaluate-practice", async (req, res) => {
    try {
      const { question, studentAnswer, images, answerType, moduleName, topicName } = req.body;
      
      const promptText = `Evaluate this student's response to the following academic exercise.
      Question: "${question}"
      Topic: "${topicName}"
      Module: "${moduleName}"
      
      Response Type: ${answerType}
      ${answerType === 'typed' ? `Student's Typed Answer: "${studentAnswer}"` : `The student has provided a handwritten solution (${images?.length || 1} pages).`}
      
      You MUST provide a rigorous, objective academic evaluation.
      1. Score out of 10.
      2. Identify specific CORRECT points.
      3. Identify specific MISTAKES or misconceptions.
      4. Identify specific CONCEPT GAPS (e.g., "Student doesn't understand the application of Chain Rule").
      5. Identify STRENGTHS (e.g., "Good understanding of basic derivatives").
      6. Provide pedagogical FEEDBACK (short, encouraging, actionable).
      7. Distinguish between calculation errors and conceptual failures.`;

      let contents: any = promptText;
      if (answerType === 'handwritten') {
        if (images && Array.isArray(images) && images.length > 0) {
          const imageParts = images.map((img: string) => ({
            inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] || img }
          }));
          contents = [
            { text: promptText + "\nReview the pages in exact sequential order." },
            ...imageParts
          ];
        } else if (studentAnswer) {
          contents = [
            { text: promptText },
            { inlineData: { mimeType: "image/jpeg", data: studentAnswer.split(',')[1] || studentAnswer } }
          ];
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              correctPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              conceptGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              feedback: { type: Type.STRING },
              isConceptualMistake: { type: Type.BOOLEAN },
              recommendedNextAction: { type: Type.STRING }
            },
            required: ["score", "correctPoints", "mistakes", "conceptGaps", "strengths", "feedback", "isConceptualMistake", "recommendedNextAction"]
          }
        }
      });

      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error in /api/evaluate-practice:", err);
      res.status(500).json({ error: "SOMA AI evaluation failed. Check network or image quality." });
    }
  });

  app.post("/api/grade-answer", async (req, res) => {
    try {
      const { question, answer } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Grade this student answer for the following question. Provide a score (0-10), correct points, needs improvement points, and a recommendation.
        Question: ${question}
        Answer: ${answer}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              correct: { type: Type.ARRAY, items: { type: Type.STRING } },
              needsImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING },
            },
            required: ["score", "correct", "needsImprovement", "recommendation"]
          },
        },
      });
      
      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error in /api/grade-answer:", err);
      res.status(500).json({ error: "SOMA AI grading failed." });
    }
  });

  app.post("/api/tutor-chat", async (req, res) => {
    try {
      const { message, context, image, images } = req.body;
      const cat = getCATDateComponents();
      const catContext = getCATPromptContext(cat);
      const contextStr = typeof context === 'string' ? context : (context ? JSON.stringify(context) : 'General context');
      
      let contents: any = `You are SOMA AI, the intelligence layer and expert academic mentor of SOMA.
      
      Current Time & Calendar (Central Africa Time - CAT, UTC+2):
      ${catContext}
      
      SOMA Academic Time Rules:
      1. SOMA operates strictly in Central Africa Time (CAT = UTC+2). Always evaluate "today", "tomorrow", "tonight", or dates relative to ${cat.dateString} (${cat.dayOfWeek}) at ${cat.shortTimeString} CAT.
      2. The academic day closes at 23:00 CAT for student rest and memory consolidation.
      3. If current CAT time is in the Night Rest Period (>= 23:00 CAT or < 06:00 CAT):
         - Note the late hour in CAT kindly.
         - Advise the student to keep sessions brief and avoid sleep deprivation, as sleep is vital for neural consolidation.
      
      Student Academic Context:
      ${contextStr}
      
      Student Message: ${message}

      If the student is asking a conceptual question, give a clear, encouraging, university-grade explanation with active recall follow-up questions.
      If the student is submitting an answer, solution, or image to be graded, evaluate it thoroughly out of 10. Give actionable feedback and also include a machine-parseable JSON summary block enclosed strictly between <<<GRADING_JSON and GRADING_JSON>>> with keys:
      {
        "score": number (0-10),
        "topicName": string (best matching topic),
        "moduleName": string (best matching module),
        "mistakes": string[],
        "correctPoints": string[]
      }`;

      if (images && Array.isArray(images) && images.length > 0) {
        const imageParts = images.map((img: string) => ({
          inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] || img }
        }));
        contents = [
          { text: `Student Academic Context:
          ${contextStr}

          Analyze these ${images.length} ordered pages of student submission / handwritten exercise for the query: ${message}.
          Current Time Context: ${cat.shortTimeString} CAT (${cat.dateString}).
          Review the pages in exact sequential order (Page 1 to Page ${images.length}).
          Grade it out of 10, detail strengths and errors across the pages. If applicable, include a machine-parseable JSON block between <<<GRADING_JSON and GRADING_JSON>>>:
          {
            "score": number (0-10),
            "topicName": string,
            "moduleName": string,
            "mistakes": string[],
            "correctPoints": string[]
          }` },
          ...imageParts
        ];
      } else if (image) {
        contents = [
          { text: `Student Academic Context:
          ${contextStr}

          Analyze this student submission / handwritten note for the query: ${message}.
          Current Time Context: ${cat.shortTimeString} CAT (${cat.dateString}).
          Grade it out of 10, detail strengths and errors. If applicable, also include a machine-parseable JSON block between <<<GRADING_JSON and GRADING_JSON>>>:
          {
            "score": number (0-10),
            "topicName": string,
            "moduleName": string,
            "mistakes": string[],
            "correctPoints": string[]
          }` },
          { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] || image } }
        ];
      }

      const response = await callGeminiWithRetry({
        model: "gemini-flash-latest",
        contents,
        config: {
          systemInstruction: "You are SOMA, an intelligent, encouraging academic mentor and tutor operating strictly in Central Africa Time (CAT, UTC+2). In SOMA: (1) Academic days conclude at 23:00 CAT so students can rest; (2) Assignments are strict submission deadlines; (3) Quizzes, CATs, and Exams are test milestones; (4) Classes have specific lecture time blocks. Ensure all date and time perceptions match Central Africa Time (CAT) with zero mismatch. When students present problems or handwritten notes, guide them with the Socratic method, pinpointing exact mistakes."
        }
      });

      const rawText = response.text || '';
      let reply = rawText;
      let gradingResult: any = null;

      // Extract JSON grading block if present
      const gradingMatch = rawText.match(/<<<GRADING_JSON\s*([\s\S]*?)\s*GRADING_JSON>>>/);
      if (gradingMatch && gradingMatch[1]) {
        try {
          gradingResult = JSON.parse(gradingMatch[1].trim());
          // Clean the code fence from reply text for the student
          reply = rawText.replace(/<<<GRADING_JSON[\s\S]*?GRADING_JSON>>>/, '').trim();
        } catch (e) {
          console.warn("Could not parse grading json block:", e);
        }
      }

      res.json({ reply, gradingResult });
    } catch (err: any) {
      console.error("Error in /api/tutor-chat:", err);
      const isQuota = err?.message?.includes('resource_exhausted') || err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('exceeded');
      const msg = isQuota 
        ? "Gemini API quota limit has been reached. SOMA is operating in local curriculum mode while your quota resets. You can continue reviewing notes, managing your schedule, and tracking your timetable!" 
        : (err?.message || "SOMA encountered an error communicating with Gemini AI.");
      res.json({ reply: `⚠️ SOMA AI Notice: ${msg}`, gradingResult: null });
    }
  });

  app.post("/api/generate-practice", async (req, res) => {
    try {
      const { moduleName, topicName, difficulty = 'Medium', priorMistakes = [] } = req.body;

      const prompt = `Generate a university-level practice problem or diagnostic question for the topic: "${topicName}" in module: "${moduleName}".
      Target Difficulty: ${difficulty}.
      Prior student mistakes to test/address: ${JSON.stringify(priorMistakes)}.
      
      Provide a rigorous question requiring thoughtful explanation or calculation, along with key points for a correct answer.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              rubric: { type: Type.ARRAY, items: { type: Type.STRING } },
              hints: { type: Type.ARRAY, items: { type: Type.STRING } },
              sampleAnswer: { type: Type.STRING },
            },
            required: ["question", "rubric", "hints", "sampleAnswer"]
          }
        }
      });

      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error in /api/generate-practice:", err);
      res.status(500).json({
        question: `Explain the fundamental principles of ${req.body.topicName || 'this topic'} and discuss common misconceptions.`,
        rubric: ["Clear definition", "Correct example", "Detailed explanation"],
        hints: ["Think about core definitions", "Consider practical applications"],
        sampleAnswer: "A standard comprehensive solution addressing the core principles."
      });
    }
  });

  app.post("/api/parse-assessment", async (req, res) => {
    try {
      const cat = getCATDateComponents();
      const { text, modules = [], topics = [], referenceDate } = req.body;
      const effectiveRefDate = referenceDate || cat.dateString;

      const prompt = `You are SOMA's Natural Language Academic Parser operating strictly in Central Africa Time (CAT, UTC+2).
      
      Current Time Context:
      - Current Date (CAT): ${effectiveRefDate} (${cat.dayOfWeek})
      - Current Time (CAT): ${cat.shortTimeString} CAT
      - SOMA Academic Day Cutoff: 23:00 CAT
      
      Student Entered:
      "${text}"

      Available Modules: ${JSON.stringify(modules)}
      Available Topics: ${JSON.stringify(topics)}

      Tasks:
      1. Detect event type: 'assignment' (strict deadline), 'quiz' (milestone), 'cat' (continuous assessment test milestone), or 'exam' (milestone).
      2. Detect the due or event date in ISO format YYYY-MM-DD:
         - Calculate relative expressions ("today", "tomorrow", "tonight", "this Friday", "next Tuesday", "in 3 days") strictly relative to Current Date in CAT (${effectiveRefDate}).
         - Do not mix up time zones or drift into previous/next day.
      3. Identify the best matching module from Available Modules (or propose title if not matched).
      4. Detect relevant topic names from text or matching Available Topics.
      5. Provide a polished assessment title and notes.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["assignment", "quiz", "cat", "exam"] },
              dueDate: { type: Type.STRING },
              moduleId: { type: Type.STRING },
              moduleName: { type: Type.STRING },
              topicNames: { type: Type.ARRAY, items: { type: Type.STRING } },
              notes: { type: Type.STRING },
              urgency: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            },
            required: ["title", "type", "dueDate", "moduleName", "topicNames"]
          }
        }
      });

      const parsed = parseGeminiJSON(response.text!);
      res.json({
        assessment: parsed,
        ...parsed,
        catTime: cat.shortTimeString + ' CAT',
        catDate: effectiveRefDate
      });
    } catch (err: any) {
      console.error("Error in /api/parse-assessment:", err);
      const cat = getCATDateComponents();
      const fallback = {
        title: req.body.text || "New Assessment",
        type: "assignment",
        dueDate: cat.dateString,
        moduleName: "General",
        topicNames: [],
        notes: "Parsed fallback."
      };
      res.status(500).json({
        assessment: fallback,
        ...fallback,
        catTime: cat.shortTimeString + ' CAT',
        catDate: cat.dateString
      });
    }
  });

  app.post("/api/progress/insights", async (req, res) => {
    try {
      const { topics, assessments, mistakes, overallMastery } = req.body;
      const cat = getCATDateComponents();
      
      const prompt = `You are SOMA's academic intelligence engine operating strictly in Central Africa Time (CAT, UTC+2).
      Current Central Africa Time: ${cat.shortTimeString} CAT, ${cat.dayOfWeek}, ${cat.dateString}.
      
      Generate deep, objective, evidence-based academic insights for a student based strictly on their real recorded performance data:
      Current Reference CAT Date: ${cat.dateString}
      Overall Mastery: ${overallMastery !== undefined ? overallMastery + '%' : 'Insufficient baseline'}
      Topics with Performance: ${JSON.stringify(topics || [])}
      Upcoming Assessments: ${JSON.stringify(assessments || [])}
      Common Recorded Mistakes: ${JSON.stringify(mistakes || [])}
      
      Requirements:
      1. Explain WHAT they know and where they are developing based strictly on the provided evidence.
      2. Identify true academic risks (imminent assessment due near ${cat.dateString} + low mastery or repeated mistakes).
      3. Highlight detected recurring mistake patterns and actionable guidance.
      4. Suggest 3 specific study recommendations (time-boxed, respecting the 23:00 CAT day cutoff).
      Do NOT invent fake grades or assume unrecorded progress.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskAnalysis: { type: Type.STRING },
              mistakeInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["action", "duration", "reason"]
                }
              }
            },
            required: ["summary", "strengths", "riskAnalysis", "mistakeInsights", "recommendations"]
          }
        }
      });

      res.json(parseGeminiJSON(response.text!));
    } catch (err: any) {
      console.error("Error generating progress insights:", err);
      res.status(500).json({ 
        summary: "SOMA is analyzing your academic evidence.",
        strengths: [],
        riskAnalysis: "Review upcoming assessment dates and topic mastery.",
        mistakeInsights: [],
        recommendations: [
          { action: "Review core topic concepts", duration: "30 min", reason: "Reinforce fundamentals" }
        ]
      });
    }
  });

  app.get("/api/cat-time", (req, res) => {
    const cat = getCATDateComponents();
    res.json({
      status: "ok",
      timezone: "Central Africa Time (CAT, UTC+2)",
      ...cat
    });
  });

  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const { events } = req.body;
      
      // Use googleapis to sync events
      // TODO: Implement production token validation
      res.json({ status: 'ok' });
    } catch (err: any) {
      console.error("Error in /api/calendar/sync:", err);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite or static serving
  async function setupFrontendAndStart() {
    const PORT = 3000;
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  if (!process.env.VERCEL) {
    setupFrontendAndStart();
  }

export default app;
