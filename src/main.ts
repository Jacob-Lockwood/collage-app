import "./style.css";
import { Canvas, Circle, type Point } from "./canvas";
import { fromJSON, toJSON } from "./serialize";

const initialState = localStorage.getItem("canvas-state");
const canvas = initialState ? fromJSON(initialState) : new Canvas();
canvas.init(document.querySelector<HTMLCanvasElement>("canvas")!);
const save = () => {
  localStorage.setItem("canvas-state", toJSON(canvas));
};
setInterval(save, 1000);
window.addEventListener("beforeunload", save);

canvas.registerEffect(() => {
  canvas.ctx.fillStyle = "hsl(246 11.9% 12.2%)";
  canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
  const squareSize = canvas.screenScale(1);
  const startX = canvas.screenX(0) % squareSize;
  const startY = canvas.screenY(0) % squareSize;
  canvas.ctx.strokeStyle = "hsl(246 11.9% 24.6%)";
  canvas.ctx.beginPath();
  for (let x = startX; x < canvas.width; x += squareSize) {
    canvas.ctx.moveTo(x, 0);
    canvas.ctx.lineTo(x, canvas.height);
  }
  for (let y = startY; y < canvas.height; y += squareSize) {
    canvas.ctx.moveTo(0, y);
    canvas.ctx.lineTo(canvas.width, y);
  }
  canvas.ctx.stroke();
});
canvas.registerEffect(() => {
  document.getElementById("debug")!.innerHTML = `
    cameraX: ${canvas.cameraCenter.x.toFixed(2)} <br/>
    cameraY: ${canvas.cameraCenter.y.toFixed(2)}
  `;
});

const tooltip = document.getElementById("tooltip")!;
document.addEventListener("mousemove", (ev) => {
  tooltip.style.setProperty("--x", `${ev.clientX}px`);
  tooltip.style.setProperty("--y", `${ev.clientY}px`);
  for (const node of canvas.nodes) {
    if (node.inBounds(canvas.world({ x: ev.clientX, y: ev.clientY }))) {
      // const txt = (n: number) => (n === Math.round(n) ? `${n}` : n.toFixed(2));
      tooltip.textContent = node.id;
      return tooltip.classList.add("show");
    }
  }
  tooltip.classList.remove("show");
});

function createDot(x: number, y: number) {
  canvas.registerNode(new Circle({ x, y }, 0.2));
}

createDot(0, 0);
createDot(0, 1);
createDot(1, 0);

let timeOfLastClick = 0;
document.addEventListener("click", (ev) => {
  if (Date.now() - timeOfLastClick < 300) {
    const x = canvas.worldX(ev.clientX);
    const y = canvas.worldY(ev.clientY);
    createDot(ev.shiftKey ? Math.round(x) : x, ev.shiftKey ? Math.round(y) : y);
    canvas.render();
    timeOfLastClick = 0;
  } else {
    timeOfLastClick = Date.now();
  }
});

canvas.render();
window.addEventListener("resize", () => canvas.render());

let dragMouseStart: Point | undefined;
let dragCameraStart: Point | undefined;
document.addEventListener("mousedown", (ev) => {
  dragMouseStart = { x: ev.clientX, y: ev.clientY };
  dragCameraStart = { ...canvas.cameraCenter };
});
document.addEventListener("mousemove", (ev) => {
  if (!dragMouseStart || !dragCameraStart) return;
  canvas.cameraCenter.x =
    dragCameraStart.x - canvas.worldScale(ev.clientX - dragMouseStart.x);
  canvas.cameraCenter.y =
    dragCameraStart.y - canvas.worldScale(ev.clientY - dragMouseStart.y);
  canvas.render();
});
document.addEventListener("mouseup", () => {
  dragMouseStart = undefined;
});

document.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    canvas.zoomFactor += ev.deltaY / 1000;
    canvas.render();
  },
  { passive: false },
);
