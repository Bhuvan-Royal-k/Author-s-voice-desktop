import os
import re
from pypdf import PdfReader
import docx
from charset_normalizer import detect

def split_into_sentences(text):
    text = text.strip()
    if not text:
        return []
        
    # Replace multiple spaces/newlines with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Split on standard sentence punctuation followed by a space
    raw_sentences = re.split(r'(?<=[.!?])\s+', text)
    
    abbreviations = {
        "mr.", "st.", "dr.", "ms.", "gen.", "col.", "lt.", "prof.", "vs.", "eg.", "ie.", "etc.", 
        "e.g.", "i.e.", "jan.", "feb.", "mar.", "apr.", "jun.", "jul.", "aug.", "sep.", "oct.", "nov.", "dec."
    }
    
    sentences = []
    temp_sentence = ""
    
    for s in raw_sentences:
        s = s.strip()
        if not s:
            continue
            
        if temp_sentence:
            temp_sentence += " " + s
        else:
            temp_sentence = s
            
        # Check if the current accumulated sentence ends with an abbreviation
        words = temp_sentence.split()
        if words and words[-1].lower() in abbreviations:
            # Continue merging with the next segment
            continue
        else:
            sentences.append(temp_sentence)
            temp_sentence = ""
            
    if temp_sentence:
        sentences.append(temp_sentence)
        
    return sentences

def group_sentences_into_pages(sentences, max_words=600):
    """
    Groups a list of sentences into pages of approximately max_words.
    Ensures pages only break at sentence boundaries.
    """
    pages = []
    current_page_sentences = []
    current_word_count = 0
    page_number = 1
    
    for sentence in sentences:
        words = sentence.split()
        word_count = len(words)
        
        if current_word_count + word_count > max_words and current_page_sentences:
            page_content = " ".join(current_page_sentences)
            pages.append({
                "page_number": page_number,
                "raw_text": page_content,
                "sentences": list(current_page_sentences)
            })
            page_number += 1
            current_page_sentences = []
            current_word_count = 0
            
        current_page_sentences.append(sentence)
        current_word_count += word_count
        
    if current_page_sentences:
        page_content = " ".join(current_page_sentences)
        pages.append({
            "page_number": page_number,
            "raw_text": page_content,
            "sentences": list(current_page_sentences)
        })
        
    return pages

def parse_pdf_outline(reader):
    """
    Parses Table of Contents from PDF bookmarks recursively.
    """
    toc = []
    
    def _parse(outline_item, level=1):
        if isinstance(outline_item, list):
            for item in outline_item:
                _parse(item, level)
        else:
            try:
                title = outline_item.title
                page_idx = reader.get_destination_page_number(outline_item)
                toc.append({
                    "title": title,
                    "page": page_idx + 1,  # Make it 1-indexed
                    "level": level
                })
            except Exception:
                pass

    try:
        outline = reader.outline
        if outline:
            _parse(outline)
    except Exception:
        pass
    
    return toc

def parse_pdf(file_path):
    """
    Extracts pages and TOC from PDF file.
    """
    reader = PdfReader(file_path)
    pages = []
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({
            "page_number": i + 1,
            "raw_text": text,
            "sentences": split_into_sentences(text)
        })
        
    toc = parse_pdf_outline(reader)
    return pages, toc

def parse_docx(file_path):
    """
    Extracts text and pseudo-TOC from DOCX file.
    Uses sentence-level page grouping while respecting headings.
    """
    doc = docx.Document(file_path)
    pages = []
    toc = []
    
    current_page_sentences = []
    current_word_count = 0
    page_number = 1
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
            
        is_heading = para.style.name.startswith("Heading") or para.style.name == "Title"
        
        # Heading triggers a page break
        if is_heading and current_page_sentences:
            page_content = " ".join(current_page_sentences)
            pages.append({
                "page_number": page_number,
                "raw_text": page_content,
                "sentences": list(current_page_sentences)
            })
            page_number += 1
            current_page_sentences = []
            current_word_count = 0
            
        if is_heading:
            level = 1
            match = re.search(r'\d+', para.style.name)
            if match:
                level = int(match.group())
            toc.append({
                "title": text,
                "page": page_number,
                "level": level
            })
            
        # Split paragraph into sentences and accumulate
        para_sentences = split_into_sentences(text)
        for sentence in para_sentences:
            words = sentence.split()
            word_count = len(words)
            
            if current_word_count + word_count > 600 and current_page_sentences:
                page_content = " ".join(current_page_sentences)
                pages.append({
                    "page_number": page_number,
                    "raw_text": page_content,
                    "sentences": list(current_page_sentences)
                })
                page_number += 1
                current_page_sentences = []
                current_word_count = 0
                
            current_page_sentences.append(sentence)
            current_word_count += word_count
            
    # Flush remaining text
    if current_page_sentences:
        page_content = " ".join(current_page_sentences)
        pages.append({
            "page_number": page_number,
            "raw_text": page_content,
            "sentences": list(current_page_sentences)
        })
        
    return pages, toc

def parse_txt(file_path):
    """
    Extracts text from plain text files, using charset-normalizer to detect encoding.
    """
    with open(file_path, "rb") as f:
        raw_data = f.read()
        
    detection = detect(raw_data)
    encoding = detection.get("encoding") or "utf-8"
    
    try:
        content = raw_data.decode(encoding)
    except Exception:
        content = raw_data.decode("utf-8", errors="ignore")
        
    # Split entire text into sentences
    sentences = split_into_sentences(content)
    
    # Group sentences into pages
    pages = group_sentences_into_pages(sentences, max_words=600)
    
    return pages, []

def parse_document(file_path):
    """
    Dispatcher function to parse any supported document based on extension.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        try:
            return parse_docx(file_path)
        except Exception as e:
            if ext == ".doc":
                raise ValueError("Legacy Word (.doc) formats must be converted to .docx.")
            raise e
    elif ext == ".txt":
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
