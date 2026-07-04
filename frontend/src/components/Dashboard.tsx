import React from "react";
import { Play, BookOpen, Heart, Plus, FolderOpen } from "lucide-react";
import type { BookMetadata, Stats } from "../utils/api";
import { api } from "../utils/api";
import { getGradientForTitle } from "../utils/colors";

interface DashboardProps {
  books: BookMetadata[];
  stats: Stats;
  onSelectBook: (book: BookMetadata) => void;
  onQuickListen?: (book: BookMetadata) => void;
  isLoading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ books, stats, onSelectBook, onQuickListen, isLoading }) => {
  const recentBooks = [...books]
    .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())
    .slice(0, 10);

  const continueBook = [...books]
    .filter(b => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())[0];

  const favoriteBooks = books.filter(b => b.favorite).slice(0, 10);
  
  const handleImportDocument = async () => {
    try {
      await api.pickFile();
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportFolder = async () => {
    try {
      await api.pickFolder();
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

  if (isLoading) {
    return (
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "32px", color: "var(--text-primary)", opacity: 0.5 }}>Loading...</h2>
        <div style={{ display: "flex", gap: "24px", overflowX: "auto", paddingBottom: "24px", scrollbarWidth: "none" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ minWidth: "200px", maxWidth: "200px" }}>
              <div className="skeleton skeleton-card"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text-small"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "24px", color: "var(--text-primary)" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <BookOpen size={40} style={{ color: "var(--accent-color)" }} />
        </div>
        <h2 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>Your Library is Empty</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "400px", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          Start your listening journey. Import a PDF, Word document, or text file to generate your first audiobook.
        </p>
        <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
          <button className="btn btn-primary" onClick={handleImportDocument} style={{ padding: "14px 24px", fontSize: "15px", borderRadius: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
            <Plus size={18} />
            Import Document
          </button>
          <button className="btn btn-secondary" onClick={handleImportFolder} style={{ padding: "14px 24px", fontSize: "15px", borderRadius: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
            <FolderOpen size={18} />
            Choose Library Folder
          </button>
        </div>
      </div>
    );
  }

  const renderHorizontalList = (items: BookMetadata[]) => (
    <div className="horizontal-scroll-container" style={{ display: "flex", gap: "24px", overflowX: "auto", paddingBottom: "16px", scrollSnapType: "x mandatory" }}>
      {items.map((book) => {
        const firstLetter = book.title.charAt(0).toUpperCase();
        const coverGradient = getGradientForTitle(book.title);
        
        return (
          <div 
            key={book.file_path} 
            className="spotify-card group" 
            onClick={() => onSelectBook(book)} 
            style={{ minWidth: "200px", maxWidth: "200px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px", transition: "all 0.3s ease", cursor: "pointer", position: "relative", scrollSnapAlign: "start" }}
          >
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
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={book.title}>
                {book.title}
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
                <span>{formatListeningTime(book.listening_time)} listened</span>
                <span style={{ opacity: 0.7 }}>{book.progress}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px", paddingBottom: "120px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Home</h1>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={handleImportDocument} style={{ padding: "10px 16px", fontSize: "13px", borderRadius: "20px", display: "flex", gap: "8px", alignItems: "center" }}>
            <Plus size={16} />
            Add Document
          </button>
        </div>
      </div>

      {/* Continue Listening Hero */}
      {continueBook && (
        <div 
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            gap: "24px",
            alignItems: "center",
            position: "relative",
            overflow: "hidden"
          }}
          className="hover-scale"
        >
          <div style={{
            width: "120px",
            height: "160px",
            borderRadius: "8px",
            background: getGradientForTitle(continueBook.title),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
          }}>
            <span style={{ fontSize: "64px", fontWeight: "700", color: "rgba(255, 255, 255, 0.4)", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              {continueBook.title.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexGrow: 1 }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent-color)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Continue Listening
              </span>
              <h3 style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                {continueBook.title}
              </h3>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
              <span>Page {continueBook.current_page} of {continueBook.page_count}</span>
              <span>•</span>
              <span>{continueBook.progress}% completed</span>
            </div>
            
            <div className="progress-bar-container" style={{ width: "100%", maxWidth: "400px", height: "6px", marginTop: "8px" }}>
              <div className="progress-bar-fill" style={{ width: `${continueBook.progress}%`, backgroundColor: "var(--accent-color)" }}></div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
              <button 
                className="btn btn-primary" 
                onClick={() => onSelectBook(continueBook)}
                style={{ padding: "12px 24px", borderRadius: "30px", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}
              >
                <BookOpen size={18} />
                Open Reader
              </button>
              {onQuickListen && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => onQuickListen(continueBook)}
                  style={{ padding: "12px 24px", borderRadius: "30px", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <Play size={18} fill="currentColor" stroke="none" />
                  Quick Listen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reading Goal / Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>Total Listening Time</span>
          <span style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>{formatListeningTime(stats.total_listening_time)}</span>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>Storage Used</span>
          <span style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
            {stats.storage_bytes ? (stats.storage_bytes / (1024 * 1024)).toFixed(1) : "0"} MB
          </span>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>Books in Library</span>
          <span style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>{books.length}</span>
        </div>
      </div>

      {/* Recently Opened */}
      {recentBooks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>Recently Opened</h2>
          {renderHorizontalList(recentBooks)}
        </div>
      )}

      {/* Favorites */}
      {favoriteBooks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
            <Heart size={20} fill="var(--accent-color)" stroke="none" />
            Favorites
          </h2>
          {renderHorizontalList(favoriteBooks)}
        </div>
      )}
    </div>
  );
};
