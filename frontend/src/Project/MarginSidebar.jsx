import React from 'react';

function MarginSidebar({marginBars}) {
    if(!marginBars) return <div style={{ width: '25%', borderLeft: '1px solid #eee', minHeight: '100%' }}></div>;
    return (
        <div style={{ width: '25%', position: 'relative', borderLeft: '1px solid #eee', minHeight: '100%' }}>
        {marginBars.map(bar => (
            <div
            key={bar.id}
            style={{
                position: 'absolute',
                top: `${bar.top}px`,
                height: `${Math.max(bar.height, 24)}px`, // Minimum height for single words
                left: `${bar.track * 30}px`, // Cascades overlapping bars to the right
                borderLeft: `4px solid ${bar.color}`,
                paddingLeft: '6px',
                display: 'flex',
                alignItems: 'flex-start',
                boxSizing: 'border-box'
            }}
            >
            <div style={{ 
                backgroundColor: bar.color, 
                color: '#fff', 
                fontSize: '11px', 
                padding: '2px 6px', 
                borderRadius: '3px', 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                {bar.codeName}
            </div>
            </div>
        ))}
        </div>
    );
}

export default MarginSidebar;