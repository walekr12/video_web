/// <reference lib="dom" />
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import VideoMonitor, { VideoMonitorHandle } from './components/VideoMonitor.tsx';
import Controls from './components/Controls.tsx';
import { VideoFile, PlayerStatus, TrimState, ExportProgress, ExportTask } from './types.ts';
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
  
  // Export FPS (frame rate)
  const [exportFps, setExportFps] = useState(30);
  
  // Export Queue - 非阻塞导出队列
  const [exportQueue, setExportQueue] = useState<ExportTask[]>([]);
  const isProcessingRef = useRef(false);
  const exportQueueRef = useRef<ExportTask[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    exportQueueRef.current = exportQueue;
  }, [exportQueue]);

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

  // 清除所有文件
  const handleClearAll = () => {
    setFiles([]);
    setActiveFile(null);
    setCurrentTime(0);
    setDuration(0);
    setTrimState({ startTime: 0, duration: getSavedDuration() });
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

  // 处理单个导出任务
  const processExportTask = async (task: ExportTask) => {
    try {
      // 更新状态为处理中
      setExportQueue(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'processing' as const } : t
      ));

      const blob = await ffmpegService.trimVideo(
        task.file,
        task.startTime,
        task.duration,
        (progress) => {
          setExportQueue(prev => prev.map(t => 
            t.id === task.id ? { ...t, progress: Math.round(progress.ratio * 100) } : t
          ));
        },
        task.exportMode,
        task.fps
      );

      // Calculate duration for filename (rounded to integer)
      const durationSeconds = Math.round(task.duration);
      
      // Try to save to export folder using File System Access API
      if (task.directoryHandle) {
        try {
          // Get or create "export" subdirectory
          const exportDirHandle = await (task.directoryHandle as any).getDirectoryHandle('export', { create: true });
          
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
          
          // 更新状态为完成
          setExportQueue(prev => prev.map(t => 
            t.id === task.id ? { ...t, status: 'completed' as const, progress: 100, fileName } : t
          ));
          
          // 3秒后自动从队列中移除已完成的任务
          setTimeout(() => {
            setExportQueue(prev => prev.filter(t => t.id !== task.id));
          }, 3000);
        } catch (fsError: any) {
          console.error('File System API error:', fsError);
          // Fallback to download
          fallbackDownload(blob, durationSeconds, task.id);
        }
      } else {
        // No directory handle, use download
        fallbackDownload(blob, durationSeconds, task.id);
      }
    } catch (error: any) {
      console.error("Export failed:", error);
      setExportQueue(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'failed' as const, error: error.message || 'Unknown error' } : t
      ));
    }
  };

  // 全局下载序号计数器
  const downloadSeqRef = useRef(1);
  
  // Fallback download when File System API is not available
  const fallbackDownload = (blob: Blob, durationSeconds: number, taskId: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 使用递增序号
    const seqNum = downloadSeqRef.current++;
    const fileName = `${seqNum}_${durationSeconds}s.mp4`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    setExportQueue(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed' as const, progress: 100, fileName } : t
    ));
    
    // 3秒后自动从队列中移除已完成的任务
    setTimeout(() => {
      setExportQueue(prev => prev.filter(t => t.id !== taskId));
    }, 3000);
  };

  // 处理导出队列
  const processQueue = async () => {
    if (isProcessingRef.current) return;
    
    const pendingTask = exportQueueRef.current.find(t => t.status === 'pending');
    if (!pendingTask) return;
    
    isProcessingRef.current = true;
    await processExportTask(pendingTask);
    isProcessingRef.current = false;
    
    // 检查是否还有待处理的任务
    setTimeout(() => processQueue(), 100);
  };

  // 监听队列变化，自动开始处理
  useEffect(() => {
    const pendingCount = exportQueue.filter(t => t.status === 'pending').length;
    if (pendingCount > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [exportQueue]);

  // 添加导出任务到队列
  const handleExport = async () => {
    if (!activeFile) return;
    
    const durationSeconds = Math.round(trimState.duration);
    const taskId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: ExportTask = {
      id: taskId,
      fileName: `待导出_${durationSeconds}s.mp4`,
      sourceFileName: activeFile.name,
      startTime: trimState.startTime,
      duration: trimState.duration,
      status: 'pending',
      progress: 0,
      directoryHandle: activeFile.directoryHandle,
      file: activeFile.file,
      exportMode: exportMode,
      fps: exportFps
    };
    
    setExportQueue(prev => [...prev, newTask]);
  };

  // 从队列中移除已完成的任务
  const removeFromQueue = (taskId: string) => {
    setExportQueue(prev => prev.filter(t => t.id !== taskId));
  };

  // 清除所有已完成/失败的任务
  const clearCompletedTasks = () => {
    setExportQueue(prev => prev.filter(t => t.status === 'pending' || t.status === 'processing'));
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
          onClearAll={handleClearAll}
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
            exportFps={exportFps}
            durationLocked={durationLocked}
            onSeek={handleSeek}
            onPlayPause={togglePlayPause}
            onStep={handleStep}
            onTrimChange={setTrimState}
            onPlaybackRateChange={setPlaybackRate}
            onExportModeChange={setExportMode}
            onExportFpsChange={setExportFps}
            onDurationLockChange={handleDurationLockChange}
            onSaveDuration={handleSaveDuration}
            onExport={handleExport}
          />
        </div>

      </div>

      {/* RIGHT: Export Queue Panel */}
      {exportQueue.length > 0 && (
        <div className="w-80 flex-shrink-0 z-20 relative">
          <div className="h-full glass-panel border-l border-cyan-500/20 p-4 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
                <h3 className="text-sm font-bold text-cyan-300">导出队列</h3>
                <span className="text-xs text-cyan-500/70 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  {exportQueue.filter(t => t.status === 'pending' || t.status === 'processing').length} 进行中
                </span>
              </div>
              <button 
                onClick={clearCompletedTasks}
                className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
              >
                清除已完成
              </button>
            </div>
            
            {/* Queue List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {exportQueue.map(task => (
                <div 
                  key={task.id} 
                  className={`p-3 rounded-lg border transition-all ${
                    task.status === 'processing' 
                      ? 'bg-cyan-500/10 border-cyan-500/30' 
                      : task.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : task.status === 'failed'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-slate-800/50 border-slate-600/30'
                  }`}
                >
                  {/* Task Info */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {task.sourceFileName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatTime(task.startTime)} → {formatTime(task.startTime + task.duration)}
                      </p>
                    </div>
                    {(task.status === 'completed' || task.status === 'failed') && (
                      <button 
                        onClick={() => removeFromQueue(task.id)}
                        className="ml-2 text-slate-500 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.status === 'completed' 
                          ? 'bg-green-500' 
                          : task.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${
                      task.status === 'processing' ? 'text-cyan-400' :
                      task.status === 'completed' ? 'text-green-400' :
                      task.status === 'failed' ? 'text-red-400' :
                      'text-slate-500'
                    }`}>
                      {task.status === 'pending' && '等待中...'}
                      {task.status === 'processing' && `${task.progress}%`}
                      {task.status === 'completed' && `✓ ${task.fileName}`}
                      {task.status === 'failed' && `✗ ${task.error || '失败'}`}
                    </span>
                    <span className="text-slate-500">
                      {task.exportMode === 'fast' ? '快速' : `精确 ${task.fps}fps`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
