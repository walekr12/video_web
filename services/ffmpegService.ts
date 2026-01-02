import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { ExportProgress } from '../types.ts';

export type ExportMode = 'fast' | 'precise';

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load() {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();
    
    try {
      const baseURL = window.location.origin + '/ffmpeg';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.loaded = true;
      console.log('FFmpeg loaded');
    } catch (error) {
      console.error('Failed to load FFmpeg', error);
      throw new Error('Failed to load video processing engine. Please use a browser that supports SharedArrayBuffer or check network.');
    }
  }

  async trimVideo(
    file: File, 
    startTime: number, 
    duration: number, 
    onProgress: (progress: ExportProgress) => void,
    mode: ExportMode = 'fast',
    fps: number = 30
  ): Promise<Blob> {
    if (!this.loaded || !this.ffmpeg) {
      await this.load();
    }

    const ffmpeg = this.ffmpeg!;
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // Write file to FFmpeg's virtual file system
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    ffmpeg.on('progress', ({ progress, time }) => {
      onProgress({ ratio: progress, time });
    });

    let command: string[];

    if (mode === 'fast') {
      // 快速模式：使用流复制，不重编码，速度极快
      // 缺点：只能在关键帧处精确切割
      command = [
        '-ss', startTime.toString(),
        '-i', inputName,
        '-t', duration.toString(),
        '-c', 'copy',  // 直接复制流，不重编码
        '-avoid_negative_ts', 'make_zero',
        outputName
      ];
    } else {
      // 精确模式：重新编码，帧级精确
      // 缺点：速度较慢
      command = [
        '-ss', startTime.toString(),
        '-i', inputName,
        '-t', duration.toString(),
        '-r', fps.toString(),  // 设置输出帧率
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',  // 质量参数，数值越低质量越高
        '-c:a', 'aac',
        '-b:a', '128k',
        outputName
      ];
    }

    await ffmpeg.exec(command);

    // Read the result
    const data = await ffmpeg.readFile(outputName);
    
    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  }
}

export const ffmpegService = new FFmpegService();
