import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sampleRate = 22_050;
const durationSeconds = 16;
const sampleCount = sampleRate * durationSeconds;
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../public/audio");
const tau = Math.PI * 2;
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const softClip = (value) => Math.tanh(value * 1.35) * 0.78;
const pulse = (phase, width = 0.5) => (phase % 1 < width ? 1 : -1);
const envelope = (phase, attack = 0.03, release = 0.22) => Math.min(1, phase / attack, (1 - phase) / release);
const seededNoise = (index) => {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

const composers = {
  "ambient-drift": (time, index) => {
    const chords = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
    const chord = chords[Math.floor(time / 4) % chords.length];
    const local = (time % 4) / 4;
    const swell = 0.52 + 0.35 * Math.sin(Math.PI * local);
    const pad = chord.reduce((sum, note, voice) => sum + Math.sin(tau * midi(note) * time + voice * 0.7) * (0.15 - voice * 0.015), 0);
    const shimmer = Math.sin(tau * midi(chord[2] + 12) * time + Math.sin(time * 0.37)) * 0.06;
    const air = seededNoise(index) * 0.012 * (0.5 + 0.5 * Math.sin(time * 0.19));
    return (pad * swell + shimmer + air) * 0.72;
  },
  "bright-miles": (time, index) => {
    const notes = [60, 64, 67, 72, 57, 60, 64, 69, 65, 69, 72, 77, 55, 59, 62, 67];
    const stepDuration = 0.25;
    const step = Math.floor(time / stepDuration) % notes.length;
    const phase = (time % stepDuration) / stepDuration;
    const arp = Math.sin(tau * midi(notes[step]) * time) * envelope(phase, 0.06, 0.55) * 0.34;
    const bassNotes = [36, 33, 41, 31];
    const bass = Math.sin(tau * midi(bassNotes[Math.floor(time / 4) % 4]) * time) * 0.2;
    const beatPhase = (time % 0.5) / 0.5;
    const kick = Math.sin(tau * (72 - beatPhase * 35) * time) * Math.exp(-beatPhase * 11) * 0.42;
    const hatPhase = (time % 0.25) / 0.25;
    const hat = seededNoise(index) * Math.exp(-hatPhase * 22) * 0.06;
    return arp + bass + kick + hat;
  },
  "cinematic-rise": (time, index) => {
    const chords = [[36, 43, 48, 52], [41, 48, 53, 57], [33, 40, 45, 48], [43, 50, 55, 59]];
    const chordIndex = Math.floor(time / 4) % 4;
    const chord = chords[chordIndex];
    const local = (time % 4) / 4;
    const strings = chord.reduce((sum, note, voice) => {
      const detune = voice % 2 ? 1.004 : 0.997;
      return sum + Math.sin(tau * midi(note) * detune * time + voice) * (0.13 + local * 0.035);
    }, 0);
    const octave = Math.sin(tau * midi(chord[2] + 12) * time) * local * 0.11;
    const lowPulse = pulse(time * 2, 0.22) * Math.sin(tau * midi(chord[0] - 12) * time) * Math.exp(-((time % 0.5) / 0.5) * 4) * 0.2;
    const texture = seededNoise(index) * 0.016 * local;
    return strings + octave + lowPulse + texture;
  },
};

const wavBuffer = (compose) => {
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const edgeFade = Math.min(1, time / 0.04, (durationSeconds - time) / 0.04);
    const value = softClip(compose(time, index)) * edgeFade;
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2);
  }
  return buffer;
};

mkdirSync(outputDirectory, { recursive: true });
for (const [name, compose] of Object.entries(composers)) {
  writeFileSync(resolve(outputDirectory, `${name}.wav`), wavBuffer(compose));
}

