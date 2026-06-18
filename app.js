import {
  ACTIVE_SITE_CAPTURE_RADIUS,
  BASE_PARTICLE_SPEED,
  BROWNIAN_JITTER,
  REACTION_DURATION_MS,
  initCanvasSimulation,
} from "./modules/canvas.js";
import {
  addExperimentPoint,
  getChartImageDataUrl,
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
  roadmapMissionStatuses,
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
const HIGH_SUBSTRATE_FOR_VMAX = 160;
const VMAX_EVIDENCE_POINT_COUNT = 4;
const ROADMAP_ONBOARDING_STORAGE_KEY = "hasSeenRoadmapIntro";
const LEARNING_MODE_STORAGE_KEY = "enzymetrics.learningMode";
const GUIDED_STEP_STORAGE_KEY = "enzymetrics.guidedSteps";
const GUIDED_PROMPT_STORAGE_KEY = "enzymetrics.guidedPromptsSeen";
const LEARNING_MODES = Object.freeze({
  guided: "guided",
  free: "free",
});
const GUIDED_STEPS = Object.freeze({
  firstExperiment: "first-experiment",
});
const ROADMAP_MISSION_IDS = Object.freeze({
  intro: "intro-enzyme-system",
  addEnzymes: "add-or-observe-enzymes",
  setIdealTemperature: "set-ideal-temperature",
  addSubstrate: "add-substrate",
  runLowSubstrate: "run-first-experiment",
  runMediumSubstrate: "increase-substrate-concentration",
  runHighSubstrate: "build-several-graph-points",
  reachHighOccupancy: "observe-enzyme-occupancy",
  noticeSaturation: "notice-saturation",
  discoverVmax: "discover-vmax",
  increaseEnzymeConcentration: "increase-enzyme-concentration",
  compareEnzymeSeries: "compare-enzyme-series",
});
const GUIDED_PROMPTS = Object.freeze({
  welcome: "welcome",
  addSubstrate: "add-substrate",
  setTemperature: "set-temperature",
  firstMeasurement: "first-measurement",
  firstGraphPoint: "first-graph-point",
  curveComparison: "curve-comparison",
  occupancyIntro: "occupancy-intro",
  speedIntro: "speed-intro",
  enzymeComparisonIntro: "enzyme-comparison-intro",
  enzymeSeriesIntro: "enzyme-series-intro",
});
const REPEATABLE_GUIDED_PROMPTS = new Set([GUIDED_PROMPTS.curveComparison]);
const GUIDED_FIRST_GRAPH_QUIZ_TEMPLATE_IDS = Object.freeze([
  "x-axis-meaning",
  "y-axis-meaning",
  "plot-graph-point",
]);
const GUIDED_OCCUPANCY_QUIZ_TEMPLATE_IDS = Object.freeze([
  "high-occupancy-meaning",
  "occupancy-limits-speed",
]);
const GUIDED_SATURATION_QUIZ_TEMPLATE_IDS = Object.freeze(["saturation-inference"]);
const GUIDED_VMAX_QUIZ_TEMPLATE_IDS = Object.freeze([
  "vmax-meaning",
  "vmax-flattening",
  "vmax-substrate-limit",
]);
const GUIDED_ENZYME_COMPARISON_QUIZ_TEMPLATE_IDS = Object.freeze([
  "compare-enzyme-series-vmax",
  "enzyme-series-higher",
  "enzyme-count-effect",
]);
const GUIDED_PROMPT_CONTENT = Object.freeze({
  [GUIDED_PROMPTS.welcome]: {
    eyebrowKey: "guided.welcome.eyebrow",
    titleKey: "guided.welcome.title",
    bodyKeys: [
      "guided.welcome.investigate",
      "guided.welcome.enzyme",
      "guided.welcome.substrate",
      "guided.welcome.measure",
      "guided.welcome.discover",
      "guided.welcome.action",
    ],
  },
  [GUIDED_PROMPTS.setTemperature]: {
    eyebrowKey: "guided.mission.temperature.eyebrow",
    titleKey: "guided.mission.temperature.title",
    bodyKeys: ["guided.mission.temperature.body", "guided.mission.temperature.action"],
  },
  [GUIDED_PROMPTS.addSubstrate]: {
    eyebrowKey: "guided.mission.substrate.eyebrow",
    titleKey: "guided.mission.substrate.title",
    bodyKeys: ["guided.mission.substrate.body", "guided.mission.substrate.action"],
  },
  [GUIDED_PROMPTS.firstMeasurement]: {
    eyebrowKey: "guided.mission.measurement.eyebrow",
    titleKey: "guided.mission.measurement.title",
    bodyKeys: ["guided.mission.measurement.body", "guided.mission.measurement.action"],
  },
  [GUIDED_PROMPTS.firstGraphPoint]: {
    eyebrowKey: "guided.result.firstExperiment.eyebrow",
    titleKey: "guided.result.firstExperiment.title",
    bodyKeys: [
      "guided.result.firstExperiment.measured",
      "guided.result.firstExperiment.velocity",
      "guided.result.firstExperiment.xAxis",
      "guided.result.firstExperiment.yAxis",
      "guided.result.firstExperiment.graph",
      "guided.result.firstExperiment.action",
    ],
  },
  [GUIDED_PROMPTS.curveComparison]: {
    eyebrowKey: "guided.curve.comparison.eyebrow",
    titleKey: "guided.curve.comparison.title",
    bodyKeys: [
      "guided.curve.comparison.substrate",
      "guided.curve.comparison.velocity",
      "guided.curve.comparison.action",
    ],
  },
  [GUIDED_PROMPTS.occupancyIntro]: {
    eyebrowKey: "guided.occupancy.eyebrow",
    titleKey: "guided.occupancy.title",
    bodyKeys: ["guided.occupancy.meaning", "guided.occupancy.action"],
  },
  [GUIDED_PROMPTS.speedIntro]: {
    eyebrowKey: "guided.speed.eyebrow",
    titleKey: "guided.speed.title",
    bodyKeys: ["guided.speed.meaning", "guided.speed.action"],
  },
  [GUIDED_PROMPTS.enzymeComparisonIntro]: {
    eyebrowKey: "guided.enzymeComparison.eyebrow",
    titleKey: "guided.enzymeComparison.title",
    bodyKeys: ["guided.enzymeComparison.series", "guided.enzymeComparison.action"],
  },
  [GUIDED_PROMPTS.enzymeSeriesIntro]: {
    eyebrowKey: "guided.enzymeSeries.eyebrow",
    titleKey: "guided.enzymeSeries.title",
    bodyKeys: ["guided.enzymeSeries.explanation", "guided.enzymeSeries.action"],
  },
});
const NUMERIC_TUPLE_PATTERN =
  /\(\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*,\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*\)/g;

const state = {
  learningMode: LEARNING_MODES.guided,
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
  currentMeasurementSeconds: MEASUREMENT_SECONDS,
  currentSpeedMultiplier: 1,
  measurementSpeedMultiplier: 1,
  measurementOccupancySamples: [],
  currentPredictionKey: null,
  saturationInsightSeen: false,
  roadmapOnboardingActive: false,
  pendingRoadmapWelcome: false,
  guidedSteps: new Set(),
  guidedPromptQueue: [],
  activeGuidedPromptId: null,
  latestPointComparison: null,
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

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function hasSeenRoadmapIntro() {
  return canUseLocalStorage()
    ? window.localStorage.getItem(ROADMAP_ONBOARDING_STORAGE_KEY) === "true"
    : true;
}

function markRoadmapIntroSeen() {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ROADMAP_ONBOARDING_STORAGE_KEY, "true");
  }
}

