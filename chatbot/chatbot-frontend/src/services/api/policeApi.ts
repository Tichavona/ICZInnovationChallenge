// src/services/api/policeApi.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class PoliceApiService {
  private baseUrl = `${API_BASE_URL}/dashboard/police`;

  async getIncidents(params: {
    status?: string;
    timeframe?: '24h' | '7d' | '30d';
    stationId?: string;
    district?: string;
  }) {
    const response = await axios.get(`${this.baseUrl}/incidents`, { params });
    return response.data;
  }

  async getIncidentDetails(id: string) {
    const response = await axios.get(`${this.baseUrl}/incidents/${id}`);
    return response.data;
  }

  async assignIncident(id: string, data: { stationId: string; staffIds?: string[] }) {
    const response = await axios.post(`${this.baseUrl}/incidents/${id}/assign`, data);
    return response.data;
  }

  async updateIncidentStatus(id: string, data: { status: string; notes?: string }) {
    const response = await axios.post(`${this.baseUrl}/incidents/${id}/status`, data);
    return response.data;
  }

  async getCrimeHeatmap(stationId?: string, days: number = 30) {
    const response = await axios.get(`${this.baseUrl}/analytics/heatmap`, {
      params: { stationId, days }
    });
    return response.data;
  }

  async getResponseTimeAnalytics(period: '24h' | '7d' | '30d' | '90d' = '30d') {
    const response = await axios.get(`${this.baseUrl}/analytics/response-times`, {
      params: { period }
    });
    return response.data;
  }

  async getCrimeTypeBreakdown(stationId?: string, days: number = 30) {
    const response = await axios.get(`${this.baseUrl}/analytics/crime-types`, {
      params: { stationId, days }
    });
    return response.data;
  }

  async getStaffPerformance(stationId?: string) {
    const response = await axios.get(`${this.baseUrl}/staff/performance`, {
      params: { stationId }
    });
    return response.data;
  }

  async getResourceStatus(stationId?: string) {
    const response = await axios.get(`${this.baseUrl}/resources/status`, {
      params: { stationId }
    });
    return response.data;
  }

  async getMetrics(timeframe: string, stationId?: string) {
    const response = await axios.get(`${this.baseUrl}/metrics`, {
      params: { timeframe, stationId }
    });
    return response.data;
  }

  async getStations() {
    const response = await axios.get(`${this.baseUrl}/stations`);
    return response.data;
  }

  async getStationDetails(id: string) {
    const response = await axios.get(`${this.baseUrl}/stations/${id}`);
    return response.data;
  }
}

export const policeApi = new PoliceApiService();
