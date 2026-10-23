import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-surface px-4 text-ink">
        <div className="w-full max-w-sm rounded-2xl bg-panel p-6 text-center shadow-card">
          <h1 className="text-xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink/70">The page hit an unexpected error. Your data is safe. Reload to continue.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-ghost" onClick={() => this.setState({ error: null })}>Try again</button>
            <button className="btn" onClick={() => window.location.assign('/')}>Reload app</button>
          </div>
        </div>
      </div>
    );
  }
}
