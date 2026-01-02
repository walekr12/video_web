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
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onStep: (frames: number) => void;
  onTrimChange: (newTrim: TrimState) => void;
  onPlaybackRateChange: (rate: number) => void;
  onExportModeChange: (mode: ExportMode) => void;
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
  onSeek,
  onPlayPause,
  onStep,
  onTrimChange,
  onPlaybackRateChange,
  onExportModeChange,
  onExport
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Sync seek bar while playing, but not while dragging
  const displayTime = currentTime;

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const setStartToCurrent = () => {
    const newDuration = Math.max(0, (trimState.startTime + trimState.duration) - currentTime);
    onTrimChange({
      startTime: currentTime,
      duration: newDuration > 0 ? newDuration : trimState.duration 
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onTrimChange({ ...trimState, duration: val });
  };
  
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onTrimChange({ ...trimState, startTime: val });
  };

  // Calculate timeline visuals
  const startPercent = duration > 0 ? (trimState.startTime / duration) * 100 : 0;
  const widthPercent = duration > 0 ? (trimState.duration / duration) * 100 : 0;

  return (
    <div className="h-full bg-neutral-900 border-t border-neutral-800 flex flex-col p-4 select-none">
      
      {/* Parameters Panel */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-800">
        <div className="flex items-end gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500 font-mono uppercase">Start Time (s)</label>
            <div className="flex gap-1">
               <input
                type="number"
                step="0.1"
                min="0"
                max={duration}
                value={trimState.startTime.toFixed(2)}
                onChange={handleStartChange}
                disabled={!activeFile}
                className="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1 w-24 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
               <button 
                onClick={setStartToCurrent}
                disabled={!activeFile}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded px-2"
                title="Set Start to Current Playhead"
               >
                 &#8617;
               </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500 font-mono uppercase">Duration (s)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={trimState.duration.toFixed(2)}
              onChange={handleDurationChange}
              disabled={!activeFile}
              className="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1 w-24 text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
             <label className="text-xs text-neutral-500 font-mono uppercase">End Time (Preview)</label>
             <div className="text-sm font-mono text-neutral-400 py-1">
                {formatTime(trimState.startTime + trimState.duration)}
             </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500 font-mono uppercase">Playback Speed</label>
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              disabled={!activeFile}
              className="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1 w-24 text-sm font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {PLAYBACK_RATES.map(rate => (
                <option key={rate} value={rate}>{rate}x</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-4">
          {/* Export Mode Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500 font-mono uppercase">Export Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => onExportModeChange('fast')}
                disabled={!activeFile}
                className={`px-3 py-1 text-xs font-mono rounded border transition ${
                  exportMode === 'fast' 
                    ? 'bg-green-600 border-green-500 text-white' 
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
                title="极速导出：直接复制流，不重编码（可能在非关键帧处略有偏差）"
              >
                ⚡ 极速
              </button>
              <button
                onClick={() => onExportModeChange('precise')}
                disabled={!activeFile}
                className={`px-3 py-1 text-xs font-mono rounded border transition ${
                  exportMode === 'precise' 
                    ? 'bg-orange-600 border-orange-500 text-white' 
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
                title="精确导出：重新编码，帧级精确（速度较慢）"
              >
                🎯 精确
              </button>
            </div>
          </div>

          <div>
            <button
                onClick={onExport}
                disabled={!activeFile || playerStatus === PlayerStatus.EXPORTING}
                className={`flex items-center gap-2 px-6 py-2 rounded font-bold uppercase tracking-wider text-xs transition ${
                    playerStatus === PlayerStatus.EXPORTING 
                    ? 'bg-yellow-600/50 text-yellow-200 cursor-wait' 
                    : !activeFile 
                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                }`}
            >
                {playerStatus === PlayerStatus.EXPORTING ? 'Processing...' : 'Export Clip'}
                {!playerStatus && activeFile && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                )}
            </button>
        </div>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="flex-1 flex flex-col justify-end gap-2">
        {/* Playback Controls */}
        <div className="flex justify-center gap-4 mb-2">
            <button onClick={() => onStep(-1)} disabled={!activeFile} className="text-neutral-400 hover:text-white disabled:opacity-30">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11 19L2 12l9-7v14zM22 19l-9-7 9-7v14z" /></svg>
            </button>
            <button onClick={onPlayPause} disabled={!activeFile} className="text-white bg-neutral-700 hover:bg-neutral-600 w-10 h-10 rounded-full flex items-center justify-center transition shadow disabled:opacity-30">
               {playerStatus === PlayerStatus.PLAYING ? (
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
               ) : (
                   <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
               )}
            </button>
            <button onClick={() => onStep(1)} disabled={!activeFile} className="text-neutral-400 hover:text-white disabled:opacity-30">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 19l9-7-9-7v14zM2 19l9-7-9-7v14z" /></svg>
            </button>
        </div>

        {/* Timeline Slider */}
        <div className="relative w-full h-10 flex items-center group">
            <div className="absolute top-0 right-0 text-xs font-mono text-neutral-500">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Track Background */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-neutral-800 rounded-full overflow-hidden">
                {/* Trim Range Highlight */}
                <div 
                    className="absolute h-full bg-blue-900/40 border-l border-r border-blue-500/50"
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
                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded shadow pointer-events-none z-10 transition-all duration-75"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
        </div>
      </div>
    </div>
  );
};

export default Controls;
