let n = 40;
let eps = 0.2;
let pts = [];
let guardPairs = [];

let controlsDiv, epsSlider, nInput, regenBtn;

let currentInterval = null;
let isDragging = false;
let dragStartIndex = null;

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(canvasMousePressed);
  cnv.mouseReleased(canvasMouseReleased);
  cnv.mouseMoved(canvasMouseMoved);

  textFont("Helvetica, Arial, sans-serif");
  buildPoints();
  buildGuards();

  controlsDiv = createDiv();
  controlsDiv.style("position", "fixed");
  controlsDiv.style("top", "10px");
  controlsDiv.style("right", "10px");
  controlsDiv.style("display", "flex");
  controlsDiv.style("gap", "8px");
  controlsDiv.style("background", "rgba(255,255,255,0.9)");
  controlsDiv.style("padding", "6px 8px");
  controlsDiv.style("border-radius", "6px");
  controlsDiv.style("font-size", "12px");

  const epsLabel = createSpan();
  epsLabel.parent(controlsDiv);

  epsSlider = createSlider(0.05, 0.5, eps, 0.05);
  epsSlider.parent(controlsDiv);
  epsSlider.style("width", "80px");
  epsSlider.input(() => {
    eps = epsSlider.value();
    buildGuards();
    currentInterval = null;
    epsLabel.html("ε = " + eps.toFixed(2));
  });
  epsLabel.html("ε = " + epsSlider.value().toFixed(2));

  const nLabel = createSpan(" n:");
  nLabel.parent(controlsDiv);

  nInput = createInput(String(n), "number");
  nInput.parent(controlsDiv);
  nInput.attribute("min", 10);
  nInput.attribute("max", 200);
  nInput.style("width", "50px");
  nInput.changed(() => {
    let val = int(nInput.value());
    if (isNaN(val) || val < 10) val = 10;
    if (val > 200) val = 200;
    n = val;
    nInput.value(String(n));
    buildPoints();
    buildGuards();
    currentInterval = null;
  });

  regenBtn = createButton("Regenerate");
  regenBtn.parent(controlsDiv);
  regenBtn.mousePressed(() => {
    buildPoints();
    buildGuards();
    currentInterval = null;
  });
}

function draw() {
  background(255);
  const midY = height / 2;

  stroke(200);
  strokeWeight(2);
  line(60, midY, width - 60, midY);

  if (currentInterval) {
    const { i, j } = currentInterval;
    const x1 = pts[i].x;
    const x2 = pts[j].x;
    noStroke();
    fill(220, 240, 255, 120);
    rect(x1 - 8, midY - 25, x2 - x1 + 16, 50, 6);
  }

  noStroke();
  fill(40);
  for (let i = 0; i < pts.length; i++) {
    circle(pts[i].x, pts[i].y, 8);
  }

  stroke(0, 120, 255);
  strokeWeight(2);
  noFill();
  for (let g = 0; g < guardPairs.length; g++) {
    const [i, j] = guardPairs[g];
    const x1 = pts[i].x;
    const x2 = pts[j].x;
    const midX = (x1 + x2) / 2;
    const midYArc = midY - 40 - 10 * (g % 3);

    beginShape();
    vertex(x1, midY);
    quadraticVertex(midX, midYArc, x2, midY);
    endShape();
  }

  if (
    currentInterval &&
    currentInterval.large &&
    currentInterval.guardIndex >= 0
  ) {
    const gIdx = currentInterval.guardIndex;
    const [i, j] = guardPairs[gIdx];
    const x1 = pts[i].x;
    const x2 = pts[j].x;
    const midX = (x1 + x2) / 2;
    const midYArc = midY - 40 - 10 * (gIdx % 3);

    stroke(0, 180, 80);
    strokeWeight(4);
    noFill();
    beginShape();
    vertex(x1, midY);
    quadraticVertex(midX, midYArc, x2, midY);
    endShape();

    noStroke();
    fill(0, 180, 80);
    circle(pts[i].x, pts[i].y, 10);
    circle(pts[j].x, pts[j].y, 10);
  }

  drawLegend();
}

function drawLegend() {
  const x0 = 16;
  const y0 = height - 20;
  textSize(14);
  fill(20);
  noStroke();

  const baseLine = `Guard pairs = ${guardPairs.length}`;
  text(baseLine, x0, 30);

  let msg = "Tip: Drag along the line to select an interval.";
  if (currentInterval) {
    const { count, large, guardIndex } = currentInterval;
    if (!large) {
      msg = `Selected interval: size = ${count} (< εn), not required to be hit.`;
    } else if (large && guardIndex >= 0) {
      msg = `Selected interval: size = ${count} (≥ εn), contains a guard pair.`;
    } else {
      msg = `Selected interval: size = ${count} (≥ εn), but no guard pair found in our sample.`;
    }
  }

  text(msg, x0, y0);
}

function buildPoints() {
  pts = [];
  const margin = 60;
  const innerW = max(100, width - 2 * margin);
  const midY = height / 2;

  if (n === 1) {
    pts.push({ x: width / 2, y: midY });
    return;
  }

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = margin + t * innerW;
    pts.push({ x, y: midY });
  }
}

function buildGuards() {
  guardPairs = [];
  const lenMin = max(2, Math.ceil(eps * n));
  if (lenMin > n) return;

  const samples = 400;
  const intervals = [];

  for (let s = 0; s < samples; s++) {
    const maxStart = n - lenMin;
    if (maxStart < 0) break;
    const start = floor(random(0, maxStart + 1));
    const extra = floor(random(0, n - (start + lenMin) + 1));
    const end = start + lenMin - 1 + extra;
    intervals.push({ i: start, j: end, covered: false });
  }

  let safety = 3 * n;
  while (safety-- > 0) {
    const uncovered = intervals.filter((I) => !I.covered);
    if (uncovered.length === 0) break;

    const I = uncovered[0];
    const mid = floor((I.i + I.j) / 2);
    let a = mid;
    let b = mid + 1;
    if (b > I.j) {
      a = max(I.i, mid - 1);
      b = I.j;
    }
    if (a < I.i) a = I.i;
    if (b > I.j) b = I.j;
    if (a >= b) {
      a = I.i;
      b = I.j;
    }

    guardPairs.push([a, b]);

    for (const J of intervals) {
      if (!J.covered && J.i <= a && J.j >= b) {
        J.covered = true;
      }
    }
  }
}

function canvasMousePressed() {
  const midY = height / 2;
  if (abs(mouseY - midY) > 30) return;

  const idx = nearestPointIndex(mouseX);
  if (idx === null) return;

  isDragging = true;
  dragStartIndex = idx;
  updateCurrentInterval(idx);
}

function canvasMouseReleased() {
  isDragging = false;
}

function canvasMouseMoved() {
  if (!isDragging) return;
  const idx = nearestPointIndex(mouseX);
  if (idx === null) return;
  updateCurrentInterval(idx);
}

function nearestPointIndex(mx) {
  if (pts.length === 0) return null;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = abs(pts[i].x - mx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function updateCurrentInterval(idx) {
  if (dragStartIndex === null) return;
  const i = min(dragStartIndex, idx);
  const j = max(dragStartIndex, idx);
  const count = j - i + 1;
  const large = count >= eps * n;

  let guardIndex = -1;
  if (large) {
    for (let g = 0; g < guardPairs.length; g++) {
      const [a, b] = guardPairs[g];
      if (a >= i && b <= j) {
        guardIndex = g;
        break;
      }
    }
  }

  currentInterval = { i, j, count, large, guardIndex };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildPoints();
}
