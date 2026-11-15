export type SupportedLanguage = 'C++' | 'Python' | 'Java' | 'JavaScript' | 'C' | 'SQL';

export type WorkspaceTab = 'solver' | 'debugger' | 'viva';

export type ExaminerStrictness = 'friendly' | 'strict';

export interface AssignmentFileInput {
  name: string;
  mimeType: string;
  data: string; // base64 for binary (PDF/images), raw text for text/code files
  isText: boolean;
}

export interface SolveRequest {
  prompt: string;
  files?: AssignmentFileInput[];
  language: SupportedLanguage;
  includeComments: boolean;
}

export interface SolvedQuestion {
  questionNumber: number;
  questionTitle: string;
  extractedQuestion: string;
  code: string;
  fileExtension: string;
  approachSummary: string;
  timeComplexity: string;
  spaceComplexity: string;
  keySteps: string[];
}

export interface HiddenTrap {
  location: string;
  hiddenInstruction: string;
  trapArtifact: string;
  actionTaken: string;
}

export interface SolveResponse {
  assignmentTitle: string;
  hiddenTrapsDetected?: HiddenTrap[];
  rubricConstraints?: string[];
  solutions: SolvedQuestion[];
}

export interface DebugRequest {
  code: string;
  language: SupportedLanguage;
}

export interface DebugIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  location: string;
  description: string;
  fixExplanation: string;
}

export interface FlaggedPattern {
  pattern: string;
  reason: string;
}

export interface RefactoringTip {
  original: string;
  suggested: string;
  rationale: string;
}

export interface ExplainerSection {
  sectionTitle: string;
  lines: string;
  explanation: string;
}

export interface DebugResponse {
  bugsAndFixes: {
    summary: string;
    issues: DebugIssue[];
    fixedCode: string;
  };
  originalityGuard: {
    similarityRisk: 'Low' | 'Moderate' | 'High';
    assessment: string;
    flaggedPatterns: FlaggedPattern[];
    refactoringTips: RefactoringTip[];
  };
  plainEnglishExplainer: ExplainerSection[];
}

export interface VivaRequest {
  code: string;
  language: SupportedLanguage;
  strictness: ExaminerStrictness;
}

export interface DemoStep {
  stepNumber: number;
  phase: string;
  talkingPoint: string;
  codeFocus: string;
}

export interface VivaQuestion {
  id: number;
  topic: string;
  difficulty: 'Core' | 'Edge Case' | 'Deep Dive';
  question: string;
  hint: string;
  modelAnswer: string;
  codeReference: string;
}

export interface VivaResponse {
  demoScript: {
    overview: string;
    estimatedDuration: string;
    steps: DemoStep[];
  };
  vivaQuestions: VivaQuestion[];
}
