import unittest
import os
import shutil
import tempfile
from backend.config import load_config, save_config, CONFIG_FILE
from backend.parser import split_into_sentences, parse_txt
from backend.tts import format_rate

class TestAuthorVoiceBackend(unittest.TestCase):
    
    def test_speed_formatting(self):
        self.assertEqual(format_rate(1.0), "+0%")
        self.assertEqual(format_rate(1.25), "+25%")
        self.assertEqual(format_rate(0.85), "-15%")
        self.assertEqual(format_rate(2.5), "+150%")
        self.assertEqual(format_rate(0.5), "-50%")
        
    def test_sentence_splitting(self):
        text = "Hello world! Dr. Smith went to the market. This is an e.g. of sentence splitting."
        sentences = split_into_sentences(text)
        
        # Verify sentences count and parts
        self.assertEqual(len(sentences), 3)
        self.assertEqual(sentences[0], "Hello world!")
        # Dr. Smith should remain in the same sentence
        self.assertEqual(sentences[1], "Dr. Smith went to the market.")
        # "e.g." should not trigger split
        self.assertEqual(sentences[2], "This is an e.g. of sentence splitting.")
        
    def test_txt_virtual_page_splitting(self):
        # Create a large text mock with sentence boundaries
        # 150 sentences of 10 words each = 1500 words total
        sentence_text = "This is a simple sentence containing ten words to test."
        content = " ".join([sentence_text] * 150)
        
        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".txt")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(content)
                
            pages, toc = parse_txt(temp_path)
            
            # 1500 words / 600 words limit = 3 pages total
            self.assertEqual(len(pages), 3)
            self.assertEqual(pages[0]["page_number"], 1)
            self.assertEqual(pages[1]["page_number"], 2)
            self.assertEqual(pages[2]["page_number"], 3)
            self.assertEqual(len(toc), 0)
        finally:
            os.remove(temp_path)
            
    def test_config_management(self):
        # Backup existing config if any
        config_backup = None
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r") as f:
                config_backup = f.read()
                
        try:
            test_config = {
                "library_path": "C:\\MockLibrary",
                "ai_provider": "ollama",
                "gemini_key": "test_key",
                "ollama_url": "http://localhost:11434",
                "default_voice": "en-US-GuyNeural",
                "default_speed": 1.2
            }
            
            save_config(test_config)
            loaded = load_config()
            
            self.assertEqual(loaded["library_path"], "C:\\MockLibrary")
            self.assertEqual(loaded["ai_provider"], "ollama")
            self.assertEqual(loaded["default_voice"], "en-US-GuyNeural")
            self.assertEqual(loaded["default_speed"], 1.2)
        finally:
            # Restore backup
            if config_backup:
                with open(CONFIG_FILE, "w") as f:
                    f.write(config_backup)
            elif os.path.exists(CONFIG_FILE):
                os.remove(CONFIG_FILE)

if __name__ == "__main__":
    unittest.main()
