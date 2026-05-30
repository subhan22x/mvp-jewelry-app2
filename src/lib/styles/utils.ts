export function renderTemplate(raw: string, ctx: Record<string,string|number|boolean>): string {
  return raw.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k: string) => {
    if (!(k in ctx)) throw new Error(`Missing placeholder ${k}`);
    const v = ctx[k];
    return typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
  });
}

export function colorSchemeString(twoTone: boolean, primary: string, secondary?: string | null) {
  return twoTone ? `two_tone ${primary} + ${secondary}` : `single_tone ${primary}`;
}
