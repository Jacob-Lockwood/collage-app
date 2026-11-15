import { data, fromJSON, serialize } from "./serialize";

export type Point = { x: number; y: number };

export type RenderOptions = {
  highlight?: boolean;
};
interface Render {
  render(canvas: Canvas, options: RenderOptions): void;
}
@serialize
export abstract class CanvasNode implements Render {
  @data id: string;
  constructor() {
    this.id = Math.floor(Math.random() * 1e9).toString(36);
  }
  abstract render(canvas: Canvas, options: RenderOptions): void;
  abstract inBounds(point: Point): boolean;
}

@serialize
export class Canvas {
  readonly element: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  @data cameraCenter: Point = { x: 0, y: 0 };
  @data zoomFactor: number = Math.log(60);
  constructor(element: HTMLCanvasElement) {
    this.element = element;
    this.ctx = element.getContext("2d")!;
  }
  get width() {
    return this.element.width;
  }
  set width(w) {
    this.element.width = w;
  }
  get height() {
    return this.element.height;
  }
  set height(h) {
    this.element.height = h;
  }

  effects: Render[] = [];
  @data nodes: CanvasNode[] = [];
  registerNode(node: CanvasNode) {
    this.nodes.push(node);
  }
  registerEffect(render: Render["render"]) {
    this.effects.push({ render });
  }

  render() {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const effect of this.effects) effect.render(this, {});
    for (const node of this.nodes) node.render(this, {});
  }

  screenScale(worldLen: number) {
    return Math.exp(this.zoomFactor) * worldLen;
  }
  worldScale(screenLen: number) {
    return screenLen / Math.exp(this.zoomFactor);
  }
  screenX(xWorld: number) {
    return this.screenScale(xWorld - this.cameraCenter.x) + this.width / 2;
  }
  screenY(yWorld: number) {
    return this.screenScale(yWorld - this.cameraCenter.y) + this.height / 2;
  }
  worldX(xScreen: number) {
    return this.worldScale(xScreen - this.width / 2) + this.cameraCenter.x;
  }
  worldY(yScreen: number) {
    return this.worldScale(yScreen - this.height / 2) + this.cameraCenter.y;
  }
  world(screenPoint: Point): Point {
    return { x: this.worldX(screenPoint.x), y: this.worldY(screenPoint.y) };
  }
  screen(worldPoint: Point): Point {
    return { x: this.screenX(worldPoint.x), y: this.screenY(worldPoint.y) };
  }

  parse(json: string) {
    Object.assign(this, fromJSON(json));
  }
}

@serialize
export class Circle extends CanvasNode {
  @data center: Point;
  @data radius: number;
  @data color: string;
  constructor(center: Point, radius: number) {
    super();
    this.center = center;
    this.radius = radius;
    this.color = `hsl(${Math.random() * 360}deg,80%,80%)`;
  }
  render(canvas: Canvas) {
    const r = canvas.screenScale(this.radius);
    const x = canvas.screenX(this.center.x);
    const y = canvas.screenY(this.center.y);
    canvas.ctx.fillStyle = this.color;
    canvas.ctx.beginPath();
    canvas.ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
    canvas.ctx.fill();
  }
  inBounds(point: Point) {
    return (
      Math.abs(point.x - this.center.x) < this.radius &&
      Math.abs(point.y - this.center.y) < this.radius
    );
  }
}
