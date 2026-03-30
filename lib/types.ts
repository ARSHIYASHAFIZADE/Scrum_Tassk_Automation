export interface Company {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Template {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export interface ScrumSession {
  id: string;
  user_id: string;
  company_id: string;
  template_id: string | null;
  date: string;
  transcript: string | null;
  generated_document: string | null;
  audio_url: string | null;
  audio_filename: string | null;
  sprint_week: number | null;
  created_at: string;
}

export interface AppContextType {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  templates: Template[];
  refreshCompanies: () => Promise<void>;
  loading: boolean;
}
