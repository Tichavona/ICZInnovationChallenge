/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FireHazardDetectionService {
  private readonly logger = new Logger(FireHazardDetectionService.name);
  
  // Fire hazard keywords in multiple languages
  private readonly fireKeywords = [
    // English
    'fire', 'fire hazard', 'fire emergency', 'fire outbreak', 'fire incident',
    'burning', 'burn', 'burns', 'burned', 'burnt', 'on fire',
    'smoke', 'smoking', 'smoky', 'smoke inhalation', 'thick smoke',
    'flames', 'flame', 'blaze', 'inferno', 'wildfire', 'forest fire',
    'house fire', 'building fire', 'structure fire', 'electrical fire',
    'gas fire', 'kitchen fire', 'car fire', 'vehicle fire',
    'fire spreading', 'fire alarm', 'fire extinguisher', 'fire department',
    'fire brigade', 'fire fighters', 'fire truck', 'fire engine',
    'fire suppression', 'fire safety', '🔥', 'fire danger',
    'explosion', 'explosive', 'exploded', 'blast', 'detonation',
    'combustible', 'flammable', 'ignition', 'spark', 'embers',
    'arson', 'fire raising', 'pyromaniac', 'fire starter',
    
    // Shona
    'moto', 'kutsva', 'kupisa', 'kupfuta', 'pfuta',
    'chiutsi', 'chivutsi', 'kubvira moto', 'moto uri kubvira',
    'moto uri kupisa', 'moto wakabata', 'imba iri kutsva',
    'sango riri kutsva', 'moto wechingochani', 'moto wemagetsi',
    'moto wekicheni', 'moto wemotokari', 'kuputika', 'kuputika kwemoto',
    'kuputsika', 'kuparara', 'kupfutika', 'choto', 'choto chinopisa',
    'hwemoto', 'njanji yemoto', 'chitima chemoto', 'tsuro yemoto',
    
    // Ndebele
    'umlilo', 'ukuvutha', 'ukutsha', 'ukusha', 'umusi',
    'amalangabi', 'ilangabi', 'umlilo omkhulu', 'ihlathi liyavutha',
    'indlu iyavutha', 'isakhiwo siyavutha', 'imoto iyavutha',
    'ukuqhuma', 'ukuqhuma komlilo', 'isiqhumane', 'okuqhuma',
    
    // Contextual phrases
    'fire spreading quickly', 'fire out of control', 'uncontrolled fire',
    'fire getting bigger', 'fire approaching', 'fire near',
    'evacuate due to fire', 'trapped by fire', 'surrounded by fire',
    'can\'t escape fire', 'fire blocking exit', 'smoke filling room',
    'can\'t breathe due to smoke', 'choking on smoke',
    'fire in the building', 'fire next door', 'fire across the street',
    'smelling smoke', 'see smoke', 'see flames', 'hear crackling',
    'fire alarm going off', 'fire alarm sounding',
    'emergency fire', 'need fire brigade', 'call fire department'
  ];

  // Fire severity indicators
  private readonly severityKeywords = {
    critical: [
      'out of control', 'uncontrolled', 'raging', 'massive', 'enormous', 'catastrophic',
      'explosion', 'exploded', 'blast', 'inferno', 'firestorm', 'fireball',
      'collapsing', 'collapsed', 'imminent collapse', 'trapped', 'surrounded',
      'life threatening', 'life-threatening', 'critical', 'emergency',
      'spreading rapidly', 'spreading fast', 'engulfed', 'fully involved'
    ],
    high: [
      'large', 'big', 'huge', 'significant', 'substantial', 'major',
      'spreading', 'growing', 'intensifying', 'escalating',
      'multiple buildings', 'several buildings', 'apartment block',
      'commercial building', 'factory', 'warehouse', 'school', 'hospital',
      'people inside', 'people trapped', 'can\'t get out', 'dangerous'
    ],
    medium: [
      'moderate', 'medium', 'contained', 'controlled', 'manageable',
      'small fire', 'localized', 'single room', 'one room', 'kitchen fire',
      'bin fire', 'trash fire', 'rubbish fire', 'outside fire',
      'smoke but no flames', 'smoldering', 'smouldering'
    ],
    low: [
      'small', 'little', 'minor', 'tiny', 'isolated', 'contained',
      'almost out', 'dying down', 'decreasing', 'under control',
      'smoke only', 'no flames', 'just smoke', 'burning safely',
      'campfire', 'bonfire', 'controlled burn'
    ]
  };

  // Fire type detection
  private readonly fireTypeKeywords = {
    'structural': [
      'house', 'building', 'apartment', 'flat', 'home', 'residence',
      'office', 'shop', 'store', 'mall', 'restaurant', 'hotel',
      'school', 'hospital', 'church', 'factory', 'warehouse',
      'imba', 'chivako', 'hofisi', 'chitoro', 'chikoro', 'chipatara'
    ],
    'wildfire': [
      'forest', 'bush', 'veld', 'grass', 'savanna', 'woodland',
      'wildfire', 'bushfire', 'veld fire', 'grass fire', 'forest fire',
      'sango', 'huswa', 'uswa', 'bundo', 'dondo', 'gwenga'
    ],
    'vehicle': [
      'car', 'vehicle', 'truck', 'bus', 'van', 'motorcycle', 'bike',
      'motokari', 'mota', 'kombi', 'lorry', 'trakita', 'bhazi'
    ],
    'electrical': [
      'electrical', 'electric', 'wiring', 'circuit', 'fuse box',
      'power line', 'electricity', 'transformer', 'socket', 'plug',
      'magetsi', 'waya', 'circuit breaker', 'meter box'
    ],
    'industrial': [
      'factory', 'industrial', 'manufacturing', 'plant', 'chemical',
      'fuel', 'petrol', 'diesel', 'gas', 'oil', 'pipeline',
      'fekitori', 'mainini', 'petrolo', 'diziri', 'gasi', 'oiri'
    ]
  };

  /**
   * Check if text contains fire hazard keywords
   */
  containsFireHazardKeywords(text: string): boolean {
    if (!text) return false;
    
    const normalizedText = text.toLowerCase();
    return this.fireKeywords.some(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract fire-related keywords from text
   */
  extractFireHazardKeywords(text: string): string[] {
    if (!text) return [];
    
    const normalizedText = text.toLowerCase();
    const foundKeywords: string[] = [];
    
    for (const keyword of this.fireKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }
    
    return foundKeywords;
  }

  /**
   * Detect fire type based on keywords
   */
  detectFireType(text: string): string {
    if (!text) return 'unknown';
    
    const normalizedText = text.toLowerCase();
    const detectedTypes: { type: string; count: number }[] = [];
    
    for (const [fireType, keywords] of Object.entries(this.fireTypeKeywords)) {
      const matchCount = keywords.filter(keyword => 
        normalizedText.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > 0) {
        detectedTypes.push({ type: fireType, count: matchCount });
      }
    }
    
    // Sort by match count descending
    detectedTypes.sort((a, b) => b.count - a.count);
    
    return detectedTypes.length > 0 ? detectedTypes[0].type : 'unknown';
  }

  /**
   * Assess fire severity based on keywords
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
    
    // Check for low severity keywords (decrease score)
    for (const keyword of this.severityKeywords.low) {
      if (normalizedText.includes(keyword)) {
        severityScore -= 1;
      }
    }
    
    // Determine level based on score
    if (severityScore >= 15) return { level: 'critical', score: severityScore };
    if (severityScore >= 8) return { level: 'high', score: severityScore };
    if (severityScore >= 3) return { level: 'medium', score: severityScore };
    return { level: 'low', score: Math.max(0, severityScore) };
  }

  /**
   * Get fire response recommendation based on severity and fire type
   */
  getFireResponse(severity: 'critical' | 'high' | 'medium' | 'low', fireType: string = 'unknown'): string {
    const typeSpecificNote = this.getFireTypeNote(fireType);
    
    const responses = {
      critical: `🚨 *CRITICAL FIRE HAZARD DETECTED*\n• Immediate fire brigade dispatch required\n• Multiple fire engines dispatched\n• Evacuate immediately if safe to do so\n• Emergency services alerted for mass response\n• ${typeSpecificNote}`,
      high: `🆘 *SERIOUS FIRE HAZARD DETECTED*\n• Urgent fire response dispatched\n• Fire engines on the way\n• Prepare to evacuate if necessary\n• Fire department alerted\n• ${typeSpecificNote}`,
      medium: `🔥 *MODERATE FIRE HAZARD DETECTED*\n• Fire services dispatched\n• Fire crew responding\n• Monitor the situation\n• Follow fire safety protocols\n• ${typeSpecificNote}`,
      low: `⚠️ *MINOR FIRE HAZARD INDICATED*\n• Fire department notified\n• Assessment in progress\n• Basic fire safety guidance available\n• Monitor for any changes\n• ${typeSpecificNote}`
    };
    
    return responses[severity];
  }

  /**
   * Get fire type specific note
   */
  private getFireTypeNote(fireType: string): string {
    const notes = {
      'structural': '🏢 *Structure Fire* - Building evacuation may be necessary. Do not re-enter until cleared.',
      'wildfire': '🌲 *Wildfire* - Follow evacuation orders. Stay informed about wind direction.',
      'vehicle': '🚗 *Vehicle Fire* - Stay at a safe distance. Vehicles can explode.',
      'electrical': '⚡ *Electrical Fire* - Do not use water. If safe, cut power supply.',
      'industrial': '🏭 *Industrial Fire* - Hazardous materials may be present. Maintain safe distance.',
      'unknown': '📋 Stay safe and follow emergency services instructions.'
    };
    
    return notes[fireType] || notes.unknown;
  }

  /**
   * Get evacuation recommendation based on severity
   */
  getEvacuationAdvice(severity: 'critical' | 'high' | 'medium' | 'low'): string {
    const advice = {
      critical: 'IMMEDIATE EVACUATION REQUIRED - Leave now, use nearest exit, do not use elevators',
      high: 'PREPARE TO EVACUATE - Gather essentials, stay alert for evacuation orders',
      medium: 'BE READY TO EVACUATE - Keep exit routes clear, monitor the situation',
      low: 'NO IMMEDIATE EVACUATION - Stay aware and follow safety protocols'
    };
    
    return advice[severity];
  }

  /**
   * Check if fire involves hazardous materials
   */
  containsHazardousMaterials(text: string): boolean {
    if (!text) return false;
    
    const hazardousKeywords = [
      'gas', 'petrol', 'diesel', 'oil', 'chemical', 'paint', 'solvent',
      'propane', 'butane', 'acetylene', 'oxygen', 'hydrogen', 'flammable',
      'explosive', 'ammunition', 'fireworks', 'aerosol', 'battery',
      'gasi', 'petrolo', 'diziri', 'oiri', 'kemikari', 'bungu',
      'explosives', 'munitions', 'magazini', 'bhatiri'
    ];
    
    const normalizedText = text.toLowerCase();
    return hazardousKeywords.some(keyword => normalizedText.includes(keyword));
  }

  /**
   * Check if fire involves people trapped
   */
  containsPeopleTrapped(text: string): boolean {
    if (!text) return false;
    
    const trappedKeywords = [
      'trapped', 'stuck', 'can\'t get out', 'cannot escape', 'surrounded',
      'blocked', 'inside', 'people inside', 'someone inside',
      'child inside', 'children inside', 'baby inside', 'elderly inside',
      'disabled inside', 'unable to leave', 'locked in', 'stranded',
      'kutapwa', 'kusungwa', 'kuvharirwa', 'kusvikirwa', 'vamwe mukati',
      'mwana mukati', 'vana mukati', 'mucheche mukati'
    ];
    
    const normalizedText = text.toLowerCase();
    return trappedKeywords.some(keyword => normalizedText.includes(keyword));
  }

  /**
   * Get estimated response priority based on severity
   */
  getResponsePriority(severity: 'critical' | 'high' | 'medium' | 'low'): number {
    const priorities = {
      critical: 1, // Highest priority
      high: 2,
      medium: 3,
      low: 4
    };
    
    return priorities[severity];
  }
}