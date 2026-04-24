import { useState, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

function SearchBar({ projectId, onShowResults }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE}/projects/${projectId}/search?query=${encodeURIComponent(query)}`
      );
      const results = await response.json();
      setSearchResults(results);
      onShowResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    onShowResults([]);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="🔍 Search all documents..."
          value={searchQuery}
          onChange={handleSearch}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#23232a',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#646cff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#444';
          }}
        />
        {isSearching && (
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#888',
            fontSize: '12px'
          }}>
            Searching...
          </span>
        )}
        {searchQuery && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
