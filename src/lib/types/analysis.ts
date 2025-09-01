// Canonical music analysis types used across client and server

export interface ChordInfo {
  start: number;
  end: number;
  chord_majmin: string;
}

export interface AnalyzedTrack {
  lyrics: string; // Lyrics
  chords: ChordInfo[]; // Chords structure
  moods: string[]; // Mood
  genres: string[]; // Genre
  subgenres: string[]; // Subgenre
  instruments: string[]; // Instruments
  movements: string[]; // Movement
  energyLevel: string; // Energy
  emotion: string; // Emotion
  language: string; // Language
  key: string; // Root Key
  timeSignature: string; // Time signature
  voiceGender: string; // Voice gender
  voicePresence: string; // Voice presence
  musicalEra: string; // Musical era
  duration: number; // Duration (seconds)
  cover: string; // Cover (url)
}

// Client-visible wrapper stored in session and passed between routes
export type AnalysisResult = {
  id: string;
  provider: string;
  data: ({
    fileName?: string;
    size?: number;
    type?: string;
    tempo?: number;
    mood?: string;
    analyzedTrack: AnalyzedTrack;
  } & Record<string, unknown>);
};
