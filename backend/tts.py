import asyncio
import edge_tts
import json
import os
from abc import ABC, abstractmethod

def format_rate(multiplier):
    percent = int((multiplier - 1.0) * 100)
    if percent >= 0:
        return f"+{percent}%"
    else:
        return f"{percent}%"

class TTSProvider(ABC):
    @abstractmethod
    async def get_voices(self):
        pass

    @abstractmethod
    async def generate(self, sentences, voice, speed_multiplier, audio_path, timeline_path):
        pass

class EdgeTTSProvider(TTSProvider):
    async def get_voices(self):
        try:
            voices = await edge_tts.VoicesManager.create()
            sorted_voices = sorted(voices.voices, key=lambda x: x.get("Locale", ""))
            return [
                {
                    "name": v.get("Name", ""),
                    "short_name": v.get("ShortName", ""),
                    "gender": v.get("Gender", ""),
                    "locale": v.get("Locale", ""),
                    "friendly_name": f"{v.get('FriendlyName', '')} (Balanced)"
                }
                for v in sorted_voices
            ]
        except Exception:
            return [
                {"name": "Microsoft Server Speech Text to Speech Voice (en-US, AriaNeural)", "short_name": "en-US-AriaNeural", "gender": "Female", "locale": "en-US", "friendly_name": "Aria (Balanced)"},
                {"name": "Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)", "short_name": "en-US-GuyNeural", "gender": "Male", "locale": "en-US", "friendly_name": "Guy (Balanced)"}
            ]

    async def generate(self, sentences, voice, speed_multiplier, audio_path, timeline_path):
        text = " ".join(sentences)
        rate_str = format_rate(speed_multiplier)
        communicate = edge_tts.Communicate(text, voice, rate=rate_str)
        boundaries = []
        
        os.makedirs(os.path.dirname(audio_path), exist_ok=True)
        os.makedirs(os.path.dirname(timeline_path), exist_ok=True)
        
        with open(audio_path, "wb") as audio_file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_file.write(chunk["data"])
                elif chunk["type"] == "SentenceBoundary":
                    boundaries.append(chunk)
                    
        timeline = []
        for i, b in enumerate(boundaries):
            start_seconds = b["offset"] / 10000000.0
            duration_seconds = b["duration"] / 10000000.0
            end_seconds = start_seconds + duration_seconds
            sentence_idx = min(i, len(sentences) - 1)
            original_sentence = sentences[sentence_idx] if sentence_idx >= 0 else b["text"]
            
            timeline.append({
                "sentence_index": sentence_idx,
                "start_time": start_seconds,
                "end_time": end_seconds,
                "text": original_sentence,
                "spoken_text": b["text"]
            })
            
        with open(timeline_path, "w", encoding="utf-8") as timeline_file:
            json.dump(timeline, timeline_file, indent=4)
            
        return timeline

class KokoroTTSProvider(TTSProvider):
    async def get_voices(self):
        # Stub: waiting for local ONNX/binaries to be supplied
        return [
            {"name": "Kokoro Default Voice", "short_name": "kokoro-default", "gender": "Neutral", "locale": "en-US", "friendly_name": "Kokoro Default (Natural)"}
        ]

    async def generate(self, sentences, voice, speed_multiplier, audio_path, timeline_path):
        # Stub implementation falling back to EdgeTTS until local pipeline is wired
        edge = EdgeTTSProvider()
        return await edge.generate(sentences, "en-US-AriaNeural", speed_multiplier, audio_path, timeline_path)

class PiperTTSProvider(TTSProvider):
    async def get_voices(self):
        # Stub: waiting for piper models
        return [
            {"name": "Piper Default Voice", "short_name": "piper-default", "gender": "Neutral", "locale": "en-US", "friendly_name": "Piper Default (Offline)"}
        ]

    async def generate(self, sentences, voice, speed_multiplier, audio_path, timeline_path):
        # Stub implementation falling back to EdgeTTS until local pipeline is wired
        edge = EdgeTTSProvider()
        return await edge.generate(sentences, "en-US-GuyNeural", speed_multiplier, audio_path, timeline_path)

class TTSDispatcher:
    def __init__(self):
        self.providers = {
            "edge": EdgeTTSProvider(),
            "kokoro": KokoroTTSProvider(),
            "piper": PiperTTSProvider()
        }
        
    def _get_provider(self, voice_short_name: str) -> TTSProvider:
        if voice_short_name.startswith("kokoro"):
            return self.providers["kokoro"]
        elif voice_short_name.startswith("piper"):
            return self.providers["piper"]
        return self.providers["edge"]

    async def list_available_voices(self):
        all_voices = []
        for p in self.providers.values():
            all_voices.extend(await p.get_voices())
        return all_voices

    async def generate_speech_and_timeline(self, sentences, voice, speed_multiplier, audio_path, timeline_path):
        provider = self._get_provider(voice)
        return await provider.generate(sentences, voice, speed_multiplier, audio_path, timeline_path)

dispatcher = TTSDispatcher()

async def list_available_voices():
    return await dispatcher.list_available_voices()

async def generate_speech_and_timeline(sentences, voice, speed_multiplier, audio_path, timeline_path):
    return await dispatcher.generate_speech_and_timeline(sentences, voice, speed_multiplier, audio_path, timeline_path)
