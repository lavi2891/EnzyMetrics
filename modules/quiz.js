import { t, translate } from "../i18n/index.js";

const FOCUS_TYPES = {
  axisMeaning: "axis-meaning",
  graphPoint: "graph-point",
  saturation: "saturation",
  seriesComparison: "series-comparison",
};

const MIN_TREND_POINTS = 3;
const MIN_SERIES_COUNT = 2;

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
    return "?";
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatPoint(substrateConcentration, averageVelocity) {
  return `(${formatNumber(substrateConcentration)}, ${formatNumber(averageVelocity)})`;
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
        correctAnswer: formatPoint(point.substrateConcentration, point.averageVelocity),
        distractors: [
          formatPoint(conditions.enzymeConcentration, point.averageVelocity),
          formatPoint(point.substrateConcentration, conditions.enzymeConcentration),
          formatPoint(point.averageVelocity, point.substrateConcentration),
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
        distractors: [
          template.substrateDistractor,
          template.velocityDistractor,
          formatPoint(point.substrateConcentration, point.averageVelocity),
        ],
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
    return getSaturationPair(data) !== null;
  }

  if (template.id === "compare-enzyme-series-vmax") {
    return getComparableSeries(data.seriesData) !== null;
  }

  if (template.focus === FOCUS_TYPES.seriesComparison) {
    return data.seriesData.length >= MIN_SERIES_COUNT;
  }

  return true;
}

function buildChoices(correctAnswer, distractors) {
  const uniqueChoices = [...new Set([correctAnswer, ...distractors])].slice(0, 4);

  return shuffle(uniqueChoices).map((text) => ({
    text,
    correct: text === correctAnswer,
  }));
}

export function generateQuizQuestion(sessionData) {
  const normalizedData = normalizeSessionData(sessionData);
  const availableTemplates = questionTemplates.filter((template) =>
    isTemplateAvailable(template, normalizedData),
  );

  if (availableTemplates.length === 0) {
    throw new TypeError("quiz.noAvailableTemplates");
  }

  const template = randomItem(availableTemplates);
  const builtQuestion = template.build(normalizedData);

  return {
    id: template.id,
    focus: template.focus,
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
