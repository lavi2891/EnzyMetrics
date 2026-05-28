const TWO_PI = Math.PI * 2;
export const BASE_PARTICLE_SPEED = 60;
export const BROWNIAN_JITTER = 28;
export const ACTIVE_SITE_CAPTURE_RADIUS = 22;
export const REACTION_DURATION_MS = 5000;

const DEFAULT_OPTIONS = {
  enzymeCount: 6,
  substrateCount: 12,
  maxSubstrateCount: 60,
  enzymeRadius: 16,
  substrateSize: 12,
  productRadius: 6,
  baseSpeed: BASE_PARTICLE_SPEED,
  brownianJitter: BROWNIAN_JITTER,
  activeSiteCaptureRadius: ACTIVE_SITE_CAPTURE_RADIUS,
  bindDuration: REACTION_DURATION_MS,
};

const Styles = {
  enzyme: {
    fill: "#2563eb",
    stroke: "#1e3a8a",
    notchFill: "#f8fafc",
  },
  substrate: {
    fill: "#22c55e",
    stroke: "#166534",
  },
  product: {
    fill: "#facc15",
    stroke: "#a16207",
  },
};

function randomBetween(min, max) {
  if (max <= min) {
    return min;
  }

  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randomVelocity(speed) {
  const angle = randomBetween(0, TWO_PI);
  const magnitude = randomBetween(speed * 0.45, speed);

  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

function createSubstrate(canvas, size, speed) {
  const maxX = Math.max(size, canvas.width - size);
  const maxY = Math.max(size, canvas.height - size);

  return {
    type: "substrate",
    x: randomBetween(size, maxX),
    y: randomBetween(size, maxY),
    size,
    rotation: randomBetween(0, TWO_PI),
    velocity: randomVelocity(speed),
    bound: false,
  };
}

function createProduct(x, y, radius, side) {
  return {
    type: "product",
    x: x + side * radius * 0.8,
    y,
    radius,
    side,
    velocity: {
      x: side * randomBetween(8, 20),
      y: -randomBetween(30, 58),
    },
  };
}

function createEnzyme(canvas, radius, speed) {
  const maxX = Math.max(radius, canvas.width - radius);
  const maxY = Math.max(radius, canvas.height - radius);

  return {
    type: "enzyme",
    x: randomBetween(radius, maxX),
    y: randomBetween(radius, maxY),
    radius,
    notchAngle: randomBetween(0, TWO_PI),
    notchRadius: radius * 0.38,
    velocity: randomVelocity(speed),
    complex: null,
  };
}

export class CanvasSimulation {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("CanvasSimulation requires an HTMLCanvasElement.");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.speedMultiplier = 1;
    this.enzymes = [];
    this.substrates = [];
    this.products = [];
    this.collisionAttempts = 0;
    this.successfulBindings = 0;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.realElapsedMs = 0;
    this.simulationElapsedMs = 0;
    this.occupancyAreaMs = 0;
    this.running = false;

    this.reset();
  }

  reset() {
    const enzymeCount = Math.max(1, Math.min(this.options.enzymeCount, 12));
    const substrateCount = Math.max(
      1,
      Math.min(this.options.substrateCount, this.options.maxSubstrateCount),
    );

    this.enzymes = Array.from({ length: enzymeCount }, () =>
      createEnzyme(this.canvas, this.options.enzymeRadius, this.options.baseSpeed),
    );
    this.substrates = Array.from({ length: substrateCount }, () =>
      createSubstrate(this.canvas, this.options.substrateSize, this.options.baseSpeed),
    );
    this.products = [];
    this.collisionAttempts = 0;
    this.successfulBindings = 0;
    this.realElapsedMs = 0;
    this.simulationElapsedMs = 0;
    this.occupancyAreaMs = 0;
    this.draw();
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.animationId = null;
    this.running = false;
  }

  destroy() {
    this.stop();
    this.enzymes = [];
    this.substrates = [];
    this.products = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setSpeedMultiplier(value) {
    const multiplier = Number(value);
    this.speedMultiplier = [1, 2, 5].includes(multiplier) ? multiplier : 1;
  }

  getMetrics() {
    const totalEnzymes = this.enzymes.length;
    const occupiedEnzymes = this.enzymes.filter((enzyme) => enzyme.complex).length;
    const activeEnzymes = totalEnzymes - occupiedEnzymes;
    const occupancy = totalEnzymes > 0 ? occupiedEnzymes / totalEnzymes : 0;

    return {
      activeEnzymes,
      occupiedEnzymes,
      totalEnzymes,
      occupancy,
      occupancyPercent: Math.round(occupancy * 100),
      substrateCount: this.substrates.filter((substrate) => !substrate.bound).length,
      productCount: this.products.length,
      collisionAttempts: this.collisionAttempts,
      successfulBindings: this.successfulBindings,
      bindDurationMs: this.options.bindDuration,
      speedMultiplier: this.speedMultiplier,
      realElapsedMs: this.realElapsedMs,
      simulationElapsedMs: this.simulationElapsedMs,
      averageOccupancy:
        this.simulationElapsedMs > 0 ? this.occupancyAreaMs / this.simulationElapsedMs : occupancy,
    };
  }

  getSimulationDeltaMs(realDeltaMs) {
    return realDeltaMs * this.speedMultiplier;
  }

  getSimulationElapsedMs() {
    return this.simulationElapsedMs;
  }

  getOccupancyAreaMs() {
    return this.occupancyAreaMs;
  }

  tick = (time) => {
    const realDeltaMs = Math.min(time - this.lastFrameTime, 50);
    const deltaSeconds = realDeltaMs / 1000;
    this.lastFrameTime = time;

    this.update(deltaSeconds);
    this.draw();

    if (this.running) {
      this.animationId = requestAnimationFrame(this.tick);
    }
  };

  update(deltaSeconds) {
    const scaledDelta = deltaSeconds * this.speedMultiplier;
    const simulationDeltaMs = this.getSimulationDeltaMs(deltaSeconds * 1000);

    this.realElapsedMs += deltaSeconds * 1000;
    this.simulationElapsedMs += simulationDeltaMs;

    this.enzymes.forEach((enzyme) => {
      if (enzyme.complex) {
        this.updateComplex(enzyme, scaledDelta);
      } else {
        this.moveParticle(enzyme, scaledDelta, enzyme.radius);
        enzyme.notchAngle += scaledDelta * 0.35;
      }
    });

    this.substrates.forEach((substrate) => {
      if (!substrate.bound) {
        this.moveParticle(substrate, scaledDelta, substrate.size);
        substrate.rotation += scaledDelta * 0.9;
      }
    });

    this.products.forEach((product) => {
      product.x += product.velocity.x * scaledDelta;
      product.y += product.velocity.y * scaledDelta;
      product.velocity.x += randomBetween(-4, 4) * scaledDelta;
      this.bounceParticle(product, product.radius);
    });

    this.detectCollisions();
    this.occupancyAreaMs += this.getMetrics().occupancy * simulationDeltaMs;
  }

  moveParticle(particle, deltaSeconds, boundaryRadius) {
    const jitter = this.options.brownianJitter;
    particle.velocity.x += randomBetween(-jitter, jitter) * deltaSeconds;
    particle.velocity.y += randomBetween(-jitter, jitter) * deltaSeconds;

    const maxSpeed = this.options.baseSpeed * 1.35;
    const speed = Math.hypot(particle.velocity.x, particle.velocity.y);
    if (speed > maxSpeed) {
      particle.velocity.x = (particle.velocity.x / speed) * maxSpeed;
      particle.velocity.y = (particle.velocity.y / speed) * maxSpeed;
    }

    particle.x += particle.velocity.x * deltaSeconds;
    particle.y += particle.velocity.y * deltaSeconds;

    this.bounceParticle(particle, boundaryRadius);
  }

  bounceParticle(particle, boundaryRadius = 0) {
    const minX = boundaryRadius;
    const maxX = Math.max(boundaryRadius, this.canvas.width - boundaryRadius);
    const minY = boundaryRadius;
    const maxY = Math.max(boundaryRadius, this.canvas.height - boundaryRadius);

    if (particle.x < minX || particle.x > maxX) {
      particle.x = clamp(particle.x, minX, maxX);
      particle.velocity.x = -particle.velocity.x;
    }

    if (particle.y < minY || particle.y > maxY) {
      particle.y = clamp(particle.y, minY, maxY);
      particle.velocity.y = -particle.velocity.y;
    }
  }

  detectCollisions() {
    this.enzymes.forEach((enzyme) => {
      if (enzyme.complex) {
        return;
      }

      const notch = this.getNotchPosition(enzyme);
      const notchHitRadius =
        enzyme.notchRadius + this.options.substrateSize * 0.9 + this.options.activeSiteCaptureRadius;
      const hitDistanceSquared = notchHitRadius * notchHitRadius;

      const substrate = this.substrates.find((candidate) => {
        if (candidate.bound) {
          return false;
        }

        this.collisionAttempts += 1;
        return distanceSquared(candidate, notch) <= hitDistanceSquared;
      });

      if (substrate) {
        this.bind(enzyme, substrate);
      }
    });
  }

  bind(enzyme, substrate) {
    substrate.bound = true;
    substrate.x = enzyme.x;
    substrate.y = enzyme.y;
    this.successfulBindings += 1;

    enzyme.complex = {
      substrate,
      remainingMs: this.options.bindDuration,
    };
  }

  updateComplex(enzyme, deltaSeconds) {
    this.moveParticle(enzyme, deltaSeconds, enzyme.radius);

    const { substrate } = enzyme.complex;
    const notch = this.getNotchPosition(enzyme);
    substrate.x = notch.x;
    substrate.y = notch.y;
    substrate.rotation = enzyme.notchAngle;
    enzyme.complex.remainingMs -= deltaSeconds * 1000;

    if (enzyme.complex.remainingMs <= 0) {
      this.releaseProducts(enzyme);
    }
  }

  releaseProducts(enzyme) {
    const substrate = enzyme.complex.substrate;
    const substrateIndex = this.substrates.indexOf(substrate);

    if (substrateIndex !== -1) {
      this.substrates.splice(substrateIndex, 1);
    }

    this.products.push(
      createProduct(substrate.x, substrate.y, this.options.productRadius, -1),
      createProduct(substrate.x, substrate.y, this.options.productRadius, 1),
    );

    enzyme.complex = null;
  }

  getNotchPosition(enzyme) {
    const distanceFromCenter = enzyme.radius * 0.72;

    return {
      x: enzyme.x + Math.cos(enzyme.notchAngle) * distanceFromCenter,
      y: enzyme.y + Math.sin(enzyme.notchAngle) * distanceFromCenter,
    };
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.products.forEach((product) => this.drawProduct(product));
    this.substrates.forEach((substrate) => {
      if (!substrate.bound) {
        this.drawSubstrate(substrate);
      }
    });
    this.enzymes.forEach((enzyme) => this.drawEnzyme(enzyme));
    this.substrates.forEach((substrate) => {
      if (substrate.bound) {
        this.drawSubstrate(substrate, 0.7);
      }
    });
  }

  drawEnzyme(enzyme) {
    const notch = this.getNotchPosition(enzyme);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(enzyme.x, enzyme.y, enzyme.radius, 0, TWO_PI);
    this.ctx.fillStyle = Styles.enzyme.fill;
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = Styles.enzyme.stroke;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(notch.x, notch.y, enzyme.notchRadius, 0, TWO_PI);
    this.ctx.fillStyle = Styles.enzyme.notchFill;
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = Styles.enzyme.stroke;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSubstrate(substrate, scale = 1) {
    this.ctx.save();
    this.ctx.translate(substrate.x, substrate.y);
    this.ctx.rotate(substrate.rotation);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -substrate.size * scale);
    this.ctx.lineTo(substrate.size * 0.9 * scale, substrate.size * 0.75 * scale);
    this.ctx.lineTo(-substrate.size * 0.9 * scale, substrate.size * 0.75 * scale);
    this.ctx.closePath();
    this.ctx.fillStyle = Styles.substrate.fill;
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = Styles.substrate.stroke;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawProduct(product) {
    this.ctx.save();
    this.ctx.translate(product.x, product.y);
    this.ctx.scale(product.side, 1);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, product.radius, -Math.PI / 2, Math.PI / 2);
    this.ctx.closePath();
    this.ctx.fillStyle = Styles.product.fill;
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = Styles.product.stroke;
    this.ctx.stroke();
    this.ctx.restore();
  }
}

export function initCanvasSimulation(canvas, options) {
  return new CanvasSimulation(canvas, options);
}
