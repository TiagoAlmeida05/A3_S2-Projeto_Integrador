import os
import shutil
from fastapi import UploadFile
from faster_whisper import WhisperModel

class TranscribeService:
    def __init__(self):
        # Using 'base' model for high performance on local CPU/GPU setups.
        # Options: "tiny", "base", "small", "medium"
        # To strictly avoid any internet calls, ensure weights are fully cached 
        # or loaded dynamically via path configurations.
        self.model_size = "base"
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

    async def transcribe_audio_file(self, file: UploadFile) -> str:
        """Saves an incoming upload stream to a temporary local file, 

        transcribes it entirely offline via faster-whisper, and cleans up.
        """
        temp_file_path = f"temp_transcription_{file.filename}"
        
        # Stream the upload data safely into a temporary local file block
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            # Execute transcription pipeline
            segments, info = self.model.transcribe(temp_file_path, beam_size=5)
            
            # Combine individual text timestamps/segments into a singular block
            full_transcript = " ".join([segment.text for segment in segments])
            return full_transcript.strip()
            
        finally:
            # Clean up disk footprint
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

# Instantiate a single reuseable singleton instance
transcribe_service = TranscribeService()