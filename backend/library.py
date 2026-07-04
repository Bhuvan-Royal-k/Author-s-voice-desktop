import os
import json
import datetime
from .parser import parse_document, split_into_sentences
from .config import load_config

STATS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "stats.json")

def get_asset_path(file_path):
    """
    Given a book file path, returns the path of the voice_assets directory.
    """
    dir_name = os.path.dirname(file_path)
    base_name = os.path.basename(file_path)
    name_without_ext, _ = os.path.splitext(base_name)
    return os.path.join(dir_name, f"{name_without_ext}.voice_assets")

def load_stats():
    """
    Loads global statistics from stats.json.
    """
    default_stats = {
        "total_listening_time": 0.0
    }
    if not os.path.exists(STATS_FILE):
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(default_stats, f, indent=4)
        return default_stats
    try:
        with open(STATS_FILE, "r", encoding="utf-8") as f:
            stats = json.load(f)
            # Check keys
            for k, v in default_stats.items():
                if k not in stats:
                    stats[k] = v
            return stats
    except Exception:
        return default_stats

def save_stats(stats):
    """
    Saves global statistics.
    """
    try:
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=4)
    except Exception:
        pass

def update_streak_and_time(listening_delta_seconds):
    """
    Updates the listening time.
    """
    stats = load_stats()
    stats["total_listening_time"] += listening_delta_seconds
    save_stats(stats)
    return stats

def initialize_book_assets(file_path):
    """
    Creates the assets folder, extracts book text, and generates metadata.json and notes.md.
    """
    asset_dir = get_asset_path(file_path)
    audio_dir = os.path.join(asset_dir, "audio")
    cache_dir = os.path.join(asset_dir, "cache")
    metadata_path = os.path.join(asset_dir, "metadata.json")
    notes_path = os.path.join(asset_dir, "notes.md")
    
    os.makedirs(audio_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)
    
    # 1. Parse text and TOC
    try:
        pages, toc = parse_document(file_path)
    except Exception as e:
        print(f"Error parsing document {file_path}: {e}")
        return None
        
    page_count = len(pages)
    
    # 2. Write cached pages in cache/page_1.json, etc.
    for page in pages:
        page_num = page["page_number"]
        page_cache_path = os.path.join(cache_dir, f"page_{page_num}.json")
        with open(page_cache_path, "w", encoding="utf-8") as pf:
            json.dump(page, pf, indent=4)
            
    # 3. Create metadata.json
    filename = os.path.basename(file_path)
    metadata = {
        "title": os.path.splitext(filename)[0],
        "filename": filename,
        "file_path": file_path,
        "file_size": os.path.getsize(file_path),
        "page_count": page_count,
        "current_page": 1,
        "progress": 0.0,
        "toc": toc,
        "added_at": datetime.datetime.now().isoformat(),
        "last_read_at": datetime.datetime.now().isoformat(),
        "listening_time": 0.0,
        "completed": False,
        "favorite": False
    }
    
    with open(metadata_path, "w", encoding="utf-8") as mf:
        json.dump(metadata, mf, indent=4)
        
    # 4. Create empty notes.md
    if not os.path.exists(notes_path):
        with open(notes_path, "w", encoding="utf-8") as nf:
            nf.write(f"# Notes for {metadata['title']}\n\nCreated: {datetime.date.today().isoformat()}\n\n")
            
    return metadata

def scan_library_recursive(library_path, opened_documents=None):
    """
    Recursively scans the library path for PDF, DOCX, DOC, and TXT files.
    Also includes individual files from opened_documents.
    Ensures voice_assets directories exist and are initialized.
    Returns list of book metadata objects.
    """
    if opened_documents is None:
        opened_documents = []
        
    supported_extensions = {".pdf", ".docx", ".doc", ".txt"}
    books = []
    processed_paths = set()
    
    def process_file(file_path, base_dir=""):
        if file_path in processed_paths or not os.path.exists(file_path):
            return
            
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in supported_extensions:
            return
            
        processed_paths.add(file_path)
        asset_dir = get_asset_path(file_path)
        metadata_path = os.path.join(asset_dir, "metadata.json")
        
        metadata = None
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r", encoding="utf-8") as mf:
                    metadata = json.load(mf)
                    # Sync file path and check if file size matches
                    if metadata.get("file_path") != file_path:
                        metadata["file_path"] = file_path
                        with open(metadata_path, "w", encoding="utf-8") as wmf:
                            json.dump(metadata, wmf, indent=4)
            except Exception:
                pass
        
        # If not initialized, initialize now
        if not metadata:
            metadata = initialize_book_assets(file_path)
            
        if metadata:
            # Append relative path from library root for display (or basename if individual file)
            if base_dir and file_path.startswith(base_dir):
                rel_path = os.path.relpath(file_path, base_dir)
            else:
                rel_path = os.path.basename(file_path)
            metadata["relative_path"] = rel_path
            books.append(metadata)

    # 1. Process individual opened documents
    for doc_path in opened_documents:
        process_file(doc_path)
        
    # 2. Process library path recursively
    if library_path and os.path.exists(library_path):
        for root, dirs, files in os.walk(library_path):
            # Filter out directories that end with .voice_assets or start with dot
            dirs[:] = [d for d in dirs if not d.endswith(".voice_assets") and not d.startswith(".")]
            
            for file in files:
                file_path = os.path.join(root, file)
                process_file(file_path, base_dir=library_path)
                    
    # Sort books by last_read_at descending
    books.sort(key=lambda x: x.get("last_read_at", ""), reverse=True)
    return books

