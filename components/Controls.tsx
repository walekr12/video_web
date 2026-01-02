/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { VideoFile, TrimState, PlayerStatus } from '../types.ts';
import { ExportMode } from '../services/ffmpegService.ts';
import { formatTime } from '../utils.ts';

interface ControlsProps {
  activeFile: VideoFile | null;
  currentTime: number;
  duration: number;
  playerStatus: PlayerStatus;
  trimState: TrimState;
  playbackRate: number;
  exportMode: ExportMode;
  durationLocked: boolean;
  exportFps: number;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onStep: (frames: number) => void;
  onTrimChange: (newTrim: TrimState) => void;
  onPlaybackRateChange: (rate: number) => void;
  onExportModeChange: (mode: ExportMode) => void;
  onDurationLockChange: (locked: boolean) => void;
  onSaveDuration: () => void;
  onExportFpsChange: (fps: number) => void;
  onExport: () => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

const Controls: React.FC<ControlsProps> = ({
  activeFile,
  currentTime,
  duration,
  playerStatus,
  trimState,
  playbackRate,
  exportMode,
  durationLocked,
  exportFps,
  onSeek,
  onPlayPause,
  onStep,
  onTrimChange,
  onPlaybackRateChange,
  onExportModeChange,
  onDurationLockChange,
  onSaveDuration,
  onExportFpsChange,
  onExport
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const displayTime = currentTime;

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  // 设置开始时间为当前播放位置，Duration 保持不变
  const setStartToCurrent = () => {
    onTrimChange({
      startTime: currentTime,
      duration: trimState.duration  // Duration 永不改变
    });
  };
  
  const handleFpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      onExportFpsChange(val);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onTrimChange({ ...trimState, duration: val });
  };
  
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onTrimChange({ ...trimState, startTime: val });
  };

  const startPercent = duration > 0 ? (trimState.startTime / duration) * 100 : 0;
  const widthPercent = duration > 0 ? (trimState.duration / duration) * 100 : 0;

  return (
    <div className="h-full glass-panel border-t border-cyan-500/20 flex flex-col p-3 select-none overflow-hidden">
      
      {/* Timeline Controls - 顶部：播放控制和进度条 */}
      <div className="mb-2 pb-2 border-b border-cyan-500/10">
        {/* Timeline Slider */}
        <div className="relative w-full h-10 flex items-center group mb-2">
            <div className="absolute top-0 right-0 text-xs font-mono text-cyan-400 neon-text-subtle">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Track Background */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-neutral-800/80 rounded-full overflow-hidden border border-cyan-500/20">
                {/* Trim Range Highlight */}
                <div 
                    className="absolute h-full bg-gradient-to-r from-cyan-500/40 to-purple-500/40 border-l-2 border-r-2 border-cyan-400/60"
                    style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                />
            </div>
            
            {/* Native Slider for Scrubbing */}
            <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.01"
                value={displayTime}
                onChange={handleTimelineChange}
                disabled={!activeFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            {/* Visual Playhead */}
            <div 
                className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 rounded shadow-lg shadow-cyan-500/50 pointer-events-none z-10 transition-all duration-75"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"></div>
            </div>
        </div>

        {/* Playback Controls */}
        <div className="flex justify-center gap-3">
            <button onClick={() => onStep(-1)} disabled={!activeFile} className="cyber-playback-btn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11 19L2 12l9-7v14zM22 19l-9-7 9-7v14z" /></svg>
            </button>
            <button onClick={onPlayPause} disabled={!activeFile} className="cyber-play-btn">
               {playerStatus === PlayerStatus.PLAYING ? (
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
               ) : (
                   <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
               )}
            </button>
            <button onClick={() => onStep(1)} disabled={!activeFile} className="cyber-playback-btn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 19l9-7-9-7v14zM2 19l9-7-9-7v14z" /></svg>
            </button>
        </div>
      </div>

      {/* Parameters Panel - 底部：功能区 */}
      <div className="flex-1 flex items-center justify-between">
        <div className="flex items-end gap-4">
          {/* Start Time */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Start
            </label>
            <div className="flex gap-1">
               <input
                type="number"
                step="0.1"
                min="0"
                max={duration}
                value={trimState.startTime.toFixed(2)}
                onChange={handleStartChange}
                disabled={!activeFile}
                className="cyber-input w-20 text-sm"
              />
               <button 
                onClick={setStartToCurrent}
                disabled={!activeFile}
                className="cyber-btn-small"
                title="Set Start to Current Playhead"
               >
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                 </svg>
               </button>
            </div>
          </div>

          {/* Duration with Lock */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              Duration
              {durationLocked && <span className="text-green-400 ml-1 text-xs">🔒</span>}
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={trimState.duration.toFixed(2)}
                onChange={handleDurationChange}
                disabled={!activeFile}
                className="cyber-input w-20 text-sm"
              />
              <button 
                onClick={onSaveDuration}
                disabled={!activeFile}
                className={`cyber-btn-small ${durationLocked ? 'cyber-btn-active' : ''}`}
                title={durationLocked ? "Duration locked - click to update" : "Save duration permanently"}
              >
                {durationLocked ? (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
              </button>
              {durationLocked && (
                <button 
                  onClick={() => onDurationLockChange(false)}
                  className="cyber-btn-small cyber-btn-danger"
                  title="Unlock duration"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* End Time Preview */}
          <div className="flex flex-col gap-0.5">
             <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider">End</label>
             <div className="text-sm font-mono text-cyan-300 py-1 px-2 bg-neutral-800/50 rounded border border-cyan-500/20 neon-text-subtle">
                {formatTime(trimState.startTime + trimState.duration)}
             </div>
          </div>

          {/* Playback Speed */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider">Speed</label>
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              disabled={!activeFile}
              className="cyber-input w-16 text-sm cursor-pointer"
            >
              {PLAYBACK_RATES.map(rate => (
                <option key={rate} value={rate}>{rate}x</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-3">
          {/* Export FPS */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider">FPS</label>
            <input
              type="number"
              step="1"
              min="1"
              max="120"
              value={exportFps}
              onChange={handleFpsChange}
              disabled={!activeFile}
              className="cyber-input w-14 text-sm text-center"
              title="Export frame rate (fps)"
            />
          </div>

          {/* Export Mode Selection */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider">Mode</label>
            <div className="flex gap-1">
              <button
                onClick={() => onExportModeChange('fast')}
                disabled={!activeFile}
                className={`cyber-mode-btn-compact ${exportMode === 'fast' ? 'cyber-mode-btn-fast-active' : ''}`}
                title="Fast: Direct stream copy, instant but may have slight offset at non-keyframes"
              >
                <span>⚡</span>
                <span className="text-xs">Fast</span>
              </button>
              <button
                onClick={() => onExportModeChange('precise')}
                disabled={!activeFile}
                className={`cyber-mode-btn-compact ${exportMode === 'precise' ? 'cyber-mode-btn-precise-active' : ''}`}
                title="Precise: Re-encode for frame-accurate cuts (slower)"
              >
                <span>🎯</span>
                <span className="text-xs">Precise</span>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <button
              onClick={onExport}
              disabled={!activeFile || playerStatus === PlayerStatus.EXPORTING}
              className={`cyber-export-btn ${
                  playerStatus === PlayerStatus.EXPORTING 
                  ? 'cyber-export-btn-processing' 
                  : !activeFile 
                      ? 'cyber-export-btn-disabled'
                      : ''
              }`}
          >
              <span className="relative z-10 flex items-center gap-2">
                {playerStatus === PlayerStatus.EXPORTING ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </>
                )}
              </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;
