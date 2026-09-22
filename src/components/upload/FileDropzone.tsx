import React, { useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  fileName: string;
  questionCount: number;
  isUploading: boolean;
  error: string;
  success: string;
  onFileChange: (file: File) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  fileName,
  questionCount,
  isUploading,
  error,
  success,
  onFileChange,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return 'Faqat .xlsx yoki .xls formatidagi fayllar qabul qilinadi';
    }
    if (file.size > maxSize) {
      return 'Fayl hajmi 10MB dan katta bo\'lmasligi kerak';
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    onFileChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-950/40 hover:border-indigo-500/40 hover:bg-slate-900/60'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="region"
        aria-describedby="file-upload-desc"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          accept=".xlsx,.xls"
          className="hidden"
          aria-hidden="true"
        />

        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
          <Upload size={28} />
        </div>

        <h4 className="text-sm font-semibold text-white mb-1">
          {isDragging ? 'Faylni bu yerga tashlang' : 'Excel faylini tanlang yoki sudrab keling'}
        </h4>

        <p id="file-upload-desc" className="text-slate-400 text-xs max-w-xs mx-auto">
          .xlsx yoki .xls formatidagi fayllar qabul qilinadi (maksimal 10MB)
        </p>
      </div>

      {isUploading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-2.5 rounded-xl flex items-start text-xs font-medium animate-fadeIn">
          <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0 text-rose-400" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-xl flex items-start text-xs font-medium animate-fadeIn">
          <Check size={16} className="mr-2 mt-0.5 shrink-0 text-emerald-400" />
          <p>{success}</p>
        </div>
      )}

      {fileName && (
        <div className="mt-3.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-white text-xs font-semibold truncate max-w-[200px]">{fileName}</p>
              <p className="text-slate-400 text-[11px]">{questionCount} ta savol ajratildi</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Tayyor
          </span>
        </div>
      )}
    </div>
  );
};
