import "./style.css";
import { Canvas, Circle, type Point } from "./canvas";
import { fromJSON, toJSON } from "./serialize";

const initialState = localStorage.getItem("canvas-state");
let canvas = initialState ? fromJSON<Canvas>(initialState) : new Canvas();

const titleBox = document.querySelector("#canvas-title")!;
const titleTxt = titleBox.querySelector("input")!;
const titleBtn = titleBox.querySelector("button")!;

function init() {
  canvas.init(document.querySelector<HTMLCanvasElement>("canvas")!);
  canvas.registerEffect(() => {
    canvas.ctx.fillStyle = "hsl(246 11.9% 12.2%)";
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
    const squareSize = canvas.screenScale(1);
    const startX = canvas.screenX(0) % squareSize;
    const startY = canvas.screenY(0) % squareSize;
    canvas.ctx.strokeStyle = `hsl(246 11.9% ${Math.max(canvas.zoomFactor * 5, 12.2)}%)`;
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
  titleTxt.value = canvas.title;
}
init();

const save = () => {
  const json = toJSON(canvas);
  localStorage.setItem("canvas-state", json);
  return json;
};
setInterval(save, 5000);
window.addEventListener("beforeunload", save);

const tooltip = document.getElementById("tooltip")!;
document.addEventListener("mousemove", (ev) => {
  document.body.style.setProperty("--mouse-x", `${ev.clientX}px`);
  document.body.style.setProperty("--mouse-y", `${ev.clientY}px`);
  for (const node of canvas.nodes) {
    if (node.inBounds(canvas.world({ x: ev.clientX, y: ev.clientY }))) {
      const txt = (n: number) => (n === Math.round(n) ? `${n}` : n.toFixed(2));
      tooltip.textContent =
        node instanceof Circle
          ? `(${txt(node.center.x)},${txt(node.center.y)})`
          : `ID: ${node.id}`;
      return tooltip.classList.add("show");
    }
  }
  tooltip.classList.remove("show");
});

function createDot(x: number, y: number) {
  canvas.registerNode(new Circle({ x, y }, 0.2));
}

let timeOfLastClick = 0;
canvas.element.addEventListener("click", (ev) => {
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
    dragCameraStart.x -
    canvas.worldScale((ev.clientX - dragMouseStart.x) * devicePixelRatio);
  canvas.cameraCenter.y =
    dragCameraStart.y -
    canvas.worldScale((ev.clientY - dragMouseStart.y) * devicePixelRatio);
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

document.querySelector("#save button")!.addEventListener("click", () => {
  const json = save();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.querySelector<HTMLAnchorElement>("#download")!;
  a.href = url;
  a.download = `${canvas.title}.canvas.json`;
  a.click();
  URL.revokeObjectURL(url);
});

const upload = document.querySelector<HTMLInputElement>("#upload")!;
document.querySelector("#load button")!.addEventListener("click", () => {
  const msg =
    "Are you sure you want to load a new canvas? Any current data not downloaded will be lost.";
  if (!confirm(msg)) return;
  setTimeout(() => upload.click(), 300);
});
upload.addEventListener("change", async () => {
  const file = upload.files?.[0];
  if (!file) return;
  const json = await file.text();
  canvas = fromJSON<Canvas>(json);
  init();
  canvas.render();
});

const clearBtn = document.querySelector("#clear button");
clearBtn?.addEventListener("click", () => {
  const msg =
    "Are you sure you want to clear the canvas? Any data not downloaded will be lost.";
  if (!confirm(msg)) return;
  canvas = new Canvas();
  init();
  canvas.render();
});

let editingTitle = false;
const titleFocus = () => {
  editingTitle = true;
  titleTxt.disabled = false;
  titleTxt.focus();
};
const toggleFocus = () => {
  if (editingTitle) {
    editingTitle = false;
    titleTxt.disabled = true;
  } else titleFocus();
};
titleTxt.addEventListener("click", titleFocus);
titleBtn.addEventListener("click", toggleFocus);
titleTxt.addEventListener("focusout", toggleFocus);
titleTxt.addEventListener("change", () => {
  canvas.title = titleTxt.value;
});
