import React, { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const isConfigError = this.state.error?.message.includes('Attempt to get default algod configuration')

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="card bg-slate-800 border border-error-500 border-opacity-50 shadow-2xl">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-error-500 bg-opacity-10">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h1 className="text-2xl font-bold text-error-500">Error Occurred</h1>
                </div>

                <p className="text-slate-300 mb-4 leading-relaxed">
                  {isConfigError
                    ? '🔧 Environment Configuration Error: Please make sure to set up your environment variables correctly. Create a .env file in the Vaulttracker-frontend folder based on the .env.example template and fill in the required values for Algod and Indexer connections.'
                    : this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
                </p>

                {isConfigError && (
                  <div className="bg-slate-700 rounded-lg p-3 mb-4 text-sm text-slate-300 font-mono">
                    <p className="mb-2 font-semibold text-slate-100">Required Environment Variables:</p>
                    <ul className="space-y-1 text-xs">
                      <li>✓ VITE_ALGOD_SERVER</li>
                      <li>✓ VITE_ALGOD_PORT</li>
                      <li>✓ VITE_ALGOD_TOKEN</li>
                      <li>✓ VITE_INDEXER_SERVER</li>
                      <li>✓ VITE_INDEXER_PORT</li>
                      <li>✓ VITE_INDEXER_TOKEN</li>
                    </ul>
                  </div>
                )}

                <div className="card-actions justify-between mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary btn-sm"
                    aria-label="Refresh page"
                  >
                    🔄 Refresh Page
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="btn btn-ghost btn-sm"
                    aria-label="Go to home"
                  >
                    🏠 Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
