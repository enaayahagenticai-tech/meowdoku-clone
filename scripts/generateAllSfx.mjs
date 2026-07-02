import fs from 'fs';
import path from 'path';
import https from 'https';

const envPath = '/Users/skr/.config/sharktycoon/audio.env';
const raw = fs.readFileSync(envPath, 'utf8');
const m = raw.match(/ELEVENLABS_API_KEY="([^"]+)"/);
if (!m) { console.error('No key in audio.env'); process.exit(1); }
const apiKey = m[1];
const outDir = path.join('/Users/skr/meowdoku-clone', 'src', 'sounds', 'sfx');
fs.mkdirSync(outDir, { recursive: true });

const items = [
  { name: 'click',       text: 'Click.',                 stability: .45, similarity: .65 },
  { name: 'back',        text: 'Back.',                  stability: .40, similarity: .60 },
  { name: 'toggle',      text: 'Toggle.',                stability: .35, similarity: .70 },
  { name: 'flip',        text: 'Pop.',                   stability: .30, similarity: .75 },
  { name: 'place',       text: 'Plink.',                 stability: .25, similarity: .80 },
  { name: 'clear',       text: 'Shhh.',                  stability: .30, similarity: .72 },
  { name: 'wrong',       text: 'Bloop.',                 stability: .45, similarity: .65 },
  { name: 'lifeLost',    text: 'Thud.',                  stability: .50, similarity: .60 },
  { name: 'win',         text: 'Great.',                 stability: .30, similarity: .78 },
  { name: 'levelUp',     text: 'Level up.',              stability: .32, similarity: .76 },
  { name: 'dailyDone',   text: 'Daily complete.',        stability: .35, similarity: .72 },
  { name: 'unlock',      text: 'Unlocked.',              stability: .28, similarity: .80 },
  { name: 'streak',      text: 'Streak.',                stability: .25, similarity: .82 },
];

async function request(payload) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve({ status: r.statusCode || 0, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  let ok = 0;
  for (const item of items) {
    const payload = JSON.stringify({
      text: item.text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: item.stability, similarity_boost: item.similarity },
      output_format: 'mp3_44100_128',
    });
    const { status, body } = await request(payload);
    if (status === 200) {
      fs.writeFileSync(path.join(outDir, item.name + '.mp3'), body);
      console.log('OK', item.name + '.mp3');
      ok++;
    } else {
      console.error('FAIL', item.name, status, body.toString().slice(0, 120));
    }
  }
  console.log('Generated', ok, '/', items.length, 'SFX');
  process.exit(ok === items.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
