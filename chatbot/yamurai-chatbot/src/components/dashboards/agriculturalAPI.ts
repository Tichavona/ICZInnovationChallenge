/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class AgriculturalApiService {
  private baseUrl = `${API_BASE_URL}/dashboard/agricultural`;

  async getIncidents(params: {
    type?: string;
    severity?: string;
    status?: string;
    cropType?: string;
    region?: string;
    timeframe?: '24h' | '7d' | '30d' | '90d' | 'year';
  }) {
    const response = await axios.get(`${this.baseUrl}/incidents`, { params });
    return response.data;
  }

  async getIncidentDetails(id: string) {
    const response = await axios.get(`${this.baseUrl}/incidents/${id}`);
    return response.data;
  }

  async getHeatmap(params: {
    cropType?: string;
    diseaseName?: string;
    region?: string;
    days?: number;
    minSeverity?: string;
  }) {
    const response = await axios.get(`${this.baseUrl}/heatmap`, { params });
    return response.data;
  }

  async getDiseasePrediction(diseaseName: string, region: string) {
    const response = await axios.get(`${this.baseUrl}/prediction/${diseaseName}`, {
      params: { region }
    });
    return response.data;
  }

  async getAdvisories(params: {
    type?: string;
    targetCrop?: string;
    region?: string;
    priority?: string;
    isActive?: boolean;
    limit?: number;
  }) {
    const response = await axios.get(`${this.baseUrl}/advisories`, { params });
    return response.data;
  }

  async createAdvisory(data: any) {
    const response = await axios.post(`${this.baseUrl}/advisories`, data);
    return response.data;
  }

  async getFarmerStatistics(region?: string, district?: string) {
    const response = await axios.get(`${this.baseUrl}/farmers/statistics`, {
      params: { region, district }
    });
    return response.data;
  }

  async getCropHealthOverview(region?: string, cropType?: string) {
    const response = await axios.get(`${this.baseUrl}/crop-health`, {
      params: { region, cropType }
    });
    return response.data;
  }

  async getResourceNeeds(region?: string, status?: string) {
    const response = await axios.get(`${this.baseUrl}/resources`, {
      params: { region, status }
    });
    return response.data;
  }

  async getMetrics(region?: string, timeframe?: '24h' | '7d' | '30d' | '90d' | 'year') {
    const response = await axios.get(`${this.baseUrl}/metrics`, {
      params: { region, timeframe }
    });
    return response.data;
  }

  async updateIncidentStatus(id: string, data: { status: string; notes?: string }) {
    const response = await axios.post(`${this.baseUrl}/incidents/${id}/update-status`, data);
    return response.data;
  }
}

export const agriculturalApi = new AgriculturalApiService();