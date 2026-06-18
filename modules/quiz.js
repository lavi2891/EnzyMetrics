import { t, translate } from "../i18n/index.js";

const FOCUS_TYPES = {
  axisMeaning: "axis-meaning",
  graphPoint: "graph-point",
  saturation: "saturation",
  seriesComparison: "series-comparison",
};

const MIN_TREND_POINTS = 3;
const MIN_SERIES_COUNT = 2;
const HIGH_SUBSTRATE_FOR_SATURATION = 160;
const VMAX_EVIDENCE_POINT_COUNT = 4;
const HIGH_OCCUPANCY_FOR_VMAX = 80;

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function formatQuizNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "?";
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatNumber(value) {
  return formatQuizNumber(value);
}

function createCoordinateChoice(x, y) {
  const formattedX = formatQuizNumber(x);
  const formattedY = formatQuizNumber(y);

  return {
    id: `coordinate:${formattedX},${formattedY}`,
    kind: "coordinate",
    x,
    y,
  };
}

export function formatQuizChoiceText(choice) {
  if (choice?.kind === "coordinate") {
    return `(${formatQuizNumber(choice.x)}, ${formatQuizNumber(choice.y)})`;
  }

  return String(choice?.text ?? choice ?? "");
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getLatestPoint(points) {
  return points[points.length - 1] ?? null;
}

function getSeriesForPoint(seriesData, point) {
  return seriesData.find((series) => series.id === point?.seriesId) ?? seriesData[0] ?? null;
}

function getConditionsForPoint(data, point) {
  const series = getSeriesForPoint(data.seriesData, point);
  return {
    enzymeConcentration: toNumber(
      series?.conditions?.enzymeConcentration,
      data.enzymeConcentration,
    ),
    temperature: toNumber(series?.conditions?.temperature, data.temperature),
    inhibitorConcentration: toNumber(
      series?.conditions?.inhibitorConcentration,
      data.inhibitorConcentration,
    ),
  };
}

function sortPointsBySubstrate(points) {
  return [...points].sort(
    (a, b) => toNumber(a.substrateConcentration) - toNumber(b.substrateConcentration),
  );
}

function getCurrentSeriesPoints(data) {
  const latestPoint = getLatestPoint(data.experimentPoints);
  const seriesId = latestPoint?.seriesId;
  const points = seriesId
    ? data.experimentPoints.filter((point) => point.seriesId === seriesId)
    : data.experimentPoints;

  return sortPointsBySubstrate(points);
}

function getPointsForSeries(data, seriesId) {
  return sortPointsBySubstrate(
    data.experimentPoints.filter((point) => point.seriesId === seriesId),
  );
}

function getHighestOccupancyPoint(data) {
  return data.experimentPoints.reduce((highest, point) => {
    const currentOccupancy = toNumber(point.averageOccupancyPercent);
    const highestOccupancy = toNumber(highest?.averageOccupancyPercent, -1);
    return currentOccupancy > highestOccupancy ? point : highest;
  }, null);
}

function getSaturationPair(data) {
  const points = getCurrentSeriesPoints(data);

  if (points.length < 2) {
    return null;
  }

  for (let index = points.length - 2; index >= 0; index -= 1) {
    const lower = points[index];
    const higher = points[index + 1];
    const lowerSubstrate = toNumber(lower.substrateConcentration);
    const higherSubstrate = toNumber(higher.substrateConcentration);
    const lowerVelocity = toNumber(lower.averageVelocity);
    const higherVelocity = toNumber(higher.averageVelocity);
    const substrateRatio = lowerSubstrate > 0 ? higherSubstrate / lowerSubstrate : 0;
    const velocityChange = Math.abs(higherVelocity - lowerVelocity);
    const velocityLimit = Math.max(0.15, Math.abs(lowerVelocity) * 0.2);

    if (substrateRatio >= 1.4 && velocityChange <= velocityLimit) {
      return {
        lower,
        higher,
        substrateRatio,
        velocityChange,
      };
    }
  }

  return null;
}

function hasPointSetVmaxEvidence(data, points) {
  return (
    points.length >= VMAX_EVIDENCE_POINT_COUNT &&
    points.some((point) => toNumber(point.substrateConcentration) >= HIGH_SUBSTRATE_FOR_SATURATION) &&
    points.some((point) => toNumber(point.averageOccupancyPercent) >= HIGH_OCCUPANCY_FOR_VMAX) &&
    getSaturationPair({ ...data, experimentPoints: points }) !== null
  );
}

function hasVmaxEvidence(data) {
  if (hasPointSetVmaxEvidence(data, getCurrentSeriesPoints(data))) {
    return true;
  }

  return data.seriesData.some((series) =>
    hasPointSetVmaxEvidence(data, getPointsForSeries(data, series.id)),
  );
}

function getMaxVelocityForSeries(data, series) {
  return getPointsForSeries(data, series.id).reduce((highest, point) => {
    const velocity = toNumber(point.averageVelocity);
    return velocity > highest ? velocity : highest;
  }, 0);
}

function getComparableSeries(seriesData) {
  for (let firstIndex = 0; firstIndex < seriesData.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < seriesData.length; secondIndex += 1) {
      const first = seriesData[firstIndex];
      const second = seriesData[secondIndex];
      const firstConditions = first.conditions ?? {};
      const secondConditions = second.conditions ?? {};

      if (
        toNumber(firstConditions.temperature) === toNumber(secondConditions.temperature) &&
        toNumber(firstConditions.inhibitorConcentration) ===
          toNumber(secondConditions.inhibitorConcentration) &&
        toNumber(firstConditions.enzymeConcentration) !==
          toNumber(secondConditions.enzymeConcentration)
      ) {
        return { first, second };
      }
    }
  }

  return null;
}

