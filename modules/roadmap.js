export const roadmapMissionStatuses = Object.freeze({
  locked: "locked",
  available: "available",
  completed: "completed",
});

export const roadmapRequiredActions = Object.freeze({
  viewIntro: "view-intro",
  identifyParticles: "identify-particles",
  observeEnzymes: "observe-enzymes",
  addSubstrate: "add-substrate",
  runExperiment: "run-experiment",
  increaseSubstrate: "increase-substrate",
  observeOccupancy: "observe-occupancy",
  buildGraphPoints: "build-graph-points",
  noticeSaturation: "notice-saturation",
  discoverVmax: "discover-vmax",
});

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
    id: "identify-enzyme-substrate-product",
    titleKey: "roadmap.identifyParticles.title",
    descriptionKey: "roadmap.identifyParticles.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.identifyParticles,
    pointsReward: 10,
  },
  {
    id: "add-or-observe-enzymes",
    titleKey: "roadmap.observeEnzymes.title",
    descriptionKey: "roadmap.observeEnzymes.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.observeEnzymes,
    pointsReward: 10,
  },
  {
    id: "add-substrate",
    titleKey: "roadmap.addSubstrate.title",
    descriptionKey: "roadmap.addSubstrate.description",
    status: roadmapMissionStatuses.locked,
    requiredAction: roadmapRequiredActions.addSubstrate,
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

export function getRoadmapMissions() {
  return roadmapMissions.map((mission) => ({ ...mission }));
}
