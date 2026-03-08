import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type TtsOptions = {
    voice?: string;
    lang?: string;
    format?: 'mp3' | 'ogg';
};

/**
 * Returns the audio output directory.
 * Tests can point this to a temp dir via _TTS_AUDIO_DIR_OVERRIDE to avoid
 * writing into public/assets/audio during test runs.
 */
function getAudioDir(): string {
    return process.env._TTS_AUDIO_DIR_OVERRIDE
        ? path.resolve(process.env._TTS_AUDIO_DIR_OVERRIDE)
        : path.resolve(process.cwd(), 'public/assets/audio');
}

function ensureAudioDir(): string {
    const dir = getAudioDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function resolveSoundsGenPath(): string {
    const fromEnv = process.env.SOUNDS_GEN_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

    // Common execution roots:
    // - from web/                => ../soundsGen.py
    // - from repo root           => soundsGen.py
    const candidates = [
        path.resolve(process.cwd(), 'soundsGen.py'),
        path.resolve(process.cwd(), '../soundsGen.py'),
    ];

    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
        throw new Error('[tts-service] soundsGen.py not found. Set SOUNDS_GEN_PATH to absolute path.');
    }
    return found;
}

export function hashTextForAudio(text: string, opts: TtsOptions = {}): string {
    const h = crypto.createHash('sha256');
    h.update(text + JSON.stringify(opts));
    return h.digest('hex');
}

export async function generateAudioForPost(
    text: string,
    slug: string,
    opts: TtsOptions = {}
): Promise<{ path: string; hash: string }> {
    const AUDIO_DIR = ensureAudioDir();

    const hash = hashTextForAudio(text, opts);
    const filename = `${hash}.mp3`;
    const outPath = path.join(AUDIO_DIR, filename);

    // Idempotent cache hit
    if (fs.existsSync(outPath)) {
        return { path: `/assets/audio/${filename}`, hash };
    }

    const provider = (process.env.TTS_PROVIDER || 'mock').toLowerCase();

    // Story 2: local development default
    if (provider === 'mock') {
        const content = `MOCK AUDIO - slug:${slug} - hash:${hash}\n`;
        fs.writeFileSync(outPath, content, 'utf8');
        return { path: `/assets/audio/${filename}`, hash };
    }

    // Story 2 + local testing for Story 3: local-gtts via soundsGen.py
    if (provider === 'local-gtts') {
        const script = resolveSoundsGenPath();
        const pythonBin = process.env.PYTHON_BIN || 'python';
        const lang = opts.lang || 'th';

        try {
            await execFileAsync(pythonBin, [
                script,
                '--text',
                text,
                '--lang',
                lang,
                '--output-dir',
                AUDIO_DIR,
                '--filename',
                hash,
            ]);
        } catch (err) {
            const e = err as { stderr?: string; message?: string };
            throw new Error(`[tts-service] local-gtts failed for ${slug}: ${e.stderr || e.message || 'unknown error'}`);
        }

        if (!fs.existsSync(outPath)) {
            throw new Error(`[tts-service] local-gtts did not produce expected file: ${outPath}`);
        }

        return { path: `/assets/audio/${filename}`, hash };
    }

    // Story 3: production HTTP provider
    if (provider === 'http' || provider === 'example-http') {
        const url = process.env.TTS_API_URL;
        const key = process.env.TTS_API_KEY;
        if (!url || !key) {
            throw new Error('[tts-service] TTS_API_URL and TTS_API_KEY required for http provider');
        }

        const nodeFetch = (globalThis as typeof globalThis & { fetch?: typeof fetch }).fetch;
        if (!nodeFetch) throw new Error('[tts-service] fetch is not available in this runtime');

        const resp = await nodeFetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice: opts.voice,
                lang: opts.lang,
                format: opts.format || 'mp3',
            }),
        });

        if (!resp.ok) {
            const txt = await resp.text().catch(() => String(resp.status));
            throw new Error(`[tts-service] provider error: ${resp.status} ${txt}`);
        }

        const arrayBuffer = await resp.arrayBuffer();
        fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
        return { path: `/assets/audio/${filename}`, hash };
    }

    throw new Error(`[tts-service] Unknown TTS provider: ${provider}`);
}
