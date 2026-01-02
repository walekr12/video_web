/// <reference lib="dom" />
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import VideoMonitor, { VideoMonitorHandle } from './components/VideoMonitor.tsx';
import Controls from './components/Controls.tsx';
import { VideoFile, PlayerStatus, TrimState, ExportProgress } from './types.ts';
import { ffmpegService, ExportMode } from './services/ffmpegService.ts';
import { formatTime } from './utils.ts';

const App: React.FC = () => {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [activeFile, setActiveFile] = useState<VideoFile | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(PlayerStatus.IDLE);
  
  // Timestamps
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Trim State
  const [trimState, setTrimState] = useState<TrimState>({ startTime: 0, duration: 10 });
  
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
  }, []); // Run only on unmount of App, but we need granular control on file remove

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
    // Default trim state reset, but wait for metadata to set proper duration defaults if needed
    setTrimState({ startTime: 0, duration: 10 });
  };

  const handleMetadataLoaded = () => {
      // Once metadata loads, if current trim is invalid or default, adjust
      // We keep the logic simple here: just ensure we don't exceed duration
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

      // Download trigger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trimmed_${activeFile.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      window.alert("Export failed. See console for details.");
    } finally {
      setPlayerStatus(PlayerStatus.IDLE);
      setExportProgress(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
      
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
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP: Video Monitor (Resizable Flex) */}
        <div className="flex-1 min-h-0 relative bg-black">
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
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="w-96 p-6 bg-neutral-900 rounded border border-neutral-700 shadow-2xl">
                    <h3 className="text-lg font-bold mb-2 text-white">Exporting Clip...</h3>
                    <p className="text-sm text-neutral-400 mb-4">Encoding video, please wait.</p>
                    <div className="w-full bg-neutral-800 rounded-full h-2.5 mb-2 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(exportProgress.ratio * 100, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-neutral-500">
                        <span>{Math.floor(exportProgress.ratio * 100)}%</span>
                        <span>{formatTime(exportProgress.time)} processed</span>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* BOTTOM: Controls (Fixed Height) */}
        <div className="h-48 flex-shrink-0 z-20">
          <Controls 
            activeFile={activeFile}
            currentTime={currentTime}
            duration={duration}
            playerStatus={playerStatus}
            trimState={trimState}
            playbackRate={playbackRate}
            exportMode={exportMode}
            onSeek={handleSeek}
            onPlayPause={togglePlayPause}
            onStep={handleStep}
            onTrimChange={setTrimState}
            onPlaybackRateChange={setPlaybackRate}
            onExportModeChange={setExportMode}
            onExport={handleExport}
          />
        </div>

      </div>
    </div>
  );
};

export default App;
