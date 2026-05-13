
import React from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ModelPreset {
  name: string;
  url: string;
  description: string;
  avatarId: string;
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  AR = 'AR',
}

