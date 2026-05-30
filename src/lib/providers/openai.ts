import type { ImageProvider, ProviderGenerateArgs, ProviderResult } from './types';

// Stub — implement when VARIANT_*_PROVIDER=openai
// Steps:
//   1. npm install openai
//   2. import OpenAI from 'openai'
//   3. Use client.images.generate({ model, prompt, response_format: 'b64_json' })
//      and return Buffer.from(data[0].b64_json!, 'base64')
export class OpenAIProvider implements ImageProvider {
  constructor(_apiKey: string) {}

  generate(_args: ProviderGenerateArgs): Promise<ProviderResult> {
    throw new Error('OpenAI provider not yet implemented. See src/lib/providers/openai.ts.');
  }
}
