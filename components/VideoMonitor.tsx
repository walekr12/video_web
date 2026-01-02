/// <reference lib="dom" />
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { VideoFile } from '../types.ts';

interface VideoMonitorProps {
  file: VideoFile | null;
  playbackRate: number;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onLoadedMetadata: () => void;
}

export interface VideoMonitorHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  stepFrame: (frames: number) => void;
  getCurrentTime: () => number;
}

const VideoMonitor = forwardRef<VideoMonitorHandle, VideoMonitorProps>(({ 
  file, 
  playbackRate,
  onTimeUpdate, 
  onDurationChange,
  onLoadedMetadata
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    stepFrame: (frames: number) => {
      if (videoRef.current) {
        // Assuming 30fps as default for web if unknown
        const frameTime = 1 / 30; 
        videoRef.current.currentTime = Math.min(
          Math.max(0, videoRef.current.currentTime + (frames * frameTime)),
          videoRef.current.duration
        );
      }
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0
  }));

  useEffect(() => {
    if (file && videoRef.current) {
      videoRef.current.load();
    }
  }, [file]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-neutral-700">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>
          <p className="text-sm font-mono">NO SOURCE SELECTED</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative group">
      <video
        ref={videoRef}
        src={file.url}
        className="max-w-full max-h-full shadow-2xl"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onLoadedMetadata={onLoadedMetadata}
        controls={false} // Custom controls used
      />
    </div>
  );
});

VideoMonitor.displayName = 'VideoMonitor';
export default VideoMonitor;
