import {
  ACTIVE_SITE_CAPTURE_RADIUS,
  BASE_PARTICLE_SPEED,
  BROWNIAN_JITTER,
  REACTION_DURATION_MS,
  initCanvasSimulation,
} from "./modules/canvas.js";
import {
  addExperimentPoint,
  getExperimentSeries,
  exportExperimentPointsCsv,
  initKineticsChart,
  refreshKineticsChartTranslations,
  resetCurrentSeries,
  resetExperimentPoints,
} from "./modules/chart.js";
import { getExperimentInsight } from "./modules/insights.js";
import { formatQuizChoiceText, formatQuizNumber, generateQuizQuestion } from "./modules/quiz.js";
import {
  buildTeacherReport,
  buildWordleShareText,
  copyWordleShareText,
  getStopwatchSeconds,
  getStopwatchTime,
  sendTeacherReport,
  setStopwatchSpeedMultiplier,
  setTelemetry,
  startStopwatch,
  trackQuizAnswer,
} from "./modules/share.js";
import {
  completeMission,
  getRoadmapMissions,
  getRoadmapProgress,
} from "./modules/roadmap.js";
import { applyTranslations, getCurrentLanguage, setLanguage, t } from "./i18n/index.js";

export const enzymeScenarios = [
  {
    id: 1,
    nameKey: "scenario.amylase.name",
    sourceKey: "scenario.amylase.source",
    optimalTemp: 37,
    km: 0.2,
    descKey: "scenario.amylase.desc",
    imgUrl:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Salivary_alpha-amylase_1SMD.png",
  },
  {
    id: 2,
    nameKey: "scenario.pepsin.name",
    sourceKey: "scenario.pepsin.source",
    optimalTemp: 38,
    km: 0.5,
    descKey: "scenario.pepsin.desc",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pepsin.jpg",
  },
  {
    id: 3,
    nameKey: "scenario.taq.name",
    sourceKey: "scenario.taq.source",
    optimalTemp: 72,
    km: 0.1,
    descKey: "scenario.taq.desc",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Taq.png",
  },
];

const DEFAULT_SUBSTRATE_COUNT = 12;
const DEFAULT_TEACHER_EMAIL = "teacher@example.com";
const MAX_SUBSTRATE_COUNT = 200;
const MEASUREMENT_SECONDS = 20;
const QUIZ_UNLOCK_POINT_COUNT = 1;
const QUIZ_LOCKED_MESSAGE = "quiz.locked";
const HIGH_OCCUPANCY_PERCENT = 80;
const HIGH_SUBSTRATE_FOR_VMAX = 80;
const VMAX_EVIDENCE_POINT_COUNT = 3;
const NUMERIC_TUPLE_PATTERN =
  /\(\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*,\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*\)/g;

const state = {
  scenario: null,
  params: null,
  simulation: null,
  chart: null,
  challengeId: "",
  experimentPoints: [],
  currentSeriesId: null,
  pendingConditions: null,
  productsGenerated: 0,
  runProductsGenerated: 0,
  currentQuiz: null,
  usedQuizSignatures: new Set(),
  timerId: null,
  debugMetricsId: null,
  measurementId: null,
  measurementStartedSimulationMs: 0,
  measurementStartedOccupancyAreaMs: 0,
  measuring: false,
  initialSubstrateConcentration: 0,
  currentSpeedMultiplier: 1,
  measurementSpeedMultiplier: 1,
  measurementOccupancySamples: [],
  currentPredictionKey: null,
  saturationInsightSeen: false,
  latestMeasurement: null,
  experimentStatusKey: "status.ready",
  experimentStatusParams: {},
  resizeFrameId: null,
  lastCanvasHeight: 0,
  canvasHeightChangeCount: 0,
  canvasHeightWindowStartedAt: 0,
  lastViewportSize: { width: window.innerWidth, height: window.innerHeight },
};

