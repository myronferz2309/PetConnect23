import {
  Pet,
  PetCareCategory,
  PetCareMessage,
  PetCarePlan,
} from '../types';
import { inferPetActivityLevel, inferPetAgeCategory } from './aiMatchingService';

export const PET_CARE_CATEGORIES: {
  id: PetCareCategory;
  label: string;
  icon: string;
  description: string;
  exampleQuestions: string[];
}[] = [
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: '🥗',
    description: 'Diet, feeding schedules, treats & hydration',
    exampleQuestions: [
      'What should I feed my pet daily?',
      'How often should I feed my pet?',
      'Which human foods are toxic to pets?',
    ],
  },
  {
    id: 'exercise',
    label: 'Exercise',
    icon: '🏃',
    description: 'Daily activity, play ideas & mental stimulation',
    exampleQuestions: [
      'How much daily exercise does my pet need?',
      'Fun indoor games for rainy days',
      'How to keep a high-energy pet active?',
    ],
  },
  {
    id: 'behavior',
    label: 'Behavior',
    icon: '🧠',
    description: 'Barking, separation anxiety, biting & training',
    exampleQuestions: [
      'Why does my pet bark when left alone?',
      'How do I stop puppy biting and nipping?',
      'Tips for calm leash walking',
    ],
  },
  {
    id: 'grooming',
    label: 'Grooming',
    icon: '✂️',
    description: 'Bathing, brushing, nail care & coat hygiene',
    exampleQuestions: [
      'How often should I bathe my pet?',
      'How to safely trim pet nails at home?',
      'Best routine for shedding and coat care',
    ],
  },
  {
    id: 'health',
    label: 'Health',
    icon: '🩺',
    description: 'General wellbeing, warning signs & preventive care',
    exampleQuestions: [
      'What are common signs of pet illness?',
      'What vaccines does my pet need?',
      'How to protect pets from heat in summer?',
    ],
  },
  {
    id: 'new_pet',
    label: 'New Pet',
    icon: '🏠',
    description: 'Preparing your home, first-week checklist & setup',
    exampleQuestions: [
      'What supplies do I need before adoption?',
      'How to help a rescue pet adjust (3-3-3 rule)?',
      'How do I introduce a new pet to my family?',
    ],
  },
  {
    id: 'wellbeing',
    label: 'Wellbeing',
    icon: '❤️',
    description: 'Enrichment, bonding, comfort & quality of life',
    exampleQuestions: [
      'Best puzzle toys for mental enrichment',
      'How to know if my pet is happy and comfortable?',
      'Ways to strengthen our bond',
    ],
  },
];

/**
 * Emergency symptom detection for Health Safety
 */
const EMERGENCY_KEYWORDS = [
  'collapsed',
  'unconscious',
  'seizure',
  'difficulty breathing',
  'choking',
  'pale gums',
  'severe bleeding',
  'swallowed chocolate',
  'ate grapes',
  'ate poison',
  'toxic',
  'bloat',
  'swollen abdomen',
  'cannot stand',
  'hit by car',
  'vomiting blood',
];

export function isEmergencyQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Convert dog chronological age to human years equivalent
 */
export function calculateDogHumanAge(ageStr: string): string {
  const lower = ageStr.toLowerCase();
  if (lower.includes('month')) {
    const months = parseInt(lower.match(/(\d+)/)?.[1] || '6', 10);
    if (months <= 3) return 'equivalent to a 2–3 year old human toddler';
    if (months <= 6) return 'equivalent to a 5–8 year old human child';
    return 'equivalent to a 10–12 year old human pre-teen';
  }
  const years = parseInt(lower.match(/(\d+)/)?.[1] || '2', 10);
  if (years === 1) return 'roughly 15 human years (an adolescent)';
  if (years === 2) return 'roughly 24 human years (a young adult)';
  if (years === 3) return 'roughly 28 human years';
  if (years === 4) return 'roughly 32 human years';
  if (years >= 5 && years <= 7) return `roughly ${24 + (years - 2) * 4}–${24 + (years - 2) * 5} human years (mature adult)`;
  return `roughly ${24 + (years - 2) * 5} human years (a distinguished senior)`;
}

