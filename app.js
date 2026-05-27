import { initCanvasSimulation } from "./modules/canvas.js";
import {
  addExperimentPoint,
  createExperimentSeries,
  exportExperimentPointsCsv,
  initKineticsChart,
  resetCurrentSeries,
  resetExperimentPoints,
} from "./modules/chart.js";
import { getExperimentInsight } from "./modules/insights.js";
import { generateQuizQuestion } from "./modules/quiz.js";
import {
  buildTeacherReport,
  buildWordleShareText,
  copyWordleShareText,
  getStopwatchTime,
  sendTeacherReport,
  setTelemetry,
  startStopwatch,
  trackQuizAnswer,
} from "./modules/share.js";

export const enzymeScenarios = [
  {
    id: 1,
    name: "Amylase",
    source: "Human Saliva",
    optimalTemp: 37,
    km: 0.2,
    desc:
      "Amylase digests starch in your mouth, turning long carbohydrate chains into smaller sugars before food reaches the stomach.",
    imgUrl:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Salivary_alpha-amylase_1SMD.png",
  },
  {
    id: 2,
    name: "Pepsin",
    source: "Human Stomach",
    optimalTemp: 38,
    km: 0.5,
    desc:
      "Pepsin breaks down proteins in highly acidic stomach conditions, where many other enzymes would lose their shape.",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pepsin.jpg",
  },
  {
    id: 3,
    name: "Taq Polymerase",
    source: "Hot Springs Bacteria",
    optimalTemp: 72,
    km: 0.1,
    desc:
      "Taq Polymerase thrives at high temperatures and is used in PCR labs to copy DNA through repeated heating cycles.",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Taq.png",
  },
];

const DEFAULT_SUBSTRATE_COUNT = 12;
const DEFAULT_TEACHER_EMAIL = "teacher@example.com";
const MAX_SUBSTRATE_COUNT = 200;
const MEASUREMENT_SECONDS = 20;
const REACTION_DURATION_MS = 5000;
const ACTIVE_SITE_TOLERANCE = 12;
const QUIZ_UNLOCK_POINT_COUNT = 3;
const QUIZ_LOCKED_MESSAGE = "Complete at least 3 experiments to unlock checkpoint questions.";

const state = {
  scenario: null,
  params: null,
  simulation: null,
  chart: null,
  challengeId: "",
  experimentPoints: [],
  currentSeriesId: null,
  currentSeriesNumber: 0,
  productsGenerated: 0,
  runProductsGenerated: 0,
  stageStartedAt: 0,
  currentQuiz: null,
  timerId: null,
  debugMetricsId: null,
  measurementId: null,
  measurementStartedAt: 0,
  measuring: false,
  initialSubstrateConcentration: 0,
  currentSpeedMultiplier: 1,
  measurementSpeedMultiplier: 1,
  measurementOccupancySamples: [],
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
  return `${scenario.name.replace(/\s+/g, "-").toUpperCase()}-${seed}-KM${params.km}`;
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
  const sliderValue = Number(input?.value);

  if (!Number.isFinite(sliderValue)) {
    return DEFAULT_SUBSTRATE_COUNT;
  }

  return Math.max(1, Math.round((clamp(sliderValue, 0, 100) / 100) * MAX_SUBSTRATE_COUNT));
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
    baseSpeed: 34 * temperatureModifier * affinityModifier * inhibitorModifier,
    brownianJitter: 18 * temperatureModifier * inhibitorModifier,
    activeSiteTolerance: ACTIVE_SITE_TOLERANCE,
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

function formatSeriesLabel(number, conditions) {
  return `Series ${number} -- enzyme ${conditions.enzymeConcentration} | temp ${conditions.temperature}C | inhibitor ${conditions.inhibitorConcentration}%`;
}

function setCurrentSeriesLabel(label) {
  const labelEl = qs("#current-series-label", "[data-field='current-series']");

  if (labelEl) {
    labelEl.textContent = label;
  }
}

function startNewExperimentSeries() {
  const number = state.currentSeriesNumber + 1;
  const conditions = getCurrentSeriesConditions();
  const series = createExperimentSeries({
    number,
    conditions,
    label: formatSeriesLabel(number, conditions),
  });

  state.currentSeriesId = series.id;
  state.currentSeriesNumber = number;
  setCurrentSeriesLabel(series.label);
  const labelEl = qs("#current-series-label", "[data-field='current-series']");
  if (labelEl) {
    labelEl.style.setProperty("--series-color", series.color);
  }
  return series;
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
    nameEl.textContent = state.scenario.name;
  }

  if (sourceEl) {
    sourceEl.textContent = state.scenario.source;
  }

  if (descEl) {
    descEl.textContent = state.scenario.desc;
  }

  if (imageEl) {
    imageEl.src = state.scenario.imgUrl;
    imageEl.alt = `${state.scenario.name} from ${state.scenario.source}`;
  }
}

