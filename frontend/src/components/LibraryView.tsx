import React, { useState } from "react";
import { BookOpen, Heart, Search, Play, Plus } from "lucide-react";
import type { BookMetadata } from "../utils/api";
import { api } from "../utils/api";
import { getGradientForTitle } from "../utils/colors";

interface LibraryViewProps {
  books: BookMetadata[];
  onSelectBook: (book: BookMetadata) => void;
  onRefreshLibrary: () => Promise<void>;
  onQuickListen?: (book: BookMetadata) => void;
  isLoading?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onRefreshLibrary,
  onQuickListen,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleFavoriteClick = async (e: React.MouseEvent, book: BookMetadata) => {
    e.stopPropagation(); // Prevent opening the book
    try {
      await api.toggleFavorite(book.file_path);
      await onRefreshLibrary(); // Refresh metadata list
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleImportDocument = async () => {
    try {
      await api.pickFile();
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const formatListeningTime = (seconds: number) => {
    if (!seconds) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Perform search (exact match, partial match, case insensitive)
  const filteredBooks = books.filter((book) => {
    const title = book.title.toLowerCase();
    const filename = book.filename.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return title.includes(query) || filename.includes(query);
  });

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px 0", color: "var(--text-primary)" }}>My Books</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>
            {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"} in library
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "40px", borderRadius: "20px" }}
            />
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          </div>

          <button 
            onClick={handleImportDocument} 
            className="btn btn-secondary" 
            style={{ padding: "10px 16px", borderRadius: "20px", display: "flex", gap: "8px", alignItems: "center", fontSize: "14px" }}
          >
            <Plus size={16} />
            Add Books
          </button>
        </div>
      </div>

      {/* Book Grid */}
      {isLoading ? (
        <div className="book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} style={{ width: "100%" }}>
              <div className="skeleton skeleton-card"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text-small"></div>
            </div>
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div style={{ padding: "80px 40px", backgroundColor: "var(--bg-sidebar)", borderRadius: "20px", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <BookOpen size={48} style={{ color: "var(--text-muted)" }} />
          <div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text-primary)", fontSize: "18px" }}>No Books Found</h3>
            <p style={{ margin: 0, fontSize: "15px", maxWidth: "300px" }}>
              {searchQuery ? "No search results match your query." : "Click 'Add Books' to import a PDF, Word document, or text file."}
            </p>
          </div>
        </div>
      ) : (
        <div className="book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
          {filteredBooks.map((book) => {
            const firstLetter = book.title.charAt(0).toUpperCase();
            const coverGradient = getGradientForTitle(book.title);
            
            return (
              <div key={book.file_path} className="spotify-card group" onClick={() => onSelectBook(book)} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px", transition: "all 0.3s ease", cursor: "pointer", position: "relative" }}>
                
                {/* Generated Cover */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: "12px", background: coverGradient, display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: "16px", boxShadow: "0 8px 16px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  <span style={{ position: "absolute", top: "10px", right: "10px", fontSize: "100px", fontWeight: "900", color: "rgba(255, 255, 255, 0.1)", lineHeight: 1, userSelect: "none" }}>
                    {firstLetter}
                  </span>
                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px", fontWeight: "700", lineHeight: 1.2, textShadow: "0 2px 4px rgba(0,0,0,0.5)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {book.title}
                    </span>
                    <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Book</span>
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="card-hover-overlay" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", opacity: 0, transition: "opacity 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {onQuickListen && (
                      <button 
                        className="btn btn-primary"
                        style={{ padding: "12px", borderRadius: "50%", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickListen(book);
                        }}
                        title="Quick Listen"
                      >
                        <Play size={24} fill="currentColor" stroke="none" style={{ marginLeft: "4px" }} />
                      </button>
                    )}
                  </div>
                  
                  {book.progress > 0 && book.progress < 100 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", backgroundColor: "rgba(0,0,0,0.3)" }}>
                      <div style={{ width: `${book.progress}%`, height: "100%", backgroundColor: "var(--accent-color)" }}></div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={book.title}>
                    {book.title}
                  </h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                    <span>{formatListeningTime(book.listening_time)} listened</span>
                    <span style={{ fontSize: "12px", opacity: 0.7 }}>{book.progress}%</span>
                  </div>
                </div>

                {/* Top Actions */}
                <button 
                  onClick={(e) => handleFavoriteClick(e, book)}
                  style={{ position: "absolute", top: "24px", right: "24px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  <Heart size={16} fill={book.favorite ? "var(--accent-color)" : "rgba(0,0,0,0.2)"} stroke={book.favorite ? "none" : "#fff"} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
