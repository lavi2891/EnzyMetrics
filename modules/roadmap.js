export const roadmapMissionStatuses = Object.freeze({
  locked: "locked",
  available: "available",
  completed: "completed",
});

export const roadmapRequiredActions = Object.freeze({
  viewIntro: "view-intro",
  observeEnzymes: "observe-enzymes",
  setIdealTemperature: "set-ideal-temperature",
  addSubstrate: "add-substrate",
  runExperiment: "run-experiment",
  increaseSubstrate: "increase-substrate",
  observeOccupancy: "observe-occupancy",
  buildGraphPoints: "build-graph-points",
  noticeSaturation: "notice-saturation",
  discoverVmax: "discover-vmax",
});

const ROADMAP_PROGRESS_STORAGE_KEY = "enzymetrics.roadmapProgress";

export const roadmapMissions = Object.freeze([
  {
    id: "intro-enzyme-system",
    titleKey: "roadmap.introEnzymeSystem.title",
    descriptionKey: "roadmap.introEnzymeSystem.description",
    status: roadmapMissionStatuses.available,
    requiredAction: roadmapRequiredActions.viewIntro,
    pointsReward: 10,
  },
  {
    id: "add-or-observe-enzymes",
    titleKey: "roadmap.observeEnzymes.title",
    descriptionKey: "roadmap.observeEnzymes.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.observeEnzymes,
    target: {
      kind: "enzyme-count",
      value: 5,
    },
    pointsReward: 10,
  },
  {
    id: "set-ideal-temperature",
    titleKey: "roadmap.setIdealTemperature.title",
    descriptionKey: "roadmap.setIdealTemperature.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.setIdealTemperature,
    target: {
      kind: "temperature",
      source: "optimalTemp",
    },
    pointsReward: 10,
  },
  {
    id: "add-substrate",
    titleKey: "roadmap.addSubstrate.title",
    descriptionKey: "roadmap.addSubstrate.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.addSubstrate,
    target: {
      kind: "substrate-count",
      value: 20,
    },
    pointsReward: 10,
  },
  {
    id: "run-first-experiment",
    titleKey: "roadmap.runFirstExperiment.title",
    descriptionKey: "roadmap.runFirstExperiment.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.runExperiment,
    pointsReward: 15,
  },
  {
    id: "increase-substrate-concentration",
    titleKey: "roadmap.increaseSubstrate.title",
    descriptionKey: "roadmap.increaseSubstrate.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.increaseSubstrate,
    pointsReward: 15,
  },
  {
    id: "observe-enzyme-occupancy",
    titleKey: "roadmap.observeOccupancy.title",
    descriptionKey: "roadmap.observeOccupancy.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.observeOccupancy,
    pointsReward: 15,
  },
  {
    id: "build-several-graph-points",
    titleKey: "roadmap.buildGraphPoints.title",
    descriptionKey: "roadmap.buildGraphPoints.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.buildGraphPoints,
    pointsReward: 20,
  },
  {
    id: "notice-saturation",
    titleKey: "roadmap.noticeSaturation.title",
    descriptionKey: "roadmap.noticeSaturation.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.noticeSaturation,
    pointsReward: 20,
  },
  {
    id: "discover-vmax",
    titleKey: "roadmap.discoverVmax.title",
    descriptionKey: "roadmap.discoverVmax.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.discoverVmax,
    pointsReward: 25,
  },
]);

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function getValidMissionIds() {
  return new Set(roadmapMissions.map((mission) => mission.id));
}

function readCompletedMissionIds() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ROADMAP_PROGRESS_STORAGE_KEY) ?? "{}");
    const completedMissionIds = Array.isArray(parsed.completedMissionIds)
      ? parsed.completedMissionIds
      : [];
    const validMissionIds = getValidMissionIds();

    return completedMissionIds.filter((missionId) => validMissionIds.has(missionId));
  } catch {
    return [];
  }
}

function writeCompletedMissionIds(completedMissionIds) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    ROADMAP_PROGRESS_STORAGE_KEY,
    JSON.stringify({
      completedMissionIds,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function getRoadmapMissions() {
  return roadmapMissions.map((mission) => ({ ...mission }));
}

export function getRoadmapProgress() {
  const completedMissionIds = readCompletedMissionIds();

  return {
    completedMissionIds,
    completedCount: completedMissionIds.length,
    totalMissions: roadmapMissions.length,
  };
}

export function completeMission(missionId) {
  if (!getValidMissionIds().has(missionId)) {
    throw new RangeError(missionId);
  }

  const completedMissionIds = readCompletedMissionIds();

  if (!completedMissionIds.includes(missionId)) {
    writeCompletedMissionIds([...completedMissionIds, missionId]);
  }

  return getRoadmapProgress();
}

export function resetRoadmapProgress() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(ROADMAP_PROGRESS_STORAGE_KEY);
  }

  return getRoadmapProgress();
}
