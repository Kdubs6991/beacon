import { Component } from 'react'
import styles from '../pages/Auth.module.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[beacon] UI error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Beacon</div>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.subtitle}>
            An unexpected error occurred. Try refreshing the page — if the problem keeps happening, contact your admin.
          </p>
          <button
            className={styles.submit}
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/'
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
