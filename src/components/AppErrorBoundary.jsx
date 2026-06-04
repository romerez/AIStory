import React from 'react';
import { deletePersistenceDatabase } from '../data/persistentStorage';

const recoverableStorageKeys = [
  'aistory-latest-book',
  'aistory-model-settings',
  'aistory-character-library',
  'aistory-model-usage',
  'aistory-story-history',
  'aistory-setup-draft',
  'aistory-ui-mode',
];

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = async () => {
    try {
      recoverableStorageKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch {
      // If browser storage is blocked, a plain reload is still the best recovery.
    }

    await deletePersistenceDatabase();
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-crash-panel">
        <section className="panel">
          <p className="eyebrow">Frontend recovery</p>
          <h1>AIStory hit a saved-state problem</h1>
          <p>
            The app caught the crash before the page went blank. Reload first; if it keeps happening,
            reset the local AIStory browser data and start clean.
          </p>
          <div className="app-crash-actions">
            <button type="button" onClick={this.handleReload}>
              Reload
            </button>
            <button type="button" className="secondary-button" onClick={this.handleReset}>
              Reset local AIStory data
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
