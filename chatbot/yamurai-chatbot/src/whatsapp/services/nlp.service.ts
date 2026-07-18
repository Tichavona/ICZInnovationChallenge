/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NlpService {
    private readonly logger = new Logger(NlpService.name);
    
    // Natural Language Processing patterns
    private readonly emergencyPatterns = {
        robbery: ['mugging', 'theft', 'break in', 'breaking in', "robbery", "robber", "robbers", "robbed", "robbing", 
            "armed robbery", "theft", "thief", "thieves", "stolen", "steal", "stealing", "stole", "burglary", "burglar", 
            "burglars", "burgled", "break in", "break-in", "breaking-in", "larceny", "heist", "looting", "loot", "looted",
            "looters", "looting incident", "hold up", "hold-up", "held up", "home invasion", "housebreaking", "house break-in",
            "shoplifting", "pickpocket", "pickpocketing", "pickpocketed", "carjacking", "carjacked", "carjacker", "car hijack", 
            "vehicle theft", "snatching", "snatched", "snatch", "purse snatching", "phone snatching", "pilfering", "pilfered", 
            "stealing incident", "thievery", "embezzlement", "embezzled", "swindling", "extortion", "banditry", "bandits", 
            "hijacking", "hijacked", "hijacker", "raid", "raided", "raiders", "smash and grab", "smash n grab", "smash 'n grab",
            "smash & grab",
    
            // --- English (colloquial / slang) ---
            "got robbed", "got jacked", "got mugged", "got ripped off", "got my stuff taken", "my place got hit", 
            "they cleaned me out", "someone broke into my house", "they took my phone", "they took my stuff", 
            "they ran off with it", "someone swiped it", "my stuff's gone", "they smashed and grabbed", "smash and grab", 
            "cleaned out", "got jumped", "they raided my place", "my wallet got lifted", "got nicked", "nicked my phone", 
            "stole my phone", "took everything", "robbed me", "they broke my lock", "they hit my shop", "hit my house", 
            "they robbed the shop", "robbed the store",
    
            // --- Shona (formal) ---
            "kuba", "kubirwa", "kubigwa", "mbavha", "matsotsi", "ndiri kubigwa", "ndiri kubirwa", "kutora chisiri chako", "kupinda nechisimba", 
            "kupinda muchivande", "chinhu chakabiwa", "mhosva yekuba", "mhosva yekupamba",  "makororo andibira",  "makororo anditsotsa", "akabirwa",
            "makoronyera anditsotsa", "makoronyera andibira", "vamubira", "abigwa", "abirwa", "ndabigwa", "ndabirwa", "akabira", "akubira", "akabigwa",

            // --- Shona (colloquial / slang) ---
            "akabiwa", "vakandibira", "vakandipamba", "vakandirova vakatora zvinhu", "mbavha dzakapinda", "vakandibata ngunzu",
            "vakandibata huro", "huru work", "mbavha dzandibira", "vakanditora zvinhu zvangu", "akapambwa", "vakapinda mumba", 
            "mbavha dzakapinda husiku", "zvandibira", "vakandibira nharembozha", "vakandipamba mumugwagwa", "akatorerwa zvinhu",
            "vakandirova", "ndakabiwa", "ndakabirwa", "ndakatorerwa", "vakandipamba",

            // --- Ndebele (formal) ---
            "ukweba", "umtsotsi", "amatsotsi", "umbobho", "ukuphanga", "ukuphanga ngezibhamu", "ukutshontsha", "umkhohlisi", 
            "igebengu", "umgulukudu", "umphangi", "ukugqekeza", "ugesiwe", "isela", "ukuphanga endlini", "ukweba imoto",
            "ukwebiwa", "ukwebiwa impahla", "ukwebiwa imali",

            // --- Ndebele (colloquial / slang) ---
            "bangitshintshile", "bangithathe izinto zami", "bangiphanga", "bangiwebile", "bangigqekezile", "bangithathe ifoni", 
            "amasela", "umtsotsi ungithathe", "umtsotsi ungiphanga", "bangiqhekeze ekhaya", "bangiqekeze", "bangiphanga ebusuku",
            "amasela angene endlini", "bangiwebile imoto", "bangiwebile imali", "bangithathe izinto zami zonke",
            "ngiphangiwe", "ngitshontshiwe", "ngibiwe",

            // --- English + African hybrid (mixed language use) ---
            "mbavha dzandirobha", "umtsotsi robbed me", "ndakabiwa phone", "phone yangu yakabiwa", "umtsotsi took my bag", 
            "mbavha dzakapinda ndodzibata", "amatsotsi stole it", "vakandipamba last night", "bangiphanga ngo busuku", 
            "ndakabiwa last night", "ndakabirwa zvinhu zvangu", "bangithathe izinto zami zonke", "mbavha dzandirobber",
            "mbavha dzandi robber", "matsotsi andirobha", "matsotsi andi robber", "matsotsi andirobber", "makororo andi robber",
            "makororo andirobber",  "makororo andirobha",

            // --- Contextual phrases (multiword, used in real speech) ---
            "they broke into my house", "they broke into my car", "someone entered my house", "thieves entered", "armed men came",
            "gunmen attacked", "my home was robbed", "i was attacked and robbed", "they took everything from me", 
            "they cleaned out my place", "vakandipamba nematombo", "mbavha dzakapinda mangwanani", "amasela angene ebusuku"],
        violence: ['assault', 'attack', 'fighting', 'violence', 'abuse', 'beating', 'hurt me', 'threatening'],
        medical: ['heart attack', 'stroke', 'bleeding', 'unconscious', 'not breathing', 'seizure', 'overdose',
            'blood', 'bleeding', 'kubuda ropa', 'ropa', 'kujuja ropa',  'kukuvara', 'injured', 'injury', 'ronda', 'maronda', 
            'kuvadza', 'kuvadzwa', 'bleed', 'bleeds', 'bleeder', 'cut', 'cuts', 'cutting', 'gash', 'laceration', 'wound',
            'hemorrhage', 'haemorrhage', 'blood loss', 'losing blood', 'bloody', 'bloodied', 'profuse bleeding', 'severe bleeding'],
        fire: ['fire', 'burning', 'smoke', 'flames', 'blaze', 'fire', 'fire emergency', 'there is a fire', 'building fire', 
            'house fire', 'kutsva', 'kupisa', 'forest fire', 'fire outbreak', 'fire incident', 'reporting on fire', 'zhenje emoto',
            'pisa', '🔥', 'flames', 'burning', 'smoke', 'moto', 'kupfuta', 'pfuta', 'chiutsi', 'chivutsi'],
        accident: ['accident', 'crash', 'collision', 'hit by', 'run over'],
        danger: ['help me', 'emergency', 'urgent', 'danger', 'dangerous', 'scared', 'fear', 'threat'],
        kidnapping: ['kidnap', 'abduction', 'taken', 'hostage'],
        weapons: ['gun', 'knife', 'weapon', 'shot', 'stabbed']
    };

    private readonly issuePatterns = {
        water: ['burst pipe', 'water leak', 'leaking pipe', 'water main', 'broken pipe', 'flooding', 'water flooding'],
        sewerage: ['sewerage', 'sewage', 'sewer overflow', 'drainage', 'blocked drain', 'sewer backup', 'toilet backup'],
        electricity: ['power outage', 'no electricity', 'blackout', 'electrical fault', 'sparking wires', 'downed power lines'],
        roads: ['pothole', 'road damage', 'sinkhole', 'road hazard', 'broken road'],
        sanitation: ['garbage', 'trash', 'rubbish', 'waste', 'dumping', 'litter', 'cleanup'],
        public: ['vandalism', 'graffiti', 'broken bench', 'park damage', 'public facility'],
        noise: ['noise complaint', 'loud noise', 'disturbance', 'noisy neighbors']
    };

    // Research/information queries that should NOT be treated as emergencies
    private readonly researchPatterns = [
        'search', 'article', 'query', 'find', 'information about', 'tell me about', 
        'research', 'study', 'data', 'report on', 'analyze', 'explain in detail',
        'comprehensive', 'deep dive', 'what is', 'how does', 'why is', 'when was',
        'where can i find', 'can you help me with', 'i need information on',
        'looking for', 'details about', 'more about', 'background on', 'knowledge',
        'learn about', 'understand', 'information', 'resources', 'material'
    ];

    constructor() {}

    /**
     * Natural Language Processing to detect emergencies and issues from natural language
     */
    async processNaturalLanguage(text: string, phoneNumber: string): Promise<{ handled: boolean; type?: string; data?: any }> {
        try {
            const normalizedText = text.toLowerCase().trim();
            
            // Skip NLP for research queries (already handled above)
            if (this.isResearchQuery(normalizedText)) {
                return { handled: false };
            }

            // Check for emergency patterns
            const emergencyMatch = this.detectEmergency(normalizedText);
            if (emergencyMatch) {
                this.logger.log(`NLP detected emergency: ${emergencyMatch.type} for user ${phoneNumber}`);
                return { 
                    handled: true, 
                    type: 'emergency',
                    data: emergencyMatch
                };
            }

            // Check for issue reporting patterns
            const issueMatch = this.detectIssue(normalizedText);
            if (issueMatch) {
                this.logger.log(`NLP detected issue: ${issueMatch.type} for user ${phoneNumber}`);
                return { 
                    handled: true, 
                    type: 'issue',
                    data: issueMatch
                };
            }

            return { handled: false };
        } catch (error) {
            this.logger.error('Error in natural language processing:', error);
            return { handled: false };
        }
    }

    /**
     * Detect emergency situations from natural language
     */
    private detectEmergency(text: string): { type: string; confidence: number; keywords: string[] } | null {
        const detectedKeywords: string[] = [];
        let confidence = 0;

        // Check each emergency category
        for (const [category, patterns] of Object.entries(this.emergencyPatterns)) {
            const matches = patterns.filter(pattern => text.includes(pattern));
            if (matches.length > 0) {
                detectedKeywords.push(...matches);
                confidence += matches.length * 0.3; // Increase confidence based on number of matches
                
                // High confidence for specific dangerous situations
                if (['robbery', 'violence', 'weapons', 'kidnapping'].includes(category)) {
                    confidence += 0.5;
                }
            }
        }

        // Additional context-based detection
        if (text.includes('help') && (text.includes('now') || text.includes('urgent') || text.includes('please'))) {
            confidence += 0.4;
            detectedKeywords.push('urgent_help');
        }

        if (confidence > 0.3) {
            const primaryType = this.getPrimaryEmergencyType(detectedKeywords);
            return {
                type: primaryType,
                confidence: Math.min(confidence, 1.0),
                keywords: detectedKeywords
            };
        }

        return null;
    }

    /**
     * Detect issue reporting from natural language
     */
    private detectIssue(text: string): { type: string; confidence: number; keywords: string[] } | null {
        const detectedKeywords: string[] = [];
        let confidence = 0;

        // Check each issue category
        for (const [category, patterns] of Object.entries(this.issuePatterns)) {
            const matches = patterns.filter(pattern => text.includes(pattern));
            if (matches.length > 0) {
                detectedKeywords.push(...matches);
                confidence += matches.length * 0.4; // Higher base confidence for issues
            }
        }

        // Context clues for issues
        if ((text.includes('broken') || text.includes('damaged') || text.includes('leaking')) && 
            !this.containsEmergencyWords(text)) {
            confidence += 0.3;
        }

        if (confidence > 0.4) {
            const primaryType = this.getPrimaryIssueType(detectedKeywords);
            return {
                type: primaryType,
                confidence: Math.min(confidence, 1.0),
                keywords: detectedKeywords
            };
        }

        return null;
    }

    /**
     * Check if text contains emergency-related words that might override issue detection
     */
    private containsEmergencyWords(text: string): boolean {
        const emergencyWords = ['emergency', 'urgent', 'help', 'danger', 'dangerous', 'accident', 'hurt', 'injured'];
        return emergencyWords.some(word => text.includes(word));
    }

    /**
     * Determine primary emergency type based on detected keywords
     */
    private getPrimaryEmergencyType(keywords: string[]): string {
        const priorityOrder = [
            'kidnapping', 'weapons', 'violence', 'robbery', 
            'medical', 'fire', 'accident', 'danger'
        ];

        for (const type of priorityOrder) {
            if (keywords.some(keyword => this.emergencyPatterns[type]?.includes(keyword))) {
                return type;
            }
        }

        return 'general';
    }

    getEmergencyTypeDisplay(type: string): string {
        const emergencyTypes = {
            robbery: 'Robbery/Theft',
            violence: 'Violence/Assault',
            medical: 'Medical Emergency',
            fire: 'Fire',
            accident: 'Accident',
            kidnapping: 'Kidnapping/Abduction',
            weapons: 'Armed Incident',
            danger: 'General Danger',
            general: 'Emergency Situation'
        };
        return emergencyTypes[type] || 'Emergency Situation';
    }

    getIssueTypeDisplay(type: string): string {
        const issueTypes = {
            water: 'Water Leak/Burst Pipe',
            sewerage: 'Sewerage Overflow',
            electricity: 'Power/Electricity Issue',
            roads: 'Road Damage',
            sanitation: 'Sanitation/Garbage',
            public: 'Public Facility Damage',
            noise: 'Noise Complaint',
            general: 'General Issue'
        };
        return issueTypes[type] || 'General Issue';
    }

    /**
     * Determine primary issue type based on detected keywords
     */
    private getPrimaryIssueType(keywords: string[]): string {
        const priorityOrder = [
            'water', 'sewerage', 'electricity', 'roads', 
            'sanitation', 'public', 'noise'
        ];

        for (const type of priorityOrder) {
            if (keywords.some(keyword => this.issuePatterns[type]?.includes(keyword))) {
                return type;
            }
        }

        return 'general';
    }

    /**
     * Check if query is a research/information query that should not be treated as emergency
     */
    isResearchQuery(text: string): boolean {
        const normalizedText = text.toLowerCase().trim();
        
        // Check for research/information patterns
        const hasResearchIndicator = this.researchPatterns.some(pattern => 
            normalizedText.includes(pattern)
        );

        // Check for topic indicators that are clearly informational
        const topicIndicators = [
            'drug', 'substance', 'abuse', 'health', 'education', 'treatment',
            'prevention', 'awareness', 'counseling', 'rehabilitation', 'mental health',
            'addiction', 'recovery', 'therapy', 'medical', 'psychological'
        ];

        const hasTopicIndicator = topicIndicators.some(topic => 
            normalizedText.includes(topic)
        );

        // It's a research query if it has research indicators AND doesn't contain emergency words
        if (hasResearchIndicator && !this.containsEmergencyWords(normalizedText)) {
            return true;
        }

        // It's also a research query if it has both research and topic indicators
        if (hasResearchIndicator && hasTopicIndicator) {
            return true;
        }

        return false;
    }
} 