function qs(...selectors) {
  return selectors.map((selector) => document.querySelector(selector)).find(Boolean) ?? null;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function withNoise(value, percent = 0.05) {
  const multiplier = 1 + (Math.random() * 2 - 1) * percent;
  return Number((value * multiplier).toFixed(3));
}

function buildChallengeId(scenario, params) {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${t(scenario.nameKey).replace(/\s+/g, "-").toUpperCase()}-${seed}-KM${params.km}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTemperatureValue() {
  const input = qs(
    "#temp-slider",
    "#temperature-slider",
    "#temperatureSlider",
    "[data-control='temperature']",
  );
  return Number(input?.value ?? state.params?.optimalTemp ?? state.scenario?.optimalTemp ?? 37);
}

function getSubstrateCountValue() {
  const input = qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']");
  return getSubstrateParticleCountFromSlider(input?.value);
}

function getEnzymeSliderValue() {
  const input = qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']");
  return Math.max(1, Math.round(Number(input?.value ?? 6)));
}

function getEnzymeCountValue() {
  return getEnzymeSliderValue();
}

function getInhibitorValue() {
  const input = qs("#inhibitor-slider", "#inhibitorSlider", "[data-control='inhibitor']");
  return clamp(Number(input?.value ?? 0) / 100, 0, 1);
}

function getInhibitorPercentValue() {
  return Math.round(getInhibitorValue() * 100);
}

function normalizeSpeedMultiplier(value) {
  const multiplier = Number(value);
  return [1, 2, 5].includes(multiplier) ? multiplier : 1;
}

function applySpeedMultiplier() {
  state.simulation?.setSpeedMultiplier(state.currentSpeedMultiplier);
  setStopwatchSpeedMultiplier(state.currentSpeedMultiplier);
}

function getSimulationElapsedMs() {
  return state.simulation?.getSimulationElapsedMs?.() ?? 0;
}

function getSubstrateParticleCountFromSlider(value) {
  const sliderValue = Number(value);

  if (!Number.isFinite(sliderValue)) {
    return DEFAULT_SUBSTRATE_COUNT;
  }

  return Math.max(1, Math.round((clamp(sliderValue, 0, 100) / 100) * MAX_SUBSTRATE_COUNT));
}

function getTeacherEmail() {
  const input = qs("#teacher-email", "#teacherEmail", "[data-control='teacher-email']");
  return input?.value || DEFAULT_TEACHER_EMAIL;
}

function getStudentName() {
  const input = qs("#student-name", "#studentName", "[data-control='student-name']");
  return input?.value || "";
}

function calculateTemperatureModifier(temperature, optimalTemp) {
  const deviation = Math.abs(temperature - optimalTemp);
  const gradualSlowdown = clamp(1 - deviation * 0.035, 0.35, 1);
  const denaturationPenalty = deviation > 15 ? 0.35 : 1;

  return gradualSlowdown * denaturationPenalty;
}

function calculatePhysicsOptions(params) {
  const temperature = getTemperatureValue();
  const temperatureModifier = calculateTemperatureModifier(temperature, params.optimalTemp);
  const affinityModifier = clamp(1 / (1 + params.km), 0.5, 1.2);
  const inhibitorModifier = clamp(1 - getInhibitorValue() * 0.75, 0.25, 1);

  return {
    substrateCount: getSubstrateCountValue(),
    maxSubstrateCount: MAX_SUBSTRATE_COUNT,
    enzymeRadius: 16,
    substrateSize: 10,
    productRadius: 6,
    baseSpeed: BASE_PARTICLE_SPEED * temperatureModifier * affinityModifier * inhibitorModifier,
    brownianJitter: BROWNIAN_JITTER * temperatureModifier * inhibitorModifier,
    activeSiteCaptureRadius: ACTIVE_SITE_CAPTURE_RADIUS,
    bindDuration: REACTION_DURATION_MS,
    enzymeCount: Math.max(1, Math.round(getEnzymeCountValue() * inhibitorModifier)),
  };
}

function getCurrentSeriesConditions() {
  return {
    enzymeConcentration: getEnzymeSliderValue(),
    temperature: Math.round(getTemperatureValue()),
    inhibitorConcentration: getInhibitorPercentValue(),
  };
}

function formatPendingSeriesLabel(conditions) {
  return t("series.pending", {
    enzyme: conditions.enzymeConcentration,
    temp: conditions.temperature,
    inhibitor: conditions.inhibitorConcentration,
  });
}

function setCurrentSeriesLabel(label) {
  const labelEl = qs("#current-series-label", "[data-field='current-series']");

  if (labelEl) {
    labelEl.textContent = label;
  }
}

function updatePendingConditions() {
  state.pendingConditions = getCurrentSeriesConditions();
  setCurrentSeriesLabel(formatPendingSeriesLabel(state.pendingConditions));
  const labelEl = qs("#current-series-label", "[data-field='current-series']");
  if (labelEl) {
    labelEl.style.removeProperty("--series-color");
  }
}

function applyPhysicsOptions() {
  if (!state.simulation || !state.params) {
    return;
  }

  const nextOptions = calculatePhysicsOptions(state.params);
  const oldBaseSpeed = state.simulation.options.baseSpeed || 42;
  const velocityScale = clamp(nextOptions.baseSpeed / oldBaseSpeed, 0.25, 2);

  state.simulation.options = {
    ...state.simulation.options,
    ...nextOptions,
  };

  [...state.simulation.enzymes, ...state.simulation.substrates].forEach((particle) => {
    if (particle.velocity) {
      particle.velocity.x *= velocityScale;
      particle.velocity.y *= velocityScale;
    }
  });

  updateParameterReadout();
}

function populateScenarioBar() {
  const nameEl = qs("#enzyme-name", "#enzymeName", "[data-field='enzyme-name']");
  const sourceEl = qs("#enzyme-source", "#enzymeSource", "[data-field='enzyme-source']");
  const descEl = qs(
    "#scenario-text",
    "#enzyme-desc",
    "#enzymeDesc",
    "#scenario-desc",
    "[data-field='enzyme-desc']",
  );
  const imageEl = qs("#enzyme-pic", "#enzymePic", "[data-field='enzyme-pic']");

  if (nameEl) {
    nameEl.textContent = t(state.scenario.nameKey);
  }

  if (sourceEl) {
    sourceEl.textContent = t(state.scenario.sourceKey);
  }

  if (descEl) {
    descEl.textContent = t(state.scenario.descKey);
  }

  if (imageEl) {
    imageEl.src = state.scenario.imgUrl;
    imageEl.alt = t("scenario.imageAlt", {
      enzyme: t(state.scenario.nameKey),
      source: t(state.scenario.sourceKey),
    });
  }
}

function updateParameterReadout() {
  const readout = qs("#parameter-readout", "#parameterReadout", "[data-field='parameters']");

  if (!readout || !state.params) {
    return;
  }

  readout.textContent = [
    t("parameter.temp", { temp: getTemperatureValue() }),
    t("parameter.optimal", { temp: state.params.optimalTemp }),
    t("parameter.km", { km: state.params.km }),
    t("parameter.inhibitor", { inhibitor: Math.round(getInhibitorValue() * 100) }),
  ].join(" | ");
}

function getReactionVelocity() {
  const elapsedSeconds = Math.max(getSimulationElapsedMs() / 1000, 1);
  return Number((state.productsGenerated / elapsedSeconds).toFixed(2));
}

function setExperimentStatus(message) {
  const status = qs("#experiment-status", "[data-field='experiment-status']");

  if (status) {
    status.textContent = message;
  }
}

function getScenarioKeyPrefix() {
  return state.scenario?.nameKey?.replace(/\.name$/, "") ?? "";
}

function createRoadmapFact(termKey, detailKey) {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");

  term.textContent = t(termKey);
  detail.textContent = t(detailKey);
  item.append(term, detail);

  return item;
}

function completeRoadmapMission(missionId) {
  completeMission(missionId);

  if (qs("#roadmap-modal")?.open) {
    renderRoadmapModal();
  }
}

function getVmaxEvidence() {
  const currentSeriesPoints = getCurrentSeriesPoints();
  const evidencePoints = currentSeriesPoints.length > 0 ? currentSeriesPoints : state.experimentPoints;
  const hasSeveralGraphPoints =
    currentSeriesPoints.length >= VMAX_EVIDENCE_POINT_COUNT ||
    state.experimentPoints.length >= VMAX_EVIDENCE_POINT_COUNT;
  const hasHighSubstrateExperiment = evidencePoints.some(
    (point) => Number(point.substrateConcentration) >= HIGH_SUBSTRATE_FOR_VMAX,
  );
  const hasHighOccupancy = evidencePoints.some(
    (point) => Number(point.averageOccupancyPercent) >= HIGH_OCCUPANCY_PERCENT,
  );

  return {
    hasSeveralGraphPoints,
    hasHighSubstrateExperiment,
    hasSaturationInsight: state.saturationInsightSeen,
    hasHighOccupancy,
    unlocked:
      hasSeveralGraphPoints &&
      hasHighSubstrateExperiment &&
      state.saturationInsightSeen &&
      hasHighOccupancy,
  };
}

function getRoadmapShareSummary() {
  const progress = getRoadmapProgress();
  const vmaxEvidence = getVmaxEvidence();

  return {
    completedMissions: progress.completedCount,
    totalMissions: progress.totalMissions,
    vmaxDiscovered:
      vmaxEvidence.unlocked || progress.completedMissionIds.includes("discover-vmax"),
    experimentPointCount: state.experimentPoints.length,
  };
}

function renderRoadmapModal() {
  if (!state.scenario) {
    return;
  }

  const prefix = getScenarioKeyPrefix();
  const titleEl = qs("#roadmap-scenario-title");
  const sourceEl = qs("#roadmap-scenario-source");
  const introEl = qs("#roadmap-scenario-intro");
  const hookEl = qs("#roadmap-scenario-hook");
  const factsEl = qs("#roadmap-facts");
  const vmaxRevealEl = qs("#vmax-reveal");
  const progressEl = qs("#roadmap-progress");
  const missionsEl = qs("#roadmap-missions");
  const progress = getRoadmapProgress();
  const completedMissionIds = new Set(progress.completedMissionIds);
  const vmaxEvidence = getVmaxEvidence();

  if (titleEl) {
    titleEl.textContent = t(state.scenario.nameKey);
  }

  if (sourceEl) {
    sourceEl.textContent = t(state.scenario.sourceKey);
  }

  if (introEl) {
    introEl.textContent = t(`${prefix}.intro`);
  }

  if (hookEl) {
    hookEl.textContent = t(`${prefix}.hook`);
  }

  if (factsEl) {
    factsEl.replaceChildren(
      createRoadmapFact("roadmap.fact.enzyme", state.scenario.nameKey),
      createRoadmapFact("roadmap.fact.substrate", `${prefix}.substrate`),
      createRoadmapFact("roadmap.fact.product", `${prefix}.product`),
      createRoadmapFact("roadmap.fact.optimalConditions", `${prefix}.optimalConditions`),
    );
  }

  if (progressEl) {
    progressEl.textContent = t("roadmap.progress", {
      completed: progress.completedCount,
      total: progress.totalMissions,
    });
  }

  if (vmaxRevealEl) {
    vmaxRevealEl.hidden = !vmaxEvidence.unlocked;
  }

  if (missionsEl) {
    const missions = getRoadmapMissions().map((mission) => {
      const item = document.createElement("li");
      const text = document.createElement("div");
      const title = document.createElement("strong");
      const description = document.createElement("p");
      const status = document.createElement("span");

      const statusValue = completedMissionIds.has(mission.id)
        ? "completed"
        : mission.id === "discover-vmax" && vmaxEvidence.unlocked
          ? "available"
          : mission.status;

      item.className = `roadmap-mission roadmap-mission-${statusValue}`;
      title.textContent = t(mission.titleKey);
      description.textContent = t(mission.descriptionKey);
      status.className = "roadmap-status";
      status.textContent = t(`roadmap.status.${statusValue}`);

      text.append(title, description);
      item.append(text, status);

      return item;
    });

    missionsEl.replaceChildren(...missions);
  }
}

function appendTextWithMathIsolation(element, text) {
  element.textContent = "";

  let cursor = 0;
  const normalizedText = String(text);

  normalizedText.replace(NUMERIC_TUPLE_PATTERN, (match, offset) => {
    if (offset > cursor) {
      element.append(document.createTextNode(normalizedText.slice(cursor, offset)));
    }

    const math = document.createElement("span");
    math.className = "math-ltr";
    math.dir = "ltr";
    math.textContent = match;
    element.append(math);
    cursor = offset + match.length;

    return match;
  });

  if (cursor < normalizedText.length) {
    element.append(document.createTextNode(normalizedText.slice(cursor)));
  }
}

function createCoordinateChoiceElement(choice) {
  const coordinate = document.createElement("span");
  coordinate.className = "coordinate-choice";
  coordinate.dir = "ltr";

  [
    ["coord-open", "("],
    ["coord-x", formatQuizNumber(choice.x)],
    ["coord-comma", ", "],
    ["coord-y", formatQuizNumber(choice.y)],
    ["coord-close", ")"],
  ].forEach(([className, text]) => {
    const part = document.createElement("span");
    part.className = className;
    part.textContent = text;
    coordinate.append(part);
  });

  return coordinate;
}

function appendQuizChoiceContent(element, choice) {
  element.textContent = "";

  if (choice?.kind === "coordinate") {
    element.append(createCoordinateChoiceElement(choice));
    return;
  }

  appendTextWithMathIsolation(element, formatQuizChoiceText(choice));
}

function resetQuizHistory() {
  state.usedQuizSignatures.clear();
  state.currentQuiz = null;
}

function setExperimentStatusKey(key, params = {}) {
  state.experimentStatusKey = key;
  state.experimentStatusParams = { ...params };
  setExperimentStatus(t(key, params));
}

function refreshExperimentStatus() {
  setExperimentStatus(t(state.experimentStatusKey, state.experimentStatusParams));
}

function updateDebugMetrics() {
  const debugEl = qs("#debug-metrics", "[data-field='debug-metrics']");

  if (!debugEl || !state.simulation?.getMetrics) {
    return;
  }

  const metrics = state.simulation.getMetrics();
  debugEl.textContent = [
    t("debug.speed", { speed: metrics.speedMultiplier }),
    t("debug.simulatedElapsed", { seconds: (metrics.simulationElapsedMs / 1000).toFixed(1) }),
    t("debug.realElapsed", { seconds: (metrics.realElapsedMs / 1000).toFixed(1) }),
    t("debug.activeEnzymes", { count: metrics.activeEnzymes }),
    t("debug.occupied", { occupied: metrics.occupiedEnzymes, total: metrics.totalEnzymes }),
    t("debug.occupancy", { occupancy: metrics.occupancyPercent }),
    t("debug.collisionChecks", { count: metrics.collisionAttempts }),
    t("debug.bindings", { count: metrics.successfulBindings }),
    t("debug.reactionTime", { seconds: (metrics.bindDurationMs / 1000).toFixed(1) }),
  ].join(" | ");
}

function startDebugMetricsDisplay() {
  window.clearInterval(state.debugMetricsId);
  updateDebugMetrics();
  state.debugMetricsId = window.setInterval(updateDebugMetrics, 250);
}

function setMeasurementControlsDisabled(disabled) {
  [
    "#substrate-slider",
    "#enzyme-slider",
    "#temp-slider",
    "#inhibitor-slider",
    "#speed-selector",
    "#run-experiment-btn",
    "#reset-btn",
    "#reset-current-series-btn",
    "#reset-experiments-btn",
    "#export-csv-btn",
    "#skip-prediction-btn",
  ].forEach((selector) => {
    const control = qs(selector);

    if (control) {
      control.disabled = disabled;
    }
  });

  document.querySelectorAll("[data-prediction]").forEach((control) => {
    control.disabled = disabled;
  });
}

function recordExperimentPoint(point) {
  const seriesConditions = state.pendingConditions ?? getCurrentSeriesConditions();
  const experimentPoint = addExperimentPoint({
    ...point,
    seriesConditions,
  });

  if (!experimentPoint) {
    return null;
  }

  state.experimentPoints.push(experimentPoint);
  state.currentSeriesId = experimentPoint.seriesId;

  const series = getExperimentSeries().find((entry) => entry.id === experimentPoint.seriesId);
  if (series) {
    setCurrentSeriesLabel(series.label);
    const labelEl = qs("#current-series-label", "[data-field='current-series']");
    if (labelEl) {
      labelEl.style.setProperty("--series-color", series.color);
    }
  }

  return experimentPoint;
}

function getCurrentSeriesPoints() {
  return state.experimentPoints.filter((point) => point.seriesId === state.currentSeriesId);
}

function getCurrentConditions() {
  return {
    substrateConcentration: getSubstrateCountValue(),
    inhibitorConcentration: Math.round(getInhibitorValue() * 100),
    temperature: getTemperatureValue(),
    optimalTemp: state.params?.optimalTemp,
  };
}

function updateExperimentInsight(point) {
  const insight = qs("#experiment-insight");

  if (!insight) {
    return;
  }

  const insightText = getExperimentInsight(getCurrentSeriesPoints(), {
    ...getCurrentConditions(),
    substrateConcentration: point?.substrateConcentration ?? getSubstrateCountValue(),
  });
  insight.textContent = insightText;

  if (insightText === t("insight.flattening")) {
    state.saturationInsightSeen = true;
    completeRoadmapMission("notice-saturation");
    renderRoadmapModal();
  }
}

function resetExperimentInsight() {
  const insight = qs("#experiment-insight");

  if (insight) {
    insight.textContent = t("insight.empty");
  }
}

function resetMeasurementPanel() {
  state.latestMeasurement = null;

  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
  const occupancySignal = qs("#occupancy-signal");
  const speed = qs("#measurement-speed");

  if (emptyState) {
    emptyState.hidden = false;
  }

  if (values) {
    values.hidden = true;
  }

  if (occupancySignal) {
    occupancySignal.hidden = true;
    occupancySignal.textContent = "";
  }

  [substrate, products, time, velocity, occupancy, speed].forEach((element) => {
    if (element) {
      element.textContent = "--";
    }
  });
}

function updateQuizAvailability() {
  const unlocked = state.experimentPoints.length >= QUIZ_UNLOCK_POINT_COUNT;
  const questionEl = qs("#quiz-question", "#quizQuestion", "[data-field='quiz-question']");
  const choicesEl = qs("#quiz-choices", "#quizChoices", "[data-field='quiz-choices']");
  const quizButton = qs("#quiz-btn", "#newQuizButton", "[data-action='quiz']");
  const checkpointOpenButton = qs("#checkpoint-open-btn", "[data-action='open-checkpoint']");

  if (quizButton) {
    quizButton.disabled = !unlocked;
  }

  if (checkpointOpenButton) {
    checkpointOpenButton.disabled = false;
  }

  if (!unlocked) {
    if (questionEl) {
      questionEl.textContent = t(QUIZ_LOCKED_MESSAGE);
    }

    if (choicesEl) {
      choicesEl.innerHTML = "";
    }
  }
}

function updateMeasurementPanel({
  substrateConcentration,
  productsFormed,
  measurementSeconds,
  averageVelocity,
  averageOccupancyPercent,
  speedMultiplier,
}) {
  state.latestMeasurement = {
    substrateConcentration,
    productsFormed,
    measurementSeconds,
    averageVelocity,
    averageOccupancyPercent,
    speedMultiplier,
  };

  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
  const occupancySignal = qs("#occupancy-signal");
  const speed = qs("#measurement-speed");

  if (emptyState) {
    emptyState.hidden = true;
  }

  if (values) {
    values.hidden = false;
  }

  if (substrate) {
    substrate.textContent = String(substrateConcentration);
  }

  if (products) {
    products.textContent = String(productsFormed);
  }

  if (time) {
    time.textContent = t("measurement.seconds", { seconds: measurementSeconds });
  }

  if (velocity) {
    velocity.textContent = t("measurement.velocityValue", { velocity: averageVelocity });
  }

  if (occupancy) {
    occupancy.textContent = t("measurement.occupancyValue", { occupancy: averageOccupancyPercent });
  }

  if (occupancySignal) {
    occupancySignal.hidden = false;
    occupancySignal.textContent = t("measurement.averageOccupancySummary", {
      occupancy: averageOccupancyPercent,
    });
  }

  if (speed) {
    speed.textContent = t("measurement.speedValue", { speed: speedMultiplier });
  }
}

function instrumentProductGeneration(simulation) {
  const releaseProducts = simulation.releaseProducts.bind(simulation);

  simulation.releaseProducts = (enzyme) => {
    releaseProducts(enzyme);

    if (state.measuring) {
      state.productsGenerated += 2;
      state.runProductsGenerated += 2;
    }
  };
}

function getSimulationCanvas() {
  return qs(
    "#simCanvas",
    "#simulationCanvas",
    "#enzyme-canvas",
    "#canvas",
    "canvas[data-role='simulation']",
  );
}

function getSimulationViewport() {
  return qs(".simulation-viewport");
}

function trackCanvasHeightChange(height) {
  const now = performance.now();
  const viewportChanged =
    window.innerWidth !== state.lastViewportSize.width ||
    window.innerHeight !== state.lastViewportSize.height;

  if (viewportChanged) {
    state.lastViewportSize = { width: window.innerWidth, height: window.innerHeight };
    state.canvasHeightChangeCount = 0;
    state.canvasHeightWindowStartedAt = now;
  }

  if (state.lastCanvasHeight === height) {
    return;
  }

  if (now - state.canvasHeightWindowStartedAt > 3000) {
    state.canvasHeightChangeCount = 0;
    state.canvasHeightWindowStartedAt = now;
  }

  state.lastCanvasHeight = height;

  if (!viewportChanged) {
    state.canvasHeightChangeCount += 1;
  }

  if (state.canvasHeightChangeCount > 3) {
    console.warn("Canvas height feedback loop detected");
    state.canvasHeightChangeCount = 0;
    state.canvasHeightWindowStartedAt = now;
  }
}

function rectToObject(rect) {
  if (!rect) {
    return null;
  }

  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    left: Math.round(rect.left),
  };
}

function logCanvasLayout(reason) {
  const viewport = getSimulationViewport();
  const canvas = getSimulationCanvas();
  const chartCanvas = qs("#kineticsChart");
  const chartViewport = qs(".chart-viewport");
  const panel = qs(".simulation-panel");
  const mainGrid = qs(".main-grid");

  if (!viewport || !canvas) {
    return;
  }

  console.debug("[EnzyMetrics canvas layout]", {
    reason,
    canvasAttributeSize: {
      width: canvas.width,
      height: canvas.height,
    },
    canvasClientSize: {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    },
    viewport: rectToObject(viewport.getBoundingClientRect()),
    simulationPanel: rectToObject(panel?.getBoundingClientRect()),
    mainGrid: rectToObject(mainGrid?.getBoundingClientRect()),
    chartCanvasClientSize: chartCanvas
      ? { width: chartCanvas.clientWidth, height: chartCanvas.clientHeight }
      : null,
    chartViewport: rectToObject(chartViewport?.getBoundingClientRect()),
  });
}

function resizeCanvas() {
  const viewport = getSimulationViewport();
  const canvas = getSimulationCanvas();

  if (!viewport || !canvas) {
    return false;
  }

  const rect = viewport.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  trackCanvasHeightChange(height);

  if (canvas.width === width && canvas.height === height) {
    return false;
  }

  canvas.width = width;
  canvas.height = height;
  logCanvasLayout("resizeCanvas changed drawing buffer");

  return true;
}

function handleResize() {
  window.cancelAnimationFrame(state.resizeFrameId);
  state.resizeFrameId = window.requestAnimationFrame(() => {
    const changed = resizeCanvas();

    if (changed && state.simulation) {
      state.simulation.reset();
    }
  });
}

function createSimulation() {
  const canvas = getSimulationCanvas();

  if (!canvas) {
    return;
  }

  resizeCanvas();
  state.simulation?.destroy();
  state.simulation = initCanvasSimulation(canvas, calculatePhysicsOptions(state.params));
  applySpeedMultiplier();
  instrumentProductGeneration(state.simulation);
  state.simulation.start();
  updateDebugMetrics();
}

function resetSimulationForExperiment() {
  state.initialSubstrateConcentration = getSubstrateCountValue();
  state.measurementSpeedMultiplier = state.currentSpeedMultiplier;
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];

  createSimulation();
  state.measurementStartedSimulationMs = getSimulationElapsedMs();
  state.measurementStartedOccupancyAreaMs = state.simulation?.getOccupancyAreaMs?.() ?? 0;
}

