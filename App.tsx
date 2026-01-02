/// <reference lib="dom" />
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import VideoMonitor, { VideoMonitorHandle } from './components/VideoMonitor.tsx';
import Controls from './components/Controls.tsx';
import { VideoFile, PlayerStatus, TrimState, ExportProgress } from './types.ts';
import { ffmpegService, ExportMode } from './services/ffmpegService.ts';
import { formatTime } from './utils.ts';

// localStorage keys
const STORAGE_KEY_DURATION = 'video_editor_default_duration';
const STORAGE_KEY_DURATION_LOCKED = 'video_editor_duration_locked';

const App: React.FC = () => {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [activeFile, setActiveFile] = useState<VideoFile | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(PlayerStatus.IDLE);
  
  // Timestamps
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Load saved duration from localStorage
  const getSavedDuration = () => {
    const saved = localStorage.getItem(STORAGE_KEY_DURATION);
    return saved ? parseFloat(saved) : 10;
  };
  
  const getSavedDurationLocked = () => {
    return localStorage.getItem(STORAGE_KEY_DURATION_LOCKED) === 'true';
  };
  
  // Trim State
  const [trimState, setTrimState] = useState<TrimState>({ startTime: 0, duration: getSavedDuration() });
  
  // Duration lock state
  const [durationLocked, setDurationLocked] = useState(getSavedDurationLocked());
  
  // Playback Rate
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Export Mode: 'fast' = stream copy (instant), 'precise' = re-encode (slow but frame-accurate)
  const [exportMode, setExportMode] = useState<ExportMode>('fast');
  
  // Export State
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const monitorRef = useRef<VideoMonitorHandle>(null);

  // Auto garbage collection for object URLs
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, []);

  const handleFilesAdded = (newFiles: VideoFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    if (!activeFile && newFiles.length > 0) {
        handleFileSelect(newFiles[0]);
    }
  };

  const handleFileSelect = (file: VideoFile) => {
    setActiveFile(file);
    setPlayerStatus(PlayerStatus.IDLE);
    setCurrentTime(0);
    // If duration is locked, keep the saved duration; otherwise reset to default
    if (durationLocked) {
      setTrimState({ startTime: 0, duration: getSavedDuration() });
    } else {
      setTrimState({ startTime: 0, duration: 10 });
    }
  };

  const handleMetadataLoaded = () => {
    // Once metadata loads, if current trim is invalid or default, adjust
  };

  const togglePlayPause = () => {
    if (!activeFile) return;
    if (playerStatus === PlayerStatus.PLAYING) {
      monitorRef.current?.pause();
      setPlayerStatus(PlayerStatus.PAUSED);
    } else {
      monitorRef.current?.play();
      setPlayerStatus(PlayerStatus.PLAYING);
    }
  };

  const handleSeek = (time: number) => {
    monitorRef.current?.seek(time);
    setCurrentTime(time);
  };

  const handleStep = (frames: number) => {
      monitorRef.current?.stepFrame(frames);
      setPlayerStatus(PlayerStatus.PAUSED);
  };
  
  // Handle duration lock toggle
  const handleDurationLockChange = (locked: boolean) => {
    setDurationLocked(locked);
    localStorage.setItem(STORAGE_KEY_DURATION_LOCKED, locked.toString());
    if (locked) {
      // Save current duration when locking
      localStorage.setItem(STORAGE_KEY_DURATION, trimState.duration.toString());
    }
  };
  
  // Handle saving duration manually
  const handleSaveDuration = () => {
    localStorage.setItem(STORAGE_KEY_DURATION, trimState.duration.toString());
    localStorage.setItem(STORAGE_KEY_DURATION_LOCKED, 'true');
    setDurationLocked(true);
  };

  // Get next sequence number from export directory
  const getNextSequenceNumber = async (exportDirHandle: FileSystemDirectoryHandle): Promise<number> => {
    let maxNum = 0;
    try {
      for await (const entry of (exportDirHandle as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.mp4')) {
          // Parse filename like "1_5s.mp4" -> extract "1"
          const match = entry.name.match(/^(\d+)_\d+s\.mp4$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
    } catch (err) {
      console.log('Error reading export directory:', err);
    }
    return maxNum + 1;
  };

  const handleExport = async () => {
    if (!activeFile) return;
    
    setPlayerStatus(PlayerStatus.EXPORTING);
    setExportProgress({ ratio: 0, time: 0 });

    try {
      const blob = await ffmpegService.trimVideo(
        activeFile.file,
        trimState.startTime,
        trimState.duration,
        (progress) => setExportProgress(progress),
        exportMode
      );

      // Calculate duration for filename (rounded to integer)
      const durationSeconds = Math.round(trimState.duration);
      
      // Try to save to export folder using File System Access API
      if (activeFile.directoryHandle) {
        try {
          // Get or create "export" subdirectory
          const exportDirHandle = await (activeFile.directoryHandle as any).getDirectoryHandle('export', { create: true });
          
          // Get next sequence number
          const seqNum = await getNextSequenceNumber(exportDirHandle);
          
          // Create filename: {序号}_{时长}s.mp4
          const fileName = `${seqNum}_${durationSeconds}s.mp4`;
          
          // Create and write file
          const fileHandle = await exportDirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log(`Exported to: export/${fileName}`);
          window.alert(`导出成功！\n文件: export/${fileName}`);
        } catch (fsError: any) {
          console.error('File System API error:', fsError);
          // Fallback to download
          fallbackDownload(blob, durationSeconds);
        }
      } else {
        // No directory handle, use download
        fallbackDownload(blob, durationSeconds);
      }
    } catch (error) {
      console.error("Export failed:", error);
      window.alert("Export failed. See console for details.");
    } finally {
      setPlayerStatus(PlayerStatus.IDLE);
      setExportProgress(null);
    }
  };

  // Fallback download when File System API is not available
  const fallbackDownload = (blob: Blob, durationSeconds: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use timestamp for fallback sequence
    const timestamp = Date.now();
    a.download = `${timestamp}_${durationSeconds}s.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cyber-bg flex h-screen w-screen text-white font-sans overflow-hidden">
      
      {/* Animated background effects */}
      <div className="cyber-grid"></div>
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>
      <div className="glow-orb glow-orb-3"></div>
      
      {/* LEFT: Sidebar / Resources */}
      <div className="w-72 flex-shrink-0 z-10 relative">
        <Sidebar 
          files={files} 
          activeFileId={activeFile?.id || null} 
          onFileSelect={handleFileSelect}
          onFilesAdded={handleFilesAdded}
        />
      </div>

      {/* CENTER: Work Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* TOP: Video Monitor (Resizable Flex) */}
        <div className="flex-1 min-h-0 relative">
          <VideoMonitor 
            ref={monitorRef}
            file={activeFile}
            playbackRate={playbackRate}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onDurationChange={(d) => setDuration(d)}
            onLoadedMetadata={handleMetadataLoaded}
          />

          {/* Export Overlay */}
          {playerStatus === PlayerStatus.EXPORTING && exportProgress && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-md">
                <div className="glass-panel w-96 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center animate-pulse">
                        <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white neon-text">Exporting...</h3>
                        <p className="text-sm text-cyan-300/70">Processing video frames</p>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-800/50 rounded-full h-3 mb-3 overflow-hidden border border-cyan-500/30">
                        <div 
                            className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 progress-glow" 
                            style={{ width: `${Math.min(exportProgress.ratio * 100, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-cyan-400">
                        <span className="neon-text-subtle">{Math.floor(exportProgress.ratio * 100)}%</span>
                        <span className="neon-text-subtle">{formatTime(exportProgress.time)} processed</span>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* BOTTOM: Controls (Fixed Height) */}
        <div className="h-56 flex-shrink-0 z-20">
          <Controls 
            activeFile={activeFile}
            currentTime={currentTime}
            duration={duration}
            playerStatus={playerStatus}
            trimState={trimState}
            playbackRate={playbackRate}
            exportMode={exportMode}
            durationLocked={durationLocked}
            onSeek={handleSeek}
            onPlayPause={togglePlayPause}
            onStep={handleStep}
            onTrimChange={setTrimState}
            onPlaybackRateChange={setPlaybackRate}
            onExportModeChange={setExportMode}
            onDurationLockChange={handleDurationLockChange}
            onSaveDuration={handleSaveDuration}
            onExport={handleExport}
          />
        </div>

      </div>
    </div>
  );
};

export default App;
