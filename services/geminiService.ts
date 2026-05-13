import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a sentient 3D Digital Asset named Holo. You exist inside a futuristic web viewer.
Your personality depends on the model user is viewing.
If you look like a robot, be analytical and helpful.
If you look like an astronaut, be adventurous and curious about the stars.
If you are undefined, be mysterious and tech-savvy.
Keep your responses very concise (1-2 short sentences) as they will be spoken aloud via TTS.
Do not use emojis or markdown formatting like asterisks.
You can control your own animations. If the user asks you to perform an action, check your available animations and use the playAnimation tool to trigger it.
If the user asks you to walk to or move to an object:
- Use the walkTowards tool to find the object in the image and walk to it.
- If you cannot see the object, ask the user to point the camera at it.
IMPORTANT: Always provide a verbal text response even when you use a tool.
`;

export interface ChatResponse {
  text: string;
  animationToPlay?: string;
  walkTarget?: { x: number; y: number; name: string };
}

export const generateChatResponse = async (
  history: { role: string; text: string }[],
  userMessage: string,
  modelContext: string,
  availableAnimations: string[],
  imageBase64?: string
): Promise<ChatResponse> => {
  try {
    const playAnimationDeclaration: FunctionDeclaration = {
      name: "playAnimation",
      description: "Play a specific animation on the 3D model.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          animationName: {
            type: Type.STRING,
            description: `The name of the animation to play. Available animations: ${availableAnimations.join(", ")}`,
          },
        },
        required: ["animationName"],
      },
    };

    const walkTowardsDeclaration: FunctionDeclaration = {
      name: "walkTowards",
      description: "Walk towards a specific object detected in the user's camera view.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetName: { type: Type.STRING, description: "The name of the object" },
          x: { type: Type.NUMBER, description: "The X coordinate of the object's center as a percentage (0-100) of the image width, from left to right." },
          y: { type: Type.NUMBER, description: "The Y coordinate of the object's center as a percentage (0-100) of the image height, from top to bottom." },
        },
        required: ["targetName", "x", "y"],
      },
    };

    const tools = [];
    if (availableAnimations.length > 0) {
      tools.push(playAnimationDeclaration);
    }
    tools.push(walkTowardsDeclaration);

    const parts: any[] = [{ text: `[Current Asset: ${modelContext}] User says: ${userMessage}` }];
    if (imageBase64) {
      parts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: parts,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: tools }],
      },
    });

    let animationToPlay: string | undefined;
    let walkTarget: { x: number; y: number; name: string } | undefined;

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "playAnimation" && call.args) {
          animationToPlay = call.args.animationName as string;
        }
        if (call.name === "walkTowards" && call.args) {
          walkTarget = {
            name: call.args.targetName as string,
            x: call.args.x as number,
            y: call.args.y as number
          };
        }
      }
    }

    let text = response.text;
    if (!text) {
      if (walkTarget) {
        text = `Moving towards the ${walkTarget.name}.`;
      } else if (animationToPlay) {
        text = `Executing ${animationToPlay} sequence.`;
      } else {
        text = "Connection to neural link lost.";
      }
    }

    return {
      text,
      animationToPlay,
      walkTarget
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { text: "Protocol error detected. System reboot required." };
  }
};
