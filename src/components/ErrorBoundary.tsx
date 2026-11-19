import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.error;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, errorMessage: message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-surface rounded-2xl p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">Session Interrupted</h1>
              <p className="text-sm text-slate-400 leading-relaxed">{this.state.errorMessage}</p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
