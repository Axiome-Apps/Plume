import React from 'react';
import { Toaster } from 'sonner';
import Header from '../organisms/Header';
import { SuccessFilledIcon, ErrorFilledIcon, InfoFilledIcon } from '../icons';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${className}`}>
      <Header />

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">{children}</main>

      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            error:
              '!text-white !bg-red-500 font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
            success:
              '!text-green-800 !bg-green-100 font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
            info: '!text-blue-800 !bg-blue-100 font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
          },
        }}
        icons={{
          success: <SuccessFilledIcon size={1} />,
          error: <ErrorFilledIcon size={1} className="[&>path]:!fill-red-100" />,
          info: <InfoFilledIcon size={1} className="[&>path]:!fill-blue-400" />,
        }}
      />
    </div>
  );
};

export default AppLayout;