function createChart() {
  const chartCanvas = qs("#kineticsChart");

  if (!chartCanvas || !window.Chart) {
    return;
  }

  state.chart = initKineticsChart(chartCanvas);
}

function stopMeasurement() {
  window.clearInterval(state.measurementId);
  state.measurementId = null;
  state.measuring = false;
}

function resetStage() {
  stopMeasurement();
  hidePredictionPrompt();
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  state.currentPredictionKey = null;
  startStopwatch();
  setMeasurementControlsDisabled(false);
  setExperimentStatusKey("status.ready");

  createSimulation();
  state.measurementStartedSimulationMs = 0;
  state.measurementStartedOccupancyAreaMs = 0;
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
    quizAnswers: [],
  });
}

function resetAllExperiments() {
  stopMeasurement();
  hidePredictionPrompt();
  resetQuizHistory();
  state.experimentPoints = [];
  state.currentSeriesId = null;
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  state.currentPredictionKey = null;
  state.saturationInsightSeen = false;
  resetExperimentPoints();
  updatePendingConditions();
  resetMeasurementPanel();
  resetExperimentInsight();
  updateQuizAvailability();
  setMeasurementControlsDisabled(false);
  setExperimentStatusKey("status.ready");
}

function resetCurrentExperimentSeries() {
  stopMeasurement();
  hidePredictionPrompt();
  state.experimentPoints = state.experimentPoints.filter(
    (point) => point.seriesId !== state.currentSeriesId,
  );
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  state.currentPredictionKey = null;
  state.saturationInsightSeen = false;
  resetCurrentSeries();
  resetMeasurementPanel();
  resetExperimentInsight();
  updateQuizAvailability();
  setMeasurementControlsDisabled(false);
  setExperimentStatusKey("status.currentSeriesCleared");
}

