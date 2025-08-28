import React, { useCallback, useState } from "react";
import Icon from "../atoms/Icon";
import FileUpload from "../molecules/FileUpload";
import { saveDroppedFiles } from "../../utils/tauri";

interface FileData {
  path: string;
  preview: string;
}

interface DropZoneProps {
  onFilesDropped: (fileData: FileData[]) => void;
  acceptedTypes?: string[];
  className?: string;
}

const DropZone: React.FC<DropZoneProps> = ({
  onFilesDropped,
  acceptedTypes = ["image/png", "image/jpeg", "image/webp"],
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Note: Visual feedback is now handled by HTML5 events only
  // Tauri drag & drop processing is handled globally in App.tsx to avoid duplicates

  // HTML5 drag events for visual feedback
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // The actual file handling will be done by Tauri's drag-drop event
  };

  const filterValidFiles = (files: File[]) => {
    return files.filter((file) => acceptedTypes.includes(file.type));
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const validFiles = filterValidFiles(files);
      if (validFiles.length > 0) {
        try {
          // Créer des previews base64 pour les fichiers
          const filesWithPreviews = await Promise.all(
            validFiles.map(async (file) => {
              const reader = new FileReader();
              return new Promise<{ file: File; preview: string }>((resolve) => {
                reader.onload = (e) => {
                  resolve({
                    file,
                    preview: e.target?.result as string,
                  });
                };
                reader.readAsDataURL(file);
              });
            })
          );

          const filePaths = await saveDroppedFiles(validFiles);
          if (filePaths.length > 0) {
            // Associer les previews aux chemins de fichiers
            const fileData = filePaths.map((path, index) => ({
              path,
              preview: filesWithPreviews[index]?.preview || '',
            }));
            onFilesDropped(fileData);
          }
        } catch (error) {
          console.error("❌ Erreur traitement fichiers sélectionnés:", error);
        }
      }
    },
    [acceptedTypes, onFilesDropped]
  );

  const getAcceptedFormats = () => {
    return acceptedTypes
      .map((type) => type.split("/")[1].toUpperCase())
      .join(", ");
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-16 text-center bg-white transition-all duration-300
        ${isDragging 
          ? 'border-blue-500 bg-blue-100 scale-105 shadow-xl' 
          : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-1 hover:shadow-lg'
        }
        ${className}
      `}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Icon name="upload" size={48} className="text-blue-500 mx-auto mb-4" />

      <h3 className="text-xl font-semibold text-slate-800 mb-2">
        {isDragging ? 'Déposez vos images ici' : 'Sélectionnez ou déposez vos images'}
      </h3>

      <p className="text-slate-500 mb-8">
        {isDragging ? 'Relâchez pour ajouter les fichiers' : `${getAcceptedFormats()} supportés`}
      </p>

      <FileUpload
        onFilesSelected={handleFilesSelected}
        accept={acceptedTypes.join(",")}
      />
    </div>
  );
};

export default DropZone;
