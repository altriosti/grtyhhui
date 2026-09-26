import * as THREE from "three";

export function createVoxel(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    container.classList.add("no3d");
    return { show() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "gl";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, 0, 70);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334400, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(20, 30, 40);
  scene.add(key);
  const lime = new THREE.DirectionalLight(0xccff00, 1.4);
  lime.position.set(-30, -10, -20);
  scene.add(lime);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  let mesh = null, back = null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 24;
  const cx = cv.getContext("2d", { willReadFrequently: true });

  function show(t) {
    cx.clearRect(0, 0, 24, 24);
    Crows.draw(cx, t, { noBg: true });
    const img = cx.getImageData(0, 0, 24, 24).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < 24 && y < 24 && img[(y * 24 + x) * 4 + 3] > 0;
    const dist = new Array(576).fill(0);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (!on(x, y)) continue;
      let d = 0;
      while (d < 6 && on(x - d - 1, y) && on(x + d + 1, y) && on(x, y - d - 1) && on(x, y + d + 1)) d++;
      dist[y * 24 + x] = d;
    }
    const cells = [];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (on(x, y)) cells.push([x, y]);
    if (mesh) { pivot.remove(mesh); mesh.dispose(); }
    mesh = new THREE.InstancedMesh(box, mat, cells.length);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    cells.forEach(([x, y], i) => {
      const depth = 2 + Math.min(dist[y * 24 + x], 5) * 1.1;
      m.makeScale(1, 1, depth);
      m.setPosition(x - 11.5, 11.5 - y, 0);
      mesh.setMatrixAt(i, m);
      const o = (y * 24 + x) * 4;
      c.setRGB(img[o] / 255, img[o + 1] / 255, img[o + 2] / 255, THREE.SRGBColorSpace);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    pivot.add(mesh);
    const bgRuns = Crows.D.bg[t.Background][1];
    const bc = Crows.D.pal[bgRuns[3]];
    if (back) pivot.remove(back);
    back = new THREE.Mesh(new THREE.BoxGeometry(26, 26, 1.2), new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(bc[0] / 255, bc[1] / 255, bc[2] / 255, THREE.SRGBColorSpace), roughness: 0.8 }));
    back.position.z = -6.5;
    pivot.add(back);
  }

  let drag = null, rotY = -0.5, rotX = 0.08, vel = 0.35;
  container.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX }; container.setPointerCapture(e.pointerId); });
  container.addEventListener("pointermove", (e) => {
    if (!drag) return;
    rotY = drag.ry + (e.clientX - drag.x) * 0.01;
    rotX = Math.max(-0.6, Math.min(0.6, drag.rx + (e.clientY - drag.y) * 0.006));
  });
  const up = () => { drag = null; };
  container.addEventListener("pointerup", up);
  container.addEventListener("pointercancel", up);

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = 70 * Math.max(1, 1 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let running = true, last = performance.now();
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { running = es[0].isIntersecting; last = performance.now(); }).observe(container);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!drag) rotY += vel * dt * Math.cos(now / 2600);
    pivot.rotation.set(rotX, rotY, 0);
    pivot.position.y = Math.sin(now / 900) * 0.6;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  return { show };
}