function normalizeLearningMode(mode) {
  return Object.values(LEARNING_MODES).includes(mode) ? mode : null;
}

function getUrlLearningMode() {
  try {
    return normalizeLearningMode(new URLSearchParams(window.location.search).get("mode"));
  } catch {
    return null;
  }
}

function getStoredLearningMode() {
  if (!canUseLocalStorage()) {
    return null;
  }

  return normalizeLearningMode(window.localStorage.getItem(LEARNING_MODE_STORAGE_KEY));
}

function storeLearningMode(mode) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(LEARNING_MODE_STORAGE_KEY, mode);
  }
}

function readStoredSet(storageKey) {
  if (!canUseLocalStorage()) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []);
  } catch {
    return new Set();
  }
}

function writeStoredSet(storageKey, values) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify([...values]));
  }
}

function getInitialLearningMode() {
  const urlMode = getUrlLearningMode();

  if (urlMode) {
    storeLearningMode(urlMode);
    return urlMode;
  }

  return getStoredLearningMode() ?? LEARNING_MODES.guided;
}

function isFreeLearningMode() {
  return state.learningMode === LEARNING_MODES.free;
}

function isGuidedLearningMode() {
  return state.learningMode === LEARNING_MODES.guided;
}

function hasCompletedGuidedStep(stepId) {
  return isFreeLearningMode() || state.guidedSteps.has(stepId);
}

function completeGuidedStep(stepId) {
  if (!stepId || state.guidedSteps.has(stepId)) {
    return false;
  }

  state.guidedSteps.add(stepId);
  writeStoredSet(GUIDED_STEP_STORAGE_KEY, state.guidedSteps);
  updateGuidedLabUi();
  return true;
}

function getCompletedMissionIds() {
  return new Set(getRoadmapProgress().completedMissionIds);
}

function getRoadmapMission(missionId) {
  return getRoadmapMissions().find((mission) => mission.id === missionId) ?? null;
}

function getMissionTarget(missionId) {
  return getRoadmapMission(missionId)?.target ?? null;
}

function getTargetEnzymeCount() {
  const value = Number(getMissionTarget(ROADMAP_MISSION_IDS.addEnzymes)?.value);
  return Number.isFinite(value) ? Math.round(value) : 5;
}

function getComparisonEnzymeTarget() {
  const value = Number(getMissionTarget(ROADMAP_MISSION_IDS.increaseEnzymeConcentration)?.value);
  return Number.isFinite(value) ? Math.round(value) : 10;
}

function getComparisonSeriesPointTarget() {
  const value = Number(getMissionTarget(ROADMAP_MISSION_IDS.compareEnzymeSeries)?.value);
  return Number.isFinite(value) ? Math.round(value) : 2;
}

function getTargetSubstrateCount() {
  const value = Number(getMissionTarget(ROADMAP_MISSION_IDS.addSubstrate)?.value);
  return Number.isFinite(value) ? Math.round(value) : 20;
}

