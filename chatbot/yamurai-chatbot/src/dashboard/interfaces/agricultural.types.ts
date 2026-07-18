/* eslint-disable prettier/prettier */
import { CropDiseaseReport, FarmDisasterReport } from '../../database/farmer.entity';

export enum AgriculturalIncidentType {
  CROP_DISEASE = 'crop_disease',
  PEST_INFESTATION = 'pest_infestation',
  LIVESTOCK_DISEASE = 'livestock_disease',
  DROUGHT = 'drought',
  FLOOD = 'flood',
  STORM_DAMAGE = 'storm_damage',
  FIRE = 'fire',
  HAIL_DAMAGE = 'hail_damage',
  FROST_DAMAGE = 'frost_damage',
  SOIL_DEGRADATION = 'soil_degradation',
  OTHER = 'other'
}

export enum AgriculturalSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EPIDEMIC = 'epidemic'
}

export enum AgriculturalStatus {
  REPORTED = 'reported',
  ASSESSED = 'assessed',
  TREATMENT_IN_PROGRESS = 'treatment_in_progress',
  MONITORING = 'monitoring',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  UNRESOLVABLE = 'unresolvable'
}

export enum AdvisoryType {
  DISEASE_PREVENTION = 'disease_prevention',
  PEST_CONTROL = 'pest_control',
  WEATHER_WARNING = 'weather_warning',
  FARMING_PRACTICE = 'farming_practice',
  MARKET_INFO = 'market_info',
  EMERGENCY_ALERT = 'emergency_alert'
}

export interface BaseAgriculturalIncident {
  id: number;
  user: any;
  severity: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CropDiseaseIncident extends BaseAgriculturalIncident {
  incidentType: 'crop_disease';
  cropType: string;
  diseaseName: string;
  symptoms: string;
  affectedArea: number;
  originalData: CropDiseaseReport;
}

export interface FarmDisasterIncident extends BaseAgriculturalIncident {
  incidentType: 'farm_disaster';
  disasterType: string;
  description: string;
  estimatedLoss: number;
  needsAssistance: boolean;
  assistanceType: string;
  originalData: FarmDisasterReport;
}

export type AgriculturalIncident = CropDiseaseIncident | FarmDisasterIncident;