export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type PlanBlock = {
  time: string;
  subject: string;
  focus: string;
};

export type PlanDay = {
  date: string;
  label: string;
  blocks: PlanBlock[];
};

export type Profile = {
  id: string;
  full_name: string;
  class_level: string;
  language: string;
};