function handleSeriesConditionChange() {
  applyPhysicsOptions();
  updatePendingConditions();
  resetStage();
  setExperimentStatusKey("status.settingsUpdated");
}

function finishExperiment() {
  stopMeasurement();

  const simulatedMeasurementSeconds = MEASUREMENT_SECONDS;
  const averageVelocity = Number(
    (state.runProductsGenerated / simulatedMeasurementSeconds).toFixed(2),
  );
  const metrics = state.simulation?.getMetrics?.();
  const elapsedSimulationMs = Math.max(
    getSimulationElapsedMs() - state.measurementStartedSimulationMs,
    1,
  );
  const occupancyAreaMs =
    (state.simulation?.getOccupancyAreaMs?.() ?? 0) - state.measurementStartedOccupancyAreaMs;
  const averageOccupancy = metrics
    ? occupancyAreaMs / elapsedSimulationMs
    : state.measurementOccupancySamples.length > 0
      ? state.measurementOccupancySamples.reduce((sum, value) => sum + value, 0) /
        state.measurementOccupancySamples.length
      : 0;
  const averageOccupancyPercent = Math.round(averageOccupancy * 100);
  const productsFormed = state.runProductsGenerated;
  const point = recordExperimentPoint({
    substrateConcentration: state.initialSubstrateConcentration,
    averageVelocity,
    productsFormed,
    measurementSeconds: MEASUREMENT_SECONDS,
    normalizedMeasurementSeconds: simulatedMeasurementSeconds,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
    predictionKey: state.currentPredictionKey,
  });

  if (point) {
    completeRoadmapMission("run-first-experiment");

    if (state.experimentPoints.length >= 3) {
      completeRoadmapMission("build-several-graph-points");
    }
  }

  if (Number.isFinite(averageOccupancyPercent) && averageOccupancyPercent >= HIGH_OCCUPANCY_PERCENT) {
    completeRoadmapMission("observe-enzyme-occupancy");
  }

  updateMeasurementPanel({
    substrateConcentration: state.initialSubstrateConcentration,
    productsFormed,
    measurementSeconds: simulatedMeasurementSeconds,
    averageVelocity,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
  });
  updateExperimentInsight(point);
  updateQuizAvailability();
  state.currentPredictionKey = null;

  setMeasurementControlsDisabled(false);
  setExperimentStatusKey("status.measuredVelocity", { velocity: averageVelocity });
}