/**
 * Detect category from text query
 */
export function detectQueryCategory(query: string): PetCareCategory {
  const lower = query.toLowerCase();
  if (lower.includes('food') || lower.includes('feed') || lower.includes('eat') || lower.includes('diet') || lower.includes('treat') || lower.includes('water') || lower.includes('nutrition') || lower.includes('hungry') || lower.includes('kibble')) {
    return 'nutrition';
  }
  if (lower.includes('walk') || lower.includes('run') || lower.includes('exercise') || lower.includes('play') || lower.includes('activity') || lower.includes('stamina') || lower.includes('energy') || lower.includes('lazy')) {
    return 'exercise';
  }
  if (lower.includes('bark') || lower.includes('bite') || lower.includes('anxiety') || lower.includes('train') || lower.includes('aggressive') || lower.includes('whine') || lower.includes('behavior') || lower.includes('potty') || lower.includes('pee') || lower.includes('chew') || lower.includes('crate')) {
    return 'behavior';
  }
  if (lower.includes('bath') || lower.includes('brush') || lower.includes('nail') || lower.includes('groom') || lower.includes('shed') || lower.includes('fur') || lower.includes('coat') || lower.includes('ears')) {
    return 'grooming';
  }
  if (lower.includes('sick') || lower.includes('vomit') || lower.includes('fever') || lower.includes('vaccin') || lower.includes('pain') || lower.includes('health') || lower.includes('doctor') || lower.includes('vet') || lower.includes('teeth') || lower.includes('flea') || lower.includes('tick')) {
    return 'health';
  }
  if (lower.includes('new pet') || lower.includes('adopt') || lower.includes('bring home') || lower.includes('first week') || lower.includes('prepar') || lower.includes('supplies')) {
    return 'new_pet';
  }
  if (lower.includes('age') || lower.includes('how old') || lower.includes('year') || lower.includes('month') || lower.includes('lifespan') || lower.includes('breed') || lower.includes('enrich') || lower.includes('happy') || lower.includes('bond') || lower.includes('comfort') || lower.includes('wellbeing')) {
    return 'wellbeing';
  }
  return 'general';
}

/**
 * Generate Structured Personalized Care Plan
 */
