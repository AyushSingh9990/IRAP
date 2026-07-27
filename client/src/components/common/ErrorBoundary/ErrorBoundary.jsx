import { Component } from 'react';
import Button from '../Button/Button.jsx';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className={styles.page}>
        <section className={styles.panel} aria-labelledby="application-error-title">
          <p className="eyebrow">Application error</p>
          <h1 id="application-error-title">Something went wrong</h1>
          <p>
            The page could not be displayed safely. Reload the application to
            try again.
          </p>
          <Button onClick={this.handleReload}>Reload application</Button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
