import { useState, useRef } from "react";

const API_BASE = "http://127.0.0.1:8000";

const SearchBar = ({ projectId, onSearchResults, onResultClick }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);

  // HELPER FUNCTION: Splits the context by the search term and highlights it
  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return text;
    }
    
    // Escape special characters in the query to avoid regex breaking
    const escapedHighlight = highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Create a case-insensitive regex
    const regex = new RegExp(`(${escapedHighlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Check if this part is the highlighted term by comparing case-insensitively
      const isMatch = part.toLowerCase() === highlight.toLowerCase();
      
      return isMatch ? (
        <mark
          key={index}
          style={{
            backgroundColor: "#ffd54f", // Bright amber background
            color: "#1a1a24",          // Dark text for contrast
            padding: "0 2px",
            borderRadius: "3px",
            fontWeight: "600",
          }}
        >
          {part}
        </mark>
      ) : (
        part
      );
    });
  };

  const handleSearch = async (e) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);

    if (searchQuery.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/projects/${projectId}/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowResults(true);
        if (onSearchResults) {
          onSearchResults(data);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setShowResults(false);
    setQuery("");
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div style={{ position: "relative", width: "300px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search documents..."
            value={query}
            onChange={handleSearch}
            onFocus={() => query && setShowResults(true)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#1a1a24",
              color: "#d1d1d1",
              border: "1px solid #333",
              borderRadius: "6px",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
          {query && (
            <button
              onClick={handleClear}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px",
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {isLoading && (
          <div
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid #333",
              borderTop: "2px solid #666",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: "600px",
            backgroundColor: "#1a1a24",
            border: "1px solid #333",
            borderRadius: "6px",
            maxHeight: "450px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          }}
        >
          {results.map((result, idx) => (
            <div
              key={idx}
              onClick={() => handleResultClick(result)}
              style={{
                padding: "14px 16px",
                borderBottom: idx < results.length - 1 ? "1px solid #282836" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s dynamic",
                backgroundColor: "#1a1a24",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#222230")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1a1a24")}
            >
              {/* Header: Filename */}
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px", fontWeight: "500" }}>
                📄 {result.document_filename}
              </div>
              
              {/* Context: Now passing through the highlight function */}
              <div
                style={{
                  fontSize: "14px",
                  color: "#e1e1e1",
                  lineHeight: "1.6",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {highlightText(result.context, query)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && query && results.length === 0 && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#1a1a24",
            border: "1px solid #333",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            padding: "12px",
            fontSize: "13px",
            color: "#888",
            textAlign: "center",
          }}
        >
          No results found
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;