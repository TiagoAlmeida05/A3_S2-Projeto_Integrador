import React from 'react';

function MarginSidebar({ marginBars, projectCodes }) {
  if (!marginBars || marginBars.length === 0) {
    return <div style={{ width: '25%', borderLeft: '1px solid #eee', minHeight: '100%' }}></div>;
  }

  // ==========================================
  // 1. CONFIGURATION CONSTANTS
  // ==========================================
  const STRIPE_WIDTH = 4;
  const STRIPE_GAP = 3;
  const TRACK_WIDTH = STRIPE_WIDTH + STRIPE_GAP;
  const START_X = 6;
  const BOX_HEIGHT = 20; 

  const getHIdx = (codeId) => {
    if (!projectCodes) return 999;
    const idx = projectCodes.findIndex(c => c.id === codeId);
    return idx !== -1 ? idx : 999;
  };

  const baseBars = marginBars.map(b => ({
    ...b,
    bottom: b.top + b.height,
    hIdx: getHIdx(b.code_id)
  }));

  // ==========================================
  // 2. BUILD THE GRID (Identify text lines)
  // ==========================================
  const rowTops = [];
  baseBars.forEach(bar => {
    if (!rowTops.some(t => Math.abs(t - bar.top) < 12)) {
      rowTops.push(bar.top);
    }
  });
  rowTops.sort((a, b) => a - b);

  const barsWithRows = baseBars.map(bar => {
    const occupiedRows = [];
    rowTops.forEach((rTop, idx) => {
      if (rTop >= bar.top - 6 && rTop < bar.bottom - 6) {
        occupiedRows.push(idx);
      }
    });
    if (occupiedRows.length === 0) {
      const closestIdx = rowTops.findIndex(t => Math.abs(t - bar.top) < 12);
      occupiedRows.push(closestIdx !== -1 ? closestIdx : 0);
    }
    return { ...bar, occupiedRows };
  });

  // ==========================================
  // 3. MERGE (Same code, Same starting line)
  // ==========================================
  const mergedBars = [];
  barsWithRows.forEach(bar => {
    const existing = mergedBars.find(m => 
      m.code_id === bar.code_id && m.occupiedRows[0] === bar.occupiedRows[0]
    );
    
    if (existing) {
      existing.top = Math.min(existing.top, bar.top);
      existing.bottom = Math.max(existing.bottom, bar.bottom);
      existing.height = existing.bottom - existing.top;
      existing.occupiedRows = [...new Set([...existing.occupiedRows, ...bar.occupiedRows])].sort((a,b) => a - b);
    } else {
      mergedBars.push({ ...bar });
    }
  });

  // ==========================================
  // 4. PACKING LANES (Zero Gaps Allowed)
  // ==========================================
  const sortedForLines = [...mergedBars].sort((a, b) => {
    const lenDiff = b.occupiedRows.length - a.occupiedRows.length;
    if (lenDiff !== 0) return lenDiff;
    return a.hIdx - b.hIdx;
  });

  const lineTracks = []; 
  sortedForLines.forEach(bar => {
    let placed = false;
    for (let i = 0; i < lineTracks.length; i++) {
      const collision = bar.occupiedRows.some(r => lineTracks[i].includes(r));
      if (!collision) {
        lineTracks[i].push(...bar.occupiedRows);
        bar.lane = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bar.lane = lineTracks.length;
      lineTracks.push([...bar.occupiedRows]);
    }
  });

  // ==========================================
  // 5. LABEL ROW GROUPING
  // ==========================================
  const boxRows = [];
  rowTops.forEach((rTop, idx) => {
    // Only grab bars that START on this specific row
    const barsStartingHere = mergedBars.filter(b => b.occupiedRows[0] === idx);
    if (barsStartingHere.length > 0) {
      boxRows.push({ top: rTop, bars: barsStartingHere });
    }
  });

  for (let i = 1; i < boxRows.length; i++) {
    const prev = boxRows[i - 1];
    const curr = boxRows[i];
    if (curr.top < prev.top + BOX_HEIGHT + 4) {
      curr.top = prev.top + BOX_HEIGHT + 4;
    }
  }

  // ==========================================
  // 6. DYNAMIC HUGGING
  // ==========================================
  boxRows.forEach(row => {
    const intersectingLines = mergedBars.filter(b => 
      b.top < row.top + BOX_HEIGHT && b.bottom > row.top
    );
    
    const maxLane = intersectingLines.length > 0 
      ? Math.max(...intersectingLines.map(b => b.lane)) 
      : -1;
    
    row.startX = START_X + ((maxLane + 1) * TRACK_WIDTH) + 4; 
    
    row.bars.sort((a, b) => a.hIdx - b.hIdx);
  });

  return (
    <div style={{ width: '25%', position: 'relative', borderLeft: '1px solid #eee', minHeight: '100%', overflowX: 'auto', overflowY: 'hidden', backgroundColor: '#fdfdfd' }}>
      <div style={{ width: 'max-content', minWidth: '100%', minHeight: '100%', position: 'relative', paddingRight: '20px' }}>
        
        {/* RENDER COLORED LINES */}
        {sortedForLines.map((bar, i) => (
          <div 
            key={`line-${bar.id}-${i}`}
            style={{
              position: 'absolute',
              top: `${bar.top + 2}px`, 
              height: `${Math.max(bar.height - 4, BOX_HEIGHT - 4)}px`, 
              left: `${START_X + (bar.lane * TRACK_WIDTH)}px`, 
              width: `${STRIPE_WIDTH}px`,
              backgroundColor: bar.color,
              borderRadius: '2px',
              zIndex: 5
            }} 
            title={bar.codeName}
          />
        ))}

        {/* RENDER BOX ROWS */}
        {boxRows.map((row, rowIdx) => (
          <div 
            key={`row-${rowIdx}`}
            style={{
              position: 'absolute',
              top: `${row.top}px`, 
              left: `${row.startX}px`,
              display: 'flex',
              flexDirection: 'row',
              gap: '4px', 
              zIndex: 10
            }}
          >
            {row.bars.map((bar, i) => (
              <div 
                key={`label-${bar.id}-${i}`}
                style={{
                  backgroundColor: bar.color,
                  color: '#fff',
                  fontSize: '11px',
                  padding: '0 8px', 
                  borderRadius: '4px', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  height: `${BOX_HEIGHT}px`,
                  maxWidth: '150px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }}
                title={bar.codeName} 
              >
                {bar.codeName}
              </div>
            ))}
          </div>
        ))}
        
      </div>
    </div>
  );
}

export default MarginSidebar;