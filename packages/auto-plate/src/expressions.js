/**
 * Broadcast QC - Auto-Plate AE Expressions Generator
 * Generates robust, high-performance JavaScript expressions for Adobe After Effects.
 */

export class PlateExpressionsGenerator {

  /**
   * Generates the Size Expression for the Shape Layer Rectangle
   * @param {Array<string|number>} layerIdentifiers List of layer names or index numbers
   */
  static generateSizeExpression(layerIdentifiers) {
    const layersArrayStr = JSON.stringify(layerIdentifiers);
    return `// Broadcast QC - Dynamic Auto-Plate Size
var targetLayers = ${layersArrayStr};
var padL = effect("Padding Left")("Slider");
var padR = effect("Padding Right")("Slider");
var padT = effect("Padding Top")("Slider");
var padB = effect("Padding Bottom")("Slider");

var minX = 999999;
var maxX = -999999;
var minY = 999999;
var maxY = -999999;
var validCount = 0;

for (var i = 0; i < targetLayers.length; i++) {
  try {
    var l = (typeof targetLayers[i] === "number") ? thisComp.layer(targetLayers[i]) : thisComp.layer(targetLayers[i]);
    if (l && l.active) {
      var r = l.sourceRectAtTime(time, false);
      if (r.width > 0 || r.height > 0) {
        var pTL = l.toComp([r.left, r.top]);
        var pTR = l.toComp([r.left + r.width, r.top]);
        var pBL = l.toComp([r.left, r.top + r.height]);
        var pBR = l.toComp([r.left + r.width, r.top + r.height]);

        minX = Math.min(minX, pTL[0], pTR[0], pBL[0], pBR[0]);
        maxX = Math.max(maxX, pTL[0], pTR[0], pBL[0], pBR[0]);
        minY = Math.min(minY, pTL[1], pTR[1], pBL[1], pBR[1]);
        maxY = Math.max(maxY, pTL[1], pTR[1], pBL[1], pBR[1]);
        validCount++;
      }
    }
  } catch(err) {}
}

if (validCount === 0) {
  [200, 80];
} else {
  var w = Math.max(10, (maxX - minX) + padL + padR);
  var h = Math.max(10, (maxY - minY) + padT + padB);
  [w, h];
}`;
  }

  /**
   * Generates the Position Expression for the Shape Layer (in Comp Space)
   * @param {Array<string|number>} layerIdentifiers
   */
  static generatePositionExpression(layerIdentifiers) {
    const layersArrayStr = JSON.stringify(layerIdentifiers);
    return `// Broadcast QC - Dynamic Auto-Plate Comp Position
var targetLayers = ${layersArrayStr};
var padL = effect("Padding Left")("Slider");
var padR = effect("Padding Right")("Slider");
var padT = effect("Padding Top")("Slider");
var padB = effect("Padding Bottom")("Slider");

var minX = 999999;
var maxX = -999999;
var minY = 999999;
var maxY = -999999;
var validCount = 0;

for (var i = 0; i < targetLayers.length; i++) {
  try {
    var l = (typeof targetLayers[i] === "number") ? thisComp.layer(targetLayers[i]) : thisComp.layer(targetLayers[i]);
    if (l && l.active) {
      var r = l.sourceRectAtTime(time, false);
      if (r.width > 0 || r.height > 0) {
        var pTL = l.toComp([r.left, r.top]);
        var pTR = l.toComp([r.left + r.width, r.top]);
        var pBL = l.toComp([r.left, r.top + r.height]);
        var pBR = l.toComp([r.left + r.width, r.top + r.height]);

        minX = Math.min(minX, pTL[0], pTR[0], pBL[0], pBR[0]);
        maxX = Math.max(maxX, pTL[0], pTR[0], pBL[0], pBR[0]);
        minY = Math.min(minY, pTL[1], pTR[1], pBL[1], pBR[1]);
        maxY = Math.max(maxY, pTL[1], pTR[1], pBL[1], pBR[1]);
        validCount++;
      }
    }
  } catch(err) {}
}

if (validCount === 0) {
  value;
} else {
  // Center of the bounding area adjusted for asymmetrical padding
  var cx = (minX + maxX)/2 + (padR - padL)/2;
  var cy = (minY + maxY)/2 + (padB - padT)/2;
  [cx, cy];
}`;
  }

