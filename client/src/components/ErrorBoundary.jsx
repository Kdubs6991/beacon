import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: 18, margin: 0 }}>Something went wrong.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}>
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
