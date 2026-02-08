import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { BuildIdea, InventoryItem } from '../types';

// Initialize Gemini Client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildIdeaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the build" },
          description: { type: Type.STRING, description: "Short description" },
          difficulty: { type: Type.STRING, description: "Difficulty level" },
          estimatedParts: { type: Type.INTEGER, description: "Total parts count" },
          reasoning: { type: Type.STRING, description: "Why this fits the inventory" },
          theme: { type: Type.STRING, description: "Theme" },
          usedParts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Names of parts from the user's inventory that are ACTUALLY used in this build."
          },
          missingParts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Names of any EXTRA parts required that are NOT in the user's inventory. Keep this empty if possible."
          }
        },
        required: ["title", "description", "difficulty", "estimatedParts", "reasoning", "theme", "usedParts", "missingParts"],
      },
    },
  },
};

export const generateBuildIdeas = async (inventory: InventoryItem[]): Promise<BuildIdea[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided");
    return [
      {
        title: "Demo: Strict Inventory Check",
        description: "API Key missing. Showing demo data.",
        difficulty: "Beginner",
        estimatedParts: 5,
        reasoning: "Demo mode.",
        theme: "System",
        usedParts: ["Brick 2x4", "Plate 1x2"],
        missingParts: []
      }
    ];
  }

  try {
    const inventoryList = inventory.map(item => `- ${item.quantity}x ${item.part.name} (LDraw ID: ${item.part.ldrawId})`).join('\n');

    const prompt = `
      STRICT INVENTORY CHALLENGE.
      
      I have exactly these LEGO parts:
      ${inventoryList}

      YOUR TASK:
      1. Analyze the shapes and connectors of these specific parts.
      2. Suggest 3 build ideas that use PRIMARILY these parts.
      3. Do NOT hallucinate a complex set (like a Starship) if I only have 5 random bricks.
      4. If the parts are random (e.g., a wheel, a plate, and a slope), suggest an "Abstract Sculpture", "Micro-scale Animal", or "Scrap Robot".
      5. BE HONEST. If you need a connector I don't have to make it work, list it in 'missingParts'. 
      6. Try to keep 'missingParts' to 0 if possible. Challenge yourself to use ONLY what is there.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: buildIdeaSchema,
        systemInstruction: "You are a strict LEGO logic engine. You never over-promise. You prioritize builds that use 100% existing inventory. You never invent parts you don't have."
      }
    });

    let jsonText = response.text || "{}";
    // Sanitize if model returns markdown block despite JSON mode (sometimes happens)
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json|```/g, '').trim();
    }

    const data = JSON.parse(jsonText);
    return data.ideas || [];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateLDrawScript = async (ideaTitle: string, inventory: InventoryItem[]): Promise<string> => {
  if (!process.env.API_KEY) return "0 // No API Key provided";

  try {
    const partsList = inventory.map(i => `- ${i.quantity}x ${i.part.name} (ID: ${i.part.ldrawId})`).join('\n');

    const prompt = `
      Create a valid LDraw (.ldr) file content for a model titled "${ideaTitle}".
      
      STRICT INVENTORY:
      ${partsList}

      RULES:
      1. USE ONLY THE PARTS LISTED ABOVE. Do NOT use any other parts.
      2. Do NOT exceed the quantity of each part properly.
      3. If you run out of parts, STOP building or simplify the model.
      4. Do NOT add extra connectors, baseplates, or "filler" bricks. If it can't be built with the inventory, build something smaller.
      5. Use standard LDraw color codes (0=Black, 4=Red, 2=Green, 14=Yellow, 1=Blue, 15=White, 71=Modulex Light Bluish Grey, 72=Dark Bluish Grey) to make it look realistic.
      6. Arrange the parts to form: ${ideaTitle}.
      7. Output ONLY raw LDraw text (lines starting with 1 for parts). No markdown, no comments.
      
      LDraw Line Format: 1 <colour> <x> <y> <z> <a> <b> <c> <d> <e> <f> <g> <h> <i> <file>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        // No schema, raw text
      }
    });

    let script = response.text || "0 // Error generating script";

    if (script.startsWith('```')) {
      script = script.replace(/```ldraw|```/g, '').trim();
    }

    return script;

  } catch (error) {
    console.error("Gemini LDraw Gen Error:", error);
    return "0 // Error generating LDraw data";
  }
};

export const generateBuildImage = async (ideaTitle: string, partsContext: string): Promise<string> => {
  if (!process.env.API_KEY) return "https://picsum.photos/800/600?grayscale";

  try {
    // Prompt engineered to reduce hallucinations by asking for a "loose arrangement" or "minimalist" view
    // rather than a full "MOC" which triggers the model to complete the missing parts.
    const prompt = `
      A macro photography shot of a very simple, small abstract LEGO creation made using ONLY these parts: ${partsContext}.
      The parts are connected simply or stacked.
      White background, studio lighting.
      Do NOT add any extra bricks that are not listed.
      The image should look like a work-in-progress or a simple scrap build.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return "https://picsum.photos/800/600?blur=2";
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return "https://picsum.photos/800/600?error";
  }
};