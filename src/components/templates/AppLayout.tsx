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
    <div className={`min-h-screen bg-background flex flex-col ${className}`}>
      <Header />

      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">{children}</main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            error:
              '!text-white !bg-error font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
            success:
              '!text-success !bg-success/10 font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
            info: '!text-primary !bg-primary/10 font-medium text-left text-base tracking-normal flex items-baseline rounded-lg',
          },
        }}
        icons={{
          success: <SuccessFilledIcon size={1} />,
          error: <ErrorFilledIcon size={1} className="[&>path]:!fill-error/20" />,
          info: <InfoFilledIcon size={1} className="[&>path]:!fill-primary" />,
        }}
      />
    </div>
  );
};

export default AppLayout;