function getMissionSubstrateTarget(missionId, fallback) {
  const value = Number(getMissionTarget(missionId)?.value);
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function getLowSubstrateTarget() {
  return getMissionSubstrateTarget(ROADMAP_MISSION_IDS.runLowSubstrate, getTargetSubstrateCount());
}

function getMediumSubstrateTarget() {
  return getMissionSubstrateTarget(ROADMAP_MISSION_IDS.runMediumSubstrate, 80);
}

function getHighSubstrateTarget() {
  return getMissionSubstrateTarget(ROADMAP_MISSION_IDS.runHighSubstrate, 160);
}

function getTargetTemperature() {
  return Math.round(Number(state.params?.optimalTemp ?? state.scenario?.optimalTemp ?? 37));
}

function formatSignedDelta(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  const formatted = formatQuizNumber(number);
  return number > 0 ? `+${formatted}` : formatted;
}

function getRoadmapMissionI18nParams() {
  return {
    targetEnzymeCount: getTargetEnzymeCount(),
    targetSubstrateCount: getTargetSubstrateCount(),
    lowSubstrateCount: getLowSubstrateTarget(),
    mediumSubstrateCount: getMediumSubstrateTarget(),
    highSubstrateCount: getHighSubstrateTarget(),
    comparisonEnzymeCount: getComparisonEnzymeTarget(),
    comparisonPointCount: getComparisonSeriesPointTarget(),
    targetTemperature: getTargetTemperature(),
  };
}

function isGuidedEnzymeSetupComplete(completedMissionIds = getCompletedMissionIds()) {
  return completedMissionIds.has(ROADMAP_MISSION_IDS.addEnzymes);
}

function isGuidedTemperatureSetupComplete(completedMissionIds = getCompletedMissionIds()) {
  return completedMissionIds.has(ROADMAP_MISSION_IDS.setIdealTemperature);
}

function isGuidedSubstrateSetupComplete(completedMissionIds = getCompletedMissionIds()) {
  return completedMissionIds.has(ROADMAP_MISSION_IDS.addSubstrate);
}

function isTargetEnzymeCountSet() {
  return getEnzymeCountValue() >= getTargetEnzymeCount();
}

function isTargetTemperatureSet() {
  return Math.round(getTemperatureValue()) === getTargetTemperature();
}

function isTargetSubstrateCountSet() {
  return getSubstrateCountValue() >= getTargetSubstrateCount();
}

function isOccupancyLearningUnlocked() {
  return isFreeLearningMode() || getCurrentSeriesPoints().length >= VMAX_EVIDENCE_POINT_COUNT;
}

function isSaturationLearningUnlocked() {
  const completedMissionIds = getCompletedMissionIds();
  return (
    isFreeLearningMode() ||
    (state.saturationInsightSeen && completedMissionIds.has(ROADMAP_MISSION_IDS.runHighSubstrate))
  );
}

function isEnzymeComparisonLearningUnlocked() {
  return isFreeLearningMode() || getCompletedMissionIds().has(ROADMAP_MISSION_IDS.discoverVmax);
}

function isSpeedControlUnlocked() {
  return isFreeLearningMode() || getCompletedMissionIds().has(ROADMAP_MISSION_IDS.runLowSubstrate);
}

function hasComparableEnzymeSeries() {
  const series = getExperimentSeries();

  for (let firstIndex = 0; firstIndex < series.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < series.length; secondIndex += 1) {
      const firstConditions = series[firstIndex].conditions ?? {};
      const secondConditions = series[secondIndex].conditions ?? {};

      if (
        Number(firstConditions.temperature) === Number(secondConditions.temperature) &&
        Number(firstConditions.inhibitorConcentration) === Number(secondConditions.inhibitorConcentration) &&
        Number(firstConditions.enzymeConcentration) !== Number(secondConditions.enzymeConcentration) &&
        series[firstIndex].points.length > 0 &&
        series[secondIndex].points.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

function hasHighOccupancyPoint() {
  return getCurrentSeriesPoints().some(
    (point) => Number(point.averageOccupancyPercent) >= HIGH_OCCUPANCY_PERCENT,
  );
}

function areGuidedAdvancedSettingsUnlocked() {
  return isFreeExplorationUnlocked();
}

function hasAvailableSettingsControls({
  enzymeAvailable = false,
  temperatureAvailable = false,
  speedUnlocked = false,
  advancedSettingsUnlocked = false,
} = {}) {
  return enzymeAvailable || temperatureAvailable || speedUnlocked || advancedSettingsUnlocked;
}

function getScenarioId(scenario = state.scenario) {
  return String(scenario?.id ?? "");
}

function getScenarioById(id) {
  return enzymeScenarios.find((scenario) => getScenarioId(scenario) === String(id)) ?? null;
}

function createScenarioParams(scenario) {
  return {
    optimalTemp: withNoise(scenario.optimalTemp),
    km: withNoise(scenario.km),
    source: t(scenario.sourceKey),
    enzyme: t(scenario.nameKey),
  };
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

function getMeasurementDurationSeconds() {
  const input = qs("#measurement-duration-selector");
  const value = Number(input?.value ?? state.currentMeasurementSeconds ?? MEASUREMENT_SECONDS);

  return [10, 20, 30, 60].includes(value) ? value : MEASUREMENT_SECONDS;
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
  const substrateCount =
    isFreeLearningMode() || isGuidedEnzymeSetupComplete() ? getSubstrateCountValue() : 0;

  return {
    substrateCount,
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
    enzymeSystemId: getScenarioId(),
    enzymeSystemKey: state.scenario?.nameKey ?? "",
    enzymeSystemName: state.scenario ? t(state.scenario.nameKey) : "?",
    enzymeConcentration: getEnzymeSliderValue(),
    temperature: Math.round(getTemperatureValue()),
    inhibitorConcentration: getInhibitorPercentValue(),
  };
}

function formatPendingSeriesLabel(conditions) {
  return t("series.pending", {
    system: conditions.enzymeSystemName ?? "?",
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

function syncScenarioSelector() {
  const selector = qs("#enzyme-selector");

  if (!selector) {
    return;
  }

  const selectedValue = getScenarioId();
  const options = enzymeScenarios.map((scenario) => {
    const option = document.createElement("option");
    option.value = getScenarioId(scenario);
    option.textContent = t(scenario.nameKey);
    return option;
  });

  selector.replaceChildren(...options);
  selector.value = selectedValue;
}

function updateScenarioSelectorAvailability() {
  const selector = qs("#enzyme-selector");
  const wrapper = selector?.closest(".enzyme-select-control");
  const available = isFreeLearningMode() || isFreeExplorationUnlocked();

  if (wrapper) {
    wrapper.hidden = !available;
  }

  if (selector) {
    selector.disabled = !available || state.measuring;
  }
}

function setElementHidden(selector, hidden) {
  const element = qs(selector);

  if (element) {
    element.hidden = hidden;
  }
}

function setControlDisabled(selector, disabled) {
  const control = qs(selector);

  if (control) {
    control.disabled = disabled;
  }
}

function setGuidedAdvancedMeasurementsHidden(hidden) {
  document.querySelectorAll(".guided-advanced-measurement").forEach((element) => {
    element.hidden = hidden;
  });
}

function setOccupancyLearningVisible(visible) {
  setElementHidden(".occupancy-measurement", !visible);
  setElementHidden("#occupancy-meter", !visible || !state.latestMeasurement);
}

function setSpeedLearningVisible(visible) {
  setElementHidden(".speed-measurement", !visible);
}

function updateOccupancyMeter(occupancyPercent) {
  const value = clamp(Number(occupancyPercent), 0, 100);
  const valueEl = qs("#occupancy-meter-value");
  const fillEl = qs("#occupancy-meter-fill");

  if (valueEl) {
    valueEl.textContent = t("measurement.occupancyValue", { occupancy: Math.round(value) });
  }

  if (fillEl) {
    fillEl.style.width = `${value}%`;
  }
}

function isGuidedPromptSeen(promptId) {
  return readStoredSet(GUIDED_PROMPT_STORAGE_KEY).has(promptId);
}

function markGuidedPromptSeen(promptId) {
  const seenPrompts = readStoredSet(GUIDED_PROMPT_STORAGE_KEY);
  seenPrompts.add(promptId);
  writeStoredSet(GUIDED_PROMPT_STORAGE_KEY, seenPrompts);
}

function shouldQueueGuidedPrompt(promptId) {
  return (
    isGuidedLearningMode() &&
    Boolean(GUIDED_PROMPT_CONTENT[promptId]) &&
    (REPEATABLE_GUIDED_PROMPTS.has(promptId) || !isGuidedPromptSeen(promptId)) &&
    state.activeGuidedPromptId !== promptId &&
    !state.guidedPromptQueue.includes(promptId)
  );
}

function canShowGuidedPrompt() {
  const blockingDialog = [...document.querySelectorAll("dialog[open]")].find(
    (dialog) => dialog.id !== "guided-modal",
  );
  return !blockingDialog;
}

function renderGuidedPrompt(promptId) {
  const content = GUIDED_PROMPT_CONTENT[promptId];
  const eyebrow = qs("#guided-modal-eyebrow");
  const title = qs("#guided-modal-title");
  const body = qs("#guided-modal-body");

  if (!content || !eyebrow || !title || !body) {
    return false;
  }

  const promptParams = {
    ...getRoadmapMissionI18nParams(),
    productsFormed: state.latestMeasurement?.productsFormed ?? 0,
    measurementSeconds: state.latestMeasurement?.measurementSeconds ?? MEASUREMENT_SECONDS,
    averageVelocity: state.latestMeasurement?.averageVelocity ?? 0,
    measurementEnzymeCount: state.latestMeasurement?.enzymeCount ?? getEnzymeCountValue(),
    previousSubstrate: state.latestPointComparison?.previousSubstrate ?? 0,
    currentSubstrate: state.latestPointComparison?.currentSubstrate ?? 0,
    substrateDelta: state.latestPointComparison?.substrateDelta ?? "0",
    previousVelocity: state.latestPointComparison?.previousVelocity ?? 0,
    currentVelocity: state.latestPointComparison?.currentVelocity ?? 0,
    velocityDelta: state.latestPointComparison?.velocityDelta ?? "0",
  };
  eyebrow.textContent = t(content.eyebrowKey);
  title.textContent = t(content.titleKey, promptParams);
  body.replaceChildren(
    ...content.bodyKeys.map((key) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = t(key, promptParams);
      return paragraph;
    }),
  );

  return true;
}

function showNextGuidedPrompt() {
  const modal = qs("#guided-modal");

  if (!modal || modal.open || !isGuidedLearningMode() || !canShowGuidedPrompt()) {
    return;
  }

  while (state.guidedPromptQueue.length > 0) {
    const promptId = state.guidedPromptQueue.shift();

    if (
      (!REPEATABLE_GUIDED_PROMPTS.has(promptId) && isGuidedPromptSeen(promptId)) ||
      !renderGuidedPrompt(promptId)
    ) {
      continue;
    }

    state.activeGuidedPromptId = promptId;
    modal.showModal();
    return;
  }
}

function queueGuidedPrompt(promptId) {
  if (!shouldQueueGuidedPrompt(promptId)) {
    return;
  }

  state.guidedPromptQueue.push(promptId);
  window.setTimeout(showNextGuidedPrompt, 0);
}

function closeGuidedPrompt() {
  const modal = qs("#guided-modal");

  if (
    state.activeGuidedPromptId &&
    !REPEATABLE_GUIDED_PROMPTS.has(state.activeGuidedPromptId)
  ) {
    markGuidedPromptSeen(state.activeGuidedPromptId);
  }

  state.activeGuidedPromptId = null;

  if (modal?.open) {
    modal.close();
  }

  window.setTimeout(showNextGuidedPrompt, 0);
}

function updateGuidedLabUi() {
  const freeMode = isFreeLearningMode();
  const completedMissionIds = getCompletedMissionIds();
  const enzymeSetupComplete = isGuidedEnzymeSetupComplete(completedMissionIds);
  const temperatureSetupComplete = isGuidedTemperatureSetupComplete(completedMissionIds);
  const substrateSetupComplete = isGuidedSubstrateSetupComplete(completedMissionIds);
  const firstExperimentComplete = completedMissionIds.has(ROADMAP_MISSION_IDS.runLowSubstrate);
  const enzymeComparisonUnlocked = isEnzymeComparisonLearningUnlocked();
  const speedUnlocked = freeMode || isSpeedControlUnlocked();
  const advancedSettingsUnlocked = freeMode || areGuidedAdvancedSettingsUnlocked();
  const curveBuilding = !freeMode && firstExperimentComplete;
  const enzymeAvailable = freeMode || advancedSettingsUnlocked || !curveBuilding || enzymeComparisonUnlocked;
  const temperatureAvailable = freeMode || advancedSettingsUnlocked || (enzymeSetupComplete && !curveBuilding);
  const substrateAvailable = freeMode || temperatureSetupComplete;
  const experimentReady = freeMode || substrateSetupComplete;
  const hasExperimentData = state.experimentPoints.length > 0;
  const occupancyLearningVisible = freeMode || isOccupancyLearningUnlocked();
  const settingsAvailable = hasAvailableSettingsControls({
    enzymeAvailable,
    temperatureAvailable,
    speedUnlocked,
    advancedSettingsUnlocked,
  });

  setElementHidden(".build-curve-section", !substrateAvailable);
  setElementHidden(".compact-measurement", !freeMode && !experimentReady && !hasExperimentData);
  setElementHidden(".insight-strip", !freeMode && !experimentReady && !hasExperimentData);
  setElementHidden("#checkpoint-open-btn", !freeMode && !hasExperimentData);
  setElementHidden(".overflow-menu", !freeMode && !hasExperimentData);
  setElementHidden("#settings-btn", !settingsAvailable);
  setElementHidden("#current-series-label", !freeMode && !temperatureAvailable && !hasExperimentData);
  setElementHidden(".share-strip", !freeMode && !hasExperimentData);
  setElementHidden("#debug-metrics", !freeMode);
  setElementHidden("#export-csv-btn", !advancedSettingsUnlocked);
  setElementHidden("#export-pdf-btn", !advancedSettingsUnlocked);

  setElementHidden(".settings-enzyme-control", !enzymeAvailable);
  setElementHidden(".primary-control", !substrateAvailable);
  setElementHidden("#run-experiment-btn", !experimentReady);
  setElementHidden(".settings-temperature-control", !temperatureAvailable);
  setElementHidden(".settings-inhibitor-control", !advancedSettingsUnlocked);
  setElementHidden(".settings-duration-control", !advancedSettingsUnlocked);
  setElementHidden(".settings-speed-control", !speedUnlocked);
  setGuidedAdvancedMeasurementsHidden(!freeMode);
  setOccupancyLearningVisible(occupancyLearningVisible);
  setSpeedLearningVisible(speedUnlocked);

  if (!freeMode) {
    setElementHidden("#occupancy-meter", !occupancyLearningVisible || !state.latestMeasurement);
  }

  setControlDisabled("#enzyme-slider", !enzymeAvailable || state.measuring);
  setControlDisabled("#substrate-slider", !substrateAvailable || state.measuring);
  setControlDisabled("#run-experiment-btn", !experimentReady || state.measuring);
  setControlDisabled("#temp-slider", !temperatureAvailable || state.measuring);
  setControlDisabled("#inhibitor-slider", !advancedSettingsUnlocked || state.measuring);
  setControlDisabled("#measurement-duration-selector", !advancedSettingsUnlocked || state.measuring);
  setControlDisabled("#speed-selector", !speedUnlocked || state.measuring);
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
  const factsEl = qs("#scenario-facts");
  const imageEl = qs("#enzyme-pic", "#enzymePic", "[data-field='enzyme-pic']");
  const prefix = getScenarioKeyPrefix();

  if (nameEl) {
    nameEl.textContent = t(state.scenario.nameKey);
  }

  if (sourceEl) {
    sourceEl.textContent = t(state.scenario.sourceKey);
  }

  if (descEl) {
    descEl.textContent = t(state.scenario.descKey);
  }

  if (factsEl) {
    factsEl.textContent = t("scenario.facts", {
      substrate: t(`${prefix}.substrate`),
      product: t(`${prefix}.product`),
    });
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

function applyScenario(scenario, { resetDefaults = false, resetStageForScenario = false } = {}) {
  state.scenario = scenario;
  state.params = createScenarioParams(scenario);
  state.challengeId = buildChallengeId(state.scenario, state.params);

  const temperatureControl = qs("#temp-slider", "#temperature-slider", "#temperatureSlider");
  if (temperatureControl && resetDefaults) {
    temperatureControl.value = isGuidedLearningMode()
      ? "50"
      : String(Math.round(state.params.optimalTemp));
    updateControlValue(temperatureControl);
  }

  const substrateControl = qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']");
  if (substrateControl && resetDefaults) {
    substrateControl.value = isGuidedLearningMode() ? "1" : "20";
    updateControlValue(substrateControl);
  }

  const enzymeControl = qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']");
  if (enzymeControl && resetDefaults) {
    enzymeControl.value = isGuidedLearningMode() ? "1" : "6";
    updateControlValue(enzymeControl);
  }

  populateScenarioBar();
  syncScenarioSelector();
  renderRoadmapModal();
  updateParameterReadout();
  updatePendingConditions();

  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
  });

  if (resetStageForScenario) {
    resetMeasurementPanel();
    resetExperimentInsight();
    resetStage();
  }
}

function changeScenario(scenarioId) {
  const scenario = getScenarioById(scenarioId);

  if (!scenario || getScenarioId(scenario) === getScenarioId()) {
    return;
  }

  applyScenario(scenario, {
    resetDefaults: true,
    resetStageForScenario: true,
  });
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
  updateGuidedLabUi();

  if (missionId === ROADMAP_MISSION_IDS.addEnzymes) {
    queueGuidedPrompt(GUIDED_PROMPTS.setTemperature);
  }

  if (missionId === ROADMAP_MISSION_IDS.setIdealTemperature) {
    queueGuidedPrompt(GUIDED_PROMPTS.addSubstrate);
  }

  if (missionId === ROADMAP_MISSION_IDS.addSubstrate) {
    queueGuidedPrompt(GUIDED_PROMPTS.firstMeasurement);
  }

  if (missionId === ROADMAP_MISSION_IDS.discoverVmax) {
    queueGuidedPrompt(GUIDED_PROMPTS.enzymeComparisonIntro);
  }

  if (missionId === ROADMAP_MISSION_IDS.increaseEnzymeConcentration) {
    queueGuidedPrompt(GUIDED_PROMPTS.enzymeSeriesIntro);
  }

  if (qs("#roadmap-modal")?.open) {
    renderRoadmapModal();
  }
}

function completeEnzymeMissionIfTargetMet() {
  if (isTargetEnzymeCountSet()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.addEnzymes);
  }

  if (
    isEnzymeComparisonLearningUnlocked() &&
    getEnzymeCountValue() >= getComparisonEnzymeTarget()
  ) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.increaseEnzymeConcentration);
  }
}

function completeTemperatureMissionIfTargetMet() {
  if (isTargetTemperatureSet()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.setIdealTemperature);
  }
}

function completeSubstrateMissionIfTargetMet() {
  if (isTargetSubstrateCountSet()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.addSubstrate);
  }
}

function setRoadmapOnboardingVisible(visible) {
  const overlay = qs("#roadmap-onboarding-overlay");
  const tip = qs("#roadmap-onboarding-tip");

  state.roadmapOnboardingActive = visible;
  document.body.classList.toggle("roadmap-onboarding-active", visible);

  if (overlay) {
    overlay.hidden = !visible;
  }

  if (tip) {
    tip.hidden = !visible;
  }
}

function showRoadmapOnboarding() {
  if (!isFreeLearningMode() && !hasSeenRoadmapIntro()) {
    setRoadmapOnboardingVisible(true);
  }
}

function dismissRoadmapOnboarding({ persist = false } = {}) {
  if (persist) {
    markRoadmapIntroSeen();
  }

  setRoadmapOnboardingVisible(false);
}

function updateLearningModeUi() {
  const freeModeButton = qs("#free-mode-btn");

  document.body.dataset.learningMode = state.learningMode;

  if (freeModeButton) {
    freeModeButton.hidden = false;
  }

  if (isFreeLearningMode()) {
    dismissRoadmapOnboarding();
    state.guidedPromptQueue = [];
    state.activeGuidedPromptId = null;
    const guidedModal = qs("#guided-modal");
    if (guidedModal?.open) {
      guidedModal.close();
    }
  }

  renderRoadmapModal();
  updateQuizAvailability();
  updateScenarioSelectorAvailability();
  updateGuidedLabUi();
}

function setLearningMode(mode, { persist = true } = {}) {
  const nextMode = normalizeLearningMode(mode) ?? LEARNING_MODES.guided;

  state.learningMode = nextMode;

  if (persist) {
    storeLearningMode(nextMode);
  }

  updateLearningModeUi();
}

function getVmaxEvidence() {
  const currentSeriesPoints = getCurrentSeriesPoints();
  const evidencePoints = currentSeriesPoints.length > 0 ? currentSeriesPoints : state.experimentPoints;
  const completedMissionIds = new Set(getRoadmapProgress().completedMissionIds);
  const hasSeveralGraphPoints = currentSeriesPoints.length >= VMAX_EVIDENCE_POINT_COUNT;
  const hasHighSubstrateExperiment = evidencePoints.some(
    (point) => Number(point.substrateConcentration) >= HIGH_SUBSTRATE_FOR_VMAX,
  ) && completedMissionIds.has(ROADMAP_MISSION_IDS.runHighSubstrate);
  const hasHighOccupancy = evidencePoints.some(
    (point) => Number(point.averageOccupancyPercent) >= HIGH_OCCUPANCY_PERCENT,
  );
  const estimatedVmax = evidencePoints.reduce((highest, point) => {
    const velocity = Number(point.averageVelocity);
    return Number.isFinite(velocity) && velocity > highest ? velocity : highest;
  }, 0);
  const hasEvidenceUnlock =
    hasSeveralGraphPoints &&
    hasHighSubstrateExperiment &&
    state.saturationInsightSeen &&
    hasHighOccupancy;

  return {
    hasSeveralGraphPoints,
    hasHighSubstrateExperiment,
    hasSaturationInsight: state.saturationInsightSeen,
    hasHighOccupancy,
    estimatedVmax,
    unlocked: hasEvidenceUnlock,
  };
}

function completeVmaxMissionIfEvidenceReady() {
  if (getVmaxEvidence().unlocked) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.discoverVmax);
  }
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

function createDefinitionItem(term, detail) {
  const fragment = document.createDocumentFragment();
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  dd.textContent = detail;
  fragment.append(dt, dd);
  return fragment;
}

function appendTableCell(row, text, cellTag = "td") {
  const cell = document.createElement(cellTag);
  cell.textContent = text;
  row.append(cell);
}

function populatePrintableReport() {
  const report = qs("#print-report");
  const dateEl = qs("#print-report-date");
  const summaryEl = qs("#print-report-summary");
  const graphEl = qs("#print-report-graph");
  const tableHeadEl = qs("#print-report-table-head");
  const tableBodyEl = qs("#print-report-table-body");
  const findingsEl = qs("#print-report-findings");

  if (!report || !summaryEl || !tableHeadEl || !tableBodyEl || !findingsEl) {
    return false;
  }

  const prefix = getScenarioKeyPrefix();
  const progress = getRoadmapProgress();
  const roadmapSummary = getRoadmapShareSummary();
  const completedMissionLabels = getRoadmapMissions()
    .filter((mission) => progress.completedMissionIds.includes(mission.id))
    .map((mission) => t(mission.titleKey, getRoadmapMissionI18nParams()));
  const graphImage = getChartImageDataUrl();

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleString();
  }

  summaryEl.replaceChildren(
    createDefinitionItem(t("printReport.enzyme"), t(state.scenario.nameKey)),
    createDefinitionItem(t("printReport.substrate"), t(`${prefix}.substrate`)),
    createDefinitionItem(t("printReport.product"), t(`${prefix}.product`)),
    createDefinitionItem(t("printReport.optimalConditions"), t(`${prefix}.optimalConditions`)),
  );

  if (graphEl) {
    graphEl.hidden = !graphImage;
    graphEl.src = graphImage;
  }

  tableHeadEl.replaceChildren();
  [
    t("csv.seriesLabel"),
    t("csv.substrateConcentration"),
    t("csv.averageVelocity"),
    t("csv.productsFormed"),
    t("csv.measurementSeconds"),
    t("csv.averageOccupancyPercent"),
  ].forEach((header) => appendTableCell(tableHeadEl, header, "th"));

  tableBodyEl.replaceChildren(
    ...getExperimentSeries().flatMap((series) =>
      series.points.map((point) => {
        const row = document.createElement("tr");
        [
          series.label,
          formatQuizNumber(point.substrateConcentration),
          formatQuizNumber(point.averageVelocity),
          formatQuizNumber(point.productsFormed),
          formatQuizNumber(point.normalizedMeasurementSeconds),
          formatQuizNumber(point.averageOccupancyPercent),
        ].forEach((value) => appendTableCell(row, value));
        return row;
      }),
    ),
  );

  findingsEl.replaceChildren(
    createDefinitionItem(
      t("printReport.completedMissions"),
      completedMissionLabels.length > 0
        ? completedMissionLabels.join(", ")
        : t("printReport.none"),
    ),
    createDefinitionItem(
      t("printReport.vmaxStatus"),
      roadmapSummary.vmaxDiscovered ? t("share.yes") : t("share.no"),
    ),
    createDefinitionItem(
      t("printReport.experimentCount"),
      String(roadmapSummary.experimentPointCount),
    ),
  );

  return true;
}