function updateParameterReadout() {
  const readout = qs("#parameter-readout", "#parameterReadout", "[data-field='parameters']");

  if (!readout || !state.params) {
    return;
  }

  readout.textContent = [
    `Temp: ${getTemperatureValue()}C`,
    `Optimal: ${state.params.optimalTemp}C`,
    `Km: ${state.params.km}`,
    `Inhibitor: ${Math.round(getInhibitorValue() * 100)}%`,
  ].join(" | ");
}

function getReactionVelocity() {
  const elapsedSeconds = Math.max((performance.now() - state.stageStartedAt) / 1000, 1);
  return Number((state.productsGenerated / elapsedSeconds).toFixed(2));
}

function setExperimentStatus(message) {
  const status = qs("#experiment-status", "[data-field='experiment-status']");

  if (status) {
    status.textContent = message;
  }
}

function updateDebugMetrics() {
  const debugEl = qs("#debug-metrics", "[data-field='debug-metrics']");

  if (!debugEl || !state.simulation?.getMetrics) {
    return;
  }

  const metrics = state.simulation.getMetrics();
  debugEl.textContent = [
    `Active enzymes: ${metrics.activeEnzymes}`,
    `Occupied: ${metrics.occupiedEnzymes}/${metrics.totalEnzymes}`,
    `Enzyme occupancy: ${metrics.occupancyPercent}%`,
    `Reaction time: ${(metrics.bindDurationMs / 1000).toFixed(1)}s`,
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
  ].forEach((selector) => {
    const control = qs(selector);

    if (control) {
      control.disabled = disabled;
    }
  });
}

function recordExperimentPoint(point) {
  const experimentPoint = addExperimentPoint({
    ...point,
    seriesId: state.currentSeriesId,
  });
  state.experimentPoints.push(experimentPoint);
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

  insight.textContent = getExperimentInsight(getCurrentSeriesPoints(), {
    ...getCurrentConditions(),
    substrateConcentration: point?.substrateConcentration ?? getSubstrateCountValue(),
  });
}

function resetExperimentInsight() {
  const insight = qs("#experiment-insight");

  if (insight) {
    insight.textContent = "Run an experiment to get a short science insight.";
  }
}

function resetMeasurementPanel() {
  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
  const speed = qs("#measurement-speed");

  if (emptyState) {
    emptyState.hidden = false;
  }

  if (values) {
    values.hidden = true;
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
      questionEl.textContent = QUIZ_LOCKED_MESSAGE;
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
  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
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
    time.textContent = `${measurementSeconds} sec`;
  }

  if (velocity) {
    velocity.textContent = `${averageVelocity} products/sec`;
  }

  if (occupancy) {
    occupancy.textContent = `${averageOccupancyPercent}%`;
  }

  if (speed) {
    speed.textContent = `x${speedMultiplier}`;
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
  if (!state.currentSeriesId) {
    startNewExperimentSeries();
  }

  state.initialSubstrateConcentration = getSubstrateCountValue();
  state.measurementSpeedMultiplier = state.currentSpeedMultiplier;
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  state.stageStartedAt = performance.now();

  createSimulation();
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
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  state.stageStartedAt = performance.now();
  startStopwatch();
  setMeasurementControlsDisabled(false);
  setExperimentStatus("Ready to measure.");

  createSimulation();
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
    quizAnswers: [],
  });
}

function resetAllExperiments() {
  stopMeasurement();
  state.experimentPoints = [];
  state.currentSeriesId = null;
  state.currentSeriesNumber = 0;
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  resetExperimentPoints();
  startNewExperimentSeries();
  resetMeasurementPanel();
  resetExperimentInsight();
  updateQuizAvailability();
  setMeasurementControlsDisabled(false);
  setExperimentStatus("Ready to measure.");
}

function resetCurrentExperimentSeries() {
  stopMeasurement();
  state.experimentPoints = state.experimentPoints.filter(
    (point) => point.seriesId !== state.currentSeriesId,
  );
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.measurementOccupancySamples = [];
  resetCurrentSeries();
  resetMeasurementPanel();
  resetExperimentInsight();
  updateQuizAvailability();
  setMeasurementControlsDisabled(false);
  setExperimentStatus("Current series cleared. Ready to measure.");
}

function handleSeriesConditionChange() {
  applyPhysicsOptions();
  startNewExperimentSeries();
  resetStage();
  setExperimentStatus("New condition series started. Ready to measure.");
}

