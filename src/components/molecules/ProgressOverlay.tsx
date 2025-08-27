import React from "react";
import Spinner from "../atoms/Spinner";

interface ProgressOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({
  isVisible,
  message = "Compression en cours...",
  progress,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 mx-4 max-w-sm w-full text-center">
        <Spinner
          size="lg"
          className="mx-auto mb-4 border-blue-600 border-t-transparent"
        />
        <p className="text-slate-700 text-lg font-medium mb-2">{message}</p>

        {progress !== undefined && (
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {progress !== undefined && (
          <p className="text-sm text-slate-500">{progress}% terminé</p>
        )}
      </div>
    </div>
  );
};

export default ProgressOverlay;