function printPdfReport() {
  if (populatePrintableReport()) {
    window.print();
  }
}

function isFreeExplorationUnlocked(vmaxEvidence = getVmaxEvidence()) {
  const progress = getRoadmapProgress();

  return (
    isFreeLearningMode() ||
    vmaxEvidence.unlocked ||
    progress.completedMissionIds.includes(ROADMAP_MISSION_IDS.discoverVmax)
  );
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
  const simulationViewEl = qs("#roadmap-simulation-view");
  const discoveryPromptEl = qs("#roadmap-discovery-prompt");
  const factsEl = qs("#roadmap-facts");
  const vmaxRevealEl = qs("#vmax-reveal");
  const freeExplorationEl = qs("#free-exploration");
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

  if (simulationViewEl) {
    simulationViewEl.textContent = t(`${prefix}.simulationView`);
  }

  if (discoveryPromptEl) {
    discoveryPromptEl.textContent = t(`${prefix}.discoveryPrompt`);
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
    const estimateEl = qs("#vmax-estimate");
    vmaxRevealEl.hidden = !vmaxEvidence.unlocked;

    if (estimateEl) {
      estimateEl.textContent = t("vmaxReveal.estimate", {
        vmax: formatQuizNumber(vmaxEvidence.estimatedVmax),
      });
    }
  }

  if (freeExplorationEl) {
    freeExplorationEl.hidden = !isFreeExplorationUnlocked(vmaxEvidence);
  }

  if (missionsEl) {
    const missionData = getRoadmapMissions();
    const nextAvailableMissionId = missionData.find(
      (mission) => !completedMissionIds.has(mission.id),
    )?.id;
    const missionParams = getRoadmapMissionI18nParams();
    const missions = missionData.map((mission) => {
      const item = document.createElement("li");
      const text = document.createElement("div");
      const title = document.createElement("strong");
      const description = document.createElement("p");
      const status = document.createElement("span");

      const statusValue = completedMissionIds.has(mission.id)
        ? "completed"
        : isFreeLearningMode()
          ? "available"
        : mission.id === "discover-vmax" && vmaxEvidence.unlocked
          ? "available"
          : mission.id === nextAvailableMissionId
            ? "available"
            : roadmapMissionStatuses.locked;

      item.className = `roadmap-mission roadmap-mission-${statusValue}`;
      const shouldMaskVmaxMission =
        mission.id === ROADMAP_MISSION_IDS.discoverVmax && !vmaxEvidence.unlocked;
      const titleKey = shouldMaskVmaxMission
        ? "roadmap.discoverVmaxLocked.title"
        : mission.titleKey;
      const descriptionKey = shouldMaskVmaxMission
        ? "roadmap.discoverVmaxLocked.description"
        : mission.descriptionKey;

      title.textContent = t(titleKey, missionParams);
      description.textContent = t(descriptionKey, missionParams);
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
    "#measurement-duration-selector",
    "#enzyme-selector",
    "#run-experiment-btn",
    "#reset-btn",
    "#reset-current-series-btn",
    "#reset-experiments-btn",
    "#export-csv-btn",
    "#export-pdf-btn",
  ].forEach((selector) => {
    const control = qs(selector);

    if (control) {
      control.disabled = disabled;
    }
  });

  updateScenarioSelectorAvailability();
  updateGuidedLabUi();
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

  updateGuidedLabUi();

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
    completeRoadmapMission(ROADMAP_MISSION_IDS.noticeSaturation);
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
  const enzyme = qs("#measurement-enzyme");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
  const occupancyMeter = qs("#occupancy-meter");
  const speed = qs("#measurement-speed");

  if (emptyState) {
    emptyState.hidden = false;
  }

  if (values) {
    values.hidden = true;
  }

  if (occupancyMeter) {
    occupancyMeter.hidden = true;
  }

  updateOccupancyMeter(0);

  [substrate, enzyme, products, time, velocity, occupancy, speed].forEach((element) => {
    if (element) {
      element.textContent = "--";
    }
  });
}

function updateQuizAvailability() {
  const unlocked = isFreeLearningMode() || state.experimentPoints.length >= QUIZ_UNLOCK_POINT_COUNT;
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
  enzymeCount,
  productsFormed,
  measurementSeconds,
  averageVelocity,
  averageOccupancyPercent,
  speedMultiplier,
}) {
  state.latestMeasurement = {
    substrateConcentration,
    enzymeCount,
    productsFormed,
    measurementSeconds,
    averageVelocity,
    averageOccupancyPercent,
    speedMultiplier,
  };

  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const enzyme = qs("#measurement-enzyme");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");
  const occupancy = qs("#measurement-occupancy");
  const occupancyMeter = qs("#occupancy-meter");
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

  if (enzyme) {
    enzyme.textContent = String(enzymeCount);
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

  if (occupancyMeter) {
    occupancyMeter.hidden = !isOccupancyLearningUnlocked();
    updateOccupancyMeter(averageOccupancyPercent);
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
  clearPendingPrediction();
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
  clearPendingPrediction();
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
  updateGuidedLabUi();
}

function resetCurrentExperimentSeries() {
  stopMeasurement();
  clearPendingPrediction();
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
  updateGuidedLabUi();
}

function handleSeriesConditionChange() {
  applyPhysicsOptions();
  updatePendingConditions();
  resetStage();
  setExperimentStatusKey("status.settingsUpdated");
}

function createPointComparison(previousPoint, currentPoint) {
  const previousSubstrate = Number(previousPoint.substrateConcentration);
  const currentSubstrate = Number(currentPoint.substrateConcentration);
  const previousVelocity = Number(previousPoint.averageVelocity);
  const currentVelocity = Number(currentPoint.averageVelocity);

  return {
    previousSubstrate: formatQuizNumber(previousSubstrate),
    currentSubstrate: formatQuizNumber(currentSubstrate),
    substrateDelta: formatSignedDelta(currentSubstrate - previousSubstrate),
    previousVelocity: formatQuizNumber(previousVelocity),
    currentVelocity: formatQuizNumber(currentVelocity),
    velocityDelta: formatSignedDelta(currentVelocity - previousVelocity),
  };
}

function completeCurveMissionForPoint(point) {
  const substrateConcentration = Number(point?.substrateConcentration);

  if (!Number.isFinite(substrateConcentration)) {
    return;
  }

  if (substrateConcentration >= getLowSubstrateTarget()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.runLowSubstrate);
  }

  if (substrateConcentration >= getMediumSubstrateTarget()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.runMediumSubstrate);
  }

  if (substrateConcentration >= getHighSubstrateTarget()) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.runHighSubstrate);
  }
}