function getQuizTemplate(templateKey, params = {}) {
  return translate(`quizTemplates.${templateKey}`, params);
}

export const questionTemplates = [
  {
    id: "plot-graph-point",
    focus: FOCUS_TYPES.graphPoint,
    minExperiments: 1,
    build(data) {
      const point = getLatestPoint(data.experimentPoints);
      const conditions = getConditionsForPoint(data, point);
      const template = getQuizTemplate("plotGraphPoint", {
        enzyme: formatNumber(conditions.enzymeConcentration),
        substrate: formatNumber(point.substrateConcentration),
        velocity: formatNumber(point.averageVelocity),
      });

      return {
        question: template.question,
        correctAnswer: createCoordinateChoice(point.substrateConcentration, point.averageVelocity),
        signatureData: {
          enzymeConcentration: formatNumber(conditions.enzymeConcentration),
          substrateConcentration: formatNumber(point.substrateConcentration),
          averageVelocity: formatNumber(point.averageVelocity),
        },
        distractors: [
          createCoordinateChoice(conditions.enzymeConcentration, point.substrateConcentration),
          createCoordinateChoice(point.substrateConcentration, conditions.enzymeConcentration),
          createCoordinateChoice(point.averageVelocity, point.substrateConcentration),
        ],
        explanation: template.explanation,
      };
    },
  },
  {
    id: "x-axis-meaning",
    focus: FOCUS_TYPES.axisMeaning,
    minExperiments: 1,
    build() {
      const template = getQuizTemplate("xAxisMeaning");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.xAxis.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "y-axis-meaning",
    focus: FOCUS_TYPES.axisMeaning,
    minExperiments: 1,
    build() {
      const template = getQuizTemplate("yAxisMeaning");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.yAxis.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "condition-not-coordinate",
    focus: FOCUS_TYPES.axisMeaning,
    minExperiments: 1,
    build(data) {
      const point = getLatestPoint(data.experimentPoints);
      const conditions = getConditionsForPoint(data, point);
      const template = getQuizTemplate("conditionNotCoordinate", {
        substrate: formatNumber(point.substrateConcentration),
        velocity: formatNumber(point.averageVelocity),
        inhibitor: formatNumber(conditions.inhibitorConcentration),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.condition.answer",
        signatureData: {
          substrateConcentration: formatNumber(point.substrateConcentration),
          averageVelocity: formatNumber(point.averageVelocity),
          inhibitorConcentration: formatNumber(conditions.inhibitorConcentration),
        },
        distractors: [
          template.substrateDistractor,
          template.velocityDistractor,
          createCoordinateChoice(point.substrateConcentration, point.averageVelocity),
        ],
        explanation: template.explanation,
      };
    },
  },
  {
    id: "high-occupancy-meaning",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const point = getHighestOccupancyPoint(data);
      const template = getQuizTemplate("highOccupancyMeaning", {
        occupancy: formatNumber(point?.averageOccupancyPercent),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.occupancyMeaning.answer",
        signatureData: {
          averageOccupancyPercent: formatNumber(point?.averageOccupancyPercent),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "occupancy-limits-speed",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const point = getHighestOccupancyPoint(data);
      const template = getQuizTemplate("occupancyLimitsSpeed", {
        occupancy: formatNumber(point?.averageOccupancyPercent),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.occupancyLimit.answer",
        signatureData: {
          averageOccupancyPercent: formatNumber(point?.averageOccupancyPercent),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "saturation-inference",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const pair = getSaturationPair(data);
      const template = getQuizTemplate("saturationInference", {
        lowerSubstrate: formatNumber(pair.lower.substrateConcentration),
        higherSubstrate: formatNumber(pair.higher.substrateConcentration),
        lowerVelocity: formatNumber(pair.lower.averageVelocity),
        higherVelocity: formatNumber(pair.higher.averageVelocity),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.saturation.answer",
        signatureData: {
          lowerSubstrate: formatNumber(pair.lower.substrateConcentration),
          higherSubstrate: formatNumber(pair.higher.substrateConcentration),
          lowerVelocity: formatNumber(pair.lower.averageVelocity),
          higherVelocity: formatNumber(pair.higher.averageVelocity),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "temperature-does-not-always-help",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const point = getLatestPoint(data.experimentPoints);
      const conditions = getConditionsForPoint(data, point);
      const template = getQuizTemplate("temperatureDoesNotAlwaysHelp", {
        temp: formatNumber(conditions.temperature),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.temperature.answer",
        signatureData: {
          temperature: formatNumber(conditions.temperature),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "substrate-doubling-misconception",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const points = getCurrentSeriesPoints(data);
      const lower = points[0];
      const higher = points[points.length - 1];
      const template = getQuizTemplate("substrateDoublingMisconception", {
        lowerSubstrate: formatNumber(lower.substrateConcentration),
        higherSubstrate: formatNumber(higher.substrateConcentration),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.substrateDouble.answer",
        signatureData: {
          lowerSubstrate: formatNumber(lower.substrateConcentration),
          higherSubstrate: formatNumber(higher.substrateConcentration),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "compare-enzyme-series-vmax",
    focus: FOCUS_TYPES.seriesComparison,
    minExperiments: 1,
    minSeries: MIN_SERIES_COUNT,
    build(data) {
      const comparison = getComparableSeries(data.seriesData);
      const firstEnzyme = toNumber(comparison.first.conditions?.enzymeConcentration);
      const secondEnzyme = toNumber(comparison.second.conditions?.enzymeConcentration);
      const higher = firstEnzyme >= secondEnzyme ? comparison.first : comparison.second;
      const lower = higher === comparison.first ? comparison.second : comparison.first;
      const template = getQuizTemplate("compareEnzymeSeriesVmax", {
        lowerEnzyme: formatNumber(lower.conditions?.enzymeConcentration),
        higherEnzyme: formatNumber(higher.conditions?.enzymeConcentration),
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.compareEnzyme.answer",
        signatureData: {
          lowerEnzyme: formatNumber(lower.conditions?.enzymeConcentration),
          higherEnzyme: formatNumber(higher.conditions?.enzymeConcentration),
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "enzyme-series-higher",
    focus: FOCUS_TYPES.seriesComparison,
    minExperiments: 1,
    minSeries: MIN_SERIES_COUNT,
    build(data) {
      const comparison = getComparableSeries(data.seriesData);
      const firstMax = getMaxVelocityForSeries(data, comparison.first);
      const secondMax = getMaxVelocityForSeries(data, comparison.second);
      const likelyHigher =
        firstMax >= secondMax ? comparison.first : comparison.second;
      const likelyLower = likelyHigher === comparison.first ? comparison.second : comparison.first;
      const template = getQuizTemplate("enzymeSeriesHigher", {
        higherSeries: likelyHigher.label,
        lowerSeries: likelyLower.label,
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.enzymeSeriesHigher.answer",
        signatureData: {
          higherSeries: likelyHigher.id ?? likelyHigher.label,
          lowerSeries: likelyLower.id ?? likelyLower.label,
        },
        distractors: [
          template.lowerSeriesDistractor,
          template.sameDistractor,
          template.substrateDistractor,
        ],
        explanation: template.explanation,
      };
    },
  },
  {
    id: "enzyme-count-effect",
    focus: FOCUS_TYPES.seriesComparison,
    minExperiments: 1,
    minSeries: MIN_SERIES_COUNT,
    build() {
      const template = getQuizTemplate("enzymeCountEffect");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.enzymeCountEffect.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "vmax-meaning",
    focus: FOCUS_TYPES.saturation,
    minExperiments: VMAX_EVIDENCE_POINT_COUNT,
    build() {
      const template = getQuizTemplate("vmaxMeaning");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.vmaxMeaning.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "vmax-flattening",
    focus: FOCUS_TYPES.saturation,
    minExperiments: VMAX_EVIDENCE_POINT_COUNT,
    build() {
      const template = getQuizTemplate("vmaxFlattening");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.vmaxFlattening.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "vmax-substrate-limit",
    focus: FOCUS_TYPES.saturation,
    minExperiments: VMAX_EVIDENCE_POINT_COUNT,
    build() {
      const template = getQuizTemplate("vmaxSubstrateLimit");

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.vmaxSubstrateLimit.answer",
        signatureData: {},
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
  {
    id: "compare-inhibitor-series",
    focus: FOCUS_TYPES.seriesComparison,
    minExperiments: 1,
    minSeries: MIN_SERIES_COUNT,
    build(data) {
      const series = data.seriesData;
      const first = series[0];
      const second = series[1];
      const template = getQuizTemplate("compareInhibitorSeries", {
        firstSeries: first.label,
        secondSeries: second.label,
      });

      return {
        question: template.question,
        correctAnswer: template.correctAnswer,
        correctAnswerSignature: "quiz.compareInhibitor.answer",
        signatureData: {
          firstSeries: first.id ?? first.label,
          secondSeries: second.id ?? second.label,
        },
        distractors: template.distractors,
        explanation: template.explanation,
      };
    },
  },
];

function normalizePoint(point = {}) {
  return {
    ...point,
    substrateConcentration: toNumber(point.substrateConcentration ?? point.x),
    averageVelocity: toNumber(point.averageVelocity ?? point.y ?? point.velocity),
    seriesId: point.seriesId ?? null,
  };
}

function normalizeSeries(series = {}) {
  return {
    ...series,
    id: series.id ?? null,
    label: series.label ?? t("quiz.defaultSeries"),
    conditions: series.conditions ?? {},
    points: Array.isArray(series.points) ? series.points.map(normalizePoint) : [],
  };
}

function normalizeSessionData(sessionData = {}) {
  const experimentPoints = Array.isArray(sessionData.experimentPoints)
    ? sessionData.experimentPoints.map(normalizePoint)
    : [];
  const seriesData = Array.isArray(sessionData.seriesData)
    ? sessionData.seriesData.map(normalizeSeries)
    : [];

  if (experimentPoints.length === 0 && Number.isFinite(Number(sessionData.substrateCount))) {
    experimentPoints.push({
      substrateConcentration: toNumber(sessionData.substrateCount),
      averageVelocity: toNumber(sessionData.vmax),
      seriesId: null,
    });
  }

  return {
    experimentPoints,
    seriesData,
    enzymeConcentration: toNumber(sessionData.enzymeConcentration),
    temperature: toNumber(sessionData.temperature),
    inhibitorConcentration: toNumber(sessionData.inhibitorConcentration),
  };
}

function isTemplateAvailable(template, data) {
  if (data.experimentPoints.length < (template.minExperiments ?? 0)) {
    return false;
  }

  if (data.seriesData.length < (template.minSeries ?? 0)) {
    return false;
  }

  if (template.id === "saturation-inference") {
    const pair = getSaturationPair(data);
    return pair !== null && toNumber(pair.higher.substrateConcentration) >= HIGH_SUBSTRATE_FOR_SATURATION;
  }

  if (["compare-enzyme-series-vmax", "enzyme-series-higher", "enzyme-count-effect"].includes(template.id)) {
    return getComparableSeries(data.seriesData) !== null && hasVmaxEvidence(data);
  }

  if (["vmax-meaning", "vmax-flattening", "vmax-substrate-limit"].includes(template.id)) {
    return hasVmaxEvidence(data);
  }

  if (template.focus === FOCUS_TYPES.seriesComparison) {
    return data.seriesData.length >= MIN_SERIES_COUNT;
  }

  return true;
}

function getChoiceId(choice) {
  if (choice && typeof choice === "object" && "id" in choice) {
    return choice.id;
  }

  return `text:${String(choice)}`;
}

function normalizeChoice(choice) {
  if (choice?.kind === "coordinate") {
    return choice;
  }

  const text = String(choice);
  return {
    id: `text:${text}`,
    kind: "text",
    text,
  };
}

function buildChoices(correctAnswer, distractors) {
  const correctChoice = normalizeChoice(correctAnswer);
  const uniqueChoices = [];
  const seenChoiceIds = new Set();

  [correctAnswer, ...distractors].forEach((choice) => {
    const normalizedChoice = normalizeChoice(choice);
    const choiceId = getChoiceId(normalizedChoice);

    if (!seenChoiceIds.has(choiceId) && uniqueChoices.length < 4) {
      uniqueChoices.push(normalizedChoice);
      seenChoiceIds.add(choiceId);
    }
  });

  return shuffle(uniqueChoices).map((choice) => ({
    ...choice,
    correct: getChoiceId(choice) === getChoiceId(correctChoice),
  }));
}

function getQuestionSignature(template, builtQuestion) {
  return stableStringify({
    type: template.id,
    keyData: builtQuestion.signatureData ?? {},
    correctAnswer: builtQuestion.correctAnswerSignature ?? formatQuizChoiceText(builtQuestion.correctAnswer),
  });
}

export function generateQuizQuestion(
  sessionData,
  { usedSignatures = [], preferredTemplateIds = [] } = {},
) {
  const normalizedData = normalizeSessionData(sessionData);
  const availableTemplates = questionTemplates.filter((template) =>
    isTemplateAvailable(template, normalizedData),
  );
  const preferredTemplateIdSet = new Set(preferredTemplateIds);
  const templatePool =
    preferredTemplateIdSet.size > 0
      ? availableTemplates.filter((template) => preferredTemplateIdSet.has(template.id))
      : availableTemplates;

  if (templatePool.length === 0) {
    throw new TypeError("quiz.noAvailableTemplates");
  }

  const usedSignatureSet = new Set(usedSignatures);
  const unusedQuestions = templatePool
    .map((template) => {
      const builtQuestion = template.build(normalizedData);
      const signature = getQuestionSignature(template, builtQuestion);

      return {
        template,
        builtQuestion,
        signature,
      };
    })
    .filter((question) => !usedSignatureSet.has(question.signature));

  if (unusedQuestions.length === 0) {
    return null;
  }

  const { template, builtQuestion, signature } = randomItem(unusedQuestions);

  return {
    id: template.id,
    focus: template.focus,
    signature,
    question: builtQuestion.question,
    correctAnswer: builtQuestion.correctAnswer,
    choices: buildChoices(builtQuestion.correctAnswer, builtQuestion.distractors),
    explanation: builtQuestion.explanation,
    values: normalizedData,
  };
}

export function getQuestionTemplates() {
  return [...questionTemplates];
}
