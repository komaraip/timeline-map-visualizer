"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import { ENDING_SECONDS } from "../model/video-settings";

interface JourneyPlaybackOptions {
  track: JourneyTrack;
  durationSec: number;
  volume: number;
  audioSource: string;
  onFrame: (frame: JourneyFrame, overview?: boolean) => void;
  onAudioBlocked?: () => void;
}

export function useJourneyPlayback(options: JourneyPlaybackOptions) {
  const { track, durationSec, volume, audioSource, onFrame, onAudioBlocked } = options;
  const animationRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);
  const startProgressRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const tickRef = useRef<(timestamp: number) => void>(() => undefined);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useMemo(() => track.frameAt(progress), [progress, track]);

  const stopPreviewAudio = useCallback(() => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = undefined;
  }, []);

  const startPreviewAudio = useCallback((offsetSeconds: number) => {
    stopPreviewAudio();
    if (!audioSource) return;
    const audio = new Audio(audioSource);
    audio.loop = true;
    audio.volume = volume;
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = offsetSeconds % audio.duration;
    }, { once: true });
    previewAudioRef.current = audio;
    void audio.play().catch(onAudioBlocked);
  }, [audioSource, onAudioBlocked, stopPreviewAudio, volume]);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    setPlaying(false);
    stopPreviewAudio();
  }, [stopPreviewAudio]);

  useEffect(() => {
    tickRef.current = (timestamp: number) => {
      const elapsed = (timestamp - startedAtRef.current) / 1000;
      const timelineElapsed = startProgressRef.current * durationSec + elapsed;
      const nextProgress = Math.min(1, timelineElapsed / durationSec);
      setProgress(nextProgress);
      onFrame(track.frameAt(nextProgress), timelineElapsed >= durationSec);
      if (timelineElapsed >= durationSec + ENDING_SECONDS) {
        setPlaying(false);
        stopPreviewAudio();
        animationRef.current = undefined;
        return;
      }
      animationRef.current = requestAnimationFrame(tickRef.current);
    };
  }, [durationSec, onFrame, stopPreviewAudio, track]);

  const togglePlayback = useCallback(() => {
    if (playing) { stopPlayback(); return; }
    const nextStart = progress >= 1 ? 0 : progress;
    setProgress(nextStart);
    startProgressRef.current = nextStart;
    startedAtRef.current = performance.now();
    startPreviewAudio(nextStart * durationSec);
    setPlaying(true);
    animationRef.current = requestAnimationFrame(tickRef.current);
  }, [durationSec, playing, progress, startPreviewAudio, stopPlayback]);

  const restart = useCallback(() => {
    stopPlayback();
    setProgress(0);
    onFrame(track.frameAt(0));
  }, [onFrame, stopPlayback, track]);

  const seek = useCallback((nextProgress: number) => {
    const wasPlaying = playing;
    stopPlayback();
    setProgress(nextProgress);
    onFrame(track.frameAt(nextProgress), nextProgress >= 1);
    if (wasPlaying && nextProgress < 1) {
      startProgressRef.current = nextProgress;
      startedAtRef.current = performance.now();
      startPreviewAudio(nextProgress * durationSec);
      setPlaying(true);
      animationRef.current = requestAnimationFrame(tickRef.current);
    }
  }, [durationSec, onFrame, playing, startPreviewAudio, stopPlayback, track]);

  useEffect(() => { if (previewAudioRef.current) previewAudioRef.current.volume = volume; }, [volume]);
  useEffect(() => { onFrame(frame, progress >= 1); }, [frame, onFrame, progress]);
  useEffect(() => stopPlayback, [stopPlayback]);

  return { frame, playing, progress, togglePlayback, restart, seek, stopPlayback };
}
