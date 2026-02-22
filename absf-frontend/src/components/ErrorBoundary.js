import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Only log in production
    if (process.env.NODE_ENV !== 'production') return;

    try {
      // Send to analytics service (e.g., Sentry, LogRocket)
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.toString(),
          fatal: true,
          component_stack: errorInfo.componentStack,
        });
      }
    } catch (err) {
      console.error('Failed to log error to service:', err);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Too many errors - suggest reload
      if (this.state.errorCount >= 3) {
        return (
          <div className="error-boundary">
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h1>Multiple Errors Detected</h1>
              <p className="error-message">
                The application has encountered multiple errors. 
                Please reload the page to continue.
              </p>
              <div className="error-actions">
                <button onClick={this.handleReload} className="primary-btn">
                  🔄 Reload Page
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Show error details
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">💥</div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected happened. 
              Don't worry, your data is safe.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-stack">
                  <h3>Error:</h3>
                  <pre>{this.state.error.toString()}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h3>Component Stack:</h3>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="error-actions">
              <button onClick={this.handleReset} className="primary-btn">
                🔄 Try Again
              </button>
              <button onClick={this.handleReload} className="secondary-btn">
                ↻ Reload Page
              </button>
              <a 
                href="https://github.com/IamTamheedNazir/optimistic-ai-oracle/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="link-btn"
              >
                🐛 Report Issue
              </a>
            </div>

            {/* Help text */}
            <div className="error-help">
              <h3>What can you do?</h3>
              <ul>
                <li>Click "Try Again" to retry the operation</li>
                <li>Click "Reload Page" to refresh the application</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser</li>
                <li>If the problem persists, please report the issue</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
