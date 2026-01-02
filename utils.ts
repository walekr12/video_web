export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const hStr = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  return `${hStr}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};