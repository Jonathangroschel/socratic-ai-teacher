import { z } from 'zod';

export const InterestCategorySchema = z.object({
  category: z.string(),
  topics: z.array(z.string().min(1)).min(1),
});

export type InterestCategory = z.infer<typeof InterestCategorySchema>;

export const INTERESTS: InterestCategory[] = [
  {
    category: 'Self-Improvement & Mindset', topics: [
      'Habits', 'Discipline', 'Motivation', 'Time Management', 'Focus & Attention', 'Decision-Making', 'Critical Thinking', 'Mental Models', 'Learning How to Learn', 'Resilience & Grit', 'Confidence & Self-Talk', 'Creativity Boosting'
    ]
  },
  {
    category: 'Productivity & Workflows', topics: [
      'Goal Setting', 'Planning & Prioritization', 'Note-Taking Systems', 'Second Brain / Knowledge Management', 'Deep Work', 'Automation Basics', 'Email & Calendar Mastery', 'Meeting Skills', 'Personal OKRs', 'Procrastination', 'Work-Life Balance'
    ]
  },
  {
    category: 'Health & Fitness', topics: [
      'Nutrition Fundamentals', 'Strength Training', 'Cardio & Conditioning', 'Mobility & Flexibility', 'Sleep Optimization', 'Longevity Basics', 'Hydration & Electrolytes', 'Injury Prevention', 'Weight Management', 'Men’s Health Basics', 'Women’s Health Basics'
    ]
  },
  {
    category: 'Mental Health & Psychology', topics: [
      'Stress Management', 'Mindfulness', 'Emotional Intelligence', 'Anxiety Basics', 'Mood & Motivation', 'CBT Basics', 'Positive Psychology', 'Habit Change Psychology', 'Self-Compassion', 'Burnout Prevention'
    ]
  },
  {
    category: 'Relationships & Communication', topics: [
      'Active Listening', 'Empathy', 'Conflict Resolution', 'Nonviolent Communication', 'Negotiation', 'Persuasion', 'Public Speaking', 'Storytelling', 'Dating & Attraction', 'Friendship & Community', 'Family Dynamics', 'Networking'
    ]
  },
  {
    category: 'Money & Personal Finance', topics: [
      'Budgeting', 'Saving Systems', 'Debt Payoff', 'Credit Scores', 'Taxes Basics', 'Insurance Basics', 'Investing 101', 'Retirement Planning', 'Real Estate Basics', 'Financial Independence', 'Crypto Basics (Risk & Use Cases)'
    ]
  },
  {
    category: 'Career & Work', topics: [
      'Career Strategy', 'Finding Strengths', 'Job Search', 'Resume & Portfolio', 'Interviewing', 'Salary Negotiation', 'Remote Work', 'On-the-Job Performance', 'Office Politics', 'Freelancing & Contracting', 'Personal Branding'
    ]
  },
  {
    category: 'Entrepreneurship & Business', topics: [
      'Idea Generation', 'Problem Discovery', 'Validation & MVPs', 'Business Models', 'Pricing', 'Unit Economics', 'Go-to-Market', 'Fundraising Basics', 'Legal & Compliance Basics', 'Operations & Logistics', 'Customer Support', 'Scaling & Hiring'
    ]
  },
  {
    category: 'Marketing & Sales', topics: [
      'Brand Basics', 'Positioning & Messaging', 'Copywriting', 'Content Strategy', 'SEO Fundamentals', 'Email Marketing', 'Social Media Strategy', 'Paid Ads Fundamentals', 'Community Building', 'Sales Process', 'Account Management', 'Analytics for Marketers'
    ]
  },
  {
    category: 'Technology & Digital Literacy', topics: [
      'Computer Essentials', 'Internet Safety & Privacy', 'Cloud Basics', 'Spreadsheets & Data Hygiene', 'APIs (Conceptual)', 'No-Code Tools', 'Scripting Basics', 'Version Control Basics', 'Cybersecurity Hygiene', 'Digital Organization'
    ]
  },
  {
    category: 'AI & Machine Learning (General)', topics: [
      'What AI Can & Can’t Do', 'Generative AI Basics', 'Prompting Techniques', 'Using AI at Work', 'Automation Design', 'Data Ethics & Bias', 'LLMs at a High Level', 'AI for Creativity', 'AI for Productivity', 'Responsible AI & Privacy'
    ]
  },
  {
    category: 'Data & Analytics', topics: [
      'Data Literacy', 'Descriptive vs. Inferential', 'Statistics Basics', 'A/B Testing', 'Dashboards & KPIs', 'Experiment Design', 'Probability Intuition', 'Forecasting Basics', 'Survey Design', 'Data Visualization'
    ]
  },
  {
    category: 'Science', topics: [
      'Scientific Method', 'Physics Basics', 'Chemistry Basics', 'Biology Basics', 'Human Body', 'Earth Science', 'Astronomy', 'Ecology', 'Genetics Basics', 'Neuroscience Basics', 'Climate Science'
    ]
  },
  {
    category: 'Math & Logical Reasoning', topics: [
      'Arithmetic Refresh', 'Algebra Intuition', 'Geometry Intuition', 'Trigonometry Intuition', 'Calculus (Concepts)', 'Statistics & Probability', 'Logic & Proof', 'Game Theory Basics', 'Systems Thinking', 'Numeracy for Daily Life'
    ]
  },
  {
    category: 'Humanities & Social Sciences', topics: [
      'Philosophy', 'Ethics', 'Logic & Argumentation', 'History (World Overview)', 'Political Science Basics', 'Law & Civics', 'Sociology', 'Anthropology', 'World Religions Overview', 'International Relations'
    ]
  },
  {
    category: 'Arts & Creativity', topics: [
      'Creative Process', 'Writing Craft', 'Story Structure', 'Poetry Appreciation', 'Music Appreciation', 'Drawing & Sketching', 'Photography Basics', 'Film Literacy', 'Design Principles', 'UX Fundamentals'
    ]
  },
  {
    category: 'Languages & Communication Skills', topics: [
      'English Writing', 'Grammar & Style', 'Rhetoric', 'Vocabulary Building', 'Pronunciation', 'Public Speaking Practice', 'Conversation Skills', 'Learning a New Language', 'Translation Basics', 'Listening Comprehension'
    ]
  },
  {
    category: 'Practical Life Skills', topics: [
      'Cooking Fundamentals', 'Meal Planning', 'Personal Organization', 'Home Maintenance Basics', 'Car Care Basics', 'First Aid & Safety', 'Travel Planning', 'Personal Security', 'Etiquette & Manners', 'Digital Declutter'
    ]
  },
  {
    category: 'Environment & Sustainability', topics: [
      'Climate Change 101', 'Renewable Energy', 'Conservation', 'Sustainable Living', 'Circular Economy', 'Waste Reduction', 'Food Systems', 'Urban Planning Basics', 'Wildlife & Biodiversity', 'Environmental Policy'
    ]
  },
  {
    category: 'Culture & Society', topics: [
      'Media Literacy', 'Current Events', 'Global Cultures', 'Gender & Society', 'Race & Society', 'Pop Culture Analysis', 'Sports Science & Culture', 'Fashion & Style Basics', 'Cultural History', 'Digital Culture'
    ]
  },
  {
    category: 'Hobbies & Leisure', topics: [
      'Gardening', 'DIY & Craft', 'Chess & Strategy Games', 'Board & Card Games', 'Outdoor Skills', 'Hiking & Navigation', 'Meditation & Yoga', 'Journaling', 'Travel & Exploration', 'Pet Care Basics'
    ]
  },
  {
    category: 'Spirituality & Meaning', topics: [
      'Mindfulness Practice', 'Meditation Techniques', 'Purpose & Values', 'Stoicism', 'Buddhism Basics', 'Gratitude Practice', 'Journaling for Insight', 'Compassion Practice', 'Philosophy of Living'
    ]
  },
  {
    category: 'Civics & Community', topics: [
      'Civic Participation', 'Volunteering & Impact', 'Local Government Basics', 'Nonprofits & Philanthropy', 'Community Organizing', 'Media & Information Integrity', 'Digital Citizenship'
    ]
  },
];

export const SelectedInterestsSchema = z.object({
  interests: z
    .array(
      z.object({
        category: z.string(),
        topics: z.array(z.string()),
      }),
    )
    .min(1),
  goals: z.array(z.string()).optional().default([]),
  // Allow a 10 minute option as requested (was min 15)
  timeBudgetMins: z.number().int().min(10).max(60).optional().default(30),
});


