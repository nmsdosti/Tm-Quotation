import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error?.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(readable);
      if (parsed && parsed.error) {
        readable = `Database access error (${parsed.operationType || 'operation'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#071D36] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#071D36] text-white text-sm font-medium rounded-lg hover:bg-[#0E2B4D] transition-colors cursor-pointer"
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