function updateMeasurementStatus() {
  const metrics = state.simulation?.getMetrics?.();
  if (metrics) {
    state.measurementOccupancySamples.push(metrics.occupancy);

    if (
      Number.isFinite(metrics.occupancyPercent) &&
      metrics.occupancyPercent >= HIGH_OCCUPANCY_PERCENT
    ) {
      completeRoadmapMission("observe-enzyme-occupancy");
    }
  }

  const simulatedElapsedSeconds = Math.min(
    MEASUREMENT_SECONDS,
    (getSimulationElapsedMs() - state.measurementStartedSimulationMs) / 1000,
  );
  const displayedElapsedSeconds = Math.floor(simulatedElapsedSeconds);

  setExperimentStatusKey("status.measuring", {
    elapsed: displayedElapsedSeconds,
    total: MEASUREMENT_SECONDS,
  });

  if (simulatedElapsedSeconds >= MEASUREMENT_SECONDS) {
    finishExperiment();
  }
}

function runExperiment() {
  if (state.measuring) {
    return;
  }

  hidePredictionPrompt();
  resetSimulationForExperiment();
  state.measuring = true;

  setMeasurementControlsDisabled(true);
  updateMeasurementStatus();
  state.measurementId = window.setInterval(updateMeasurementStatus, 250);
}

