export const API_BASE_URL = "http://localhost:8000";

export interface BookMetadata {
  title: string;
  filename: string;
  file_path: string;
  file_size: number;
  page_count: number;
  current_page: number;
  progress: number;
  toc: { title: string; page: number; level: number }[];
  added_at: string;
  last_read_at: string;
  listening_time: number;
  completed: boolean;
  favorite: boolean;
  relative_path?: string;
}

export interface AppConfig {
  library_path: string;
  opened_documents?: string[];
  default_voice: string;
  default_speed: number;
}

export interface Stats {
  total_listening_time: number;
  reading_dates: string[];
  streak: number;
  storage_bytes?: number;
}

export interface PageData {
  page_number: number;
  raw_text: string;
  sentences: string[];
}

export interface TimelineItem {
  sentence_index: number;
  start_time: number;
  end_time: number;
  text: string;
  spoken_text: string;
}

export interface SpeechResponse {
  audio_url: string;
  timeline: TimelineItem[];
}

export interface Voice {
  name: string;
  short_name: string;
  gender: string;
  locale: string;
  friendly_name: string;
}

// Fetch wrapper helper
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("We couldn't find what you were looking for.");
      } else if (response.status === 500) {
        throw new Error("Something went wrong on our end. Please try again.");
      } else {
        throw new Error("An unexpected error occurred.");
      }
    }
    return response.json() as Promise<T>;
  } catch (err: any) {
    if (err.message === "Failed to fetch") {
      throw new Error("Couldn't connect to Author Voice. Are you offline?");
    }
    throw err;
  }
}

export const api = {
  getConfig: () => request<AppConfig>("/api/config"),
  
  updateConfig: (config: AppConfig) =>
    request<AppConfig>("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }),
    
  getStats: () => request<Stats>("/api/stats"),
  
  getLibrary: () => request<{ books: BookMetadata[]; message?: string }>("/api/library"),
  
  scanLibrary: () => request<{ books: BookMetadata[] }>("/api/library/scan", { method: "POST" }),
  
  pickFile: () => request<{ path: string }>("/api/system/pick-file"),
  
  pickFolder: () => request<{ path: string }>("/api/system/pick-folder"),
  
  getBook: (filePath: string) =>
    request<BookMetadata>(`/api/book?file_path=${encodeURIComponent(filePath)}`),
    
  getPage: (filePath: string, page: number) =>
    request<PageData>(`/api/book/page?file_path=${encodeURIComponent(filePath)}&page=${page}`),
    
  updateProgress: (filePath: string, currentPage: number, listeningDelta: number) =>
    request<BookMetadata>("/api/book/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, current_page: currentPage, listening_delta: listeningDelta }),
    }),
    
  toggleFavorite: (filePath: string) =>
    request<BookMetadata>("/api/book/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
    }),
    
  getNotes: (filePath: string) =>
    request<{ content: string }>(`/api/book/notes?file_path=${encodeURIComponent(filePath)}`),
    
  saveNotes: (filePath: string, content: string) =>
    request<{ success: boolean }>("/api/book/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, content }),
    }),
    
  getVoices: () => request<Voice[]>("/api/speech/voices"),
  
  loadSpeech: (filePath: string, page: number, voice: string, speed: number) =>
    request<SpeechResponse>(
      `/api/speech/load?file_path=${encodeURIComponent(filePath)}&page=${page}&voice=${encodeURIComponent(
        voice
      )}&speed=${speed}`
    ),
    
  getAudioStreamUrl: (filePath: string, page: number, voice: string, speed: number) => {
    return `${API_BASE_URL}/api/speech/stream?file_path=${encodeURIComponent(filePath)}&page=${page}&voice=${encodeURIComponent(
      voice
    )}&speed=${speed}`;
  }
};
