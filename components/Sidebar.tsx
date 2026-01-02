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
    // Reset input
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
        // Zero-copy: Create a blob URL immediately
        url: URL.createObjectURL(f)
      }));

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Project Bin</h2>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition"
          >
            Import File
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded transition"
          >
            Import Folder
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
          // @ts-expect-error webkitdirectory is non-standard but supported
          webkitdirectory=""
          directory=""
          multiple
          ref={folderInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-8 text-center text-neutral-600 text-xs italic">
            No media imported.<br />Drag files or use buttons above.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {files.map((file) => (
              <li
                key={file.id}
                onClick={() => onFileSelect(file)}
                className={`p-3 cursor-pointer hover:bg-neutral-800 transition group ${
                  activeFileId === file.id ? 'bg-neutral-800 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-neutral-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm truncate font-medium ${activeFileId === file.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar;