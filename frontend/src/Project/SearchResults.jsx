function SearchResults({ results, onResultClick, onClose }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>
            Search Results ({results.length} found)
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Results List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0'
        }}>
          {results.map((result, idx) => {
            const before = result.context.slice(0, result.highlight_start);
            const highlight = result.context.slice(result.highlight_start, result.highlight_end);
            const after = result.context.slice(result.highlight_end);

            return (
              <button
                key={`${result.document_id}-${result.query_start_char}-${idx}`}
                onClick={() => onResultClick(result)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid #222',
                  padding: '16px 20px',
                  backgroundColor: 'transparent',
                  color: '#ddd',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  ':hover': {
                    backgroundColor: '#222'
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#222';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Document and Position */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#fff'
                  }}>
                    {result.document_filename}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: '#888',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}>
                    pos: {result.query_start_char}
                  </span>
                </div>

                {/* Context */}
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#bbb'
                }}>
                  {before}
                  <span style={{
                    backgroundColor: '#646cff',
                    color: '#fff',
                    borderRadius: '3px',
                    padding: '2px 4px',
                    fontWeight: 'bold'
                  }}>
                    {highlight}
                  </span>
                  {after}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #333',
          backgroundColor: '#111',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          fontSize: '12px',
          color: '#888',
          textAlign: 'center'
        }}>
          Click on any result to jump to it in the document
        </div>
      </div>
    </div>
  );
}

export default SearchResults;
