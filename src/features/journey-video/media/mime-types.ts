export const chooseRecordingMimeType = (isSupported: (mimeType: string) => boolean) => {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2", extension: "mp4" as const },
    { mimeType: "video/mp4;codecs=avc1.4D4028,mp4a.40.2", extension: "mp4" as const },
    { mimeType: "video/mp4", extension: "mp4" as const },
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" as const },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" as const },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" as const },
    { mimeType: "video/webm", extension: "webm" as const },
  ];
  return candidates.find((candidate) => isSupported(candidate.mimeType))
    ?? { mimeType: "", extension: "webm" as const };
};
