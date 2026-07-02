const PREFIX = '/meowdoku-clone/src/sounds/sfx/';
const files: Record<string, string> = {
  click: `${PREFIX}click.mp3`,
  back: `${PREFIX}back.mp3`,
  toggle: `${PREFIX}toggle.mp3`,
  flip: `${PREFIX}flip.mp3`,
  place: `${PREFIX}place.mp3`,
  tick: `${PREFIX}click-tick.mp3`,
  clear: `${PREFIX}clear.mp3`,
  wrong: `${PREFIX}wrong.mp3`,
  lifeLost: `${PREFIX}lifeLost.mp3`,
  win: `${PREFIX}win.mp3`,
  levelComplete: `${PREFIX}levelComplete.mp3`,
  levelUp: `${PREFIX}levelUp.mp3`,
  dailyDone: `${PREFIX}dailyDone.mp3`,
  unlock: `${PREFIX}unlock.mp3`,
  streak: `${PREFIX}streak.mp3`,
  bonus: `${PREFIX}win.mp3`,
  rare: `${PREFIX}levelUp.mp3`,
  shop: `${PREFIX}toggle.mp3`,
};

const TTS_TEXT: Record<string, string> = {
  click: 'Click.',
  back: 'Back.',
  toggle: 'Toggle.',
  flip: 'Pop.',
  place: 'Plink.',
  tick: 'Tick.',
  clear: 'Shhh.',
  wrong: 'Bloop.',
  lifeLost: 'Thud.',
  win: 'Great.',
  levelComplete: 'Level complete.',
  levelUp: 'Level up.',
  dailyDone: 'Daily complete.',
  unlock: 'Unlocked.',
  streak: 'Streak.',
};

const EXPLICIT: Record<string, string> = {};

export function setExplicitCache(map: Record<string, string>) {
  Object.entries(map).forEach(([k, v]) => { EXPLICIT[k] = v; });
}

let apiKey: string | null = null;
let voiceId = 'EXAVITQu4vr4xnSDxMaL';

export function configureElevenLabs(key: string, voice = 'EXAVITQu4vr4xnSDxMaL') {
  apiKey = key;
  voiceId = voice;
}

async function playFromUrl(url: string) {
  const audio = new Audio(url);
  audio.preload = 'none';
  audio.volume = 0.35;
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

async function ttsToUrl(name: string): Promise<void> {
  if (!apiKey) return;
  const text = TTS_TEXT[name] || name;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', output_format: 'mp3_44100_128' }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    await playFromUrl(url);
  } catch {
    // silent fallback to static file below
  }
}

export default {
  play(name: keyof typeof files & string, _fallback?: keyof typeof files & string) {
    const explicit = EXPLICIT[name] || files[name];
    const doPlay = async () => {
      try {
        if (explicit) await playFromUrl(explicit);
        else await ttsToUrl(name);
      } catch {}
    };
    doPlay();
  },
};
