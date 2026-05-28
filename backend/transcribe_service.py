import os
import shutil
from fastapi import UploadFile
from faster_whisper import WhisperModel

class TranscribeService:
    def __init__(self):
        # 🌟 Bumping from "base" to "small" for a massive jump in local accuracy.
        # It handles accents, punctuation, and background noises drastically better.
        self.model_size = "small"
        self._model = None

    @property
    def model(self) -> WhisperModel:
        """Lazy load the model so backend initialization remains instantly fast."""
        if self._model is None:
            self._model = WhisperModel(
                self.model_size, 
                device="cpu", 
                compute_type="int8"
            )
        return self._model

    async def transcribe_audio_file(self, file: UploadFile, language: str = None) -> str:
        """Saves an incoming upload stream to a temporary local file, 

        transcribes it entirely offline via faster-whisper, and cleans up.
        """
        temp_file_path = f"temp_transcription_{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            segments, info = self.model.transcribe(
                temp_file_path, 
                language=language,               
                beam_size=5,                     
                patience=2.0,                    
                no_speech_threshold=0.6,         
                condition_on_previous_text=True  
            )
            
            full_transcript = " ".join([segment.text for segment in segments])
            return full_transcript.strip()
            
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

transcribe_service = TranscribeService()