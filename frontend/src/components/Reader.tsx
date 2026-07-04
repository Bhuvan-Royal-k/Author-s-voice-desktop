import React, { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import type { BookMetadata, PageData } from "../utils/api";
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Type, 
  Edit3,
  Play
} from "lucide-react";

interface ReaderProps {
  book: BookMetadata;
  currentPage: number;
  pageData: PageData | null;
  activeSentenceIndex: number | null;
  onPageChange: (page: number) => void;
  onSeekSentence: (index: number) => void;
  onBackToLibrary: () => void;
}

export const Reader: React.FC<ReaderProps> = ({
  book,
  currentPage,
  pageData,
  activeSentenceIndex,
  onPageChange,
  onSeekSentence,
  onBackToLibrary
}) => {
  const [theme, setTheme] = useState<"midnight" | "kindle" | "sepia" | "nord" | "dracula" | "forest">("kindle");
  const [fontSize, setFontSize] = useState<number>(19); // px
  const [fontFamily, setFontFamily] = useState<"Outfit" | "Literata" | "Newsreader" | "EB Garamond">("Literata");
  
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<"toc" | "notes">("toc");
  const [notesContent, setNotesContent] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  // Selection state
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number} | null>(null);
  const [selectionStartIdx, setSelectionStartIdx] = useState<number | null>(null);

  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await api.getNotes(book.file_path);
        setNotesContent(data.content);
      } catch (err) {}
    };
    fetchNotes();
  }, [book.file_path]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.saveNotes(book.file_path, notesContent);
    } catch (err) {
    } finally {
      setSavingNotes(false);
    }
  };

  useEffect(() => {
    if (activeSentenceIndex !== null && sentenceRefs.current[activeSentenceIndex]) {
      const el = sentenceRefs.current[activeSentenceIndex];
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // Only scroll if the sentence is outside the middle 50% of the screen
        if (rect.top < viewportHeight * 0.25 || rect.bottom > viewportHeight * 0.75) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      }
    }
  }, [activeSentenceIndex]);

  const handlePrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < book.page_count) onPageChange(currentPage + 1);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionRect({
        x: rect.x + rect.width / 2,
        y: rect.y - 45 
      });

      const startNode = range.startContainer.parentElement;
      if (startNode && startNode.hasAttribute("data-index")) {
        setSelectionStartIdx(parseInt(startNode.getAttribute("data-index") || "0", 10));
      } else {
        setSelectionStartIdx(null);
      }
    } else {
      setSelectionRect(null);
    }
  };

  const handleReadSelection = () => {
    if (selectionStartIdx !== null) {
      onSeekSentence(selectionStartIdx);
    }
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className={`reader-container ${sidebarOpen ? "" : "no-toc"} theme-${theme}`}>
      {sidebarOpen && (
        <div className="reader-toc-sidebar">
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
            <button 
              className={`btn ${sidebarTab === "toc" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSidebarTab("toc")}
              style={{ flexGrow: 1, padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
            >
              <BookOpen size={14} /> TOC
            </button>
            <button 
              className={`btn ${sidebarTab === "notes" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSidebarTab("notes")}
              style={{ flexGrow: 1, padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
            >
              <Edit3 size={14} /> Notes
            </button>
          </div>

          <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", marginTop: "12px" }}>
            {sidebarTab === "toc" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {book.toc && book.toc.length > 0 ? (
                  book.toc.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`toc-item ${currentPage === item.page ? "active" : ""}`}
                      onClick={() => onPageChange(item.page)}
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                    >
                      {item.title} (p. {item.page})
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
                    No outline available.
                  </div>
                )}
              </div>
            ) : (
              <div className="notes-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Book Notes (Markdown)</h4>
                  <button 
                    onClick={handleSaveNotes} 
                    className="btn btn-primary"
                    disabled={savingNotes}
                    style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                  >
                    {savingNotes ? "Saving..." : "Save"}
                  </button>
                </div>
                <textarea
                  className="notes-editor"
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="# Notes&#10;&#10;- Highlight 1: ...&#10;- Highlight 2: ..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div 
        className={`reader-viewport`} 
        style={{ 
          "--reader-font-size": `${fontSize}px`,
          "--reader-font-family": `"${fontFamily}", serif`
        } as React.CSSProperties}
      >
        <div className="reader-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={onBackToLibrary} className="btn-icon">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon">
              <Menu size={20} />
            </button>
            <span className="reader-book-title">{book.title}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", borderRight: "1px solid var(--border-color)", paddingRight: "16px" }}>
              <select 
                className="form-input"
                style={{ padding: "4px 8px", fontSize: "12px", width: "120px", marginRight: "8px", backgroundColor: "transparent", border: "1px solid var(--border-color)" }}
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
              >
                <option value="Outfit">Outfit</option>
                <option value="Literata">Literata</option>
                <option value="Newsreader">Newsreader</option>
                <option value="EB Garamond">EB Garamond</option>
              </select>

              <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="btn-icon" title="Decrease font size">
                <Type size={14} />
              </button>
              <span style={{ fontSize: "13px", minWidth: "20px", textAlign: "center" }}>{fontSize}</span>
              <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="btn-icon" title="Increase font size">
                <Type size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {(["midnight", "kindle", "sepia", "nord", "dracula", "forest"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`theme-swatch swatch-${t} ${theme === t ? "active" : ""}`}
                  title={t.charAt(0).toUpperCase() + t.slice(1)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="reader-scroll-area" onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp} style={{ flexGrow: 1, overflowY: "auto" }}>
          <div className="reader-content-wrapper" key={currentPage} style={{ animation: "fadeIn 0.3s ease-out" }}>
            {pageData ? (
              pageData.sentences.length > 0 ? (
                <p className="reader-para">
                  {pageData.sentences.map((sentence, idx) => {
                    const isHighlight = activeSentenceIndex === idx;
                    return (
                      <span
                        key={idx}
                        data-index={idx}
                        ref={(el) => { sentenceRefs.current[idx] = el; }}
                        className={`reader-sentence ${isHighlight ? "highlight" : ""}`}
                        onClick={() => onSeekSentence(idx)}
                      >
                        {sentence}{" "}
                      </span>
                    );
                  })}
                </p>
              ) : (
                <div className="empty-state-message">Empty page text.</div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px", opacity: 0.5 }}>
                <div className="skeleton skeleton-text" style={{ width: "90%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "85%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "95%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "80%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "92%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "88%", marginTop: "32px" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "96%" }}></div>
                <div className="skeleton skeleton-text" style={{ width: "84%" }}></div>
              </div>
            )}
          </div>
          
          <div className="reader-pagination-bar">
            <button 
              onClick={handlePrevPage} 
              className="btn btn-secondary" 
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="page-indicator">Page {currentPage} of {book.page_count}</span>
            <button 
              onClick={handleNextPage} 
              className="btn btn-secondary" 
              disabled={currentPage >= book.page_count}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* Read Selection Floating Popup */}
        {selectionRect && (
          <div 
            className="read-selection-popup"
            style={{
              position: "fixed",
              left: selectionRect.x,
              top: selectionRect.y,
              transform: "translateX(-50%)",
              zIndex: 1000
            }}
          >
            <button onClick={handleReadSelection} className="btn btn-primary" style={{ padding: "8px 16px", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <Play size={16} fill="currentColor" stroke="none" style={{ marginRight: "6px" }} />
              Read Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
