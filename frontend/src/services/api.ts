import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async signup(email: string, password: string, fullName: string, role = 'STUDENT') {
    const response = await this.client.post('/auth/signup', {
      email,
      password,
      fullName,
      role,
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data.user;
  }

  // Simulations
  async getSimulations() {
    const response = await this.client.get('/simulations');
    return response.data.simulations;
  }

  async getSimulation(slug: string) {
    const response = await this.client.get(`/simulations/${slug}`);
    return response.data;
  }

  // Sessions
  async createSession(data: {
    simulationSlug: string;
    sessionName: string;
    configuration?: any;
    maxRounds?: number;
  }) {
    const response = await this.client.post('/sessions', data);
    return response.data;
  }

  async getSession(sessionId: string) {
    const response = await this.client.get(`/sessions/${sessionId}`);
    return response.data.session;
  }

  async getSessionByCode(code: string) {
    const response = await this.client.get(`/sessions/code/${code}`);
    return response.data.session;
  }

  async joinSession(sessionId: string, playerName: string, role: string) {
    const response = await this.client.post(`/sessions/${sessionId}/join`, {
      playerName,
      role,
    });
    return response.data;
  }

  async startSession(sessionId: string) {
    const response = await this.client.post(`/sessions/${sessionId}/start`);
    return response.data;
  }

  async endSession(sessionId: string) {
    const response = await this.client.post(`/sessions/${sessionId}/end`);
    return response.data;
  }

  // Facilitator dashboard
  async getMyFacilitatorSessions() {
    const response = await this.client.get('/sessions/facilitator/my-sessions');
    return response.data.sessions;
  }

  async getSessionReport(sessionId: string) {
    const response = await this.client.get(`/sessions/${sessionId}/report`);
    return response.data;
  }
}

export const api = new APIClient();

