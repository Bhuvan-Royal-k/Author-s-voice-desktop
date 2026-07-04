import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Timer,
  Clock,
  MoreHorizontal
} from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { api } from "../utils/api";
import type { BookMetadata, PageData, TimelineItem } from "../utils/api";

interface AudioPlayerProps {
  book: BookMetadata | null;
  currentPage: number;
  pageData: PageData | null;
  voice: string;
  speed: number;
  activeSentenceIndex: number | null;
  seekTriggerIndex: number | null;
  onSentenceHighlight: (index: number | null) => void;
  onPageChange: (page: number) => void;
  onClearSeekTrigger: () => void;
  voicesList: { short_name: string; friendly_name: string }[];
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: number) => void;
  onOpenReader?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  book,
  currentPage,
  pageData,
  voice,
  speed,
  activeSentenceIndex,
  seekTriggerIndex,
  onSentenceHighlight,
  onPageChange,
  onClearSeekTrigger,
  voicesList,
  onVoiceChange,
  onSpeedChange,
  onOpenReader
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const sleepTimerRef = useRef<any>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(255, 255, 255, 0.15)",
      progressColor: "var(--accent-color)",
      cursorColor: "var(--text-primary)",
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      height: 60,
      normalize: true,
      cursorWidth: 2,
    });
    
    wavesurferRef.current = wavesurfer;
    wavesurfer.setVolume(volume);

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("timeupdate", (time: number) => {
      setCurrentTime(time);
      setTimeline(prevTimeline => {
        const item = prevTimeline.find(t => time >= t.start_time && time < t.end_time);
        if (item) {
          onSentenceHighlight(item.sentence_index);
        }
        return prevTimeline;
      });
    });
    
    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
    });
    
    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      onSentenceHighlight(null);
      if (book && currentPage < book.page_count) {
        onPageChange(currentPage + 1);
        setIsPlaying(true);
      }
    });

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, []); 

  // Sync volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  // Track listening progress
  useEffect(() => {
    if (isPlaying && book) {
      const interval = setInterval(async () => {
        try {
          await api.updateProgress(book.file_path, currentPage, 10);
        } catch (err) {}
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, book, currentPage]);

  // Handle Seek from clicking sentences in Reader
  useEffect(() => {
    if (seekTriggerIndex !== null && timeline.length > 0 && wavesurferRef.current) {
      const target = timeline.find(item => item.sentence_index === seekTriggerIndex);
      if (target) {
        wavesurferRef.current.setTime(target.start_time);
        setCurrentTime(target.start_time);
        onSentenceHighlight(seekTriggerIndex);
        wavesurferRef.current.play(); // Auto-play on seek
      }
      onClearSeekTrigger();
    }
  }, [seekTriggerIndex, timeline]);

  // Load speech and timeline when page, voice, or speed changes
  useEffect(() => {
    if (!book || !pageData) return;

    const loadAudioSource = async () => {
      setLoading(true);
      const wasPlaying = isPlaying;
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
      }
      
      try {
        const speech = await api.loadSpeech(book.file_path, currentPage, voice, speed);
        setTimeline(speech.timeline);
        
        if (wavesurferRef.current) {
          const url = speech.audio_url.startsWith("/") ? `http://localhost:8000${speech.audio_url}` : speech.audio_url;
          wavesurferRef.current.load(url);
          
          wavesurferRef.current.once("ready", () => {
            if (wasPlaying) {
              wavesurferRef.current?.play();
            } else {
              setIsPlaying(false);
            }
          });
        }
      } catch (err) {
        console.error("Speech loading failed:", err);
        setIsPlaying(false);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSource();
  }, [book?.file_path, currentPage, voice, speed, pageData]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepMinutes !== null) {
      setSleepTimeRemaining(sleepMinutes * 60);
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      
      sleepTimerRef.current = setInterval(() => {
        setSleepTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (wavesurferRef.current) wavesurferRef.current.pause();
            setIsPlaying(false);
            if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
            setSleepMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      setSleepTimeRemaining(null);
    }

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepMinutes]);

  const togglePlay = () => {
    if (!wavesurferRef.current || loading) return;
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handlePrevSentence = () => {
    if (!wavesurferRef.current || timeline.length === 0) return;
    const currentIdx = activeSentenceIndex !== null ? activeSentenceIndex : 0;
    if (currentIdx > 0) {
      const prevTarget = timeline.find(item => item.sentence_index === currentIdx - 1);
      if (prevTarget) {
        wavesurferRef.current.setTime(prevTarget.start_time);
        setCurrentTime(prevTarget.start_time);
        onSentenceHighlight(currentIdx - 1);
      }
    } else if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextSentence = () => {
    if (!wavesurferRef.current || timeline.length === 0) return;
    const currentIdx = activeSentenceIndex !== null ? activeSentenceIndex : 0;
    if (currentIdx < timeline.length - 1) {
      const nextTarget = timeline.find(item => item.sentence_index === currentIdx + 1);
      if (nextTarget) {
        wavesurferRef.current.setTime(nextTarget.start_time);
        setCurrentTime(nextTarget.start_time);
        onSentenceHighlight(currentIdx + 1);
      }
    } else if (book && currentPage < book.page_count) {
      onPageChange(currentPage + 1);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  const formatSleepTime = (sec: number | null) => {
    if (sec === null) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSentence();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextSentence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, loading, timeline, activeSentenceIndex, currentPage]);

  if (!book) return null;

  return (
    <div className="bottom-player redesigned-player">
      
      {/* Waveform takes center stage at the top of the player */}
      <div className="player-waveform-container" style={{ width: "100%", padding: "0 40px", marginTop: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
        <span className="time-label" style={{ minWidth: "40px", textAlign: "right", fontWeight: "500" }}>{formatSeconds(currentTime)}</span>
        <div ref={containerRef} style={{ flexGrow: 1, height: "60px", cursor: "pointer", borderRadius: "8px", overflow: "hidden" }}></div>
        <span className="time-label" style={{ minWidth: "40px", textAlign: "left", opacity: 0.7 }}>-{formatSeconds(duration - currentTime)}</span>
      </div>

      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", padding: "12px 40px 20px" }}>
        {/* Book details */}
        <div 
          className="player-info" 
          onClick={onOpenReader}
          style={{ cursor: onOpenReader ? "pointer" : "default", width: "25%" }}
          title={onOpenReader ? "Open Reader" : ""}
        >
          <div className="player-cover" style={{ width: "56px", height: "56px" }}>
            <Clock size={24} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="player-text">
            <span className="player-title" style={{ fontSize: "15px" }}>{book.title}</span>
            <span className="player-author" style={{ marginTop: "2px" }}>Page {currentPage} of {book.page_count}</span>
          </div>
        </div>

        {/* Main playback control row */}
        <div className="player-controls-container" style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
          <div className="player-buttons" style={{ gap: "24px" }}>
            <button onClick={handlePrevSentence} className="btn-icon hover-scale" title="Previous Sentence">
              <SkipBack size={24} fill="currentColor" stroke="none" />
            </button>
            
            <button 
              onClick={togglePlay} 
              className="btn btn-primary" 
              disabled={loading} 
              style={{ borderRadius: "50%", width: "56px", height: "56px", padding: 0, boxShadow: "0 8px 16px rgba(var(--accent-rgb), 0.3)" }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {loading ? (
                <span className="spin-animation" style={{ display: "inline-block", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", width: "24px", height: "24px" }} />
              ) : isPlaying ? (
                <Pause size={24} fill="#fff" stroke="none" />
              ) : (
                <Play size={24} fill="#fff" stroke="none" style={{ marginLeft: "4px" }} />
              )}
            </button>

            <button onClick={handleNextSentence} className="btn-icon hover-scale" title="Next Sentence">
              <SkipForward size={24} fill="currentColor" stroke="none" />
            </button>
          </div>
        </div>

        {/* Settings, Speed, Sleep */}
        <div className="player-settings" style={{ width: "25%", gap: "16px" }}>
          {sleepTimeRemaining !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--accent-color)", fontWeight: "600", padding: "4px 8px", backgroundColor: "rgba(var(--accent-rgb), 0.1)", borderRadius: "12px" }}>
              <Timer size={14} />
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatSleepTime(sleepTimeRemaining)}</span>
            </div>
          )}

          <div className="player-settings-item">
            <Volume2 size={18} style={{ color: "var(--text-secondary)" }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              style={{ width: "70px", height: "4px", accentColor: "var(--text-primary)" }}
            />
          </div>

          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="btn-icon hover-scale" 
            title="Advanced Settings"
            style={{ position: "relative", backgroundColor: showSettings ? "var(--bg-card)" : "transparent" }}
          >
            <MoreHorizontal size={20} />
          </button>

          {/* Floating Settings Drawer */}
          {showSettings && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              marginBottom: "16px",
              right: "40px",
              backgroundColor: "var(--bg-sidebar)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.5)",
              width: "320px",
              zIndex: 200,
              textAlign: "left"
            }}>
              <h4 style={{ margin: "0", fontSize: "15px", fontWeight: "600", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>Playback Settings</h4>
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "13px" }}>Voice</label>
                <select 
                  className="form-input" 
                  value={voice} 
                  onChange={(e) => onVoiceChange(e.target.value)}
                  style={{ padding: "10px 12px", backgroundColor: "var(--bg-card)" }}
                >
                  {voicesList.map((v) => (
                    <option key={v.short_name} value={v.short_name}>
                      {v.friendly_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                  <span>Speed</span>
                  <span style={{ color: "var(--accent-color)", fontWeight: "600" }}>{speed}x</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={speed}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-color)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: "13px" }}>Sleep Timer</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {[15, 30, 45, 0].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        if (mins === 0) {
                          setSleepMinutes(null);
                        } else {
                          setSleepMinutes(mins);
                        }
                      }}
                      className={`btn ${((mins === 0 && sleepMinutes === null) || (mins > 0 && sleepMinutes === mins)) ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "8px", fontSize: "12px", borderRadius: "8px" }}
                    >
                      {mins === 0 ? "Off" : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
