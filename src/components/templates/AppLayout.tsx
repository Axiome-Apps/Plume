import React from 'react';
import { Toaster } from 'sonner';
import PlumeHeader from '../organisms/PlumeHeader';
import { SuccessFilledIcon, ErrorFilledIcon, InfoFilledIcon } from '../icons';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-bg text-fg ${className}`}>
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-6 sm:py-8">
        <PlumeHeader />
        <main>{children}</main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            error:
              '!bg-surface !text-fg !border !border-error/40 font-medium text-left text-sm rounded-lg',
            success:
              '!bg-surface !text-fg !border !border-success/40 font-medium text-left text-sm rounded-lg',
            info: '!bg-surface !text-fg !border !border-rule font-medium text-left text-sm rounded-lg',
          },
        }}
        icons={{
          success: <SuccessFilledIcon size={1} className="[&>path]:!fill-success" />,
          error: <ErrorFilledIcon size={1} className="[&>path]:!fill-error" />,
          info: <InfoFilledIcon size={1} className="[&>path]:!fill-primary-light" />,
        }}
      />
    </div>
  );
};

export default AppLayout;
