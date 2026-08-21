import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouteError } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallbackActions() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => window.location.assign('/')}
        className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Go to home
      </button>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-gray-800 transition-colors hover:bg-gray-50"
      >
        Refresh page
      </button>
    </div>
  );
}

function ErrorFallbackShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 text-6xl text-red-500">⚠️</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mb-6 text-gray-600">
            Please go back to the home page and try your search again.
          </p>
          <ErrorFallbackActions />
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorFallbackShell />;
    }

    return this.props.children;
  }
}

/** React Router catches route render errors itself — this replaces the live stack dump. */
export function RouteErrorFallback() {
  const error = useRouteError();
  console.error('Route error:', error);
  return <ErrorFallbackShell />;
}
