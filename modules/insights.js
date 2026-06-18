import { translate } from "../i18n/index.js";

const LOW_SUBSTRATE_THRESHOLD = 18;
const HIGH_SUBSTRATE_THRESHOLD = 160;
const HIGH_INHIBITOR_THRESHOLD = 60;
const TEMPERATURE_DEVIATION_THRESHOLD = 12;
const FLATTENING_SUBSTRATE_RATIO = 1.3;
const FLATTENING_ABSOLUTE_VELOCITY_DELTA = 0.15;
const FLATTENING_RELATIVE_VELOCITY_DELTA = 0.2;

function latestPoints(experimentPoints) {
  if (!Array.isArray(experimentPoints)) {
    return [];
  }

  return [...experimentPoints]
    .sort((a, b) => a.substrateConcentration - b.substrateConcentration)
    .slice(-3);
}

function isGraphFlattening(experimentPoints) {
  const points = latestPoints(experimentPoints);

  if (points.length < 2) {
    return false;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const lower = points[index];
    const higher = points[index + 1];
    const lowerSubstrate = Number(lower.substrateConcentration);
    const higherSubstrate = Number(higher.substrateConcentration);
    const lowerVelocity = Number(lower.averageVelocity);
    const higherVelocity = Number(higher.averageVelocity);

    if (
      Number.isFinite(lowerSubstrate) &&
      Number.isFinite(higherSubstrate) &&
      Number.isFinite(lowerVelocity) &&
      Number.isFinite(higherVelocity) &&
      higherSubstrate >= HIGH_SUBSTRATE_THRESHOLD &&
      lowerSubstrate > 0 &&
      higherSubstrate / lowerSubstrate >= FLATTENING_SUBSTRATE_RATIO
    ) {
      const velocityChange = Math.abs(higherVelocity - lowerVelocity);
      const velocityLimit = Math.max(
        FLATTENING_ABSOLUTE_VELOCITY_DELTA,
        Math.abs(lowerVelocity) * FLATTENING_RELATIVE_VELOCITY_DELTA,
      );

      if (velocityChange <= velocityLimit) {
        return true;
      }
    }
  }

  return false;
}

export function getExperimentInsight(experimentPoints, currentConditions = {}) {
  const substrateConcentration = Number(currentConditions.substrateConcentration);
  const inhibitorConcentration = Number(currentConditions.inhibitorConcentration);
  const temperature = Number(currentConditions.temperature);
  const optimalTemp = Number(currentConditions.optimalTemp);

  if (Number.isFinite(inhibitorConcentration) && inhibitorConcentration >= HIGH_INHIBITOR_THRESHOLD) {
    return translate("insightMessages.inhibitor");
  }

  if (
    Number.isFinite(temperature) &&
    Number.isFinite(optimalTemp) &&
    Math.abs(temperature - optimalTemp) >= TEMPERATURE_DEVIATION_THRESHOLD
  ) {
    return translate("insightMessages.temperature");
  }

  if (
    Number.isFinite(substrateConcentration) &&
    substrateConcentration >= HIGH_SUBSTRATE_THRESHOLD &&
    isGraphFlattening(experimentPoints)
  ) {
    return translate("insightMessages.flattening");
  }

  if (Number.isFinite(substrateConcentration) && substrateConcentration <= LOW_SUBSTRATE_THRESHOLD) {
    return translate("insightMessages.lowSubstrate");
  }

  return translate("insightMessages.compare");
}
