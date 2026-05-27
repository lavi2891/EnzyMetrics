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

export const questionTemplates = [
  {
    id: "plot-graph-point",
    focus: FOCUS_TYPES.graphPoint,
    minExperiments: 1,
    build(data) {
      const point = getLatestPoint(data.experimentPoints);
      const conditions = getConditionsForPoint(data, point);

      return {
        question: `In this experiment there were ${formatNumber(
          conditions.enzymeConcentration,
        )} enzymes, ${formatNumber(
          point.substrateConcentration,
        )} substrates, and the measured average velocity was ${formatNumber(
          point.averageVelocity,
        )} products/sec. Which point should be plotted on the graph?`,
        correctAnswer: formatPoint(point.substrateConcentration, point.averageVelocity),
        distractors: [
          formatPoint(conditions.enzymeConcentration, point.averageVelocity),
          formatPoint(point.substrateConcentration, conditions.enzymeConcentration),
          formatPoint(point.averageVelocity, point.substrateConcentration),
        ],
        explanation:
          "The graph point is (initial substrate concentration, average velocity). Enzyme count is a condition for the series, not the X coordinate.",
      };
    },
  },
  {
    id: "x-axis-meaning",
    focus: FOCUS_TYPES.axisMeaning,
    minExperiments: 1,
    build() {
      return {
        question: "On the Michaelis-Menten graph, what belongs on the X-axis?",
        correctAnswer: "Initial substrate concentration for each experiment.",
        distractors: [
          "Average reaction velocity in products/sec.",
          "Number of enzymes used in the condition series.",
          "Total products formed after the run ends.",
        ],
        explanation:
          "The X-axis is the independent variable: the substrate concentration chosen before the experiment.",
      };
    },
  },
  {
    id: "y-axis-meaning",
    focus: FOCUS_TYPES.axisMeaning,
    minExperiments: 1,
    build() {
      return {
        question: "On the Michaelis-Menten graph, what belongs on the Y-axis?",
        correctAnswer: "Average reaction velocity in products/sec.",
        distractors: [
          "Initial substrate concentration.",
          "Enzyme concentration for the series.",
          "Temperature in C.",
        ],
        explanation:
          "The Y-axis is the dependent variable: the measured average velocity caused by the chosen substrate concentration.",
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

      return {
        question: `This run used ${formatNumber(
          point.substrateConcentration,
        )} substrates, measured ${formatNumber(
          point.averageVelocity,
        )} products/sec, and had inhibitor at ${formatNumber(
          conditions.inhibitorConcentration,
        )}%. Which value is a condition, not a plotted coordinate?`,
        correctAnswer: `${formatNumber(conditions.inhibitorConcentration)}% inhibitor`,
        distractors: [
          `${formatNumber(point.substrateConcentration)} substrates`,
          `${formatNumber(point.averageVelocity)} products/sec`,
          formatPoint(point.substrateConcentration, point.averageVelocity),
        ],
        explanation:
          "Substrate and velocity make the plotted point. Inhibitor level is part of the condition series.",
      };
    },
  },
  {
    id: "saturation-inference",
    focus: FOCUS_TYPES.saturation,
    minExperiments: MIN_TREND_POINTS,
    build(data) {
      const pair = getSaturationPair(data);

      return {
        question: `Two experiments used the same enzyme settings. Substrate increased from ${formatNumber(
          pair.lower.substrateConcentration,
        )} to ${formatNumber(
          pair.higher.substrateConcentration,
        )}, but velocity changed only from ${formatNumber(
          pair.lower.averageVelocity,
        )} to ${formatNumber(
          pair.higher.averageVelocity,
        )} products/sec. What does this suggest?`,
        correctAnswer:
          "Many enzymes are already occupied, so the reaction is approaching Vmax.",
        distractors: [
          "Velocity should always double whenever substrate doubles.",
          "The inhibitor must be increasing the reaction velocity.",
          "The X-axis should be changed from substrate concentration to time.",
        ],
        explanation:
          "A flattening curve at high substrate means enzyme availability is becoming the limiting factor.",
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

      return {
        question: `A series was measured at ${formatNumber(
          conditions.temperature,
        )} C. Which statement is best when interpreting temperature effects on velocity?`,
        correctAnswer:
          "Temperature helps only up to the enzyme's useful range; too far from optimal can lower velocity.",
        distractors: [
          "Higher temperature always increases enzyme velocity.",
          "Temperature belongs on the X-axis of this Michaelis-Menten graph.",
          "Temperature is the measured Y-axis value.",
        ],
        explanation:
          "Temperature is a series condition. It can change the curve, but it is not automatically beneficial at every value.",
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

      return {
        question: `In one series, substrate changed from ${formatNumber(
          lower.substrateConcentration,
        )} to ${formatNumber(
          higher.substrateConcentration,
        )}. What should you check before claiming velocity should double?`,
        correctAnswer:
          "Whether the curve is nearing saturation, because occupied enzymes can limit further increases.",
        distractors: [
          "Only whether the enzyme count can be used as the X coordinate.",
          "Whether inhibitor concentration increased velocity.",
          "Whether temperature should replace velocity on the Y-axis.",
        ],
        explanation:
          "Substrate increases often raise velocity at low substrate, but the effect shrinks as enzyme active sites become occupied.",
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

      return {
        question: `Two series have the same temperature and inhibitor level. One uses ${formatNumber(
          lower.conditions?.enzymeConcentration,
        )} enzymes and the other uses ${formatNumber(
          higher.conditions?.enzymeConcentration,
        )} enzymes. What should usually happen to Vmax?`,
        correctAnswer:
          "The series with more enzymes should reach a higher maximum velocity.",
        distractors: [
          "The series with fewer enzymes should always reach the higher Vmax.",
          "Changing enzyme concentration should move points to a different X-axis value.",
          "More enzymes should make inhibitor increase velocity.",
        ],
        explanation:
          "More enzymes provide more active sites, so the maximum possible velocity usually increases.",
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

      return {
        question:
          "When comparing two condition series on the same graph, which interpretation is most reasonable if one series has more inhibitor?",
        correctAnswer:
          "The higher-inhibitor series will usually have lower velocities because successful enzyme-substrate interactions are reduced.",
        distractors: [
          "More inhibitor should increase velocity by creating more active sites.",
          "Inhibitor concentration should be plotted as the Y coordinate for each point.",
          `The point from ${first.label} must always be higher than the point from ${second.label}.`,
        ],
        explanation:
          "Inhibitor is a condition that can lower the curve; it is not a plotted coordinate.",
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
    label: series.label ?? "Series",
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
    throw new TypeError("generateQuizQuestion requires at least one experiment point.");
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
