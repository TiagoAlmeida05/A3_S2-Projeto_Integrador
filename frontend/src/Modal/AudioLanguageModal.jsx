import React from 'react';

const WHISPER_LANGUAGES = [
  { code: "auto", name: "✨ Auto-Detect Language" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "ar", name: "Arabic (العربية)" },
];

function AudioLanguageModal({ dialogState, onCancel, onConfirm }) {
  if (!dialogState.isOpen) return null;

  return (
    <div 
      style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: "rgba(0,0,0,0.7)", 
        zIndex: 4000, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}
    >
      <div 
        style={{ 
          backgroundColor: "#23232a", 
          padding: "24px", 
          borderRadius: "12px", 
          width: "420px", 
          color: "white", 
          border: "1px solid #444", 
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)" 
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "8px" }}>🎙️ Audio Language Picker</h3>
        <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "16px", wordBreak: "break-all" }}>
          Select the language spoken in: <strong>{dialogState.filename}</strong>
        </p>
        
        <select 
          id="audio-lang-select"
          defaultValue="auto"
          style={{ 
            width: "100%", 
            padding: "10px", 
            borderRadius: "8px", 
            border: "1px solid #555", 
            backgroundColor: "#1f1f28", 
            color: "white", 
            cursor: "pointer", 
            fontSize: "14px", 
            marginBottom: "20px" 
          }}
        >
          {WHISPER_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button 
            onClick={onCancel} 
            style={{ 
              padding: "10px 16px", 
              backgroundColor: "#444", 
              border: "none", 
              borderRadius: "8px", 
              color: "white", 
              cursor: "pointer", 
              fontWeight: "bold" 
            }}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              const selectEl = document.getElementById("audio-lang-select");
              onConfirm(selectEl.value);
            }} 
            style={{ 
              padding: "10px 16px", 
              backgroundColor: "#646cff", 
              border: "none", 
              borderRadius: "8px", 
              color: "white", 
              cursor: "pointer", 
              fontWeight: "bold" 
            }}
          >
            Confirm & Transcribe
          </button>
        </div>
      </div>
    </div>
  );
}

export default AudioLanguageModal;