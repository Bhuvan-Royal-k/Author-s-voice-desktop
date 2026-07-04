import os
import json
import asyncio
import tkinter as tk
from tkinter import filedialog
import urllib.parse
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List

from .config import load_config, save_config
from .library import (
    scan_library_recursive,
    update_book_progress,
    toggle_favorite,
    get_book_page,
    get_book_notes,
    save_book_notes,
    load_stats,
    get_asset_path,
    get_book_text
)
from .tts import list_available_voices, generate_speech_and_timeline

app = FastAPI(title="Author Voice API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ConfigUpdateSchema(BaseModel):
    library_path: str
    opened_documents: Optional[List[str]] = []
    default_voice: str
    default_speed: float

class ProgressUpdateSchema(BaseModel):
    file_path: str
    current_page: int
    listening_delta: float

class NotesSaveSchema(BaseModel):
    file_path: str
    content: str



@app.get("/api/config")
async def get_config():
    return load_config()

@app.post("/api/config")
async def update_config(data: ConfigUpdateSchema):
    cfg = {
        "library_path": data.library_path,
        "opened_documents": data.opened_documents,
        "default_voice": data.default_voice,
        "default_speed": data.default_speed
    }
    if save_config(cfg):
        return cfg
    raise HTTPException(status_code=500, detail="Failed to save configuration")

@app.get("/api/stats")
async def get_statistics():
    stats = load_stats()
    cfg = load_config()
    total_size = 0
    docs = cfg.get("opened_documents", [])
    for doc in docs:
        asset_dir = get_asset_path(doc)
        if os.path.exists(asset_dir):
            for dirpath, _, filenames in os.walk(asset_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        total_size += os.path.getsize(fp)
    
    # Also scan library path if it exists
    lib_path = cfg.get("library_path")
    if lib_path and os.path.exists(lib_path):
        for dirpath, dirnames, filenames in os.walk(lib_path):
            if ".voice_assets" in dirpath:
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        total_size += os.path.getsize(fp)
    
    stats["storage_bytes"] = total_size
    return stats

def open_file_dialog():
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    file_path = filedialog.askopenfilename(
        parent=root,
        title="Open Document",
        filetypes=[("Documents", "*.pdf *.docx *.txt")]
    )
    root.destroy()
    return file_path

def open_folder_dialog():
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    folder_path = filedialog.askdirectory(
        parent=root,
        title="Choose Library Folder"
    )
    root.destroy()
    return folder_path

@app.get("/api/system/pick-file")
async def pick_file_endpoint():
    file_path = await asyncio.to_thread(open_file_dialog)
    if file_path:
        cfg = load_config()
        docs = cfg.get("opened_documents", [])
        if file_path not in docs:
            docs.append(file_path)
            cfg["opened_documents"] = docs
            save_config(cfg)
        return {"path": file_path}
    return {"path": ""}

@app.get("/api/system/pick-folder")
async def pick_folder_endpoint():
    folder_path = await asyncio.to_thread(open_folder_dialog)
    if folder_path:
        cfg = load_config()
        cfg["library_path"] = folder_path
        save_config(cfg)
        return {"path": folder_path}
    return {"path": ""}

@app.get("/api/library")
async def get_library():
    cfg = load_config()
    lib_path = cfg.get("library_path", "")
    opened_docs = cfg.get("opened_documents", [])
    
    books = scan_library_recursive(lib_path, opened_docs)
    return {"books": books}

@app.post("/api/library/scan")
async def scan_library():
    cfg = load_config()
    lib_path = cfg.get("library_path", "")
    opened_docs = cfg.get("opened_documents", [])
    
    books = scan_library_recursive(lib_path, opened_docs)
    return {"books": books}

@app.get("/api/book")
async def get_book(file_path: str = Query(...)):
    asset_dir = get_asset_path(file_path)
    metadata_path = os.path.join(asset_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Book metadata not found.")
    with open(metadata_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/book/page")
async def get_page(file_path: str = Query(...), page: int = Query(...)):
    page_data = get_book_page(file_path, page)
    if not page_data:
        raise HTTPException(status_code=404, detail=f"Page {page} not found.")
    return page_data

@app.post("/api/book/progress")
async def update_progress(data: ProgressUpdateSchema):
    meta = update_book_progress(data.file_path, data.current_page, data.listening_delta)
    if meta:
        return meta
    raise HTTPException(status_code=404, detail="Failed to update progress.")

@app.post("/api/book/favorite")
async def toggle_book_favorite(file_path: str = Body(..., embed=True)):
    meta = toggle_favorite(file_path)
    if meta:
        return meta
    raise HTTPException(status_code=404, detail="Failed to toggle favorite.")

@app.get("/api/book/notes")
async def get_notes(file_path: str = Query(...)):
    return {"content": get_book_notes(file_path)}

@app.post("/api/book/notes")
async def save_notes(data: NotesSaveSchema):
    if save_book_notes(data.file_path, data.content):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to save notes.")

@app.get("/api/speech/voices")
async def get_voices():
    return await list_available_voices()

@app.get("/api/speech/load")
async def load_speech(
    file_path: str = Query(...),
    page: int = Query(...),
    voice: str = Query(...),
    speed: float = Query(...)
):
    """
    Checks if page speech is generated. If not, generates it.
    Returns audio streaming URL and timing timeline.
    """
    asset_dir = get_asset_path(file_path)
    safe_voice = voice.replace(":", "_").replace(" ", "_")
    audio_filename = f"page_{page}_{safe_voice}_{speed}x.mp3"
    timeline_filename = f"page_{page}_{safe_voice}_{speed}x.timeline.json"
    
    audio_path = os.path.join(asset_dir, "audio", audio_filename)
    timeline_path = os.path.join(asset_dir, "audio", timeline_filename)
    
    timeline = []
    
    # Generate if cache missed
    if not os.path.exists(audio_path) or not os.path.exists(timeline_path):
        page_data = get_book_page(file_path, page)
        if not page_data:
            raise HTTPException(status_code=404, detail=f"Page {page} text is not available.")
        
        sentences = page_data.get("sentences", [])
        if not sentences:
            # Fallback if no sentences extracted
            raw_text = page_data.get("raw_text", "").strip()
            if not raw_text:
                return {"audio_url": "", "timeline": []}
            sentences = [raw_text]
            
        try:
            timeline = await generate_speech_and_timeline(
                sentences, voice, speed, audio_path, timeline_path
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Speech generation failed: {str(e)}")
    else:
        # Load from cache
        try:
            with open(timeline_path, "r", encoding="utf-8") as tf:
                timeline = json.load(tf)
        except Exception:
            pass
            
    # Formulate relative streaming URL
    encoded_path = urllib.parse.quote_plus(file_path)
    stream_url = f"/api/speech/stream?file_path={encoded_path}&page={page}&voice={voice}&speed={speed}"
    
    return {
        "audio_url": stream_url,
        "timeline": timeline
    }

@app.get("/api/speech/stream")
async def stream_speech(
    file_path: str = Query(...),
    page: int = Query(...),
    voice: str = Query(...),
    speed: float = Query(...)
):
    """
    Streams the generated MP3 file.
    """
    asset_dir = get_asset_path(file_path)
    safe_voice = voice.replace(":", "_").replace(" ", "_")
    audio_filename = f"page_{page}_{safe_voice}_{speed}x.mp3"
    audio_path = os.path.join(asset_dir, "audio", audio_filename)
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not generated or missing.")
        
    return FileResponse(audio_path, media_type="audio/mpeg", filename=audio_filename)

