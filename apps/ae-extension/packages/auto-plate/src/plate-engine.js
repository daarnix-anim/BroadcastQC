/**
 * Broadcast QC - Auto-Plate Engine
 */

import { DEFAULT_PLATE_CONFIG, ORIGIN_POINTS, STYLE_PRESETS } from './presets.js';
import { PlateExpressionsGenerator } from './expressions.js';

export class AutoPlateEngine {
  /**
   * Validates and prepares the creation configuration
   * @param {Object} userConfig 
   */
  static prepareConfig(userConfig = {}) {
    const config = { ...DEFAULT_PLATE_CONFIG, ...userConfig };

    // Clamp numeric values
    config.paddingTop = Math.max(0, parseInt(config.paddingTop, 10) || 0);
    config.paddingBottom = Math.max(0, parseInt(config.paddingBottom, 10) || 0);
    config.paddingLeft = Math.max(0, parseInt(config.paddingLeft, 10) || 0);
    config.paddingRight = Math.max(0, parseInt(config.paddingRight, 10) || 0);
    config.roundness = Math.max(0, parseInt(config.roundness, 10) || 0);
    config.originPoint = Math.min(8, Math.max(0, parseInt(config.originPoint, 10) || 0));

    // Style configuration
    const stylePreset = STYLE_PRESETS[String(config.style).toUpperCase()] || STYLE_PRESETS.GLASS;
    config.styleData = {
      color: stylePreset.color,
      opacity: config.opacity !== undefined ? config.opacity : stylePreset.opacity,
      strokeColor: stylePreset.strokeColor,
      strokeWidth: stylePreset.strokeWidth,
      strokeOpacity: stylePreset.strokeOpacity
    };

    return config;
  }

  /**
   * Calculates the union bounding box of mock / tested rectangles
   * @param {Array<{left: number, top: number, width: number, height: number}>} rects 
   * @param {Object} padding 
   */
  static calculateUnionBounds(rects, padding = { top: 20, bottom: 20, left: 30, right: 30 }) {
    if (!rects || rects.length === 0) {
      return {
        left: 0,
        top: 0,
        width: 200 + (padding.left || 0) + (padding.right || 0),
        height: 60 + (padding.top || 0) + (padding.bottom || 0),
        contentWidth: 200,
        contentHeight: 60
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const r of rects) {
      minX = Math.min(minX, r.left);
      maxX = Math.max(maxX, r.left + r.width);
      minY = Math.min(minY, r.top);
      maxY = Math.max(maxY, r.top + r.height);
    }

    const contentWidth = Math.max(0, maxX - minX);
    const contentHeight = Math.max(0, maxY - minY);

    const padL = padding.left || 0;
    const padR = padding.right || 0;
    const padT = padding.top || 0;
    const padB = padding.bottom || 0;

    return {
      left: minX - padL,
      top: minY - padT,
      contentWidth,
      contentHeight,
      width: contentWidth + padL + padR,
      height: contentHeight + padT + padB,
      centerX: (minX + maxX) / 2 + (padR - padL) / 2,
      centerY: (minY + maxY) / 2 + (padB - padT) / 2
    };
  }

  /**
   * Generates expressions bundle for After Effects
   * @param {Array<string|number>} layerIdentifiers 
   * @param {Object} config 
   * @param {Array<number>} [relativeOffsets=[-1]]
   */
  static generateExpressions(layerIdentifiers, config = {}, relativeOffsets = [-1]) {
    const preparedConfig = this.prepareConfig(config);
    return {
      sizeExpression: PlateExpressionsGenerator.generateSizeExpression(layerIdentifiers, relativeOffsets),
      positionExpression: PlateExpressionsGenerator.generatePositionExpression(layerIdentifiers, relativeOffsets),
      anchorPointExpression: PlateExpressionsGenerator.generateAnchorPointExpression(),
      scaleExpression: PlateExpressionsGenerator.generateScaleExpression(preparedConfig.animType),
      roundnessExpression: PlateExpressionsGenerator.generateRoundnessExpression(),
      textSlideExpression: (dir, delay) => PlateExpressionsGenerator.generateTextSlideExpression(dir || preparedConfig.textSlideDirection, delay)
    };
  }

  /**
   * Separates selected layer names into plate layer and target layers
   * @param {Array<string>} layerNames 
   * @param {string} [platePrefix='[Plate]'] 
   */
  static separatePlateAndTargets(layerNames = [], platePrefix = '[Plate]') {
    const plates = [];
    const targets = [];
    for (const name of layerNames) {
      if (name && typeof name === 'string' && name.indexOf(platePrefix) === 0) {
        plates.push(name);
      } else if (name) {
        if (!targets.includes(name)) {
          targets.push(name);
        }
      }
    }
    return {
      plateName: plates[0] || null,
      targetNames: targets
    };
  }
}

