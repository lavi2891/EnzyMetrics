const LOW_SUBSTRATE_THRESHOLD = 18;
const HIGH_INHIBITOR_THRESHOLD = 60;
const TEMPERATURE_DEVIATION_THRESHOLD = 12;
const FLATTENING_DELTA_THRESHOLD = 0.15;

function latestPoints(experimentPoints) {
  return Array.isArray(experimentPoints) ? experimentPoints.slice(-3) : [];
}

function isGraphFlattening(experimentPoints) {
  const points = latestPoints(experimentPoints);

  if (points.length < 3) {
    return false;
  }

  const [first, second, third] = points;
  const firstGain = second.averageVelocity - first.averageVelocity;
  const secondGain = third.averageVelocity - second.averageVelocity;

  return firstGain > 0 && secondGain >= 0 && secondGain <= firstGain * FLATTENING_DELTA_THRESHOLD;
}

export function getExperimentInsight(experimentPoints, currentConditions = {}) {
  const substrateConcentration = Number(currentConditions.substrateConcentration);
  const inhibitorConcentration = Number(currentConditions.inhibitorConcentration);
  const temperature = Number(currentConditions.temperature);
  const optimalTemp = Number(currentConditions.optimalTemp);

  if (Number.isFinite(inhibitorConcentration) && inhibitorConcentration >= HIGH_INHIBITOR_THRESHOLD) {
    return "Inhibitors reduce successful enzyme-substrate interactions, so velocity may be lower.";
  }

  if (
    Number.isFinite(temperature) &&
    Number.isFinite(optimalTemp) &&
    Math.abs(temperature - optimalTemp) >= TEMPERATURE_DEVIATION_THRESHOLD
  ) {
    return "The enzyme is far from its optimal temperature, so it works less efficiently.";
  }

  if (isGraphFlattening(experimentPoints)) {
    return "The graph is flattening. This suggests the enzymes are becoming saturated.";
  }

  if (Number.isFinite(substrateConcentration) && substrateConcentration <= LOW_SUBSTRATE_THRESHOLD) {
    return "At low substrate concentration, adding more substrate usually increases reaction velocity because many enzymes are still free.";
  }

  return "Compare this point with earlier points to see how conditions changed reaction velocity.";
}
