import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-deenly-cream p-4 text-center">
          <div className="max-w-md w-full p-8 bg-white rounded-[40px] shadow-2xl border border-deenly-gold/20">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-deenly-green mb-4">Algo salió mal</h1>
            <p className="text-deenly-green/60 mb-8">
              Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-deenly-gold text-white rounded-2xl font-bold shadow-lg shadow-deenly-gold/20 hover:bg-deenly-gold/90 transition-all"
            >
              Recargar aplicación
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-red-50 text-red-800 text-xs text-left overflow-auto rounded-xl max-h-40">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
