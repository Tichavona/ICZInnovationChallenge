import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface FieldContextResponse {
  field: {
    id: string;
    name: string;
    area_ha: number;
    geometry: any;
  };
  season: {
    id: string;
    crop_name: string;
    crop_type: string;
    variety: string;
    planting_date: string;
    expected_harvest_date: string;
    bbch_stage: string;
    days_after_sowing: number;
    crop_coefficient: number;
    expected_yield: number;
    status: string;
  } | null;
  growth_stage_intelligence: any;
  irrigation_system: any;
  soil: any;
  ndvi: any;
  soil_moisture: any;
  weather: any;
  irrigation_history: any;
  soil_water_balance: any;
  performance_kpis: any;
  context_generated_at: string;
  days_history_included: number;
}

export interface IrrigationAssistantResponse {
  message: string;
  conversation_id?: string;
  recommendations?: any;
  context?: any;
}

@Injectable()
export class FieldContextService {
  private readonly logger = new Logger(FieldContextService.name);
  private readonly BASE_URL: string;
  private readonly API_TIMEOUT = 60000; // 60 seconds
  private readonly SERVICE_KEY: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.BASE_URL = this.configService.get<string>('SUPABASE_URL')!;
    this.SERVICE_KEY = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  /**
   * Get comprehensive field context using the field-context edge function
   * This is the ONLY API call - no direct farm_blocks queries
   */
  async getFieldContext(
    fieldId: string,
    daysHistory: number = 30
  ): Promise<FieldContextResponse> {
    try {
      if (!fieldId) {
        throw new BadRequestException('Field ID is required');
      }

      this.logger.log(`Fetching field context for field ID: ${fieldId} from field-context API`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.BASE_URL}/functions/v1/field-context`,
          {
            field_id: fieldId,
            days_history: daysHistory,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': this.SERVICE_KEY,
            },
            timeout: this.API_TIMEOUT,
          }
        ).pipe(
          timeout(this.API_TIMEOUT),
          map((res) => res.data),
          catchError((error) => {
            if (error.response) {
              this.logger.error(
                `Field context API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
              );
              
              if (error.response.status === 404) {
                throw new BadRequestException(
                  'The field-context service is not available. Please contact support.'
                );
              }
              
              throw new BadRequestException(
                error.response.data?.error || 'Failed to fetch field context'
              );
            }
            this.logger.error('Field context service error:', error.message);
            throw new BadRequestException('Failed to fetch field context');
          })
        )
      );

      this.logger.log(`Successfully fetched field context for ${fieldId}`);
      return response;
    } catch (error) {
      this.logger.error('Error in getFieldContext:', error);
      throw error;
    }
  }

  /**
   * Call the Irrigation Agent Orchestrator
   */
  async askIrrigationAssistant(
    fieldId: string,
    message: string,
    conversationId?: string,
    userId?: string
  ): Promise<IrrigationAssistantResponse> {
    try {
      this.logger.log(`Calling irrigation orchestrator for field: ${fieldId}`);

      const body: any = {
        field_id: fieldId,
        message: message,
      };

      if (conversationId) {
        body.conversation_id = conversationId;
      }

      if (userId) {
        body.user_id = userId;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.BASE_URL}/functions/v1/irrigation-agent-orchestrator`,
          body,
          {
            headers: {
              'Authorization': `Bearer ${this.SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: this.API_TIMEOUT,
          }
        ).pipe(
          timeout(this.API_TIMEOUT),
          map((res) => res.data),
          catchError((error) => {
            if (error.response) {
              this.logger.error(
                `Irrigation orchestrator error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
              );
              throw new BadRequestException(
                error.response.data?.error || 'Failed to get irrigation recommendation'
              );
            }
            this.logger.error('Irrigation orchestrator error:', error.message);
            throw new BadRequestException('Failed to connect to irrigation service');
          })
        )
      );

      this.logger.log(`Successfully got response from irrigation orchestrator`);
      return response;
    } catch (error) {
      this.logger.error('Error calling irrigation orchestrator:', error);
      throw error;
    }
  }

  /**
   * Format field context for WhatsApp display
   */
  formatFieldContextForWhatsApp(context: FieldContextResponse): string {
    let message = `🌾 *FIELD INSIGHTS* 🌾\n\n`;

    // Field and Crop Info
    message += `*📍 Field:* ${context.field.name}\n`;
    message += `*📏 Area:* ${context.field.area_ha?.toFixed(1)} ha\n`;

    if (context.season) {
      message += `*🌱 Crop:* ${context.season.crop_name}\n`;
      message += `*📅 Planting:* ${new Date(context.season.planting_date).toLocaleDateString()}\n`;
      if (context.season.days_after_sowing) {
        message += `*📊 DAS:* ${context.season.days_after_sowing} days\n`;
      }
      message += `*🌿 Stage:* ${context.season.bbch_stage || 'Not specified'}\n\n`;
    }

    // Soil Moisture Status
    if (context.soil_moisture) {
      const moistureEmoji = context.soil_moisture.status === 'Low' ? '🔴' :
                           context.soil_moisture.status === 'Moderate' ? '🟡' : '🟢';
      message += `${moistureEmoji} *Soil Moisture:* ${context.soil_moisture.status}\n`;
      message += `   Current: ${(context.soil_moisture.latest * 100).toFixed(1)}%\n`;
      message += `   Trend: ${context.soil_moisture.trend === 'increasing' ? '📈 Increasing' :
                               context.soil_moisture.trend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}\n\n`;
    }

    // NDVI / Crop Health
    if (context.ndvi) {
      const healthEmoji = context.ndvi.latest > 0.6 ? '🟢' :
                          context.ndvi.latest > 0.4 ? '🟡' : '🔴';
      message += `${healthEmoji} *Crop Health (NDVI):* ${context.ndvi.latest.toFixed(3)}\n`;
      message += `   Trend: ${context.ndvi.trend === 'increasing' ? '📈 Improving' :
                              context.ndvi.trend === 'decreasing' ? '📉 Declining' : '➡️ Stable'}\n\n`;
    }

    // Water Balance
    if (context.soil_water_balance) {
      const waterEmoji = context.soil_water_balance.status === 'Critical' ? '🔴' :
                        context.soil_water_balance.status === 'Moderate stress' ? '🟡' : '🟢';
      message += `${waterEmoji} *Water Balance:* ${context.soil_water_balance.status}\n`;
      message += `   SWC: ${context.soil_water_balance.current_swc_mm?.toFixed(0)}/${context.soil_water_balance.total_available_water_mm?.toFixed(0)}mm\n`;
      message += `   Depletion: ${(context.soil_water_balance.depletion_fraction * 100).toFixed(0)}%\n`;
      if (context.soil_water_balance.irrigation_need) {
        message += `   ⚠️ *IRRIGATION NEEDED!*\n`;
      }
      message += `\n`;
    }

    // Weather Summary
    message += `🌤️ *Weather Summary*\n`;
    message += `   Rain last 7 days: ${context.weather.summary.total_rain_last_7days?.toFixed(1) || 0}mm\n`;
    message += `   Forecast next 7 days: ${context.weather.summary.forecasted_rain_next_7days?.toFixed(1) || 0}mm\n`;
    if (context.weather.summary.avg_temp_last_7days) {
      message += `   Avg temp: ${context.weather.summary.avg_temp_last_7days.toFixed(1)}°C\n`;
    }
    message += `\n`;

    // Irrigation History
    if (context.irrigation_history.last_irrigation) {
      message += `💧 *Last Irrigation*\n`;
      message += `   Date: ${new Date(context.irrigation_history.last_irrigation.event_date).toLocaleDateString()}\n`;
      message += `   Amount: ${context.irrigation_history.last_irrigation.depth_mm}mm\n`;
      message += `   Total last 14 days: ${context.irrigation_history.total_irrigation_last_14days?.toFixed(0) || 0}mm\n\n`;
    }

    message += `📅 *Data as of:* ${new Date(context.context_generated_at).toLocaleString()}\n`;
    message += `💡 *Ask me any farming question about this field!*\n`;
    message += `❌ *Type "CANCEL" to exit ECOFARMER AI*\n`;

    return message;
  }

  /**
   * Format irrigation assistant response for WhatsApp
   */
  formatAssistantResponse(response: IrrigationAssistantResponse): string {
    let message = `🌾 *AGROMATE AI* 🌾\n\n`;
    message += response.message;
    
    if (response.conversation_id) {
      message += `\n\n💡 *Tip:* You can continue this conversation by asking follow-up questions.`;
    }
    
    message += `\n\n❌ Type "CANCEL" to exit AGROMATE AI.`;
    
    return message;
  }

  /**
   * Format error message for WhatsApp
   */
  formatErrorMessage(error: string): string {
    return `❌ *Error*\n\n${error}\n\nPlease try again or type "CANCEL" to exit AGROMATE AI.`;
  }
}