export function generateCarePlan(pet: Pet): PetCarePlan {
  const petName = pet.name;
  const breed = pet.breed || 'Pet';
  const category = pet.category;
  const ageCat = inferPetAgeCategory(pet.age);
  const activity = inferPetActivityLevel(pet);

  const isDog = category === 'dogs';
  const isPuppyKitten = ageCat === 'puppy_kitten';

  const dailyRoutine = [
    {
      time: 'Morning (7:30 AM)',
      task: isPuppyKitten
        ? `Morning meal (${ageCat === 'puppy_kitten' ? 'growth formula' : 'balanced diet'}) & fresh water replenishment.`
        : `Nutritious breakfast for ${petName} & fresh bowl of water.`,
      category: 'Nutrition',
    },
    {
      time: 'Morning Walk / Play (8:00 AM)',
      task: isDog
        ? `${activity === 'high' ? '45-minute active walk and sniff exploration' : '20–30 minute brisk neighborhood walk'}.`
        : '15 minutes of interactive wand toy or feather chase play.',
      category: 'Exercise',
    },
    {
      time: 'Midday (1:00 PM)',
      task: isPuppyKitten
        ? `Midday light meal, bathroom break, and calm rest period.`
        : `Hydration check, short enrichment toy session (lick mat or snuffle mat).`,
      category: 'Wellbeing',
    },
    {
      time: 'Evening (6:30 PM)',
      task: isDog
        ? `${activity === 'high' ? 'Evening outdoor walk or dog park fetch session' : 'Relaxing evening stroll'} & dinner.`
        : `Evening meal & interactive feather toy hunting session.`,
      category: 'Nutrition',
    },
    {
      time: 'Night (9:30 PM)',
      task: `Final bathroom break / litter check, calm settling routine & cozy sleeping area prep.`,
      category: 'Wellbeing',
    },
  ];

  const weeklyRoutine = [
    {
      task: isDog ? `Coat brushing (2–3 times a week) and paw inspection.` : `Gentle brushing to remove loose hair & prevent hairballs.`,
      frequency: 'Every 2-3 Days',
      category: 'Grooming',
    },
    {
      task: `Check ears and gently clean around eyes with a damp pet wipe.`,
      frequency: 'Weekly',
      category: 'Grooming',
    },
    {
      task: `Rotate enrichment toys to keep mental stimulation fresh and engaging.`,
      frequency: 'Every Weekend',
      category: 'Enrichment',
    },
    {
      task: `Wash food and water bowls thoroughly; inspect bedding.`,
      frequency: 'Weekly',
      category: 'Hygiene',
    },
  ];

  const importantNotes = [
    `Vaccinations & preventive care: Ensure annual wellness checkups with a licensed veterinarian.`,
    `Hydration: Always keep cool, fresh drinking water accessible throughout the day.`,
    isDog && activity === 'high'
      ? `${petName} is a high-energy breed (${breed}); daily physical activity prevents boredom.`
      : `${petName} thrives with predictable daily routines and positive reinforcement.`,
  ];

  return {
    petName,
    petBreed: breed,
    dailyRoutine,
    weeklyRoutine,
    importantNotes,
    createdAt: Date.now(),
  };
}

/**
 * PetCare AI Engine
 */
