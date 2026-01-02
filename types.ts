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

// 导出任务状态
export type ExportTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 导出任务
export interface ExportTask {
  id: string;
  fileName: string;           // 导出文件名
  sourceFileName: string;     // 源视频文件名
  startTime: number;
  duration: number;
  status: ExportTaskStatus;
  progress: number;           // 0-100
  error?: string;
  directoryHandle?: FileSystemDirectoryHandle;
  file: File;                 // 源视频文件
  exportMode: 'fast' | 'precise';
  fps: number;
}
