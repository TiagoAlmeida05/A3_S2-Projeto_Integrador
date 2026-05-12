function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, warningText }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#242424', padding: '30px', borderRadius: '8px', border: '1px solid #444', width: '400px', color: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
          <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{title || "Confirm Deletion"}</h2>
        </div>

        <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.5', marginBottom: '25px', marginLeft: '2px',textAlign: 'left' }}>
          {warningText || "Are you sure you want to delete this item? This action cannot be undone."}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '10px 16px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#333'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            style={{ padding: '10px 16px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#cc0000'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ff4444'}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;