function completeEnzymeComparisonMissionIfReady() {
  const currentSeries = getExperimentSeries().find((series) => series.id === state.currentSeriesId);

  if (
    currentSeries &&
    Number(currentSeries.conditions?.enzymeConcentration) >= getComparisonEnzymeTarget() &&
    currentSeries.points.length >= getComparisonSeriesPointTarget()
  ) {
    completeRoadmapMission(ROADMAP_MISSION_IDS.compareEnzymeSeries);
  }
}

function finishExperiment() {
  stopMeasurement();

  const previousPoint = getCurrentSeriesPoints().at(-1) ?? null;
  const simulatedMeasurementSeconds = getMeasurementDurationSeconds();
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
    measurementSeconds: simulatedMeasurementSeconds,
    normalizedMeasurementSeconds: simulatedMeasurementSeconds,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
    predictionKey: state.currentPredictionKey,
  });

  if (point) {
    completeCurveMissionForPoint(point);

    if (completeGuidedStep(GUIDED_STEPS.firstExperiment)) {
      queueGuidedPrompt(GUIDED_PROMPTS.firstGraphPoint);
      queueGuidedPrompt(GUIDED_PROMPTS.speedIntro);
    }

    if (previousPoint) {
      state.latestPointComparison = createPointComparison(previousPoint, point);
      queueGuidedPrompt(GUIDED_PROMPTS.curveComparison);
    }

    if (isOccupancyLearningUnlocked()) {
      queueGuidedPrompt(GUIDED_PROMPTS.occupancyIntro);

      if (hasHighOccupancyPoint()) {
        completeRoadmapMission(ROADMAP_MISSION_IDS.reachHighOccupancy);
      }
    }

    completeEnzymeComparisonMissionIfReady();
  }

  updateMeasurementPanel({
    substrateConcentration: state.initialSubstrateConcentration,
    enzymeCount: getEnzymeCountValue(),
    productsFormed,
    measurementSeconds: simulatedMeasurementSeconds,
    averageVelocity,
    averageOccupancyPercent,
    speedMultiplier: state.measurementSpeedMultiplier,
  });
  updateExperimentInsight(point);
  completeVmaxMissionIfEvidenceReady();
  updateQuizAvailability();
  updateGuidedLabUi();
  state.currentPredictionKey = null;

  setMeasurementControlsDisabled(false);
  setExperimentStatusKey("status.measuredVelocity", { velocity: averageVelocity });
}

