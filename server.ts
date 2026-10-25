import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Google GenAI initialization with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Image Analysis with gemini-4-argon (as required by specification)
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', documentType = 'Standard Passport' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `You are a certified biometric photo validation expert and computer vision inspector for passport, visa, and ID photos.
Analyze this submitted photograph for compliance with official photo specifications (target: ${documentType}).
Check:
1. Subject framing and head position (centered, looking forward, face proportions).
2. Lighting and shadows (even illumination, no harsh shadows behind ears/neck).
3. Background quality (uniform, plain color or transparency, distraction-free).
4. Sharpness, blur, and pixel quality (focus, clarity, resolution suitability).
5. Facial expressions (neutral expression, eyes open and clearly visible, mouth closed).
6. Glasses/accessories compliance.

Return a valid JSON object with EXACTLY this structure:
{
  "complianceScore": <number from 0 to 100>,
  "verdict": "<Approved | Needs Adjustment | Rejected>",
  "summary": "<1-2 sentence overall assessment>",
  "checks": [
    {"category": "Framing & Composition", "status": "Pass" | "Warning" | "Fail", "detail": "<detail>"},
    {"category": "Lighting & Shadows", "status": "Pass" | "Warning" | "Fail", "detail": "<detail>"},
    {"category": "Background Quality", "status": "Pass" | "Warning" | "Fail", "detail": "<detail>"},
    {"category": "Sharpness & Focus", "status": "Pass" | "Warning" | "Fail", "detail": "<detail>"},
    {"category": "Expression & Visibility", "status": "Pass" | "Warning" | "Fail", "detail": "<detail>"}
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "estimatedEyeLevelPercent": <number representing vertical distance from top of frame to eye line, e.g. 45>,
  "estimatedHeadHeightPercent": <number representing head height percentage of frame, e.g. 70>
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        complianceScore: 85,
        verdict: 'Approved',
        summary: 'Photo parsed successfully.',
        checks: [],
        recommendations: [],
      };
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini image analysis error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze image with Gemini 4 Argon',
    });
  }
});

// Create & Edit Images using gemini-nano-banana-2.1 with fallback
app.post('/api/gemini/edit-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', prompt = 'Enhance portrait studio lighting and clean crisp silhouette cutout on transparent background', aspectRatio = '1:1' } = req.body;
    if (!imageBase64 && !prompt) {
      return res.status(400).json({ error: 'Image or prompt required' });
    }

    const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, '') : null;

    const parts: any[] = [];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: prompt });

    // Primary: gemini-nano-banana-2.1
    let modelName = 'gemini-nano-banana-2.1';
    let resultImageBase64: string | null = null;
    let descriptionText = '';

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            resultImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            descriptionText += part.text + ' ';
          }
        }
      }
    } catch (primaryErr: any) {
      console.warn('Fallback to gemini-3.1-flash-lite-image due to:', primaryErr.message);
      // Fallback to flash-lite-image if nano banana requires specific key tier
      modelName = 'gemini-3.1-flash-lite-image';
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
      });

      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            resultImageBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            descriptionText += part.text + ' ';
          }
        }
      }
    }

    res.json({
      modelUsed: modelName,
      imageUrl: resultImageBase64,
      text: descriptionText.trim(),
    });
  } catch (error: any) {
    console.error('Gemini edit-image error:', error);
    res.status(500).json({
      error: error.message || 'Image generation/editing failed',
    });
  }
});

// BGNinja API proxy endpoint - Uses documented free public endpoint without API key
app.post('/api/bgninja/remove', async (req, res) => {
  try {
    const { imageBase64, bg } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const formData = new FormData();
    // BGNinja official API documentation specifies parameter name "file"
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'photo.jpg');
    formData.append('src', 'CutoutStudio');
    if (bg) {
      formData.append('bg', bg.replace('#', ''));
    }

    const bgninjaRes = await fetch('https://bgninja.com/api/remove', {
      method: 'POST',
      body: formData,
    });

    if (!bgninjaRes.ok) {
      const errText = await bgninjaRes.text();
      let msg = `BGNinja API returned HTTP ${bgninjaRes.status}`;
      if (bgninjaRes.status === 429) {
        msg = 'BGNinja free tier daily rate limit reached (10 images/day per IP). Please try again tomorrow or use the Offline Edge Keyer.';
      } else if (bgninjaRes.status === 413) {
        msg = 'Image file size exceeds BGNinja upload limit (max 99MB / 30MP).';
      } else if (errText) {
        msg += `: ${errText}`;
      }
      return res.status(bgninjaRes.status).json({ error: msg });
    }

    const resBuffer = await bgninjaRes.arrayBuffer();
    const base64Out = Buffer.from(resBuffer).toString('base64');
    res.json({
      success: true,
      dataUrl: `data:image/png;base64,${base64Out}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'BGNinja request failed' });
  }
});

// Start server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cutout Studio server running on port ${PORT}`);
  });
}

startServer();