function showPredictionPrompt() {
  const prompt = qs("#prediction-prompt");

  if (prompt) {
    prompt.hidden = false;
  }
}

function hidePredictionPrompt() {
  const prompt = qs("#prediction-prompt");

  if (prompt) {
    prompt.hidden = true;
  }
}

function startExperimentWithPrediction(predictionKey = null) {
  state.currentPredictionKey = predictionKey;
  runExperiment();
}

function updateStopwatchDisplay() {
  const timer = qs("#stopwatch", "[data-field='stopwatch']");

  if (timer) {
    timer.textContent = getStopwatchTime();
  }
}

function formatControlValue(control) {
  switch (control?.id) {
    case "substrate-slider":
      return t("value.particles", { count: getSubstrateParticleCountFromSlider(control.value) });
    case "enzyme-slider":
      return t("value.enzymes", { count: Math.round(Number(control.value)) });
    case "temp-slider":
      return t("value.temperature", { temp: Math.round(Number(control.value)) });
    case "inhibitor-slider":
      return t("value.percent", { percent: Math.round(Number(control.value)) });
    case "speed-selector":
      return t("value.speed", { speed: normalizeSpeedMultiplier(control.value) });
    default:
      return String(control?.value ?? "");
  }
}

function updateControlValue(control) {
  if (!control?.id) {
    return;
  }

  const formattedValue = formatControlValue(control);
  const valueEl = qs(`#${control.id}-value`);
  const tooltip = control.closest(".range-wrap")?.querySelector(".range-tooltip");

  if (valueEl) {
    valueEl.textContent = formattedValue;
  }

  if (!tooltip || control.type !== "range") {
    return;
  }

  const min = Number(control.min || 0);
  const max = Number(control.max || 100);
  const value = Number(control.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  control.closest(".range-wrap")?.style.setProperty("--thumb-position", `${percent}%`);
  tooltip.textContent = formattedValue;
}

function setupControlValueFeedback(...controls) {
  controls.filter(Boolean).forEach((control) => {
    const rangeWrap = control.closest(".range-wrap");
    const update = () => updateControlValue(control);

    update();
    control.addEventListener("input", update);
    control.addEventListener("change", update);

    if (control.type === "range" && rangeWrap) {
      control.addEventListener("pointerdown", () => rangeWrap.classList.add("is-dragging"));
      ["pointerup", "pointercancel", "blur"].forEach((eventName) => {
        control.addEventListener(eventName, () => rangeWrap.classList.remove("is-dragging"));
      });
    }
  });
}

function getControlElements() {
  return [
    qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']"),
    qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']"),
    qs("#temp-slider", "#temperature-slider", "#temperatureSlider", "[data-control='temperature']"),
    qs("#inhibitor-slider", "#inhibitorSlider", "[data-control='inhibitor']"),
    qs("#speed-selector", "#speed-slider", "#speedSelector", "#speed", "[data-control='speed']"),
  ].filter(Boolean);
}

function refreshCurrentSeriesLabel() {
  const currentSeries = getExperimentSeries().find((series) => series.id === state.currentSeriesId);

  if (currentSeries) {
    setCurrentSeriesLabel(currentSeries.label);
    const labelEl = qs("#current-series-label", "[data-field='current-series']");
    if (labelEl) {
      labelEl.style.setProperty("--series-color", currentSeries.color);
    }
    return;
  }

  if (state.pendingConditions) {
    setCurrentSeriesLabel(formatPendingSeriesLabel(state.pendingConditions));
  }
}

function syncLanguageSelector() {
  const languageSelector = qs("#language-selector");

  if (languageSelector) {
    languageSelector.value = getCurrentLanguage();
  }
}

function refreshLocalizedText() {
  applyTranslations();
  syncLanguageSelector();
  populateScenarioBar();
  renderRoadmapModal();
  updateParameterReadout();
  updateDebugMetrics();
  getControlElements().forEach(updateControlValue);
  refreshKineticsChartTranslations();
  refreshCurrentSeriesLabel();

  if (state.latestMeasurement) {
    updateMeasurementPanel(state.latestMeasurement);
  }

  if (state.currentQuiz || qs("#quiz-modal")?.open) {
    renderQuizQuestion();
  } else {
    updateQuizAvailability();
  }

  const latestPoint = getCurrentSeriesPoints().at(-1);
  if (latestPoint) {
    updateExperimentInsight(latestPoint);
  } else {
    resetExperimentInsight();
  }

  refreshExperimentStatus();
}

function startTimerDisplay() {
  window.clearInterval(state.timerId);
  updateStopwatchDisplay();
  state.timerId = window.setInterval(updateStopwatchDisplay, 250);
}

function renderQuizQuestion() {
  if (state.experimentPoints.length < QUIZ_UNLOCK_POINT_COUNT) {
    updateQuizAvailability();
    return;
  }

  const questionEl = qs("#quiz-question", "#quizQuestion", "[data-field='quiz-question']");
  const choicesEl = qs("#quiz-choices", "#quizChoices", "[data-field='quiz-choices']");

  state.currentQuiz = generateQuizQuestion(
    {
      vmax: getReactionVelocity(),
      substrateCount: getSubstrateCountValue(),
      enzymeConcentration: getEnzymeSliderValue(),
      temperature: Math.round(getTemperatureValue()),
      inhibitorConcentration: getInhibitorPercentValue(),
      experimentPoints: state.experimentPoints,
      seriesData: getExperimentSeries(),
    },
    {
      usedSignatures: state.usedQuizSignatures,
    },
  );

  if (!state.currentQuiz) {
    if (questionEl) {
      questionEl.textContent = t("quiz.complete");
    }

    if (choicesEl) {
      choicesEl.innerHTML = "";
    }

    return;
  }

  state.usedQuizSignatures.add(state.currentQuiz.signature);

  if (questionEl) {
    appendTextWithMathIsolation(questionEl, state.currentQuiz.question);
  }

  if (!choicesEl) {
    return;
  }

  choicesEl.innerHTML = "";
  state.currentQuiz.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    appendQuizChoiceContent(button, choice);
    button.addEventListener("click", () => {
      trackQuizAnswer({
        question: state.currentQuiz.question,
        focus: state.currentQuiz.focus,
        selectedAnswer: formatQuizChoiceText(choice),
        attempts: choice.correct ? 1 : 3,
      });
      button.dataset.correct = String(choice.correct);
    });
    choicesEl.append(button);
  });
}

