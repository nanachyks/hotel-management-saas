import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', color: '#64748b', padding: 40, textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: 'var(--color-primary, #3b82f6)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
