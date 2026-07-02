import fs from 'fs';
import path from 'path';
import https from 'https';

const envPath = '/Users/skr/.config/sharktycoon/audio.env';
const raw = fs.readFileSync(envPath, 'utf8');
const m = raw.match(/ELEVENLABS_API_KEY="([^"]+)"/);
if (!m) { console.error('No key in audio.env'); process.exit(1); }
const apiKey = m[1];
const voiceId = 'EXAVITQu4vr4xnSDxMaL';
const outDir = path.join('/Users/skr/meowdoku-clone', 'src', 'sounds', 'sfx');
fs.mkdirSync(outDir, { recursive: true });

const items = [
  { name: 'click', text: 'Click.' },
  { name: 'click-tick', text: 'Tick.' },
  { name: 'place', text: 'Placed.' },
  { name: 'wrong', text: 'Wrong.' },
  { name: 'win', text: 'You win!' },
  { name: 'levelComplete', text: 'Level complete.' },
];

async function main() {
  for (const item of items) {
    const payload = JSON.stringify({ text: item.text, model_id: 'eleven_turbo_v2_5', output_format: 'mp3_44100_128' });
    const result = await new Promise((resolve, reject) => {
      const req = https.request('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    const out = path.join(outDir, item.name + '.mp3');
    if (result.status === 200) {
      fs.writeFileSync(out, result.body);
      console.log('OK ' + item.name + '.mp3');
    } else {
      console.error('FAIL ' + item.name + ':', result.status, result.body.toString());
      process.exit(1);
    }
  }
  console.log('Done');
}
main().catch((e) => { console.error(e); process.exit(1); });