export const petCareAiService = {
  /**
   * Process user prompt and formulate grounded, personalized, safe response
   */
  async askPetCare(
    query: string,
    selectedPet: Pet | null,
    history: PetCareMessage[] = []
  ): Promise<Omit<PetCareMessage, 'id' | 'createdAt'>> {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();
    const isEmergency = isEmergencyQuery(trimmed);
    const category = detectQueryCategory(trimmed);

    const petName = selectedPet ? selectedPet.name : null;
    const petBreed = selectedPet?.breed || '';
    const petAge = selectedPet?.age || '';
    const petCategory = selectedPet?.category || 'dogs';
    const activity = selectedPet ? inferPetActivityLevel(selectedPet) : 'moderate';
    const ageCat = selectedPet ? inferPetAgeCategory(selectedPet.age) : 'adult';
    const location = selectedPet ? selectedPet.location.split(',')[0].trim() : '';

    // 1. Check for Emergency Health Query
    if (isEmergency) {
      const petRef = petName || 'your pet';
      return {
        sender: 'assistant',
        category: 'health',
        isEmergency: true,
        text: `⚠️ **Please seek immediate emergency veterinary care.**\n\nThe symptoms you described for ${petRef} can indicate a serious medical situation that requires urgent in-person evaluation by a licensed veterinarian.`,
        tryThis: [
          'Keep your pet calm, comfortable, and minimize movement.',
          'Do NOT induce vomiting or administer human medications unless directly instructed by a veterinarian.',
          'Call your nearest emergency veterinary clinic immediately to inform them you are on your way.',
        ],
        whenToGetHelp: 'Emergency veterinary care should be sought without delay.',
      };
    }

    // 2. Check for Care Plan Request
    if (lower.includes('care plan') || lower.includes('weekly plan') || lower.includes('routine') || lower.includes('schedule')) {
      if (selectedPet) {
        const plan = generateCarePlan(selectedPet);
        return {
          sender: 'assistant',
          category: 'wellbeing',
          text: `Here is a personalized care plan for **${selectedPet.name}** (${selectedPet.breed}, ${selectedPet.age}). This routine is tailored to their ${activity} energy level and life stage.`,
          carePlan: plan,
          tryThis: [
            `Keep morning and evening meals consistent within 30 minutes each day.`,
            `Pair physical exercise with 10–15 minutes of mental scent work or puzzle toys.`,
            `Adjust outdoor walk times during hot summer afternoons.`,
          ],
          whenToGetHelp: `Consult your veterinarian if ${selectedPet.name}'s appetite or energy levels change noticeably.`,
        };
      } else {
        return {
          sender: 'assistant',
          category: 'wellbeing',
          text: `To create a tailored daily and weekly care plan, please select a pet from your PetConnect profiles above, or tell me their species, breed, and age!`,
          tryThis: [
            'Select a pet using the pet selector bar above.',
            'Or ask: "Create a care plan for a 2-year-old Golden Retriever".',
          ],
        };
      }
    }

    // 3. Check for Age & Life-Stage Questions ("whats dog age", "how old", "dog years")
    if (
      lower.includes('age') ||
      lower.includes('how old') ||
      lower.includes('human year') ||
      lower.includes('dog year') ||
      lower.includes('cat year') ||
      lower.includes('lifespan') ||
      lower.includes('life stage')
    ) {
      if (selectedPet) {
        const humanAge = calculateDogHumanAge(petAge);
        return {
          sender: 'assistant',
          category: 'wellbeing',
          text: `**${petName}** is listed as **${petAge}** in their PetConnect profile.\n\nIn human age terms, ${petName} (${petBreed}) is **${humanAge}**.\n\n` +
            `• **Life Stage**: ${ageCat === 'puppy_kitten' ? 'Puppy/Kitten (Rapid growth & training phase)' : ageCat === 'young' ? 'Young Adult (High vitality & peak playfulness)' : ageCat === 'adult' ? 'Adult (Settled routine & stable personality)' : 'Senior (Golden years, gentle care)'}\n` +
            `• **Aging Calculation**: For dogs and cats, the first year equals roughly 15 human years, year 2 adds about 9 years (reaching age 24), and each year after that adds about 4–5 human years depending on breed size.`,
          tryThis: [
            ageCat === 'puppy_kitten'
              ? 'Focus on positive socialization, bite inhibition, and foundational house training.'
              : ageCat === 'senior'
              ? 'Provide orthopedic bedding and schedule bi-annual wellness vet checks.'
              : 'Maintain balanced daily exercise and consistent feeding routines.',
            'Keep mental enrichment and scent games part of their daily life.',
          ],
          whenToGetHelp: `Monitor ${petName}'s mobility, dental health, and energy as they transition through life stages.`,
        };
      } else {
        return {
          sender: 'assistant',
          category: 'wellbeing',
          text: `A pet's age in human years depends on their species and size:\n\n` +
            `• **First Year**: Equals roughly 15 human years (rapid juvenile development).\n` +
            `• **Second Year**: Adds about 9 human years (reaching approximately 24 human years).\n` +
            `• **Each Year Thereafter**: Adds about 4 to 5 human years for small/medium dogs and cats, or 5 to 6 years for giant breeds.\n\n` +
            `Select a specific pet above to calculate their exact human-age equivalent and life-stage care tips!`,
          tryThis: [
            'Puppies & Kittens (< 1 yr): High protein diet and foundational socialization.',
            'Adult Pets (1–7 yrs): Consistent routine, weight management, and dental care.',
            'Senior Pets (7+ yrs): Joint support, gentler exercise, and bi-annual veterinary visits.',
          ],
        };
      }
    }

    // 4. Check for Breed & Personality Questions ("what breed", "tell me about", "characteristics")
    if (
      lower.includes('breed') ||
      lower.includes('temperament') ||
      lower.includes('personality') ||
      lower.includes('about bella') ||
      lower.includes('about bruno') ||
      lower.includes('about milo') ||
      lower.includes('about oliver')
    ) {
      if (selectedPet) {
        return {
          sender: 'assistant',
          category: 'wellbeing',
          text: `**${petName}** is a **${petBreed}** (${petAge}, ${selectedPet.gender}).\n\n` +
            `• **Energy Level**: ${activity.charAt(0).toUpperCase() + activity.slice(1)}\n` +
            `• **Location**: ${selectedPet.location}\n` +
            `• **Personality Traits**: ${selectedPet.tags?.join(', ') || 'Loving, friendly companion'}\n\n` +
            `**Description**: ${selectedPet.description}`,
          tryThis: [
            `Tailor daily play and exercise to ${petName}'s ${activity} energy level.`,
            selectedPet.adoptionRequirements && selectedPet.adoptionRequirements.length > 0
              ? `Adoption notes: ${selectedPet.adoptionRequirements.join('; ')}`
              : 'Provide engaging toys and structured bonding time.',
          ],
        };
      }
    }

    // 5. Check for Potty / House Training Questions
    if (lower.includes('potty') || lower.includes('toilet') || lower.includes('peeing inside') || lower.includes('house train') || lower.includes('litter')) {
      return {
        sender: 'assistant',
        category: 'behavior',
        text: petName
          ? `House training for **${petName}** relies on predictable timing, supervision, and rewarding successful potty breaks outdoors immediately.`
          : `Effective house training relies on establishing a strict routine, managing access, and immediately rewarding outdoor bathroom breaks.`,
        tryThis: [
          'Take your pet out first thing in the morning, immediately after meals, after naps, and before bedtime.',
          'Reward with a high-value treat and enthusiastic praise the exact second they finish outside.',
          'Clean indoor accidents with an enzymatic cleaner (regular cleaners leave scent markers that encourage repeat peeing).',
          'Never punish or scold accidents after the fact—it creates fear rather than understanding.',
        ],
        whenToGetHelp: 'If an already house-trained pet suddenly starts having frequent accidents or shows painful urination, have a vet check for urinary tract infections.',
      };
    }

    // 6. Check for Biting, Teething & Nipping
    if (lower.includes('bite') || lower.includes('biting') || lower.includes('nip') || lower.includes('nipping') || lower.includes('chew')) {
      return {
        sender: 'assistant',
        category: 'behavior',
        text: petName
          ? `Mouthiness and teething in **${petName}** are natural developmental exploration behaviors. The goal is redirection and bite inhibition.`
          : `Play-biting and chewing are natural instincts. The most effective technique is immediate redirection to appropriate chew toys.`,
        tryThis: [
          'Whenever teeth touch human skin or clothes, make a sharp "Ouch!" sound, freeze all interaction for 5 seconds, and offer a toy instead.',
          'Keep durable chew toys and frozen lick-mats accessible around the house.',
          'Avoid using hands or feet as play objects during wrestling.',
          'Provide frozen carrots or chilled rubber toys to soothe sore gums during teething.',
        ],
        whenToGetHelp: 'If biting is accompanied by stiff body posture, growling, or resource guarding over food/toys, consult a positive-reinforcement behaviorist.',
      };
    }

    // 7. Check for Barking, Whining & Separation Anxiety
    if (lower.includes('bark') || lower.includes('whin') || lower.includes('alone') || lower.includes('anxiety') || lower.includes('crate')) {
      return {
        sender: 'assistant',
        category: 'behavior',
        text: petName
          ? `Vocalizing or restlessness in **${petName}** when left alone is often tied to separation anxiety or unmet stimulation needs. Building calm departure routines creates confidence.`
          : `Excessive barking or pacing when left alone can be managed through gradual desensitization, physical exercise, and positive alone-time associations.`,
        tryThis: [
          'Practice micro-departures: step out the door for 30 seconds, return calmly, and reward quiet behavior.',
          'Leave a frozen peanut-butter Kong or puzzle toy right before leaving so departures equal positive rewards.',
          'Exercise your pet 30–45 minutes before departure to reduce pent-up physical energy.',
          'Keep arrivals and departures low-key and matter-of-fact.',
        ],
        whenToGetHelp: 'If your pet exhibits severe panic, attempts to break out of crates, or inflicts self-injury, contact a veterinary behavior specialist.',
      };
    }

    // 8. Check for Nutrition & Feeding Queries
    if (
      lower.includes('food') ||
      lower.includes('feed') ||
      lower.includes('eat') ||
      lower.includes('diet') ||
      lower.includes('treat') ||
      lower.includes('water') ||
      lower.includes('toxic') ||
      lower.includes('hungry')
    ) {
      const foodText = petName
        ? `For **${petName}** (${petBreed}, ${petAge}), nutrition should be calibrated for their **${activity}** energy level.`
        : `A complete and balanced diet formulated for your pet's specific life stage provides all essential proteins, fats, vitamins, and minerals.`;

      return {
        sender: 'assistant',
        category: 'nutrition',
        text: `${foodText}\n\n` +
          `• **Meal Schedule**: Adult pets thrive on 2 measured meals per day (morning & evening); puppies/kittens need 3–4 smaller meals.\n` +
          `• **Hydration**: Ensure fresh, clean water is always available in clean stainless steel or ceramic bowls.\n` +
          `• **Toxic Foods to Strictly Avoid**: Chocolate, grapes, raisins, onions, garlic, coffee/tea, cooked bones, and artificial sweeteners (xylitol).`,
        tryThis: [
          'Measure daily portions using a standard measuring cup rather than estimating.',
          'Keep healthy treats to under 10% of daily total caloric intake.',
          'Transition to new foods gradually over 7–10 days to prevent digestive upset.',
        ],
        whenToGetHelp: 'If your pet refuses food for over 24 hours, shows persistent vomiting, or has sudden weight changes, contact a veterinarian.',
      };
    }

    // 9. Check for Exercise & Play Queries
    if (
      lower.includes('walk') ||
      lower.includes('run') ||
      lower.includes('exercise') ||
      lower.includes('play') ||
      lower.includes('stamina') ||
      lower.includes('energy')
    ) {
      const isHighEnergy = activity === 'high';
      return {
        sender: 'assistant',
        category: 'exercise',
        text: petName
          ? `Since **${petName}** is a ${petBreed} with a **${activity}** activity level${location ? ` near ${location}` : ''}, structured physical movement combined with mental enrichment keeps them balanced and content.`
          : `Daily physical exercise tailored to your pet's breed and age is crucial for cardiovascular health, weight management, and mental wellbeing.`,
        tryThis: isHighEnergy
          ? [
              'Provide 45–60 minutes of active walking or jogging split between morning and evening.',
              'Incorporate fetch, scent tracking, or agility games in safe fenced areas.',
              'Let your dog sniff freely during walks—sniffing is calming mental work.',
            ]
          : [
              'Aim for two 20–30 minute leisurely strolls daily.',
              'Practice indoor hide-and-seek games with treats.',
              'Avoid strenuous outdoor exercise during peak afternoon heat.',
            ],
        whenToGetHelp: 'If your pet shows sudden limping, excessive panting, reluctance to stand, or joint stiffness, ease activity and consult your vet.',
      };
    }

    // 10. Check for Grooming, Bathing & Fur Queries
    if (
      lower.includes('bath') ||
      lower.includes('brush') ||
      lower.includes('nail') ||
      lower.includes('groom') ||
      lower.includes('shed') ||
      lower.includes('fur') ||
      lower.includes('coat') ||
      lower.includes('ear')
    ) {
      return {
        sender: 'assistant',
        category: 'grooming',
        text: petName
          ? `Regular grooming for **${petName}** keeps their skin and coat healthy while reducing shedding around your home.`
          : `Grooming is essential for coat health, hygiene, and early detection of skin irritations or parasites.`,
        tryThis: [
          'Brush coat 2–3 times weekly using a brush suited for their coat type (slicker brush for double coats, soft bristle for short coats).',
          'Bathe only every 3–6 weeks with pet-formulated shampoo to preserve natural skin oils.',
          'Trim nail tips carefully every 2–3 weeks, avoiding the sensitive pink quick.',
          'Inspect ears weekly for redness, dirt, or unusual odors.',
        ],
        whenToGetHelp: 'If you notice constant scratching, hair loss, red inflamed skin, or foul ear odor, consult a veterinarian.',
      };
    }

    // 11. Check for Vaccines, Fleas, Ticks & Health Queries
    if (
      lower.includes('vaccin') ||
      lower.includes('flea') ||
      lower.includes('tick') ||
      lower.includes('deworm') ||
      lower.includes('sick') ||
      lower.includes('teeth') ||
      lower.includes('doctor') ||
      lower.includes('vet')
    ) {
      let healthNotes = '';
      if (selectedPet?.health?.notes) {
        healthNotes = `\n\n(Profile Health Note: "${selectedPet.health.notes}")`;
      }

      return {
        sender: 'assistant',
        category: 'health',
        text: `Essential preventive healthcare includes core vaccinations, parasite prevention, and routine dental hygiene.${healthNotes}`,
        tryThis: [
          'Core Dog Vaccines: Rabies, DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza).',
          'Core Cat Vaccines: Rabies, FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia).',
          'Administer monthly vet-approved tick, flea, and heartworm/deworming preventatives.',
          'Brush teeth several times weekly with pet-safe enzymatic toothpaste (never human toothpaste).',
        ],
        whenToGetHelp: 'Consult a licensed veterinarian for official vaccinations, prescriptions, or any signs of persistent lethargy, vomiting, or diarrhea.',
      };
    }

    // 12. Check for New Pet & Adoption Questions
    if (
      lower.includes('adopt') ||
      lower.includes('new pet') ||
      lower.includes('bring home') ||
      lower.includes('first week') ||
      lower.includes('supplies') ||
      lower.includes('checklist')
    ) {
      return {
        sender: 'assistant',
        category: 'new_pet',
        text: `Adopting a companion is a wonderful journey! Remember the **3-3-3 Rule** for newly adopted pets:\n\n` +
          `• **First 3 Days**: Decompressing, feeling overwhelmed, adjusting to new scents.\n` +
          `• **First 3 Weeks**: Learning your daily routine, understanding boundaries, feeling safer.\n` +
          `• **First 3 Months**: Building true trust, complete comfort, and bonding deeply.`,
        tryThis: [
          'Prepare a quiet "safe zone" with a bed, water bowl, and toys before bringing your pet home.',
          'Essential Checklist: Collar with ID tag, leash, crate/carrier, food/water bowls, age-appropriate food, waste bags/litter box.',
          'Keep the first week quiet and calm—avoid large parties or overwhelming visitors.',
          'Use PetConnect AI Match to discover pets that fit your lifestyle perfectly.',
        ],
      };
    }

    // 13. General / Conversational Fallback (Tailored to prompt and pet)
    const subject = petName ? petName : 'your pet';
    return {
      sender: 'assistant',
      category: 'general',
      text: `Regarding **"${trimmed}"**:\n\n` +
        `When caring for **${subject}**${petBreed ? ` (${petBreed}, ${petAge})` : ''}, consistency, positive reinforcement, and meeting their daily physical and emotional needs are key.\n\n` +
        `Feel free to ask about specific routines, diet, behavioral habits, or generate a full care plan!`,
      tryThis: [
        petName ? `Ask: "What is the best daily routine for ${petName}?"` : 'Ask: "How much exercise does my pet need?"',
        'Tap the category chips above (Nutrition, Exercise, Behavior, Grooming, Health) for instant guidance.',
        'Tap "✨ Care Plan" below to generate a complete daily & weekly routine.',
      ],
      whenToGetHelp: `For medical advice, medication, or diagnosis, always consult a licensed veterinarian.`,
    };
  },
};
