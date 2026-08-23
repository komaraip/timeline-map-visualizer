"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chooseRecordingMimeType } from "../media/mime-types";
import type { JourneyFrame, JourneyTrack } from "../model/journey-track";
import { ENDING_SECONDS, videoDimensions, type ExportStatus, type JourneyVideoSettings } from "../model/video-settings";

interface JourneyRecorderOptions {
  track: JourneyTrack;
  settings: JourneyVideoSettings;
  audioSource: string;
  hasJourney: boolean;
  stopPlayback: () => void;
  basemapIsRecordable: () => boolean;
  onFallback: () => void;
  onFrame: (frame: JourneyFrame, overview: boolean) => void;
  drawFrame: (canvas: HTMLCanvasElement, frame: JourneyFrame, overview: boolean, useBasemap: boolean) => void;
}

export function useJourneyRecorder(options: JourneyRecorderOptions) {
  const { track, settings, audioSource, hasJourney, stopPlayback, basemapIsRecordable, onFallback, onFrame, drawFrame } = options;
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recordingStreamRef = useRef<MediaStream | undefined>(undefined);
  const recordingAudioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const recordingContextRef = useRef<AudioContext | undefined>(undefined);
  const outputUrlRef = useRef<string | undefined>(undefined);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputExtension, setOutputExtension] = useState<"mp4" | "webm">("webm");

  const releaseResources = useCallback(() => {
    recorderRef.current = undefined;
    recordingStreamRef.current?.getTracks().forEach((trackItem) => trackItem.stop());
    recordingStreamRef.current = undefined;
    recordingAudioRef.current?.pause();
    recordingAudioRef.current = undefined;
    if (recordingContextRef.current) void recordingContextRef.current.close();
    recordingContextRef.current = undefined;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseResources();
    setStatus("cancelled");
    setMessage("Video creation cancelled.");
    setProgress(0);
  }, [releaseResources]);

  const createVideo = useCallback(async () => {
    if (!hasJourney || status === "recording" || status === "preparing") return;
    cancelledRef.current = false;
    stopPlayback();
    setStatus("preparing"); setProgress(0); setMessage("Preparing local renderer…");
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = undefined; setOutputUrl("");
    const canvas = exportCanvasRef.current;
    if (!canvas || typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      setStatus("error"); setMessage("Video recording is not supported by this browser."); return;
    }
    const dimensions = videoDimensions(settings.aspectRatio, settings.resolution);
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const useBasemap = basemapIsRecordable();
    if (!useBasemap) { onFallback(); setMessage("Using the private minimal map because basemap recording is unavailable."); }
    const captureStream = canvas.captureStream(settings.fps);
    recordingStreamRef.current = captureStream;
    let gainNode: GainNode | undefined;
    if (audioSource) {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextCtor();
        const audio = new Audio(audioSource); audio.loop = true; audio.crossOrigin = "anonymous";
        const mediaSource = audioContext.createMediaElementSource(audio);
        gainNode = audioContext.createGain();
        const destination = audioContext.createMediaStreamDestination();
        mediaSource.connect(gainNode); gainNode.connect(destination);
        destination.stream.getAudioTracks().forEach((trackItem) => captureStream.addTrack(trackItem));
        recordingContextRef.current = audioContext; recordingAudioRef.current = audio;
        await audio.play();
      } catch {
        setMessage("The video will be recorded without audio because this soundtrack could not be decoded.");
      }
    }

    const format = chooseRecordingMimeType((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    setOutputExtension(format.extension);
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(captureStream, {
        ...(format.mimeType ? { mimeType: format.mimeType } : {}),
        videoBitsPerSecond: settings.resolution === "hd" ? 8_000_000 : 4_000_000,
        audioBitsPerSecond: 160_000,
      });
    } catch {
      releaseResources(); setStatus("error"); setMessage("This browser could not start its local video encoder."); return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { releaseResources(); setStatus("error"); setMessage("The local video encoder stopped unexpectedly."); };
    recorder.onstop = () => {
      if (cancelledRef.current) { releaseResources(); return; }
      if (!chunks.length) { releaseResources(); setStatus("error"); setMessage("The browser finished without producing a video file."); return; }
      const blob = new Blob(chunks, { type: format.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url; setOutputUrl(url);
      releaseResources(); setStatus("complete"); setProgress(1);
      setMessage(`${format.extension.toUpperCase()} ready · ${(blob.size / 1_048_576).toFixed(1)} MB`);
    };

    recorder.start(1000);
    setStatus("recording"); setMessage(`Recording ${format.extension.toUpperCase()} locally…`);
    const totalSeconds = settings.durationSec + ENDING_SECONDS;
    const recordingStarted = performance.now();
    const render = (timestamp: number) => {
      if (recorder.state !== "recording") return;
      const elapsed = (timestamp - recordingStarted) / 1000;
      const overview = elapsed > settings.durationSec;
      const frame = track.frameAt(Math.min(1, elapsed / settings.durationSec));
      onFrame(frame, overview);
      const fade = Math.min(1, elapsed / 0.6, Math.max(0, (totalSeconds - elapsed) / 0.7));
      if (gainNode) gainNode.gain.value = settings.volume * fade;
      drawFrame(canvas, frame, overview, useBasemap);
      setProgress(Math.min(1, elapsed / totalSeconds));
      setMessage(`Recording ${format.extension.toUpperCase()} locally · ${Math.max(0, Math.ceil(totalSeconds - elapsed))}s remaining`);
      if (elapsed >= totalSeconds) { setStatus("finalizing"); setMessage("Finalizing the local video…"); recorder.stop(); return; }
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
  }, [audioSource, basemapIsRecordable, drawFrame, hasJourney, onFallback, onFrame, releaseResources, settings, status, stopPlayback, track]);

  const download = useCallback(() => {
    if (!outputUrl) return;
    const anchor = document.createElement("a");
    anchor.href = outputUrl;
    anchor.download = `timeline-journey.${outputExtension}`;
    anchor.click();
  }, [outputExtension, outputUrl]);

  useEffect(() => () => {
    releaseResources();
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, [releaseResources]);

  const formatLabel = typeof MediaRecorder === "undefined"
    ? "Recording unavailable"
    : chooseRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime)).extension.toUpperCase();

  return { exportCanvasRef, status, progress, message, outputUrl, outputExtension, formatLabel, createVideo, cancel, download };
}
