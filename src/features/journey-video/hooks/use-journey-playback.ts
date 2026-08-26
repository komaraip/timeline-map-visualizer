import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import {
  IDLE_CAMERA,
  INTRO_SECONDS,
  journeyPresentationAt,
  journeyVideoSeconds,
  type JourneyCameraState,
} from "../model/video-settings";

interface JourneyPlaybackOptions {
  track: JourneyTrack;
  durationSec: number;
  volume: number;
  audioSource: string;
  onFrame: (frame: JourneyFrame, camera: JourneyCameraState) => void;
  onAudioBlocked?: () => void;
}

const UI_FRAME_INTERVAL_MS = 1000 / 30;

export function useJourneyPlayback(options: JourneyPlaybackOptions) {
  const { track, durationSec, volume, audioSource, onFrame, onAudioBlocked } = options;
  const animationRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);
  const startElapsedRef = useRef(0);
  const currentElapsedRef = useRef(0);
  const lastUiFrameRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const tickRef = useRef<(timestamp: number) => void>(() => undefined);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [camera, setCamera] = useState<JourneyCameraState>(IDLE_CAMERA);
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
    if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    setPlaying(false);
    stopPreviewAudio();
  }, [stopPreviewAudio]);

  useEffect(() => {
    tickRef.current = (timestamp: number) => {
      const elapsed = startElapsedRef.current + (timestamp - startedAtRef.current) / 1000;
      const totalSeconds = journeyVideoSeconds(durationSec);
      const boundedElapsed = Math.min(totalSeconds, elapsed);
      const presentation = journeyPresentationAt(boundedElapsed, durationSec);
      const nextFrame = track.frameAt(presentation.routeProgress);
      currentElapsedRef.current = boundedElapsed;
      onFrame(nextFrame, presentation.camera);

      if (timestamp - lastUiFrameRef.current >= UI_FRAME_INTERVAL_MS || boundedElapsed >= totalSeconds) {
        lastUiFrameRef.current = timestamp;
        setProgress(presentation.routeProgress);
        setCamera(presentation.camera);
      }

      if (boundedElapsed >= totalSeconds) {
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
    const totalSeconds = journeyVideoSeconds(durationSec);
    const nextElapsed = currentElapsedRef.current >= totalSeconds ? 0 : currentElapsedRef.current;
    if (nextElapsed === 0) {
      setProgress(0);
      setCamera({ phase: "intro", progress: 0 });
      onFrame(track.frameAt(0), { phase: "intro", progress: 0 });
    }
    startElapsedRef.current = nextElapsed;
    startedAtRef.current = performance.now();
    lastUiFrameRef.current = 0;
    startPreviewAudio(nextElapsed);
    setPlaying(true);
    animationRef.current = requestAnimationFrame(tickRef.current);
  }, [durationSec, onFrame, playing, startPreviewAudio, stopPlayback, track]);

  const restart = useCallback(() => {
    stopPlayback();
    currentElapsedRef.current = 0;
    startElapsedRef.current = 0;
    setProgress(0);
    setCamera(IDLE_CAMERA);
    onFrame(track.frameAt(0), IDLE_CAMERA);
  }, [onFrame, stopPlayback, track]);

  const seek = useCallback((nextProgress: number) => {
    const wasPlaying = playing;
    stopPlayback();
    const boundedProgress = Math.min(1, Math.max(0, nextProgress));
    const nextCamera: JourneyCameraState = boundedProgress <= 0
      ? IDLE_CAMERA
      : { phase: "follow", progress: boundedProgress };
    const nextElapsed = boundedProgress <= 0 ? 0 : INTRO_SECONDS + boundedProgress * durationSec;
    currentElapsedRef.current = nextElapsed;
    startElapsedRef.current = nextElapsed;
    setProgress(boundedProgress);
    setCamera(nextCamera);
    onFrame(track.frameAt(boundedProgress), nextCamera);
    if (wasPlaying && boundedProgress < 1) {
      startedAtRef.current = performance.now();
      lastUiFrameRef.current = 0;
      startPreviewAudio(nextElapsed);
      setPlaying(true);
      animationRef.current = requestAnimationFrame(tickRef.current);
    }
  }, [durationSec, onFrame, playing, startPreviewAudio, stopPlayback, track]);

  useEffect(() => {
    currentElapsedRef.current = 0;
    startElapsedRef.current = 0;
    onFrame(track.frameAt(0), IDLE_CAMERA);
  }, [onFrame, track]);
  useEffect(() => { if (previewAudioRef.current) previewAudioRef.current.volume = volume; }, [volume]);
  useEffect(() => stopPlayback, [stopPlayback]);

  return { frame, camera, playing, progress, togglePlayback, restart, seek, stopPlayback };
}