function updateMeasurementStatus() {
  const measurementSeconds = getMeasurementDurationSeconds();
  const metrics = state.simulation?.getMetrics?.();
  if (metrics) {
    state.measurementOccupancySamples.push(metrics.occupancy);
  }

  const simulatedElapsedSeconds = Math.min(
    measurementSeconds,
    (getSimulationElapsedMs() - state.measurementStartedSimulationMs) / 1000,
  );
  const displayedElapsedSeconds = Math.floor(simulatedElapsedSeconds);

  setExperimentStatusKey("status.measuring", {
    elapsed: displayedElapsedSeconds,
    total: measurementSeconds,
  });

  if (simulatedElapsedSeconds >= measurementSeconds) {
    finishExperiment();
  }
}

function runExperiment() {
  if (state.measuring) {
    return;
  }

  clearPendingPrediction();
  resetSimulationForExperiment();
  state.measuring = true;

  setMeasurementControlsDisabled(true);
  updateMeasurementStatus();
  state.measurementId = window.setInterval(updateMeasurementStatus, 250);
}

function clearPendingPrediction() {
  state.currentPredictionKey = null;
}

function startExperimentDirectly() {
  clearPendingPrediction();
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
    case "measurement-duration-selector":
      return t("measurement.seconds", { seconds: getMeasurementDurationSeconds() });
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
  if (state.scenario && state.params) {
    state.params = {
      ...state.params,
      source: t(state.scenario.sourceKey),
      enzyme: t(state.scenario.nameKey),
    };
  }
  syncScenarioSelector();
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

  if (state.activeGuidedPromptId && qs("#guided-modal")?.open) {
    renderGuidedPrompt(state.activeGuidedPromptId);
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
  if (!isFreeLearningMode() && state.experimentPoints.length < QUIZ_UNLOCK_POINT_COUNT) {
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
      preferredTemplateIds:
        isGuidedLearningMode() && isFreeExplorationUnlocked()
          ? []
          : isGuidedLearningMode() && hasComparableEnzymeSeries()
            ? GUIDED_ENZYME_COMPARISON_QUIZ_TEMPLATE_IDS
            : isGuidedLearningMode() && getVmaxEvidence().unlocked
              ? GUIDED_VMAX_QUIZ_TEMPLATE_IDS
              : isGuidedLearningMode() && isSaturationLearningUnlocked()
                ? GUIDED_SATURATION_QUIZ_TEMPLATE_IDS
                : isGuidedLearningMode() && isOccupancyLearningUnlocked()
                  ? GUIDED_OCCUPANCY_QUIZ_TEMPLATE_IDS
                  : isGuidedLearningMode() && state.experimentPoints.length === 1
                    ? GUIDED_FIRST_GRAPH_QUIZ_TEMPLATE_IDS
                    : [],
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
  const measurementDurationControl = qs("#measurement-duration-selector");
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
  const freeModeButton = qs("#free-mode-btn");
  const enzymeSelector = qs("#enzyme-selector");
  const roadmapButton = qs("#roadmap-btn", "[data-action='open-roadmap']");
  const roadmapModal = qs("#roadmap-modal");
  const closeRoadmapButton = qs("[data-close='roadmap']");
  const roadmapOnboardingDismiss = qs("#roadmap-onboarding-dismiss");
  const quizModal = qs("#quiz-modal");
  const closeQuizButton = qs("[data-close='quiz']");
  const guidedModal = qs("#guided-modal");
  const guidedContinueButton = qs("#guided-modal-continue");
  const guidedCloseButton = qs("#guided-modal-close");
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
  const exportPdfButton = qs("#export-pdf-btn");
  const languageSelector = qs("#language-selector");

  setupControlValueFeedback(
    substrateControl,
    enzymeControl,
    temperatureControl,
    inhibitorControl,
    measurementDurationControl,
    speedControl,
  );

  const handleSpeedChange = () => {
    state.currentSpeedMultiplier = normalizeSpeedMultiplier(speedControl.value);
    applySpeedMultiplier();
  };

  speedControl?.addEventListener("input", handleSpeedChange);
  speedControl?.addEventListener("change", handleSpeedChange);

  const handleMeasurementDurationChange = () => {
    state.currentMeasurementSeconds = getMeasurementDurationSeconds();
    updateControlValue(measurementDurationControl);
  };

  measurementDurationControl?.addEventListener("input", handleMeasurementDurationChange);
  measurementDurationControl?.addEventListener("change", handleMeasurementDurationChange);

  const handleSeriesConditionInput = () => {
    applyPhysicsOptions();
    updatePendingConditions();
  };

  temperatureControl?.addEventListener("input", handleSeriesConditionInput);
  enzymeControl?.addEventListener("input", () => {
    handleSeriesConditionInput();
    completeEnzymeMissionIfTargetMet();
  });
  inhibitorControl?.addEventListener("input", handleSeriesConditionInput);

  substrateControl?.addEventListener("input", () => {
    applyPhysicsOptions();
  });
  substrateControl?.addEventListener("change", () => {
    completeSubstrateMissionIfTargetMet();
    resetStage();
  });
  enzymeControl?.addEventListener("change", () => {
    completeEnzymeMissionIfTargetMet();
    handleSeriesConditionChange();
  });
  temperatureControl?.addEventListener("change", () => {
    handleSeriesConditionChange();
    completeTemperatureMissionIfTargetMet();
  });
  inhibitorControl?.addEventListener("change", handleSeriesConditionChange);
  enzymeSelector?.addEventListener("change", () => {
    changeScenario(enzymeSelector.value);
  });

  runExperimentButton?.addEventListener("click", () => {
    if (state.measuring) {
      return;
    }

    startExperimentDirectly();
  });
  settingsButton?.addEventListener("click", () => settingsModal?.showModal());
  closeSettingsButton?.addEventListener("click", () => settingsModal?.close());
  settingsModal?.addEventListener("close", showNextGuidedPrompt);
  roadmapButton?.addEventListener("click", () => {
    state.pendingRoadmapWelcome = shouldQueueGuidedPrompt(GUIDED_PROMPTS.welcome);
    completeRoadmapMission(ROADMAP_MISSION_IDS.intro);
    dismissRoadmapOnboarding({ persist: true });
    renderRoadmapModal();
    roadmapModal?.showModal();
  });
  roadmapOnboardingDismiss?.addEventListener("change", () => {
    if (roadmapOnboardingDismiss.checked) {
      dismissRoadmapOnboarding({ persist: true });
    }
  });
  closeRoadmapButton?.addEventListener("click", () => roadmapModal?.close());
  roadmapModal?.addEventListener("close", () => {
    if (state.pendingRoadmapWelcome) {
      state.pendingRoadmapWelcome = false;
      queueGuidedPrompt(GUIDED_PROMPTS.welcome);
      return;
    }

    showNextGuidedPrompt();
  });
  freeModeButton?.addEventListener("click", () => {
    setLearningMode(LEARNING_MODES.free);
  });
  checkpointOpenButton?.addEventListener("click", () => {
    quizModal?.showModal();
    renderQuizQuestion();
  });
  closeQuizButton?.addEventListener("click", () => quizModal?.close());
  quizModal?.addEventListener("close", showNextGuidedPrompt);
  guidedContinueButton?.addEventListener("click", closeGuidedPrompt);
  guidedCloseButton?.addEventListener("click", closeGuidedPrompt);
  guidedModal?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeGuidedPrompt();
  });
  guidedModal?.addEventListener("close", () => {
    if (state.activeGuidedPromptId && !guidedModal.open) {
      closeGuidedPrompt();
    }
  });
  resetButton?.addEventListener("click", () => resetStage());
  resetCurrentSeriesButton?.addEventListener("click", resetCurrentExperimentSeries);
  resetExperimentsButton?.addEventListener("click", resetAllExperiments);
  exportCsvButton?.addEventListener("click", () => exportExperimentPointsCsv());
  exportPdfButton?.addEventListener("click", printPdfReport);
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
  applyScenario(enzymeScenarios[0], { resetDefaults: true });

  const speedControl = qs("#speed-selector", "#speed-slider", "#speedSelector", "#speed");
  if (speedControl) {
    state.currentSpeedMultiplier = normalizeSpeedMultiplier(speedControl.value);
  }

  state.currentMeasurementSeconds = getMeasurementDurationSeconds();
}

function initApp() {
  state.learningMode = getInitialLearningMode();
  state.guidedSteps = readStoredSet(GUIDED_STEP_STORAGE_KEY);
  applyTranslations();
  initScenario();
  createChart();
  bindControls();
  syncLanguageSelector();
  window.addEventListener("resize", handleResize);
  resetStage();
  resetAllExperiments();
  updateLearningModeUi();
  startTimerDisplay();
  startDebugMetricsDisplay();
  showRoadmapOnboarding();

  window.EnzyMetrics = {
    enzymeScenarios,
    getState: () => ({ ...state }),
    addExperimentPoint: recordExperimentPoint,
    getExperimentSeries,
    buildWordleShareText,
    generateQuizQuestion: renderQuizQuestion,
    resetExperimentPoints,
    resetCurrentExperimentSeries,
    resetAllExperiments,
    runExperiment,
    resetStage,
    setLearningMode,
  };
}

document.addEventListener("DOMContentLoaded", initApp);
