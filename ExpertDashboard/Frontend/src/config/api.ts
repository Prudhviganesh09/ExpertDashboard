// API Configuration
// Use relative paths since backend serves both frontend and API on same port
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export { API_BASE_URL };

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/user/login`,
    LOGIN_ALT: `${API_BASE_URL}/auth/login`, // Alternative login endpoint
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    VERIFY: `${API_BASE_URL}/auth/verify`,
  },
  CLIENTS: `${API_BASE_URL}/webhook-handler`,
  MEETINGS: `${API_BASE_URL}/meetings`,
  PROPERTIES: `${API_BASE_URL}/properties-cache`,
  WEBHOOK_PROXY: `${API_BASE_URL}/webhook-proxy`,
  CREATE_REQUIREMENT: `${API_BASE_URL}/create-requirement`,
  REQUIREMENTS: `${API_BASE_URL}/requirements`,
  AREA_NAMES: `${API_BASE_URL}/area-names`,
  PROPERTY_ID: `${API_BASE_URL}/property-id`,
  PROPERTY_IDS: `${API_BASE_URL}/property-ids`,
  ALL_PROPERTIES: `${API_BASE_URL}/all-properties`,
  AGENTS: `${API_BASE_URL}/agents`,
  AGENTS_STATS: `${API_BASE_URL}/agents/stats`,
  AGENT_STATS: (agentId: string) => `${API_BASE_URL}/agent/${agentId}/stats`,
  AGENT_CLIENTS: (agentId: string) => `${API_BASE_URL}/agent/${agentId}/clients`,
  CLIENT_AGENT_ASSIGNMENTS: `${API_BASE_URL}/client-agent-assignments`,
  ASSIGN_CLIENT_TO_AGENT: (clientId: string) => `${API_BASE_URL}/clients/${clientId}/assign-agent`,
  ZOHO_LEADS: (ownerEmail: string) => `${API_BASE_URL}/zoho/leads?ownerEmail=${encodeURIComponent(ownerEmail)}`,
  EXPERT_MEETINGS: {
    LIST: (clientId: string) => `${API_BASE_URL}/expert-meetings/${clientId}`,
    CREATE: `${API_BASE_URL}/expert-meetings`,
    CHECK_AVAILABILITY: (expertEmail: string, startTime: string, endTime: string) => 
      `${API_BASE_URL}/expert-meetings/availability/${expertEmail}?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
  },
  EXPERTS: `${API_BASE_URL}/experts`,
};