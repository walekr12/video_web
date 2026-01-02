/// <reference lib="dom" />
import React, { useRef } from 'react';
import { VideoFile } from '../types.ts';
import { generateId } from '../utils.ts';

interface SidebarProps {
  files: VideoFile[];
  activeFileId: string | null;
  onFileSelect: (file: VideoFile) => void;
  onFilesAdded: (files: VideoFile[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ files, activeFileId, onFileSelect, onFilesAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(Array.from(event.target.files));
    }
    event.target.value = ''; 
  };

  const processFiles = (fileList: File[]) => {
    const validExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
    const newFiles: VideoFile[] = fileList
      .filter(f => validExtensions.some(ext => f.name.toLowerCase().endsWith(`.${ext}`)))
      .map(f => ({
        id: generateId(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        url: URL.createObjectURL(f)
      }));

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
  };

  return (
    <div className="flex flex-col h-full sidebar-glass">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white neon-text-subtle">Video Editor</h1>
            <p className="text-xs text-cyan-400/60">Pro Edition</p>
          </div>
        </div>
        
        <h2 className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          Project Bin
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-3 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white text-xs font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-cyan-900/30 hover:shadow-cyan-500/30 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex-1 px-3 py-2.5 bg-neutral-800/80 hover:bg-neutral-700/80 text-cyan-300 text-xs font-semibold rounded-lg transition-all duration-300 border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Folder
          </button>
        </div>
        <input
          type="file"
          multiple
          accept="video/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          ref={folderInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center border border-cyan-500/20">
              <svg className="w-8 h-8 text-cyan-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <p className="text-cyan-400/50 text-xs">No media imported</p>
            <p className="text-cyan-400/30 text-xs mt-1">Drag files or use buttons above</p>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {files.map((file, index) => (
              <li
                key={file.id}
                onClick={() => onFileSelect(file)}
                className={`p-2.5 cursor-pointer rounded-lg transition-all duration-300 group ${
                  activeFileId === file.id 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/10 border border-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                    : 'bg-neutral-800/30 border border-transparent hover:bg-neutral-800/60 hover:border-cyan-500/20'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeFileId === file.id 
                      ? 'bg-gradient-to-br from-cyan-500 to-purple-600' 
                      : 'bg-neutral-800 group-hover:bg-neutral-700'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className={`text-sm truncate font-medium transition-colors ${
                      activeFileId === file.id ? 'text-white neon-text-subtle' : 'text-neutral-300 group-hover:text-white'
                    }`}>
                      {file.name}
                    </p>
                    <p className="text-xs text-cyan-400/50 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {activeFileId === file.id && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50"></div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-cyan-500/10">
        <div className="flex items-center justify-between text-xs text-cyan-400/40">
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Ready
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
