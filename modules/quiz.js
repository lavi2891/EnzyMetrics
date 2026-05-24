const FOCUS_TYPES = {
  independentVariable: "independent-variable",
  dependentVariable: "dependent-variable",
  molecularCause: "molecular-cause",
};

export const questionTemplates = [
  {
    id: "substrate-count-x-axis",
    focus: FOCUS_TYPES.independentVariable,
    prompt:
      "In this run, the simulation started with {{substrateCount}} substrate particles. Which value should be plotted on the X-axis for Initial Substrate Concentration?",
    answer({ substrateCount }) {
      return substrateCount;
    },
    explanation:
      "Initial substrate concentration is the independent variable, so it belongs on the X-axis.",
  },
  {
    id: "velocity-y-axis",
    focus: FOCUS_TYPES.dependentVariable,
    prompt:
      "This run produced a reaction velocity of {{vmax}} products per second. Which value should be plotted on the Y-axis?",
    answer({ vmax }) {
      return vmax;
    },
    explanation:
      "Reaction velocity is the dependent variable because it changes in response to substrate concentration.",
  },
  {
    id: "active-site-saturation",
    focus: FOCUS_TYPES.molecularCause,
    prompt:
      "The run has {{substrateCount}} substrates but the velocity is capped near {{vmax}} products per second. What molecular event best explains why adding more substrate stops increasing the rate?",
    answer() {
      return "All enzyme active sites are saturated.";
    },
    distractors({ substrateCount, vmax }) {
      return [
        `The substrate count falls to ${formatNumber(substrateCount / 2)} before binding can occur.`,
        `The reaction velocity doubles to ${formatNumber(vmax * 2)} products per second automatically.`,
        "The products become new enzymes and slow the reaction.",
      ];
    },
    explanation:
      "At high substrate levels, available enzyme active sites are occupied, so enzyme availability limits the reaction rate.",
  },
];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new TypeError("Quiz values must be finite numbers.");
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function injectValues(template, values) {
  return template.replace(/\{\{(vmax|substrateCount)\}\}/g, (_, key) =>
    formatNumber(values[key]),
  );
}

function normalizeSessionData(sessionData) {
  const vmax = Number(sessionData?.vmax);
  const substrateCount = Number(sessionData?.substrateCount);

  if (!Number.isFinite(vmax) || !Number.isFinite(substrateCount)) {
    throw new TypeError("generateQuizQuestion requires numeric vmax and substrateCount values.");
  }

  return {
    vmax,
    substrateCount,
  };
}

function numericDistractors(correctAnswer) {
  const doubled = correctAnswer * 2;
  const halved = correctAnswer / 2;
  const offset = correctAnswer + Math.max(1, Math.round(correctAnswer * 0.25));

  return [doubled, halved, offset]
    .filter((value) => Number.isFinite(value) && value !== correctAnswer)
    .map(formatNumber);
}

function buildChoices(template, correctAnswer, sessionData) {
  const formattedCorrectAnswer =
    typeof correctAnswer === "number" ? formatNumber(correctAnswer) : correctAnswer;

  const distractors = template.distractors
    ? template.distractors(sessionData)
    : numericDistractors(correctAnswer);

  const uniqueChoices = [...new Set([formattedCorrectAnswer, ...distractors])];

  return shuffle(uniqueChoices).map((text) => ({
    text,
    correct: text === formattedCorrectAnswer,
  }));
}

export function generateQuizQuestion(sessionData) {
  const normalizedData = normalizeSessionData(sessionData);
  const template = randomItem(questionTemplates);
  const correctAnswer = template.answer(normalizedData);

  return {
    id: template.id,
    focus: template.focus,
    question: injectValues(template.prompt, normalizedData),
    correctAnswer:
      typeof correctAnswer === "number" ? formatNumber(correctAnswer) : correctAnswer,
    choices: buildChoices(template, correctAnswer, normalizedData),
    explanation: injectValues(template.explanation, normalizedData),
    values: normalizedData,
  };
}

export function getQuestionTemplates() {
  return [...questionTemplates];
}
