import React from 'react';

function MarginSidebar({ marginBars }) {
  if (!marginBars || marginBars.length === 0) {
    return <div style={{ width: '25%', borderLeft: '1px solid #eee', minHeight: '100%' }}></div>;
  }

  const maxTrack = Math.max(...marginBars.map(b => b.track));
  
  // ==========================================
  // 🎛️ SPACING & HEIGHT CONTROLS
  // ==========================================
  const lineSpacing = 6; 
  const gapAfterLines = 10;
  const extraHeight = -3; 
  // ==========================================

  const linesBundleWidth = (maxTrack + 1) * lineSpacing;
  const labelGroups = [];
  const sortedBars = [...marginBars].sort((a, b) => a.top - b.top);

  sortedBars.forEach(bar => {
    const group = labelGroups.find(g => Math.abs(g.top - bar.top) < 12);
    if (group) {
      group.bars.push(bar);
    } else {
      labelGroups.push({ top: bar.top, height: bar.height, bars: [bar] });
    }
  });

  return (
    <div style={{ 
      width: '25%', 
      position: 'relative', 
      borderLeft: '1px solid #eee', 
      minHeight: '100%', 
      overflowX: 'auto', 
      overflowY: 'hidden' 
    }}>
      <div style={{ width: 'max-content', minWidth: '100%', minHeight: '100%', position: 'relative', paddingRight: '20px' }}>
        
        {labelGroups.map((group, index) => {
          
          const uniqueBars = [];
          const seenCodes = new Set();
          group.bars.forEach(b => {
            if (!seenCodes.has(b.codeName)) {
              seenCodes.add(b.codeName);
              uniqueBars.push(b);
            }
          });

          uniqueBars.sort((a, b) => a.track - b.track);

          return (
            <React.Fragment key={`group-frag-${index}`}>
              {uniqueBars.map((bar, i) => (
                <div 
                  key={`line-${bar.id}-${i}`}
                  style={{
                    position: 'absolute',
                    top: `${group.top - (extraHeight / 2)}px`, 
                    height: `${group.height + extraHeight}px`, 
                    left: `${i * lineSpacing}px`, 
                    width: '4px',
                    backgroundColor: bar.color,
                    borderRadius: '2px'
                  }} 
                />
              ))}

              <div 
                key={`group-${index}`}
                style={{
                  position: 'absolute',
                  top: `${group.top - (extraHeight / 2)}px`, 
                  height: `${group.height + extraHeight}px`, 
                  left: `${linesBundleWidth + gapAfterLines}px`,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  zIndex: 10
                }}
              >
                {uniqueBars.map((bar, i) => (
                  <div 
                    key={`label-${bar.id}-${i}`}
                    style={{
                      backgroundColor: bar.color,
                      color: '#fff',
                      fontSize: '11px',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center', 
                      padding: '0 8px', 
                      borderRadius: '4px', 
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {bar.codeName}
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}

      </div>
    </div>
  );
}

export default MarginSidebar;