import math
import os
import shutil
import time
from fastapi import UploadFile
from faster_whisper import WhisperModel
from concurrent.futures import ThreadPoolExecutor

class TranscribeService:
    def __init__(self):
        self.model_size = "small"
        self._model = None
        
        system_cores = os.cpu_count() or 2
        
        if system_cores <= 2:
            self.optimal_threads = system_cores 
        elif system_cores <= 4:
            self.optimal_threads = system_cores - 1
        else:
            self.optimal_threads = min(8, math.ceil(system_cores * 0.75))
            
        self.executor = ThreadPoolExecutor(max_workers=self.optimal_threads)
        print(f"--- Allocating {self.optimal_threads} worker threads out of {system_cores} system cores ---")

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            print(f"Loading Whisper model '{self.model_size}' entirely into RAM...")
            self._model = WhisperModel(
                self.model_size, 
                device="cpu", 
                compute_type="int8",
                cpu_threads=self.optimal_threads 
            )
            print("Model loaded successfully!")
        return self._model

    def _transcribe_chunk(self, chunk_path: str, language: str):
        """Worker function running inside parallel threads that deletes the

        chunk the exact millisecond it finishes reading it.
        """
        try:
            if not os.path.exists(chunk_path):
                return ""
                
            segments, _ = self.model.transcribe(
                chunk_path,
                language=language,
                beam_size=5,
                patience=2.0,
                no_speech_threshold=0.6,
                condition_on_previous_text=False 
            )
            return " ".join([seg.text for seg in segments])
        finally:
            if os.path.exists(chunk_path):
                try:
                    os.remove(chunk_path)
                except Exception as e:
                    print(f"Failed instant delete on chunk {chunk_path}: {e}")

    async def transcribe_audio_file(self, file: UploadFile, language: str = None) -> str:
        temp_file_path = f"temp_transcription_{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        unique_prefix = f"chunk_{int(time.time())}"
        chunk_pattern = f"{unique_prefix}_%03d.wav"
            
        try:
            print("Optimizing audio file execution structure via FFmpeg...")
            import subprocess
            
            split_cmd = [
                "ffmpeg", "-y", "-i", temp_file_path,
                "-f", "segment", "-segment_time", "300", 
                "-c", "copy", chunk_pattern
            ]
            subprocess.run(split_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            chunks = sorted([
                os.path.abspath(f) for f in os.listdir(".") 
                if f.startswith(unique_prefix) and f.endswith(".wav")
            ])
            
            if not chunks:
                chunks = [os.path.abspath(temp_file_path)]
            
            print(f"Slices created: {len(chunks)} chunks. Dispatching threads parallel execution...")
            
            futures = [
                self.executor.submit(self._transcribe_chunk, chunk, language)
                for chunk in chunks
            ]
            
            transcript_parts = [future.result() for future in futures]
            
            full_transcript = " ".join(transcript_parts)
            return full_transcript.strip()
            
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
            for f in os.listdir("."):
                if f.startswith(unique_prefix) and f.endswith(".wav"):
                    try:
                        os.remove(f)
                    except:
                        pass

transcribe_service = TranscribeService()