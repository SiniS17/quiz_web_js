import Head from 'next/head';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/js/main.js';
    script.type = 'module';
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Aviation Quiz App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <i className="fas fa-plane"></i>
              <h1 id="quiz-title">Aviation Quiz</h1>
            </div>
            <nav className="header-nav">
              <button id="home-btn" className="nav-btn">
                <i className="fas fa-home"></i>
                <span>Home</span>
              </button>
            </nav>
          </div>
        </header>

        <aside id="left-sidebar" className="left-sidebar" style={{ display: 'none' }}>
          <div id="results-container" className="results-panel"></div>
        </aside>

        <main className="main-content">
          <div id="quiz-list-container" className="quiz-selection">
            <div className="welcome-section">
              <h2>Choose Your Quiz Category</h2>
              <p>Test your knowledge in aviation maintenance, technical systems, and certification standards.</p>
            </div>
            <div id="quiz-grid" className="quiz-grid"></div>
          </div>

          <div id="quiz-container" className="quiz-interface"></div>
        </main>
      </div>

      <div id="loading-overlay" className="loading-overlay">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Preparing Live Test</div>
          <div className="loading-subtitle">Please wait while questions are being loaded...</div>
        </div>
      </div>

      <button id="control-fab" className="fab" aria-label="Toggle Controls">
        <i className="fas fa-sliders-h"></i>
      </button>

      <button id="sidebar-fab" className="fab mobile-only" aria-label="Toggle Review">
        <i className="fas fa-list"></i>
      </button>

      <div id="control-panel" className="floating-panel" role="dialog" aria-modal="true" aria-hidden="true">
        <div className="panel-header">
          <h3>Quiz Controls</h3>
          <button id="close-panel" className="close-btn" aria-label="Close Panel">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="panel-content">
          <div className="control-group control-group-inline">
            <label><i className="fas fa-compress-arrows-alt"></i> Range select</label>
            <input type="checkbox" id="range-select-checkbox" />
          </div>
          <div id="range-inputs" className="control-group range-inputs-row" style={{display: 'none'}}>
            <div className="range-pair">
              <span>From</span>
              <input type="number" id="range-from" min="1" defaultValue="1" placeholder="1" />
              <span>To</span>
              <input type="number" id="range-to" min="1" defaultValue="20" placeholder="end" />
            </div>
          </div>
          <div className="control-group">
            <div className="count-label-row">
              <label id="question-count-label"><i className="fas fa-hashtag"></i> Amount:</label>
              <button id="all-count-btn" className="all-btn" title="Use all available questions">All</button>
            </div>
            <div className="count-input-row">
              <input type="text" id="question-count" min="1" defaultValue="20" placeholder="20" />
              <button id="apply-count-btn" className="apply-btn" title="Apply question count / range">
                <i className="fas fa-check"></i> Apply
              </button>
            </div>
          </div>
          <div className="control-group control-group-inline">
            <label><i className="fas fa-random"></i> Shuffle</label>
            <input type="checkbox" id="shuffle-checkbox" defaultChecked />
          </div>
          <div className="control-group control-group-inline">
            <label><i className="fas fa-bolt"></i> Live Test</label>
            <input type="checkbox" id="live-test-checkbox" />
          </div>
          <div className="control-group">
            <label><i className="fas fa-layer-group"></i> Levels:</label>
            <div id="level-checkboxes" className="level-filters-inline"></div>
          </div>
          <div className="control-group">
            <p id="max-questions-info" className="quiz-info"></p>
          </div>
        </div>
      </div>

      <div id="panel-overlay" className="panel-overlay"></div>
    </>
  );
}
