/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BloodDetectionService {
  private readonly logger = new Logger(BloodDetectionService.name);
  
  // Blood/bleeding keywords in multiple languages
  private readonly bloodKeywords = [
    // English
    'blood', 'bleeding', 'bleed', 'bleeds', 'bleeder',
    'cut', 'cuts', 'cutting', 'gash', 'laceration', 'wound',
    'hemorrhage', 'haemorrhage', 'blood loss', 'losing blood',
    'bloody', 'bloodied', 'profuse bleeding', 'severe bleeding',
    'uncontrolled bleeding', 'stop the bleeding', 'bleeding heavily',
    'injured', 'injury', 'wounded', 'hurt', 'trauma',
    
    // Shona
    'ropa', 'kubuda ropa', 'kujuja ropa', 'ropa riri kubuda',
    'kukuvara', 'ronda', 'maronda', 'kuvadza', 'kuvadzwa',
    'kucheka', 'kuchekwa', 'kugurwa', 'kugurwa neropa',
    'kurohwa', 'kupwanywa', 'kuparara', 'kutyoka',
    
    // Ndebele
    'igazi', 'ukopha', 'ukopha kakhulu', 'ukulimala',
    'isilonda', 'amanxeba', 'ukulinyazwa', 'ukulinyaza',
    'ukusikwa', 'ukugwazwa', 'ukutshayana', 'ukulwa',
    
    // Contextual phrases
    'needs medical attention', 'needs doctor', 'needs hospital',
    'seriously injured', 'critically injured', 'life-threatening',
    'unconscious and bleeding', 'bleeding from head', 'bleeding from wound',
    'deep cut', 'open wound', 'bleeding heavily', 'bleeding profusely',
    'can\'t stop bleeding', 'won\'t stop bleeding', 'bleeding out'
  ];

  // Severity indicators
  private readonly severityKeywords = {
    critical: ['severe', 'profuse', 'uncontrolled', 'gushing', 'spurting', 'life-threatening', 'critical'],
    high: ['heavy', 'significant', 'lots of', 'much', 'serious'],
    medium: ['some', 'moderate', 'bleeding', 'minor cut'],
    low: ['small', 'little', 'slight', 'scrape', 'scratch']
  };

  /**
   * Check if text contains blood/bleeding keywords
   */
  containsBloodKeywords(text: string): boolean {
    if (!text) return false;
    
    const normalizedText = text.toLowerCase();
    return this.bloodKeywords.some(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract blood-related keywords from text
   */
  extractBloodKeywords(text: string): string[] {
    if (!text) return [];
    
    const normalizedText = text.toLowerCase();
    const foundKeywords: string[] = [];
    
    for (const keyword of this.bloodKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }
    
    return foundKeywords;
  }

  /**
   * Assess bleeding severity based on keywords
   */
  assessSeverity(text: string): { level: 'critical' | 'high' | 'medium' | 'low'; score: number } {
    if (!text) return { level: 'low', score: 0 };
    
    const normalizedText = text.toLowerCase();
    let severityScore = 0;
    
    // Check for critical keywords
    for (const keyword of this.severityKeywords.critical) {
      if (normalizedText.includes(keyword)) {
        severityScore += 10;
      }
    }
    
    // Check for high severity keywords
    for (const keyword of this.severityKeywords.high) {
      if (normalizedText.includes(keyword)) {
        severityScore += 5;
      }
    }
    
    // Check for medium severity keywords
    for (const keyword of this.severityKeywords.medium) {
      if (normalizedText.includes(keyword)) {
        severityScore += 2;
      }
    }
    
    // Determine level based on score
    if (severityScore >= 15) return { level: 'critical', score: severityScore };
    if (severityScore >= 8) return { level: 'high', score: severityScore };
    if (severityScore >= 3) return { level: 'medium', score: severityScore };
    return { level: 'low', score: severityScore };
  }

  /**
   * Get medical response recommendation based on severity
   */
  getMedicalResponse(severity: 'critical' | 'high' | 'medium' | 'low'): string {
    const responses = {
      critical: '🚨 *CRITICAL BLEEDING DETECTED*\n• Immediate ambulance dispatch required\n• Emergency medical team notified\n• Prepare for life-saving interventions',
      high: '🆘 *SERIOUS BLEEDING DETECTED*\n• Urgent medical response dispatched\n• Ambulance on the way\n• Medical team alerted',
      medium: '🏥 *MODERATE BLEEDING DETECTED*\n• Medical assistance dispatched\n• Ambulance responding\n• Provide first aid if trained',
      low: '💊 *MINOR BLEEDING INDICATED*\n• Basic medical support notified\n• First aid guidance available\n• Monitor for changes'
    };
    
    return responses[severity];
  }
}
