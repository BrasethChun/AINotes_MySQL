export interface NoteAttachment {
  name: string;
  path: string;
  size: number;
  type: string;
  id: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO Date string
  updatedAt: string;
  thumbnailUrl?: string;
  tags?: string[];
  attachments?: NoteAttachment[];
  meetingDate?: string;
  meetingVenue?: string;
  agenda?: string;
  meetingPriority?: string;
}

export interface User {
  id: string;
  name: string;
  full_name?: string;
  display_name?: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  can_access_welcome?: boolean;
  can_access_it?: boolean;
  can_access_pro?: boolean;
}

export enum RoutePath {
  HOME = '/',
  NOTES = '/notes',
  CREATE_NOTE = '/notes/new',
  EDIT_NOTE = '/notes/:id/edit',
  NOTE_DETAIL = '/notes/:id',
  ACCOUNT = '/account',
  SETTINGS = '/settings',
  LOGIN = '/login',
  SIGNUP = '/signup',
  FORGOT_PASSWORD = '/forgot-password',
  RESET_PASSWORD = '/reset-password',
  IT_DASHBOARD = '/it-dashboard',
  INVOICES = '/invoices',
  CREATE_INVOICE = '/invoices/new',
  EDIT_INVOICE = '/invoices/:id/edit',
  VENDORS = '/vendors',
}