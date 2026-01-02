import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcDir = path.resolve(__dirname, 'node_modules/@ffmpeg/core/dist/esm');
const destDir = path.resolve(__dirname, 'public/ffmpeg');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

files.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    
    try {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to ${dest}`);
    } catch (err) {
        console.error(`Error copying ${file}:`, err);
    }
});
