import { useState, useEffect } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { Dashboard } from "./components/Dashboard";
import { LibraryView } from "./components/LibraryView";
import { Reader } from "./components/Reader";
import { AudioPlayer } from "./components/AudioPlayer";
import { SettingsView } from "./components/SettingsView";
import { api } from "./utils/api";
import type { AppConfig, BookMetadata, Stats, PageData, Voice } from "./utils/api";
import { 
  Home as HomeIcon, 
  Library as LibraryIcon, 
  Settings as SettingsIcon 
} from "lucide-react";
import Logo from "./components/Logo";
import "./App.css";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [stats, setStats] = useState<Stats>({ total_listening_time: 0, reading_dates: [], streak: 0 });
  const [voices, setVoices] = useState<Voice[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Global keyboard shortcuts
    const handleGlobalKeydown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        try {
          if (e.shiftKey) {
            await api.pickFolder();
          } else {
            await api.pickFile();
          }
          // Refresh library after pick
          const libData = await api.getLibrary();
          setBooks(libData.books);
        } catch (err) {}
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, []);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<"home" | "my_books" | "settings">("home");
  
  // Active reading state
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageData, setPageData] = useState<PageData | null>(null);
  
  // Read-Along sync states
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [seekTriggerIndex, setSeekTriggerIndex] = useState<number | null>(null);

  // Load supplementary data (used when config is updated)
  const loadData = async () => {
    try {
      const [statsRes, voicesRes, libraryRes] = await Promise.allSettled([
        api.getStats(),
        api.getVoices(),
        api.getLibrary()
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      else console.error("Failed to load stats:", statsRes.reason);

      if (voicesRes.status === "fulfilled") setVoices(voicesRes.value);
      else console.error("Failed to load voices:", voicesRes.reason);

      if (libraryRes.status === "fulfilled") setBooks(libraryRes.value.books || []);
      else console.error("Failed to load library:", libraryRes.reason);
    } catch (err) {
      console.error("Critical error during loadData:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        const [configRes, statsRes, voicesRes, libraryRes] = await Promise.allSettled([
          api.getConfig(),
          api.getStats(),
          api.getVoices(),
          api.getLibrary()
        ]);
        
        if (!isMounted) return;

        if (configRes.status === "fulfilled") {
          setConfig(configRes.value);
        } else {
          console.error("Failed to fetch config:", configRes.reason);
        }

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
        } else {
          console.error("Failed to fetch stats:", statsRes.reason);
        }

        if (voicesRes.status === "fulfilled") {
          setVoices(voicesRes.value);
        } else {
          console.error("Failed to fetch voices:", voicesRes.reason);
        }

        if (libraryRes.status === "fulfilled") {
          setBooks(libraryRes.value.books || []);
        } else {
          console.error("Failed to fetch library:", libraryRes.reason);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };
    
    initialize();
    return () => { isMounted = false; };
  }, []);

  // Fetch page content when opening/turning pages
  useEffect(() => {
    if (!selectedBook) return;

    const fetchPage = async () => {
      setPageData(null);
      setActiveSentenceIndex(null);
      try {
        const data = await api.getPage(selectedBook.file_path, currentPage);
        setPageData(data);
      } catch (err) {
        console.error("Failed to load page text:", err);
      }
    };

    fetchPage();
  }, [selectedBook?.file_path, currentPage]);

  // Background Audio Preloading for seamless playback
  useEffect(() => {
    if (!selectedBook || !config) return;

    // We do not await these intentionally; they run in the background
    // and instruct the backend to generate & cache the audio files.
    if (currentPage + 1 <= selectedBook.page_count) {
      api.loadSpeech(selectedBook.file_path, currentPage + 1, config.default_voice, config.default_speed)
        .catch(() => {}); // silently ignore errors
    }
    if (currentPage + 2 <= selectedBook.page_count) {
      api.loadSpeech(selectedBook.file_path, currentPage + 2, config.default_voice, config.default_speed)
        .catch(() => {});
    }
  }, [selectedBook?.file_path, currentPage, config?.default_voice, config?.default_speed]);

  const handleConfigSaved = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    setIsInitializing(true);
    await loadData();
    
    // Switch to Home after config is saved on welcome screen
    setActiveTab("home");
    setIsInitializing(false);
  };

  const handleSelectBook = (book: BookMetadata) => {
    setSelectedBook(book);
    setCurrentPage(book.current_page);
    setActiveSentenceIndex(null);
    setSeekTriggerIndex(null);
    setIsReaderOpen(true);
  };

  const handleQuickListen = (book: BookMetadata) => {
    setSelectedBook(book);
    setCurrentPage(book.current_page);
    setActiveSentenceIndex(null);
    setSeekTriggerIndex(null);
    setIsReaderOpen(false);
  };

  const handlePageChange = async (page: number) => {
    if (!selectedBook) return;
    setCurrentPage(page);
    setActiveSentenceIndex(null);
    
    // Save progress to backend instantly
    try {
      const updated = await api.updateProgress(selectedBook.file_path, page, 0.0);
      setSelectedBook(updated);
      
      // Refresh library list
      const libData = await api.getLibrary();
      setBooks(libData.books);
    } catch (err) {
      console.error("Failed to save progress update:", err);
    }
  };

  const handleSeekSentence = (index: number) => {
    setSeekTriggerIndex(index);
  };

  const handleVoiceChange = async (newVoice: string) => {
    if (!config) return;
    const updated = { ...config, default_voice: newVoice };
    await api.updateConfig(updated);
    setConfig(updated);
  };

  const handleSpeedChange = async (newSpeed: number) => {
    if (!config) return;
    const updated = { ...config, default_speed: newSpeed };
    await api.updateConfig(updated);
    setConfig(updated);
  };

  const handleRefreshLibrary = async () => {
    try {
      const scan = await api.scanLibrary();
      setBooks(scan.books);
      
      const statsData = await api.getStats();
      setStats(statsData);
    } catch (err) {
      console.error("Library scan failed:", err);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // We only show the loading spinner if we are initializing.
  if (isInitializing) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Logo size={48} className="logo-accent spin-animation" />
          <span style={{ fontSize: "16px", fontWeight: "500" }}>Preparing your audiobook...</span>
        </div>
      </div>
    );
  }

  // If initialization finished but config is still null, the backend is unreachable.
  if (!config) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Logo size={48} className="logo-accent" />
          <span style={{ fontSize: "16px", fontWeight: "500" }}>Connecting to local server...</span>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Welcome Screen should ONLY appear for first-time users.
  // We determine this by checking if the library_path is empty AND books are empty.
  const isFirstTime = !config.library_path && books.length === 0 && (!config.opened_documents || config.opened_documents.length === 0);

  if (isFirstTime) {
    return <WelcomeScreen onConfigSaved={handleConfigSaved} />;
  }

  const isReading = isReaderOpen && selectedBook !== null;

  return (
    <div className={`app-container ${isReading ? "no-sidebar" : ""}`}>
      {/* Navigation Sidebar */}
      {!isReading && (
        <div className="sidebar">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => setActiveTab("home")}>
            <Logo size={24} className="logo-accent" />
            <span>Author <span className="logo-accent">Voice</span></span>
          </div>

          <ul className="nav-list">
            <li 
              className={`nav-item ${activeTab === "home" ? "active" : ""}`}
              onClick={() => setActiveTab("home")}
            >
              <HomeIcon size={18} />
              Home
            </li>
            <li 
              className={`nav-item ${activeTab === "my_books" ? "active" : ""}`}
              onClick={() => setActiveTab("my_books")}
            >
              <LibraryIcon size={18} />
              My Books
            </li>
            <li 
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <SettingsIcon size={18} />
              Settings
            </li>
          </ul>

          <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "16px", fontSize: "12px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "12px" }}>
            {deferredPrompt && (
              <button 
                onClick={handleInstallApp}
                className="btn btn-primary"
                style={{ fontSize: "13px", padding: "8px 12px", display: "flex", justifyContent: "center" }}
              >
                Install Desktop App
              </button>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>Offline Ready</span>
              <span>Local-first processing. No files are uploaded.</span>
            </div>
            
            {stats.storage_bytes !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", marginTop: "4px" }}>
                <span>Storage Used</span>
                <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                  {(stats.storage_bytes / (1024 * 1024)).toFixed(1)} MB Cached
                </span>
              </div>
            )}
            
            <div style={{ textAlign: "center", opacity: 0.5, marginTop: "8px" }}>Version 1.0</div>
          </div>
        </div>
      )}

      {/* Main Panel Router */}
      <div className="main-content" style={{ padding: isReading ? "0" : "40px", gap: isReading ? "0" : "32px" }}>
        {isReading ? (
          <Reader
            book={selectedBook}
            currentPage={currentPage}
            pageData={pageData}
            activeSentenceIndex={activeSentenceIndex}
            onPageChange={handlePageChange}
            onSeekSentence={handleSeekSentence}
            onBackToLibrary={() => {
              setIsReaderOpen(false);
              handleRefreshLibrary(); // Refresh dashboard on exit
            }}
          />
        ) : activeTab === "home" ? (
          <Dashboard 
            books={books} 
            stats={stats} 
            onSelectBook={handleSelectBook} 
            onQuickListen={handleQuickListen}
            isLoading={isInitializing}
          />
        ) : activeTab === "my_books" ? (
          <LibraryView
            books={books}
            onSelectBook={handleSelectBook}
            onRefreshLibrary={handleRefreshLibrary}
            onQuickListen={handleQuickListen}
            isLoading={isInitializing}
          />
        ) : (
          <SettingsView 
            config={config} 
            voices={voices}
            onConfigSaved={handleConfigSaved} 
          />
        )}

      </div>

      {/* Apple-Books style Audio Control Player Overlay */}
      {selectedBook !== null && (
        <AudioPlayer
          book={selectedBook}
          currentPage={currentPage}
          pageData={pageData}
          voice={config.default_voice}
          speed={config.default_speed}
          activeSentenceIndex={activeSentenceIndex}
          seekTriggerIndex={seekTriggerIndex}
          onSentenceHighlight={setActiveSentenceIndex}
          onPageChange={handlePageChange}
          onClearSeekTrigger={() => setSeekTriggerIndex(null)}
          voicesList={voices.map(v => ({ short_name: v.short_name, friendly_name: v.friendly_name }))}
          onVoiceChange={handleVoiceChange}
          onSpeedChange={handleSpeedChange}
          onOpenReader={() => setIsReaderOpen(true)}
        />
      )}
    </div>
  );
}

export default App;
