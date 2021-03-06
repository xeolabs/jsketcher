import * as sketcher_utils from '../../../utils/sketcher-utils'
import {decapitalize} from '../../../../../modules/gems/capitalize';
import genSerpinski, {genSerpinskiImpl} from '../../../../app/utils/genSerpinski';
import {distance, distanceAB} from '../../../../app/math/math';

export function createSubjectFromInPlaceSketcher(ctx) {
  let actions = {};
  for (const actionId of Object.keys(ctx.streams.action.state)) {
    if (actionId.startsWith('sketch')) {
      let oldId = decapitalize(actionId.substring(6));
      actions[oldId] = {
        action: () =>  ctx.services.action.run(actionId)
      };
      actions.addBezierCurve = actions.addCubicBezierSpline;
    }
  }

  const oldStyleSketcherApp = {
    viewer: ctx.services.sketcher.inPlaceEditor.viewer,
    actions
  };
  
  return createSketcherSubject(oldStyleSketcherApp); 
}

export function createSketcherSubject(sketcherApp) {

  const viewer = sketcherApp.viewer;
  viewer.parametricManager.messageSink = msg => console.log(msg);
  
  const addSegment = sketcher_utils.addSegmentInModel.bind(this, sketcherApp);
  const addArc = sketcher_utils.addArc.bind(this, sketcherApp);
  const addCircle = sketcher_utils.addCircle.bind(this, sketcherApp);
  const addEllipse = sketcher_utils.addEllipse.bind(this, sketcherApp);
  const addEllipticalArc = sketcher_utils.addEllipticalArc.bind(this, sketcherApp);
  const addBezier = sketcher_utils.addBezier.bind(this, sketcherApp);
  const move = sketcher_utils.moveInModel.bind(this, sketcherApp);
  function addRectangle(x0, y0, x1, y1) {
    return [
      addSegment(x0, y0, x1, y0),
      addSegment(x1, y0, x1, y1),
      addSegment(x1, y1, x0, y1),
      addSegment(x0, y1, x0, y0)
    ];
  } 

  function addSerpinski(ax, ay, bx, by, depth) {
    genSerpinskiImpl(viewer, {x: ax, y: ay}, {x: bx, y: by}, depth);
    let jointWidth = distance(ax, ay, bx, by) / (depth + 1) / 2;
    let dx = bx - ax;
    let dy = by - ay;
    let D = Math.sqrt(dx*dx + dy*dy);
    dx /= D;
    dy /= D;
    let ddx = -dy * jointWidth;
    let ddy =  dx * jointWidth;
    genSerpinskiImpl(viewer, {x: bx-ddx, y: by-ddy}, {x: ax-ddx, y: ay-ddy}, depth);
    addSegment(ax, ay, ax-ddx, ay-ddy);
    addSegment(bx, by, bx-ddx, by-ddy);
  }
  
  function addPolygon() {
    let p, q, n = arguments.length;
    for(p = n - 1, q = 0; q < n; p = q++) {
      let [ax, ay] = arguments[p];
      let [bx, by] = arguments[q];
      addSegment(ax, ay, bx, by);
    }
  }
  
  function changeLayer(layerName) {
    viewer.setActiveLayerName(layerName);
  }

  function changeToConstructionLayer() {
    viewer.addingRoleMode = 'construction';
  }

  function changeToDefaultLayer() {
    viewer.addingRoleMode = null;
  }

  function click(modelX, modelY, attrs) {
    let [x, y] = sketcher_utils.modelToScreen(viewer, modelX, modelY);
    sketcher_utils.clickXY(sketcherApp, x, y, attrs);
  }

  function select(objects, inclusive) {
    sketcherApp.viewer.select(objects, !inclusive);
  }

  function runAction(id) {
    sketcherApp.actions[id].action();
  }
  
  return {
    addSegment, addRectangle, addArc, addCircle, addEllipse, addEllipticalArc, addSerpinski, addBezier, addPolygon, 
    move, changeLayer, changeToConstructionLayer, changeToDefaultLayer, 
    click, select, runAction,
    viewer
  }
  
}