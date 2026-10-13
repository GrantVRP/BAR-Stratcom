import { shell } from 'electron';

/** 02 §6: the only sites a link may open (and their subdomains). */
export const EXTERNAL_HOSTS = [
  'beyondallreason.info',
  'bar-rts.com',
  'github.com',
  'aistudio.google.com',
  'console.anthropic.com',
  'platform.openai.com',
  'openrouter.ai',
  'ollama.com',
  'lmstudio.ai'
] as const;

/** https only, no credentials in the URL, host on the allow-list. */
export function isAllowedExternalUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return EXTERNAL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** `shell:openExternal` (02 §5): opens an allow-listed https link in the browser; anything else is refused. */
export async function openExternalUrl(url: string): Promise<{ ok: true }> {
  if (!isAllowedExternalUrl(url)) throw new Error('That link is not on the list of sites StratCom may open');
  await shell.openExternal(url);
  return { ok: true };
}
