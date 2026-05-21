import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    const dev = import.meta.env.DEV
    const message = dev && error?.message
      ? error.message
      : 'Un problème technique est survenu. Rechargez la page ou réessayez dans un instant.'
    return { hasError: true, message }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info?.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#08111F] text-white px-6 text-center">
          <p className="font-condensed text-gold text-xs uppercase tracking-[3px] mb-3">HM Houti Cars</p>
          <h1 className="font-display text-2xl font-bold mb-2">Une erreur est survenue</h1>
          <p className="text-white/50 text-sm max-w-md mb-6 leading-relaxed">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-gold px-6 py-3 text-sm font-bold uppercase tracking-wide"
          >
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
