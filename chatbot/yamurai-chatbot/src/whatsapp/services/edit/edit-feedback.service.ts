/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyReport } from '../../../database/emergency-report.entity';
import { IssueReport } from '../../../database/issue-report.entity';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EditFeedbackService {
  private readonly logger = new Logger(EditFeedbackService.name);
  private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepository: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    private issueRepository: Repository<IssueReport>,
  ) {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = ['edit_media', 'feedback_media'];
    dirs.forEach(dir => {
      const path = join(this.baseDir, dir);
      if (!existsSync(path)) mkdirSync(path, { recursive: true });
    });
  }

  async saveEditMedia(
    buffer: Buffer,
    filename: string,
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE'
    ): Promise<string> {
        try {
            const dir = join(this.baseDir, 'edit_media', reportType.toLowerCase(), reportId.toString());
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            const filePath = join(dir, filename);
            const fs = require('fs');
            fs.writeFileSync(filePath, buffer);

            return filePath;
        } catch (error) {
            this.logger.error('Error saving edit media:', error);
            throw error;
        }
    }

  /**
   * Show edit menu to user
   */
  getEditMenu(reportType: 'EMERGENCY' | 'ISSUE', reportId: number, report?: any): string {
    let baseMessage = `📝 *EDIT MENU - Report #${reportId}*\n\n`;

    if (report && report.status) {
        const statusEmoji = this.getStatusEmoji(report.status);
        baseMessage += `Current Status: ${statusEmoji} ${report.status}\n\n`;
    }
    
    const options = reportType === 'EMERGENCY' 
      ? this.getEmergencyEditOptions()
      : this.getIssueEditOptions();

    return baseMessage + options;
  }

  private getEmergencyEditOptions(): string {
    return `What would you like to edit or add?\n\n` +
      `1️⃣ *Add Media* - Add more photos/videos/voice notes\n` +
      `2️⃣ *Add Note* - Add additional information\n` +
      `3️⃣ *Update Location* - Correct or update location\n` +
      `4️⃣ *Update Description* - Modify the emergency description\n` +
      `5️⃣ *Provide Feedback* - Add feedback about the response\n\n` +
      `📋 *Commands:*\n` +
      `• Type the number (1-5) to select option\n` +
      `• Type "BACK" to return to previous step\n` +
      `• Type "CANCEL" to exit edit mode\n` +
      `• Type "MENU" to see this menu again`;
  }

  private getIssueEditOptions(): string {
    return `What would you like to edit or add?\n\n` +
      `1️⃣ *Add Media* - Add more photos/videos/voice notes\n` +
      `2️⃣ *Add Note* - Add additional information\n` +
      `3️⃣ *Update Location* - Correct or update location\n` +
      `4️⃣ *Update Description* - Modify the issue description\n` +
      `5️⃣ *Status Update* - Check or update status\n\n` +
      `📋 *Commands:*\n` +
      `• Type the number (1-5) to select option\n` +
      `• Type "BACK" to return to previous step\n` +
      `• Type "CANCEL" to exit edit mode\n` +
      `• Type "MENU" to see this menu again`;
  }

  /**
   * Handle edit selection
   */
  async handleEditSelection(
    selection: string,
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number
  ): Promise<{ message: string; requiresInput: boolean; action?: string }> {
    // Map text commands to actions
    const commandMap: Record<string, string> = {
      'add media': 'ADD_MEDIA',
      'add note': 'ADD_NOTE',
      'update location': 'UPDATE_LOCATION',
      'update description': 'UPDATE_DESCRIPTION',
      'provide feedback': 'PROVIDE_FEEDBACK',
      'status update': 'STATUS_UPDATE',
      'status': 'STATUS_UPDATE'
    };

    const selectionMap = {
      '1': 'ADD_MEDIA',
      '2': 'ADD_NOTE',
      '3': 'UPDATE_LOCATION',
      '4': 'UPDATE_DESCRIPTION',
      '5': reportType === 'EMERGENCY' ? 'PROVIDE_FEEDBACK' : 'STATUS_UPDATE'
    };

    let action: string | undefined;

    // Check if it's a numeric selection
    if (selectionMap[selection]) {
      action = selectionMap[selection];
    } 
    // Check if it's a text command
    else if (commandMap[selection.toLowerCase()]) {
      action = commandMap[selection.toLowerCase()];
    }

    if (!action) {
      return {
        message: '❌ Invalid selection. Please choose 1-5, use text commands like "add media", or type "BACK" or "CANCEL".',
        requiresInput: false
      };
    }

    const baseResponse = {
        action,
        requiresInput: true
    };

    switch (action) {
      case 'ADD_MEDIA':
        return {
            ...baseResponse,
            message: '📸 Please send the photos, videos, or voice notes you want to add. You can send multiple files.\n\nWhen finished, type "DONE" or "SUBMIT".\n\nType "BACK" to return to edit menu.',
        };

      case 'ADD_NOTE':
        return {
            ...baseResponse,
            message: '📝 Please type your additional notes:\n\nType "BACK" to return to edit menu.',
        };

      case 'UPDATE_LOCATION':
        return {
            ...baseResponse,
            message: '📍 Please send your new location (tap 📎 icon and send location) or type the address:\n\nType "BACK" to return to edit menu.',
        };

      case 'UPDATE_DESCRIPTION':
        return {
            ...baseResponse,
            message: '📋 Please type the updated description:\n\nType "BACK" to return to edit menu.',
        };

      case 'PROVIDE_FEEDBACK':
        return {
            ...baseResponse,
            message: '⭐ Please provide your feedback (1-5 stars) and comments:\n\nExample: "4 - Quick response but need more updates"\n\nType "BACK" to return to edit menu.',
        };

      case 'STATUS_UPDATE':
        const statusResponse = await this.getStatusUpdate(reportId, reportType);
        return {
            ...baseResponse,
            ...statusResponse
        };

      default:
        return {
          message: '❌ Invalid action selected.',
          requiresInput: false
        };
    }
  }

  private async getStatusUpdate(
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE'
  ): Promise<{ message: string; requiresInput: boolean }> {
    let report: EmergencyReport | IssueReport | null = null;

    if (reportType === 'EMERGENCY') {
      report = await this.emergencyRepository.findOne({ where: { id: reportId } });
    } else {
      report = await this.issueRepository.findOne({ where: { id: reportId } });
    }

    if (!report) {
      return {
        message: '❌ Report not found.',
        requiresInput: false
      };
    }

    const statusEmoji = this.getStatusEmoji(report.status);
    const updatedAt = report.updatedAt.toLocaleString();

    return {
      message: `📊 *STATUS UPDATE - Report #${reportId}*\n\n` +
        `🔄 Status: ${statusEmoji} ${report.status}\n` +
        `📅 Last Updated: ${updatedAt}\n\n` +
        `Would you like to:\n` +
        `1. Request status update\n` +
        `2. Add follow-up comment\n` +
        `3. Mark as resolved\n\n` +
        `Type your choice (1-3):\n\n` +
        `Type "BACK" to return to edit menu.`,
      requiresInput: true,
    };
  }

  /**
   * Apply edit to report
   */
  async applyEdit(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    action: string,
    data: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (reportType === 'EMERGENCY') {
        return await this.applyEmergencyEdit(reportId, action, data);
      } else {
        return await this.applyIssueEdit(reportId, action, data);
      }
    } catch (error) {
      this.logger.error('Error applying edit:', error);
      return {
        success: false,
        message: '❌ Failed to apply edit. Please try again.'
      };
    }
  }

  private async applyEmergencyEdit(
    reportId: number,
    action: string,
    data: any
  ): Promise<{ success: boolean; message: string }> {
    const report = await this.emergencyRepository.findOne({ where: { id: reportId } });
    
    if (!report) {
      return { success: false, message: '❌ Emergency report not found.' };
    }

    const updateData: any = {};
    let editDescription = '';

    // Handle new departments from hazard detection
    if (data.newDepartments && data.newDepartments.length > 0) {
      const currentDepartments = report.assignedDepartments || [];
      
      const allDepartments = [...new Set([...currentDepartments, ...data.newDepartments])];
      updateData.assignedDepartmentsJson = JSON.stringify(allDepartments);
      
      // Update blood detection if present
      if (data.hazardDetected?.type === 'blood') {
        const bloodDetected = {
          keywords: data.hazardDetected.keywords || [],
          severity: data.hazardDetected.severity || 'high',
          detectedAt: new Date().toISOString(),
          originalMessage: data.note || data.description || '',
          detectedInEdit: true
        };
        updateData.bloodDetectedJson = JSON.stringify(bloodDetected);
      }
      
      // Update fire detection if present
      if (data.hazardDetected?.type === 'fire') {
        const fireDetected = {
          keywords: data.hazardDetected.keywords || [],
          severity: data.hazardDetected.severity || 'high',
          detectedAt: new Date().toISOString(),
          originalMessage: data.note || data.description || '',
          detectedInEdit: true,
          fireType: data.hazardDetected.fireType || 'unknown'
        };
        updateData.fireHazardDetectedJson = JSON.stringify(fireDetected);
      }
    }

    switch (action) {
      case 'ADD_MEDIA':
        const mediaUrls = report.mediaUrls || [];
        if (data.media && Array.isArray(data.media)) {
          data.media.forEach((media: any) => {
            mediaUrls.push(media.url);
          });
          updateData.mediaUrlsJson = JSON.stringify(mediaUrls);
          editDescription = `Added ${data.media.length} media file(s)`;
        }
        break;

      case 'ADD_NOTE':
        const notes = report.additionalNotes || [];
        const timestamp = new Date().toISOString();
        notes.push(`[EDIT ${timestamp}] ${data.note}`);
        updateData.additionalNotesJson = JSON.stringify(notes);
        editDescription = 'Added additional note';
        break;

      case 'UPDATE_LOCATION':
        updateData.location = data.location;
        if (data.latitude && data.longitude) {
          updateData.latitude = data.latitude;
          updateData.longitude = data.longitude;
        }
        editDescription = 'Updated location';
        break;

      case 'UPDATE_DESCRIPTION':
        updateData.description = data.description;
        editDescription = 'Updated description';
        break;

      case 'PROVIDE_FEEDBACK':
        if (data.rating) updateData.rating = data.rating;
        if (data.feedback) {
          const timestamp = new Date().toISOString();
          const existingFeedback = report.userFeedback || '';
          updateData.userFeedback = existingFeedback + `\n\n[EDIT ${timestamp}] Rating: ${data.rating}/5\n${data.feedback}`;
        }
        editDescription = 'Added feedback';
        break;
        
      case 'STATUS_UPDATE':
        if (data.statusChoice === '3') {
          // Mark as resolved
          updateData.status = 'RESOLVED' as any;
          updateData.resolvedAt = new Date();
          editDescription = 'Marked as resolved';
        } else if (data.statusChoice === '2' && data.followupComment) {
          // Add follow-up comment
          const followup = report.followupComments || [];
          followup.push({
            timestamp: new Date().toISOString(),
            comment: data.followupComment,
            type: 'USER_FOLLOWUP'
          });
          updateData.followupCommentsJson = JSON.stringify(followup);
          editDescription = 'Added follow-up comment';
        } else if (data.statusChoice === '1') {
          // Request status update
          const followup = report.followupComments || [];
          followup.push({
            timestamp: new Date().toISOString(),
            comment: 'User requested status update',
            type: 'STATUS_REQUEST'
          });
          updateData.followupCommentsJson = JSON.stringify(followup);
          editDescription = 'Requested status update';
        }
        break;
        
      default:
        return { success: false, message: '❌ Invalid edit action.' };
    }

    // Add edit history - get existing history as array first
    const existingHistory = report.editHistory || [];
    
    // Create new history item
    const newHistoryItem = {
      timestamp: new Date(),
      action: action,
      description: editDescription,
      editedBy: 'USER',
      hazardDetected: data.hazardDetected ? true : false,
      newDepartments: data.newDepartments || []
    };
    
    // Combine existing history with new item
    const updatedHistory = [...existingHistory, newHistoryItem];
    
    // Set the edit history using the setter (which expects an array)
    // We need to use the property that the setter is attached to
    // The setter is on 'editHistory', so we need to assign to that property
    // But we can't directly assign to report.editHistory because it uses the getter/setter
    // Instead, we'll set the JSON string directly
    
    // Convert the history array to JSON string format expected by the setter
    const serializedHistory = updatedHistory.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString()
    }));
    
    updateData.editHistoryJson = JSON.stringify(serializedHistory);
    updateData.updatedAt = new Date();
    updateData.lastEditedAt = new Date();
    updateData.lastEditedBy = 'USER';

    // Apply all updates at once
    Object.assign(report, updateData);
    await this.emergencyRepository.save(report);

    // Log the edit
    this.logger.log(`Emergency report #${reportId} edited: ${editDescription}`);

    let hazardMessage = '';
    if (data.hazardDetected) {
      hazardMessage = `\n\n⚠️ *Note:* ${data.hazardDetected.message}`;
    }
    
    if (data.newDepartments && data.newDepartments.length > 0) {
      hazardMessage += `\n\n🏥 *Additional departments notified:* ${data.newDepartments.join(', ')}`;
    }

    return {
      success: true,
      message: `✅ Emergency report #${reportId} updated successfully!\n\nChanges: ${editDescription}${hazardMessage}`
    };
  }

  private async applyIssueEdit(
    reportId: number,
    action: string,
    data: any
  ): Promise<{ success: boolean; message: string }> {
    const report = await this.issueRepository.findOne({ where: { id: reportId } });
    
    if (!report) {
      return { success: false, message: '❌ Issue report not found.' };
    }

    const updateData: any = {};
    let editDescription = '';

    switch (action) {
      case 'ADD_MEDIA':
        const mediaInfo = report.mediaInfo || [];
        if (data.media && Array.isArray(data.media)) {
            data.media.forEach((media: any) => {
                mediaInfo.push({
                    type: media.type,
                    path: media.url,
                    addedAt: new Date()
                });
            });
            updateData.mediaInfo = mediaInfo;
            editDescription = `Added ${data.media.length} media file(s)`;
        }
        break;

      case 'ADD_NOTE':
        const timestamp = new Date().toISOString();
        const currentDesc = report.description || '';
        updateData.description = currentDesc + `\n\n[EDIT ${timestamp}] Additional note: ${data.note}`;
        editDescription = 'Added additional note';
        break;

      case 'UPDATE_LOCATION':
        updateData.location = data.location;
        if (data.latitude && data.longitude) {
            updateData.latitude = data.latitude;
            updateData.longitude = data.longitude;
        }
        editDescription = 'Updated location';
        break;

      case 'UPDATE_DESCRIPTION':
        updateData.description = data.description;
        editDescription = 'Updated description';
        break;
        
      case 'STATUS_UPDATE':
        if (data.statusChoice === '3') {
            // Mark as resolved
            updateData.status = 'RESOLVED';
            updateData.resolvedAt = new Date();
            editDescription = 'Marked as resolved';
        } else if (data.statusChoice === '2' && data.followupComment) {
            // Add follow-up comment
            const currentDesc = report.description || '';
            updateData.description = currentDesc + `\n\n[EDIT ${new Date().toISOString()}] Follow-up: ${data.followupComment}`;
            editDescription = 'Added follow-up comment';
        } else if (data.statusChoice === '1') {
            // Request status update - add to description
            const currentDesc = report.description || '';
            updateData.description = currentDesc + `\n\n[EDIT ${new Date().toISOString()}] Status update requested`;
            editDescription = 'Requested status update';
        }
        break;

      default:
        return { success: false, message: '❌ Invalid edit action.' };
    }

    // Add edit history
    const existingHistory = report.editHistory || [];
    
    const newHistoryItem = {
      timestamp: new Date(),
      action: action,
      description: editDescription,
      editedBy: 'USER'
    };
    
    const updatedHistory = [...existingHistory, newHistoryItem];
    
    // Serialize for storage
    const serializedHistory = updatedHistory.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString()
    }));
    
    updateData.editHistoryJson = JSON.stringify(serializedHistory);
    updateData.updatedAt = new Date();
    updateData.lastEditedAt = new Date();
    updateData.lastEditedBy = 'USER';

    // Apply updates
    Object.assign(report, updateData);
    await this.issueRepository.save(report);

    // Log the edit
    this.logger.log(`Issue report #${reportId} edited: ${editDescription}`);

    return {
      success: true,
      message: `✅ Issue report #${reportId} updated successfully!\n\nChanges: ${editDescription}`
    };
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'reported': '📝',
      'in_progress': '🔄',
      'dispatched': '🚗',
      'resolved': '✅',
      'closed': '🔒',
      'cancelled': '❌'
    };
    return emojiMap[status] || '📋';
  }
} 
