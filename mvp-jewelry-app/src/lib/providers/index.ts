import { GoogleProvider } from './google';
import { OpenAIProvider } from './openai';
import type { ImageProvider } from './types';

const GREAT_MODEL_ID = 'gemini-3-pro-image-preview';
const FAST_MODEL_ID = 'gemini-3.1-flash-image-preview';

const providerCache = new Map<string, ImageProvider>();

function getProvider(name: string): ImageProvider {
  if (providerCache.has(name)) return providerCache.get(name)!;

  let provider: ImageProvider;
  switch (name) {
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY is required when VARIANT_*_PROVIDER=openai');
      provider = new OpenAIProvider(key);
      break;
    }
    case 'google':
    default: {
      const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.IMAGE_API_KEY;
      if (!key) throw new Error('Missing Google API key. Set GOOGLE_API_KEY or GEMINI_API_KEY.');
      provider = new GoogleProvider(key);
      break;
    }
  }

  providerCache.set(name, provider);
  return provider;
}

export function resolveGenerationConfig(variant: number): { provider: ImageProvider; modelId: string; imageSize: '1K' | '2K'; aspectRatio?: '9:16' } {
  return {
    provider: getProvider('google'),
    modelId: variant === 1 ? GREAT_MODEL_ID : FAST_MODEL_ID,
    imageSize: variant === 1 ? '2K' : '1K',
    aspectRatio: variant === 1 ? '9:16' : undefined
  };
}
