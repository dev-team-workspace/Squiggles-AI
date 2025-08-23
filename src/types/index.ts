import { FieldValue, Timestamp} from 'firebase/firestore';
import { ReactNode } from "react";

export interface Creation {
  id: string;
  userId: string;
  originalDrawingUrl: string;
  transformedImageUrl: string;
  upscaledImageUrl?: string;
  createdAt:  string; 
  style: string;
  isPublic?: boolean;
  title?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  // credits: number; // Credits system currently disabled
  funnyUsername?: string;
  createdAt?: any; // Can be Firestore Timestamp or ISO string
  displayName?: string | null;
  photoURL?: string | null;
  lastLoginAt?: any; // Can be Firestore Timestamp or ISO string
  avatarUrl?: string;
  avatarLastRegenAt?: string;
  credits?: number;
  avatarRegenCountToday?: number;
  welcomeCreditsMessageShown?: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  videoUrl?: string; 
  media?: {
    type: 'image' | 'video';
    url: string;
    altText?: string;
    createdAt?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  published: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ProcessDrawingResult {
  transformedImageUrl?: string;
  originalDrawingUrl?: string;
  generatedTitle?: string;
  error?: string;
  simulatedCost?: number;
  
}

export interface UpscaleImageResult {
  upscaledImageUrl?: string;
  error?: string;
  simulatedCost?: number;
}

export interface TogglePublishResult {
  success: boolean;
  error?: string;
  newState?: boolean;
  simulatedCost?: number;
}

export interface GenerateFunnyNameResult {
  funnyName?: string;
  error?: string;
  simulatedCost?: number;
}

export interface GenerateAvatarResult {
  avatarUrl?: string;
  error?: string;
  simulatedCost?: number;
  remainingRegens?: number;
}

export interface NewsItem {
  featuredImage: any;
  excerpt: ReactNode;
  slug: any;
  id: string;
  title: string;
  content: string;
  type: 'text' | 'youtube' | 'image';
  imageUrl?: string;
  youtubeVideoId?: string;
  createdAt: string; // ISO string date
  isPublished: boolean;
  authorId?: string;
}

export interface CreateNewsItemResult {
    success: boolean;
    newsItemId?: string;
    error?: string;
}

export type NotificationType = 'success' | 'error' | 'info' | 'default' | 'warning' | 'daily-style';

export interface NotificationItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  type: NotificationType;
  createdAt: number; // timestamp
  read: boolean;
}

export interface DailyStyle {
  id: string;
  name: string;
  description: string;
  promptForAI: string;
  icon?: React.ElementType;
  dataAiHint: string;
}

// Admin specific types
export interface AdminUserView extends Omit<UserProfile, 'createdAt' | 'lastLoginAt'> {
  createdAt: string; // Ensure ISO string for display
  lastLoginAt?: string; // Ensure ISO string for display
  isAdmin: boolean
  credits : number
}

export interface AdminCreationView extends Creation {
  isPublic: boolean;
  userEmail: string;
  storagePath: string | null;
  downloadUrl: string | null;
  updatedAt: string;
  publicUrl: string;
  likes: number;
  views: number;
  tags: string[];
}
