// EvA ERP Cloud - AI Cognitive Layer Orchestrator

export interface ExtractedLayout {
  width: number;
  height: number;
  type: 'window' | 'door' | 'facade' | 'partition';
  glassType: string;
  profileType: string;
  divisions: { type: 'horizontal' | 'vertical'; position: number }[];
  confidence: number;
  notes?: string;
}

export class AiOrchestrator {
  private static STORAGE_KEY_API_KEY = 'eva_openrouter_api_key';
  private static STORAGE_KEY_MODEL = 'eva_openrouter_model';

  public static getApiKey(): string | null {
    return localStorage.getItem(this.STORAGE_KEY_API_KEY);
  }

  public static setApiKey(key: string) {
    localStorage.setItem(this.STORAGE_KEY_API_KEY, key);
  }

  public static getModel(): string {
    return localStorage.getItem(this.STORAGE_KEY_MODEL) || 'google/gemini-2.5-flash';
  }

  public static setModel(model: string) {
    localStorage.setItem(this.STORAGE_KEY_MODEL, model);
  }

  /**
   * Orchestrates the extraction of a 2D design frame from a base64 blueprint/photo
   */
  public static async extractLayoutFromImage(base64ImageWithMime: string): Promise<ExtractedLayout> {
    const apiKey = this.getApiKey();
    const model = this.getModel();

    if (!apiKey) {
      // Mock sandbox mode when credentials are not yet configured
      console.warn('AI Orchestrator: OpenRouter API key missing. Running in Sandbox Mock Mode.');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            width: 1800,
            height: 1400,
            type: 'window',
            glassType: '12mm Double-Glazed',
            profileType: 'Alu-Black-Matte',
            divisions: [
              { type: 'vertical', position: 0.33 },
              { type: 'vertical', position: 0.66 },
              { type: 'horizontal', position: 0.4 }
            ],
            confidence: 0.88,
            notes: '[SANDBOX MODE] Simulated extraction of a triple-panel sliding window layout from blueprint.'
          });
        }, 1500);
      });
    }

    // Split mime type and base64 string
    const parts = base64ImageWithMime.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = parts[1];

    const systemPrompt = `You are a specialist architectural estimator. Analyze the uploaded fenestration blueprint, layout drawing, or site photo.
Extract the structural framing configurations for windows, doors, or partitions.
You MUST respond with a single valid JSON object containing exactly these fields:
{
  "width": number (width in mm, default 1500 if not visible),
  "height": number (height in mm, default 1200 if not visible),
  "type": "window" | "door" | "facade" | "partition",
  "glassType": "6mm Clear Tempered" | "8mm Frosted" | "12mm Double-Glazed" | "10mm Clear Tempered" | "12mm Frosted",
  "profileType": "Alu-Black-Matte" | "Alu-Rose-Gold" | "UPVC-White" | "Alu-Silver-Anodized",
  "divisions": Array of division objects: [{ "type": "horizontal" | "vertical", "position": number (normalized float position from 0 to 1 representing relative division lines) }],
  "confidence": number (confidence rating between 0 and 1),
  "notes": string (short design interpretation note)
}
Do NOT wrap the JSON inside markdown code blocks, and output ONLY valid parseable JSON.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'EvA ERP Cloud'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this design drawing and extract the dimensions, profiles, and division lines as instructed.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const rawText = responseData.choices[0]?.message?.content || '{}';
      
      // Clean up potentially wrapped JSON in markdown blocks
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted: ExtractedLayout = JSON.parse(cleanJson);
      
      return {
        width: extracted.width || 1500,
        height: extracted.height || 1200,
        type: extracted.type || 'window',
        glassType: extracted.glassType || '6mm Clear Tempered',
        profileType: extracted.profileType || 'Alu-Black-Matte',
        divisions: Array.isArray(extracted.divisions) ? extracted.divisions : [],
        confidence: extracted.confidence || 0.8,
        notes: extracted.notes || 'Successfully analyzed layout via cloud vision model.'
      };

    } catch (err: any) {
      console.error('AI Layout Extraction error:', err);
      throw new Error(`Cognitive extraction failure: ${err.message}`);
    }
  }
}