def update_book_progress(file_path, current_page, listening_delta=0.0):
    """
    Updates the reading progress and last read date of a book.
    """
    asset_dir = get_asset_path(file_path)
    metadata_path = os.path.join(asset_dir, "metadata.json")
    
    if not os.path.exists(metadata_path):
        return None
        
    try:
        with open(metadata_path, "r", encoding="utf-8") as mf:
            metadata = json.load(mf)
            
        page_count = metadata.get("page_count", 1)
        current_page = max(1, min(current_page, page_count))
        progress = ((current_page - 1) / page_count) * 100.0 if page_count > 1 else 0.0
        if current_page == page_count:
            progress = 100.0
            metadata["completed"] = True
            
        metadata["current_page"] = current_page
        metadata["progress"] = round(progress, 1)
        metadata["last_read_at"] = datetime.datetime.now().isoformat()
        metadata["listening_time"] += listening_delta
        
        with open(metadata_path, "w", encoding="utf-8") as mf:
            json.dump(metadata, mf, indent=4)
            
        # Update global stats
        if listening_delta > 0:
            update_streak_and_time(listening_delta)
            
        return metadata
    except Exception as e:
        print(f"Error updating progress: {e}")
        return None

def toggle_favorite(file_path):
    """
    Toggles the favorite flag in a book's metadata.json.
    """
    asset_dir = get_asset_path(file_path)
    metadata_path = os.path.join(asset_dir, "metadata.json")
    
    if not os.path.exists(metadata_path):
        return None
        
    try:
        with open(metadata_path, "r", encoding="utf-8") as mf:
            metadata = json.load(mf)
            
        metadata["favorite"] = not metadata.get("favorite", False)
        
        with open(metadata_path, "w", encoding="utf-8") as mf:
            json.dump(metadata, mf, indent=4)
            
        return metadata
    except Exception as e:
        print(f"Error toggling favorite: {e}")
        return None

def get_book_page(file_path, page_number):
    """
    Retrieves cached page content.
    """
    asset_dir = get_asset_path(file_path)
    page_cache_path = os.path.join(asset_dir, "cache", f"page_{page_number}.json")
    
    if not os.path.exists(page_cache_path):
        return None
        
    try:
        with open(page_cache_path, "r", encoding="utf-8") as pf:
            return json.load(pf)
    except Exception:
        return None

def get_book_text(file_path, page_count):
    """
    Aggregates all cached page texts.
    """
    full_text = []
    for p in range(1, page_count + 1):
        page_data = get_book_page(file_path, p)
        if page_data and page_data.get("raw_text"):
            full_text.append(page_data.get("raw_text"))
    return "\n\n".join(full_text)

def get_book_notes(file_path):
    """
    Reads notes.md content.
    """
    asset_dir = get_asset_path(file_path)
    notes_path = os.path.join(asset_dir, "notes.md")
    
    if not os.path.exists(notes_path):
        return ""
        
    try:
        with open(notes_path, "r", encoding="utf-8") as nf:
            return nf.read()
    except Exception:
        return ""

def save_book_notes(file_path, content):
    """
    Saves notes.md content.
    """
    asset_dir = get_asset_path(file_path)
    notes_path = os.path.join(asset_dir, "notes.md")
    
    try:
        os.makedirs(asset_dir, exist_ok=True)
        with open(notes_path, "w", encoding="utf-8") as nf:
            nf.write(content)
        return True
    except Exception:
        return False
