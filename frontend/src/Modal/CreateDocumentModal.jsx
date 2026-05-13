import { useState } from "react";

function CreateDocumentModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim() || !content.trim()) {
      setError("Both title and content are required.");
      return;
    }

    setIsSubmitting(true);
    try {
        await onCreate({ name, content });
        setName("");
        setContent("");
        onClose();
    } catch (err) {
        setError("err.message");
    } finally {
        setIsSubmitting(false);
    }  
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#242424', padding: '30px', borderRadius: '8px', border: '1px solid #444', width: '600px', color: 'white' }}>
        
        <h2 style={{ marginTop: 0 }}>Write New Document</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Document Title *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Interview with John Doe"
              required 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }} 
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Content *</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              rows="12" 
              placeholder="Start typing your document here..."
              required
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white', resize: 'vertical' }} 
            />
          </div>

          {error && <p style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '15px' }}>⚠️ {error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 15px', backgroundColor: '#646cff', border: 'none', color: 'white', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isSubmitting ? "Saving..." : "Save Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDocumentModal;
