import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import PoemCard from './components/PoemCard';
import MediaPlayer from './components/MediaPlayer';
import Admin from './pages/Admin';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedPoem, setSelectedPoem] = useState(null);
  const [poems, setPoems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State — lifted to top level so navbar can access them
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('All');
  const [activeTag, setActiveTag] = useState('All');
  const [activeGrade, setActiveGrade] = useState('All');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/published')
      .then(res => res.json())
      .then(data => { setPoems(data.poems || []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const languages = useMemo(() => ['All', ...new Set(poems.map(p => p.language).filter(Boolean))], [poems]);
  const grades    = useMemo(() => ['All', ...new Set(poems.map(p => p.education?.grade).filter(Boolean))], [poems]);
  const allTags   = useMemo(() => { const t = poems.flatMap(p => p.tags || []); return ['All', ...new Set(t)]; }, [poems]);

  const filteredPoems = useMemo(() => poems.filter(poem => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || poem.title?.toLowerCase().includes(q)
      || poem.writer?.toLowerCase().includes(q)
      || poem.shortSummary?.toLowerCase().includes(q)
      || poem.tags?.some(t => t.toLowerCase().includes(q));
    return matchesSearch
      && (activeLanguage === 'All' || poem.language === activeLanguage)
      && (activeTag === 'All'      || poem.tags?.includes(activeTag))
      && (activeGrade === 'All'    || poem.education?.grade === activeGrade);
  }), [poems, searchQuery, activeLanguage, activeTag, activeGrade]);

  const clearFilters = () => { setSearchQuery(''); setActiveLanguage('All'); setActiveTag('All'); setActiveGrade('All'); };
  const hasActiveFilters = searchQuery || activeLanguage !== 'All' || activeTag !== 'All' || activeGrade !== 'All';

  // Active chips derived at top-level so navbar can use them
  const activeChips = [
    ...(activeLanguage !== 'All' ? [{ label: activeLanguage, type: 'language', clear: () => setActiveLanguage('All') }] : []),
    ...(activeGrade !== 'All'    ? [{ label: activeGrade,    type: 'grade',    clear: () => setActiveGrade('All') }]    : []),
    ...(activeTag !== 'All'      ? [{ label: activeTag,      type: 'tag',      clear: () => setActiveTag('All') }]      : []),
  ];

  const renderHome = () => (
    <div className="animate-fade-in">
      <div className="container">
        <div className="results-bar">
          <span className="results-count">
            {isLoading ? 'Loading...' : `${filteredPoems.length} poem${filteredPoems.length !== 1 ? 's' : ''}`}
          </span>
          {hasActiveFilters && (
            <button className="clear-filters" onClick={clearFilters}>✕ Clear all</button>
          )}
        </div>

        {isLoading ? (
          <div className="loading-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : filteredPoems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔭</div>
            <h2>No poems found</h2>
            <p>Try adjusting your search or filters</p>
            <button className="btn-primary" onClick={clearFilters}>Show all poems</button>
          </div>
        ) : (
          <div className="poem-grid">
            {filteredPoems.map((poem, index) => (
              <PoemCard
                key={poem.id}
                poem={poem}
                index={index}
                onClick={() => { setSelectedPoem(poem); setCurrentView('detail'); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedPoem) return null;
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
        <button onClick={() => setCurrentView('home')} className="back-btn">← Back</button>
        <div className="poem-detail-card" style={{ borderTop: `6px solid ${selectedPoem.uiColor || 'var(--color-primary)'}` }}>
          <div className="poem-detail-header">
            <div>
              <h1 style={{ color: selectedPoem.uiColor, marginBottom: '0.3rem' }}>{selectedPoem.title}</h1>
              <p className="poem-writer">✍️ {selectedPoem.writer}</p>
            </div>
            <div className="poem-detail-meta">
              <span className="badge">{selectedPoem.language}</span>
              <span className="badge badge-edu">{selectedPoem.education?.grade}</span>
            </div>
          </div>
          {selectedPoem.shortSummary && <p className="poem-summary">"{selectedPoem.shortSummary}"</p>}
          <div className="poem-text">{selectedPoem.text}</div>
          {selectedPoem.tags?.length > 0 && (
            <div className="poem-tags">{selectedPoem.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}</div>
          )}
          <div className="poem-source-info">
            <span>📖 {selectedPoem.education?.bookName} · {selectedPoem.education?.board}</span>
            {selectedPoem.metadata?.poemPdfPath && (
              <a href={`http://localhost:3001${selectedPoem.metadata.poemPdfPath}`} target="_blank" rel="noreferrer" className="source-link">
                📄 View Source PDF
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="container navbar-content">
          {/* Logo + tagline */}
          <div className="logo-block" onClick={() => setCurrentView('home')}>
            <div className="logo">📚 PoemJoy</div>
            <div className="logo-tagline">
              <span className="logo-hindi">कविताओं की दुनिया</span>
              <span className="logo-sub">Hindi & English poems for young learners</span>
            </div>
          </div>

          {/* Sticky search + filter — always visible */}
          {currentView !== 'admin' && (
            <div className="navbar-search-wrapper">
              <div className="smart-search-bar">
                <span className="search-icon">🔍</span>
                <div className="search-inner">
                  {activeChips.map(chip => (
                    <span key={chip.label} className={`search-chip search-chip-${chip.type}`}>
                      {chip.label}
                      <button className="search-chip-remove" onClick={chip.clear}>✕</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={activeChips.length > 0 ? 'Search more...' : 'Search poems...'}
                    className="smart-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className={`filter-toggle ${filterPanelOpen ? 'filter-toggle-active' : ''}`}
                  onClick={() => setFilterPanelOpen(o => !o)}
                >
                  ⚡ {activeChips.length > 0 ? `(${activeChips.length})` : 'Filter'}
                </button>
                {hasActiveFilters && (
                  <button className="search-clear-all" onClick={clearFilters} title="Clear all">✕</button>
                )}
              </div>

              {/* Filter dropdown panel */}
              {filterPanelOpen && (
                <div className="filter-dropdown">
                  <div className="filter-row">
                    <span className="fdrop-label">Language</span>
                    <div className="fdrop-chips">
                      {languages.map(lang => (
                        <button key={lang} className={`fdrop-chip ${activeLanguage === lang ? 'fdrop-chip-active lang' : ''}`}
                          onClick={() => setActiveLanguage(lang)}>{lang}</button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-row">
                    <span className="fdrop-label">Grade</span>
                    <div className="fdrop-chips">
                      {grades.map(g => (
                        <button key={g} className={`fdrop-chip ${activeGrade === g ? 'fdrop-chip-active grade' : ''}`}
                          onClick={() => setActiveGrade(g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-row">
                    <span className="fdrop-label">Topics</span>
                    <div className="fdrop-chips">
                      {allTags.map(tag => (
                        <button key={tag} className={`fdrop-chip ${activeTag === tag ? 'fdrop-chip-active tag' : ''}`}
                          onClick={() => setActiveTag(tag)}>{tag}</button>
                      ))}
                    </div>
                  </div>
                  {/* Done button */}
                  <div className="filter-done-row">
                    <button className="filter-done-btn" onClick={() => setFilterPanelOpen(false)}>
                      ✓ Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin button */}
          <button
            className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
            style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', flexShrink: 0 }}
          >⚙️ Admin</button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'home'   && renderHome()}
        {currentView === 'detail' && renderDetail()}
        {currentView === 'admin'  && <Admin />}
      </main>

      <footer className="footer">
        <div className="container"><p>© 2026 PoemJoy · Made with ❤️ for young readers</p></div>
      </footer>
    </div>
  );
}

export default App;
