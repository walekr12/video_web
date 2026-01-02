/// <reference lib="dom" />
import React, { useRef, useState } from 'react';
import { VideoFile } from '../types.ts';
import { generateId } from '../utils.ts';

// 导入模式
type ImportMode = 'none' | 'folder' | 'files';

interface SidebarProps {
  files: VideoFile[];
  activeFileId: string | null;
  onFileSelect: (file: VideoFile) => void;
  onFilesAdded: (files: VideoFile[]) => void;
  onClearAll?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ files, activeFileId, onFileSelect, onFilesAdded, onClearAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // 导入模式：none=未导入, folder=文件夹模式, files=单文件模式
  const [importMode, setImportMode] = useState<ImportMode>('none');
  
  // 保存第一个视频的目录句柄（用于files模式）
  const [firstFileDirHandle, setFirstFileDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const validExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];

  // 选择目录导入视频（文件夹模式）
  const handleFolderImport = async () => {
    if (importMode === 'files') {
      alert('当前为视频导入模式，请先点击"全部清除"后再切换模式');
      return;
    }
    
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        
        const newFiles: VideoFile[] = [];
        
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (validExtensions.some(ext => file.name.toLowerCase().endsWith(`.${ext}`))) {
              newFiles.push({
                id: generateId(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
                directoryHandle: dirHandle
              });
            }
          }
        }
        
        if (newFiles.length > 0) {
          setImportMode('folder');
          onFilesAdded(newFiles);
        } else {
          alert('该目录下没有找到视频文件');
        }
      } else {
        folderInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory picker error:', err);
        folderInputRef.current?.click();
      }
    }
  };

  // 导入单个视频文件（视频模式）
  const handleFileImport = async () => {
    if (importMode === 'folder') {
      alert('当前为文件夹导入模式，请先点击"全部清除"后再切换模式');
      return;
    }
    
    try {
      if ('showOpenFilePicker' in window) {
        const fileHandles = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [{
            description: 'Video files',
            accept: { 'video/*': ['.mp4', '.avi', '.mov', '.webm', '.mkv'] }
          }]
        });
        
        const newFiles: VideoFile[] = [];
        let isFirstFile = files.length === 0 && importMode === 'none';
        
        for (const handle of fileHandles) {
          const file = await handle.getFile();
          if (validExtensions.some(ext => file.name.toLowerCase().endsWith(`.${ext}`))) {
            // 尝试获取父目录
            let dirHandle: FileSystemDirectoryHandle | undefined;
            
            if (isFirstFile) {
              // 第一个视频，尝试让用户选择输出目录
              try {
                alert('请选择视频所在的目录（用于导出）');
                dirHandle = await (window as any).showDirectoryPicker();
                setFirstFileDirHandle(dirHandle);
                isFirstFile = false;
              } catch (e) {
                // 用户取消，继续但没有目录句柄
              }
            } else {
              // 后续视频使用第一个视频的目录
              dirHandle = firstFileDirHandle || undefined;
            }
            
            newFiles.push({
              id: generateId(),
              file: file,
              name: file.name,
              size: file.size,
              type: file.type,
              url: URL.createObjectURL(file),
              directoryHandle: dirHandle
            });
          }
        }
        
        if (newFiles.length > 0) {
          setImportMode('files');
          onFilesAdded(newFiles);
        }
      } else {
        // Fallback to traditional file input
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('File picker error:', err);
        fileInputRef.current?.click();
      }
    }
  };

  // 清除所有文件
  const handleClearAll = () => {
    if (files.length === 0) return;
    
    if (confirm('确定要清除所有视频吗？这将允许你切换导入模式。')) {
      // 释放所有 blob URLs
      files.forEach(f => URL.revokeObjectURL(f.url));
      
      // 重置状态
      setImportMode('none');
      setFirstFileDirHandle(null);
      
      // 通知父组件清除
      if (onClearAll) {
        onClearAll();
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(Array.from(event.target.files));
    }
    event.target.value = ''; 
  };

  const processFiles = (fileList: File[]) => {
    const newFiles: VideoFile[] = fileList
      .filter(f => validExtensions.some(ext => f.name.toLowerCase().endsWith(`.${ext}`)))
      .map(f => ({
        id: generateId(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        url: URL.createObjectURL(f),
        directoryHandle: firstFileDirHandle || undefined
      }));

    if (newFiles.length > 0) {
      setImportMode(importMode === 'none' ? 'files' : importMode);
      onFilesAdded(newFiles);
    }
  };

  // 获取模式显示文本
  const getModeText = () => {
    switch (importMode) {
      case 'folder': return '📁 文件夹模式';
      case 'files': return '🎬 视频模式';
      default: return '未选择';
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
        
        {/* 当前模式显示 */}
        {importMode !== 'none' && (
          <div className="mb-3 px-2 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-300 flex items-center justify-between">
            <span>{getModeText()}</span>
            <span className="text-cyan-500/50">{files.length} 个视频</span>
          </div>
        )}
        
        <h2 className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          导入方式
        </h2>
        
        <div className="flex gap-2 mb-2">
          {/* 导入文件夹按钮 */}
          <button
            onClick={handleFolderImport}
            disabled={importMode === 'files'}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
              importMode === 'files' 
                ? 'bg-neutral-800/50 text-neutral-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-lg shadow-cyan-900/30 hover:shadow-cyan-500/30'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            文件夹
          </button>
          
          {/* 导入视频按钮 */}
          <button
            onClick={handleFileImport}
            disabled={importMode === 'folder'}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
              importMode === 'folder' 
                ? 'bg-neutral-800/50 text-neutral-500 cursor-not-allowed' 
                : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            视频
          </button>
        </div>
        
        {/* 全部清除按钮 */}
        {files.length > 0 && (
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-all duration-300 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            全部清除（切换模式）
          </button>
        )}
        
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
            <p className="text-cyan-400/50 text-xs">没有导入视频</p>
            <p className="text-cyan-400/30 text-xs mt-1">选择文件夹或视频导入</p>
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
          <span>{files.length} 个视频</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            就绪
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
