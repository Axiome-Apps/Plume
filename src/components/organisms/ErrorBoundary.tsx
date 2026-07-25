import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '@/domain/i18n/translate';
import Button from '../atoms/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary: catches exceptional render/runtime errors that escape the
 * normal (expected) error flow and shows a recoverable fallback instead of a
 * blank window. Expected errors (a failed compression) are handled inline in the
 * store — they never reach here.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg p-8 text-center">
        <h1 className="text-fg text-lg font-semibold">{translate('crash.title')}</h1>
        <p className="text-fg-3 max-w-md">{translate('crash.message')}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          {translate('crash.reload')}
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
