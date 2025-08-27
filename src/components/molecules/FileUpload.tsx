import React, { useRef } from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = "image/*",
  multiple = true,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    console.log("🖱️ FileUpload: Clic détecté, ouverture dialog");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📂 FileUpload: Fichier(s) sélectionné(s)");
    console.log("📂 FileUpload: Event target:", e.target);
    console.log("📂 FileUpload: Files property:", e.target.files);
    const files = e.target.files ? Array.from(e.target.files) : [];
    console.log("📁 FileUpload: Fichiers trouvés:", files.length, files);
    if (files.length > 0) {
      console.log("✅ FileUpload: Appel onFilesSelected");
      onFilesSelected(files);
    } else {
      console.log("❌ FileUpload: Aucun fichier à traiter");
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={handleClick} size="lg">
        <Icon name="upload" size={20} className="mr-2" />
        Ou cliquez pour parcourir
      </Button>
    </div>
  );
};

export default FileUpload;
