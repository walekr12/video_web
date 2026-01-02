export interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url: string; // The blob URL
  duration?: number;
  directoryHandle?: FileSystemDirectoryHandle; // Directory where the file is located
}

export interface TrimState {
  startTime: number;
  duration: number; // Duration of the clip to keep
}

export enum PlayerStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  EXPORTING = 'EXPORTING',
}

export interface ExportProgress {
  ratio: number; // 0 to 1
  time: number; // Seconds processed
}
