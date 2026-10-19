import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Server-side Gemini AI Menu Digitizer Endpoint
  app.post('/api/menu/digitize', async (req, res) => {
    try {
      const { base64Data, mimeType, fileName } = req.body as {
        base64Data?: string;
        mimeType?: string;
        fileName?: string;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      const hasValidKey =
        Boolean(apiKey) &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        apiKey!.trim().length > 10;

      if (!base64Data || !mimeType || !hasValidKey) {
        return res.json({
          usedFallback: true,
          reason: !hasValidKey
            ? 'Using built-in menu OCR parser (no external API key required)'
            : 'No binary payload provided',
          items: null,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const cleanBase64 = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;

      const promptText = `You are an expert Indian & international restaurant menu digitizer.
Extract all dishes and beverages from this menu document (${fileName || 'uploaded menu'}).
For each dish, return:
- name: Clean dish title
- category: Must be one of: "Appetizers", "Tandoor", "Curries", "Biryani", "Breads", "Beverages", "Desserts"
- price: Clean numerical price in INR (₹) as a number (strip ₹, Rs, commas, slashes)
- dietary: Auto-detect "Veg" (paneer, dal, sabzi, mushroom, aloo, veg, cheese, coffee, dessert) vs "Non-Veg" (chicken, murgh, mutton, gosht, fish, prawn, egg, lamb)
- description: Short, appetizing description or key ingredients list.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'Dish or beverage name',
                },
                category: {
                  type: Type.STRING,
                  description:
                    'One of: Appetizers, Tandoor, Curries, Biryani, Breads, Beverages, Desserts',
                },
                price: {
                  type: Type.NUMBER,
                  description: 'Numerical price in INR (₹)',
                },
                dietary: {
                  type: Type.STRING,
                  description: 'Veg or Non-Veg',
                },
                description: {
                  type: Type.STRING,
                  description: 'Description or key ingredients of the dish',
                },
              },
              required: ['name', 'category', 'price', 'dietary', 'description'],
            },
          },
        },
      });

      const rawText = response.text?.trim() || '[]';
      const parsedItems = JSON.parse(rawText);

      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        return res.json({
          usedFallback: false,
          items: parsedItems,
        });
      }

      return res.json({
        usedFallback: true,
        items: null,
      });
    } catch (error) {
      console.error('AI Menu Digitizer fallback triggered:', error);
      return res.json({
        usedFallback: true,
        error: error instanceof Error ? error.message : 'Extraction fallback',
        items: null,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
