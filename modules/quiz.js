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
      "You ran an experiment that started with {{substrateCount}} substrate particles. Which graph value should be used to compare this experiment with the other points?",
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
      "This experiment produced {{vmax}} products per second. What does that Y-axis value tell you about the enzyme reaction?",
    answer({ vmax }) {
      return `The average reaction velocity was ${formatNumber(vmax)} products per second.`;
    },
    distractors({ vmax }) {
      return [
        `The initial substrate concentration was ${formatNumber(vmax)} particles.`,
        "The enzyme concentration changed during the experiment.",
        "The active site disappeared after one collision.",
      ];
    },
    explanation:
      "Reaction velocity is the dependent variable because it changes in response to substrate concentration.",
  },
  {
    id: "active-site-saturation",
    focus: FOCUS_TYPES.molecularCause,
    prompt:
      "At high substrate concentration, the curve may flatten near {{vmax}} products per second. What molecular event best explains why doubling substrate no longer doubles velocity?",
    answer() {
      return "All enzyme active sites are saturated.";
    },
    distractors({ substrateCount, vmax }) {
      return [
        `The substrate count should always fall to ${formatNumber(substrateCount / 2)} before binding can occur.`,
        `The reaction velocity should automatically double to ${formatNumber(vmax * 2)} products per second.`,
        "The products become new enzymes and slow the reaction.",
      ];
    },
    explanation:
      "At high substrate levels, available enzyme active sites are occupied, so enzyme availability limits the reaction rate.",
  },
  {
    id: "saturation-region",
    focus: FOCUS_TYPES.molecularCause,
    prompt:
      "On a Michaelis-Menten graph, which region shows saturation behavior once velocity is near {{vmax}} products per second?",
    answer() {
      return "The high-substrate, flattened region of the curve.";
    },
    distractors() {
      return [
        "The low-substrate region where the line rises steeply.",
        "Any single point before products form.",
        "Only the X-axis label, not the plotted curve.",
      ];
    },
    explanation:
      "Saturation appears where adding more substrate causes little extra velocity because most active sites are already occupied.",
  },
  {
    id: "more-enzyme-series",
    focus: FOCUS_TYPES.dependentVariable,
    prompt:
      "Two series use the same substrate concentrations, but one reaches a higher maximum velocity than {{vmax}} products per second. What condition most likely changed?",
    answer() {
      return "The higher-velocity series likely used more enzyme.";
    },
    distractors() {
      return [
        "The X-axis units changed from substrate to time.",
        "The lower-velocity series must have more active sites.",
        "Substrate concentration stopped being the independent variable.",
      ];
    },
    explanation:
      "More enzyme provides more active sites, so the reaction can reach a higher maximum velocity.",
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