  /**
   * Generates the Anchor Point Expression for 9-Origin Point Expansion
   */
  static generateAnchorPointExpression() {
    return `// Broadcast QC - 9-Point Origin Anchor Calculation
// Origin Point: 0=TL, 1=TC, 2=TR, 3=LC, 4=Center, 5=RC, 6=BL, 7=BC, 8=BR
var origin = 4;
try {
  origin = Math.round(effect("Origin Point (0-8)")("Slider"));
} catch(e) {}

var size = content("Rectangle 1").content("Rectangle Path 1").size;
var w = size[0];
var h = size[1];

var ox = 0; // -w/2 (Left), 0 (Center), w/2 (Right)
var oy = 0; // -h/2 (Top), 0 (Center), h/2 (Bottom)

switch (origin) {
  case 0: ox = -w/2; oy = -h/2; break; // Top-Left
  case 1: ox = 0;    oy = -h/2; break; // Top-Center
  case 2: ox = w/2;  oy = -h/2; break; // Top-Right
  case 3: ox = -w/2; oy = 0;    break; // Left-Center
  case 4: ox = 0;    oy = 0;    break; // Center
  case 5: ox = w/2;  oy = 0;    break; // Right-Center
  case 6: ox = -w/2; oy = h/2;  break; // Bottom-Left
  case 7: ox = 0;    oy = h/2;  break; // Bottom-Center
  case 8: ox = w/2;  oy = h/2;  break; // Bottom-Right
  default: ox = 0;   oy = 0;    break;
}

[ox, oy];`;
  }

  /**
   * Generates Scale Expression for Animated In / Out with Easing
   */
  static generateScaleExpression(animType = 'expand_x') {
    return `// Broadcast QC - In/Out Animation Scale with Overshoot Easing
var inDur = 0.45;
var outDur = 0.35;
try { inDur = Math.max(0.01, effect("In Duration (sec)")("Slider")); } catch(e) {}
try { outDur = Math.max(0.01, effect("Out Duration (sec)")("Slider")); } catch(e) {}

var tIn = inPoint;
var tOut = outPoint;

function easeOutBack(t, b, c, d, s) {
  if (s == undefined) s = 1.4;
  t = t/d - 1;
  return c*(t*t*((s+1)*t + s) + 1) + b;
}

var prog = 100;
if (time < tIn + inDur) {
  var t = Math.max(0, time - tIn);
  prog = Math.min(100, Math.max(0, easeOutBack(t, 0, 100, inDur, 1.3)));
} else if (time > tOut - outDur) {
  var t = Math.max(0, time - (tOut - outDur));
  prog = Math.min(100, Math.max(0, 100 - (t / outDur) * 100));
}

var animMode = "${animType}";
if (animMode === "expand_x") {
  [prog, 100];
} else if (animMode === "expand_y") {
  [100, prog];
} else {
  [prog, prog];
}`;
  }

  /**
   * Generates Text In-Animation Expression for Masked Entrance
   */
  static generateTextSlideExpression(direction = 'left', delaySec = 0.1) {
    return `// Broadcast QC - Text Masked Slide-In
var delay = ${delaySec};
var dur = 0.45;
var tStart = inPoint + delay;

function easeOutCubic(t, b, c, d) {
  t = t/d - 1;
  return c*(t*t*t + 1) + b;
}

var dir = "${direction}";
var offset = [0, 0];

if (dir === "left") offset = [-150, 0];
else if (dir === "right") offset = [150, 0];
else if (dir === "bottom") offset = [0, 60];
else if (dir === "top") offset = [0, -60];

if (time < tStart) {
  value + offset;
} else if (time < tStart + dur) {
  var factor = 1 - (easeOutCubic(time - tStart, 0, 1, dur));
  value + [offset[0] * factor, offset[1] * factor];
} else {
  value;
}`;
  }

  /**
   * Generates Roundness Expression
   */
  static generateRoundnessExpression() {
    return `// Broadcast QC - Adaptive Roundness
var r = 16;
try {
  r = effect("Roundness")("Slider");
} catch(e) {}

var size = content("Rectangle 1").content("Rectangle Path 1").size;
var maxRadius = Math.min(size[0], size[1]) / 2;
Math.min(r, maxRadius);`;
  }
}
