import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { toAiError } from '../errors';
import { AiError, CLOUD_TIMEOUT_MS, jsonOrText, type AiModel, type AiProvider } from '../types';

/** The parts of the Gemini client we use (tests inject a fake). */
export interface GeminiClientLike {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    }): Promise<{ text?: string; promptFeedback?: { blockReason?: string } }>;
    list(params?: { config?: Record<string, unknown> }): Promise<AsyncIterable<{ name?: string; displayName?: string; supportedActions?: string[] }>>;
  };
}

export interface GeminiProviderOptions {
  apiKey: string;
  client?: (apiKey: string) => GeminiClientLike;
}

function sdkClient(apiKey: string): GeminiClientLike {
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: CLOUD_TIMEOUT_MS } }) as unknown as GeminiClientLike;
}

/** The default Gemini model: the newest "flash" that is not a preview or experiment (a rule, 04 §6.2). */
export function defaultGeminiModel(models: readonly AiModel[]): string | null {
  const version = (id: string): number => Number(/(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
  const flash = models.map((m) => m.id).filter((id) => id.includes('flash') && !/preview|exp/.test(id));
  flash.sort((a, b) => version(b) - version(a) || a.length - b.length || (a < b ? -1 : 1));
  return flash[0] ?? null;
}

/** Gemini (04 §6.2): JSON response-schema mode; the pipeline validates with zod anyway. */
export function createGeminiProvider(opts: GeminiProviderOptions): AiProvider {
  const client = (opts.client ?? sdkClient)(opts.apiKey);
  return {
    id: 'gemini',
    needsKey: true,
    async listModels(signal) {
      try {
        const out: AiModel[] = [];
        for await (const m of await client.models.list({ config: { abortSignal: signal, pageSize: 100 } })) {
          if (!m.name || !(m.supportedActions ?? []).includes('generateContent')) continue;
          const id = m.name.replace(/^models\//, '');
          out.push({ id, label: m.displayName ?? id });
        }
        return out;
      } catch (err) {
        throw toAiError(err, signal);
      }
    },
    async draft(req, signal) {
      let res: Awaited<ReturnType<GeminiClientLike['models']['generateContent']>>;
      try {
        res = await client.models.generateContent({
          model: req.model,
          contents: req.user,
          config: {
            systemInstruction: req.system,
            responseMimeType: 'application/json',
            responseJsonSchema: z.toJSONSchema(req.schema),
            abortSignal: signal
          }
        });
      } catch (err) {
        throw toAiError(err, signal);
      }
      if (res.promptFeedback?.blockReason) throw new AiError('REFUSED');
      return jsonOrText(res.text ?? '');
    }
  };
}