function bindControls() {
  const speedControl = qs(
    "#speed-selector",
    "#speed-slider",
    "#speedSelector",
    "#speed",
    "[data-control='speed']",
  );
  const temperatureControl = qs(
    "#temp-slider",
    "#temperature-slider",
    "#temperatureSlider",
    "[data-control='temperature']",
  );
  const substrateControl = qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']");
  const enzymeControl = qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']");
  const inhibitorControl = qs(
    "#inhibitor-slider",
    "#inhibitorSlider",
    "[data-control='inhibitor']",
  );
  const runExperimentButton = qs("#run-experiment-btn", "[data-action='run-experiment']");
  const skipPredictionButton = qs("#skip-prediction-btn");
  const settingsButton = qs("#settings-btn", "[data-action='settings']");
  const settingsModal = qs("#settings-modal");
  const closeSettingsButton = qs("[data-close='settings']");
  const checkpointOpenButton = qs("#checkpoint-open-btn", "[data-action='open-checkpoint']");
  const roadmapButton = qs("#roadmap-btn", "[data-action='open-roadmap']");
  const roadmapModal = qs("#roadmap-modal");
  const closeRoadmapButton = qs("[data-close='roadmap']");
  const quizModal = qs("#quiz-modal");
  const closeQuizButton = qs("[data-close='quiz']");
  const resetButton = qs("#reset-btn", "#resetButton", "[data-action='reset']");
  const resetCurrentSeriesButton = qs(
    "#reset-current-series-btn",
    "[data-action='reset-current-series']",
  );
  const resetExperimentsButton = qs(
    "#reset-experiments-btn",
    "[data-action='reset-experiments']",
  );
  const quizButton = qs("#quiz-btn", "#newQuizButton", "[data-action='quiz']");
  const shareButton = qs("#share-btn", "#shareButton", "[data-action='share']");
  const reportButton = qs("#teacher-report-btn", "#teacherReportButton", "[data-action='report']");
  const exportCsvButton = qs("#export-csv-btn", "[data-action='export-csv']");
  const languageSelector = qs("#language-selector");

  setupControlValueFeedback(
    substrateControl,
    enzymeControl,
    temperatureControl,
    inhibitorControl,
    speedControl,
  );

  const handleSpeedChange = () => {
    state.currentSpeedMultiplier = normalizeSpeedMultiplier(speedControl.value);
    applySpeedMultiplier();
  };

  speedControl?.addEventListener("input", handleSpeedChange);
  speedControl?.addEventListener("change", handleSpeedChange);

  const handleSeriesConditionInput = () => {
    applyPhysicsOptions();
    updatePendingConditions();
  };

  temperatureControl?.addEventListener("input", handleSeriesConditionInput);
  enzymeControl?.addEventListener("input", handleSeriesConditionInput);
  inhibitorControl?.addEventListener("input", handleSeriesConditionInput);

  substrateControl?.addEventListener("input", () => {
    applyPhysicsOptions();
  });
  substrateControl?.addEventListener("change", () => {
    const latestPoint = state.experimentPoints.at(-1);
    const substrateConcentration = getSubstrateParticleCountFromSlider(substrateControl.value);

    if (
      latestPoint &&
      substrateConcentration !== Number(latestPoint.substrateConcentration)
    ) {
      completeRoadmapMission("increase-substrate-concentration");
    }

    resetStage();
  });
  enzymeControl?.addEventListener("change", handleSeriesConditionChange);
  temperatureControl?.addEventListener("change", handleSeriesConditionChange);
  inhibitorControl?.addEventListener("change", handleSeriesConditionChange);

  runExperimentButton?.addEventListener("click", () => {
    if (state.measuring) {
      return;
    }

    showPredictionPrompt();
  });
  document.querySelectorAll("[data-prediction]").forEach((button) => {
    button.addEventListener("click", () => {
      startExperimentWithPrediction(button.dataset.prediction ?? null);
    });
  });
  skipPredictionButton?.addEventListener("click", () => startExperimentWithPrediction(null));
  settingsButton?.addEventListener("click", () => settingsModal?.showModal());
  closeSettingsButton?.addEventListener("click", () => settingsModal?.close());
  roadmapButton?.addEventListener("click", () => {
    completeRoadmapMission("intro-enzyme-system");
    renderRoadmapModal();
    roadmapModal?.showModal();
  });
  closeRoadmapButton?.addEventListener("click", () => roadmapModal?.close());
  checkpointOpenButton?.addEventListener("click", () => {
    quizModal?.showModal();
    renderQuizQuestion();
  });
  closeQuizButton?.addEventListener("click", () => quizModal?.close());
  resetButton?.addEventListener("click", () => resetStage());
  resetCurrentSeriesButton?.addEventListener("click", resetCurrentExperimentSeries);
  resetExperimentsButton?.addEventListener("click", resetAllExperiments);
  exportCsvButton?.addEventListener("click", () => exportExperimentPointsCsv());
  quizButton?.addEventListener("click", renderQuizQuestion);
  languageSelector?.addEventListener("change", () => {
    setLanguage(languageSelector.value);
    refreshLocalizedText();
  });

  shareButton?.addEventListener("click", async () => {
    const output = qs("#share-output", "#shareOutput", "[data-field='share-output']");
    const text = await copyWordleShareText({
      challengeId: state.challengeId,
      completionSeconds: getStopwatchSeconds(),
      roadmapSummary: getRoadmapShareSummary(),
    });

    if (output) {
      output.textContent = text;
    }
  });

  reportButton?.addEventListener("click", () => {
    const report = buildTeacherReport({
      studentName: getStudentName(),
      challengeId: state.challengeId,
      enzymeParameters: state.params,
      roadmapSummary: getRoadmapShareSummary(),
    });

    sendTeacherReport({
      teacherEmail: getTeacherEmail(),
      subject: t("share.reportSubject"),
      studentName: getStudentName(),
      challengeId: state.challengeId,
      enzymeParameters: state.params,
      roadmapSummary: getRoadmapShareSummary(),
    });

    const output = qs("#teacher-report-output", "#teacherReportOutput", "[data-field='report-output']");
    if (output) {
      output.textContent = report;
    }
  });
}

function initScenario() {
  state.scenario = randomItem(enzymeScenarios);
  state.params = {
    optimalTemp: withNoise(state.scenario.optimalTemp),
    km: withNoise(state.scenario.km),
    source: t(state.scenario.sourceKey),
    enzyme: t(state.scenario.nameKey),
  };
  state.challengeId = buildChallengeId(state.scenario, state.params);

  const temperatureControl = qs("#temp-slider", "#temperature-slider", "#temperatureSlider");
  if (temperatureControl) {
    temperatureControl.value = String(Math.round(state.params.optimalTemp));
  }

  const speedControl = qs("#speed-selector", "#speed-slider", "#speedSelector", "#speed");
  if (speedControl) {
    state.currentSpeedMultiplier = normalizeSpeedMultiplier(speedControl.value);
  }

  populateScenarioBar();
  renderRoadmapModal();
  updateParameterReadout();
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
  });
}

function initApp() {
  applyTranslations();
  initScenario();
  createChart();
  bindControls();
  syncLanguageSelector();
  window.addEventListener("resize", handleResize);
  resetStage();
  resetAllExperiments();
  startTimerDisplay();
  startDebugMetricsDisplay();

  window.EnzyMetrics = {
    enzymeScenarios,
    getState: () => ({ ...state }),
    addExperimentPoint: recordExperimentPoint,
    buildWordleShareText,
    generateQuizQuestion: renderQuizQuestion,
    resetExperimentPoints,
    resetCurrentExperimentSeries,
    resetAllExperiments,
    runExperiment,
    resetStage,
  };
}

document.addEventListener("DOMContentLoaded", initApp);