function finishExperiment() {
  stopMeasurement();

  const normalizedMeasurementSeconds = MEASUREMENT_SECONDS * state.measurementSpeedMultiplier;
  const averageVelocity = Number(
    (state.runProductsGenerated / normalizedMeasurementSeconds).toFixed(2),
  );
  const averageOccupancy =
    state.measurementOccupancySamples.length > 0
      ? state.measurementOccupancySamples.reduce((sum, value) => sum + value, 0) /
        state.measurementOccupancySamples.length
      : (state.simulation?.getMetrics?.().occupancy ?? 0);
  const averageOccupancyPercent = Math.round(averageOccupancy * 100);
  const productsFormed = state.runProductsGenerated;
  const point = recordExperimentPoint({
    substrateConcentration: state.initialSubstrateConcentration,
    averageVelocity,
    productsFormed,
    measurementSeconds: MEASUREMENT_SECONDS,
    normalizedMeasurementSeconds,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
  });
  updateMeasurementPanel({
    substrateConcentration: state.initialSubstrateConcentration,
    productsFormed,
    measurementSeconds: normalizedMeasurementSeconds,
    averageVelocity,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
  });
  updateExperimentInsight(point);
  updateQuizAvailability();

  setMeasurementControlsDisabled(false);
  setExperimentStatus(`Measured velocity: ${averageVelocity} products/sec`);
}

function updateMeasurementStatus() {
  const metrics = state.simulation?.getMetrics?.();
  if (metrics) {
    state.measurementOccupancySamples.push(metrics.occupancy);
  }

  const elapsedSeconds = Math.min(
    MEASUREMENT_SECONDS,
    Math.floor((performance.now() - state.measurementStartedAt) / 1000),
  );

  setExperimentStatus(`Measuring... ${elapsedSeconds} / ${MEASUREMENT_SECONDS} seconds`);

  if (elapsedSeconds >= MEASUREMENT_SECONDS) {
    finishExperiment();
  }
}

function runExperiment() {
  if (state.measuring) {
    return;
  }

  resetSimulationForExperiment();
  state.measurementStartedAt = performance.now();
  state.measuring = true;

  setMeasurementControlsDisabled(true);
  updateMeasurementStatus();
  state.measurementId = window.setInterval(updateMeasurementStatus, 250);
}

function updateStopwatchDisplay() {
  const timer = qs("#stopwatch", "[data-field='stopwatch']");

  if (timer) {
    timer.textContent = getStopwatchTime();
  }
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

  state.currentQuiz = generateQuizQuestion({
    vmax: getReactionVelocity(),
    substrateCount: getSubstrateCountValue(),
  });

  if (questionEl) {
    questionEl.textContent = state.currentQuiz.question;
  }

  if (!choicesEl) {
    return;
  }

  choicesEl.innerHTML = "";
  state.currentQuiz.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.text;
    button.addEventListener("click", () => {
      trackQuizAnswer({
        question: state.currentQuiz.question,
        focus: state.currentQuiz.focus,
        selectedAnswer: choice.text,
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
  const settingsButton = qs("#settings-btn", "[data-action='settings']");
  const settingsModal = qs("#settings-modal");
  const closeSettingsButton = qs("[data-close='settings']");
  const checkpointOpenButton = qs("#checkpoint-open-btn", "[data-action='open-checkpoint']");
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

  speedControl?.addEventListener("input", () => {
    state.currentSpeedMultiplier = normalizeSpeedMultiplier(speedControl.value);
    applySpeedMultiplier();
  });

  temperatureControl?.addEventListener("input", applyPhysicsOptions);
  enzymeControl?.addEventListener("input", applyPhysicsOptions);
  inhibitorControl?.addEventListener("input", applyPhysicsOptions);

  substrateControl?.addEventListener("input", () => {
    applyPhysicsOptions();
  });
  substrateControl?.addEventListener("change", () => resetStage());
  enzymeControl?.addEventListener("change", handleSeriesConditionChange);
  temperatureControl?.addEventListener("change", handleSeriesConditionChange);
  inhibitorControl?.addEventListener("change", handleSeriesConditionChange);

  runExperimentButton?.addEventListener("click", runExperiment);
  settingsButton?.addEventListener("click", () => settingsModal?.showModal());
  closeSettingsButton?.addEventListener("click", () => settingsModal?.close());
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

  shareButton?.addEventListener("click", async () => {
    const output = qs("#share-output", "#shareOutput", "[data-field='share-output']");
    const text = await copyWordleShareText({
      challengeId: state.challengeId,
      completionSeconds: Math.floor((performance.now() - state.stageStartedAt) / 1000),
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
    });

    sendTeacherReport({
      teacherEmail: getTeacherEmail(),
      subject: `EnzyMetrics Report ${state.challengeId}`,
      studentName: getStudentName(),
      challengeId: state.challengeId,
      enzymeParameters: state.params,
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
    source: state.scenario.source,
    enzyme: state.scenario.name,
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
  updateParameterReadout();
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
  });
}

function initApp() {
  initScenario();
  createChart();
  bindControls();
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
