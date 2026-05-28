function CollisionModal({ dialog, resolve }) {
  if (!dialog.isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#242424', padding: '30px', borderRadius: '8px',
        border: '1px solid #444', width: '400px', color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, color: '#ffcc00' }}>File Already Exists</h3>
        <p>The file <strong>"{dialog.filename}"</strong> already exists in this project.</p>
        
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '5px' }}>
            Rename it (Extension added automatically):
          </label>
          <input 
            type="text" 
            defaultValue={dialog.suggestedName}
            id="rename-input"
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button 
            onClick={() => resolve({ action: 'skip' })}
            style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            Skip File
          </button>
          
          <button 
            onClick={() => resolve({ action: 'replace' })}
            style={{ flex: 1, padding: '10px', backgroundColor: '#8b0000', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
          >
            Replace Old
          </button>
          
          <button 
            onClick={() => {
              const newName = document.getElementById('rename-input').value;
              resolve({ action: 'rename', value: newName });
            }}
            style={{ flex: 1.5, padding: '10px', backgroundColor: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollisionModal;