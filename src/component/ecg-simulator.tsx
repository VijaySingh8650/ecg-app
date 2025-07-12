import React, { useEffect, useRef, useState } from "react";
import type { WaveParams } from "../libs/type";
import { defaultWaveParams } from "../libs/constant";
// Your CSS file





const ECGSimulator: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  const [heartRate, setHeartRate] = useState(70);
  const [pixelsPerMv, setPixelsPerMv] = useState(100);
  const [params, setParams] = useState<WaveParams>(defaultWaveParams);
  const [applyTrigger, setApplyTrigger] = useState(0);

  const handleParamChange = (key: keyof WaveParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const PIXELS_PER_SECOND = 150;
    const POINTER_RADIUS = 6;
    const ERASE_WIDTH = 12;

    let animationFrameId: number;
    let waveformPath: SVGPathElement;
    let pointerHead: SVGCircleElement;
    let lastTimestamp = 0;
    let pointerX = 0;
    let firstSweep = true;

    let pathPoints: { x: number; y: number }[] = [];
    let drawnPoints: ({ x: number; y: number } | null)[] = [];

    // Clear existing children
    svg.innerHTML = "";

    const drawGrid = () => {
      const gridGroup = document.createElementNS(svg.namespaceURI, "g");
      const small = 8;

      for (let x = 0; x <= svg.clientWidth; x += small) {
        const line = document.createElementNS(svg.namespaceURI, "line");
        line.setAttribute("x1", `${x}`);
        line.setAttribute("y1", "0");
        line.setAttribute("x2", `${x}`);
        line.setAttribute("y2", `${svg.clientHeight}`);
        line.setAttribute("stroke", "#eee");
        gridGroup.appendChild(line);
      }

      for (let y = 0; y <= svg.clientHeight; y += small) {
        const line = document.createElementNS(svg.namespaceURI, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", `${y}`);
        line.setAttribute("x2", `${svg.clientWidth}`);
        line.setAttribute("y2", `${y}`);
        line.setAttribute("stroke", "#eee");
        gridGroup.appendChild(line);
      }

      svg.appendChild(gridGroup);
    };

    const raisedCosinePulse = (t: number, h: number, b: number, t0: number) => {
      if (b === 0 || t < t0 || t > t0 + b) return 0;
      return (h / 2) * (1 - Math.cos((2 * Math.PI * (t - t0)) / b));
    };

    const generateWaveform = () => {
      const p = params;
      const totalTime = svg.clientWidth / PIXELS_PER_SECOND;
      const y0 = svg.clientHeight / 2;
      const pts: { x: number; y: number }[] = [];
      const dt = 1 / PIXELS_PER_SECOND;

      let tElapsed = 0;
      while (tElapsed < totalTime) {
        const base = p.b_p + p.l_pq + p.b_q + p.b_r + p.b_s + p.l_st + p.b_t + p.l_tp;
        const safeHeartRate = Math.max(heartRate, 1);
        const heartPeriod = 60 / safeHeartRate;
        const scale = heartPeriod / base;

        const s = {
          b_p: p.b_p * scale, l_pq: p.l_pq * scale,
          b_q: p.b_q * scale, b_r: p.b_r * scale,
          b_s: p.b_s * scale, l_st: p.l_st * scale,
          b_t: p.b_t * scale, l_tp: p.l_tp * scale,
        };

        const times = {
          P: tElapsed,
          Q: tElapsed + s.b_p + s.l_pq,
          R: tElapsed + s.b_p + s.l_pq + s.b_q,
          S: tElapsed + s.b_p + s.l_pq + s.b_q + s.b_r,
          T: tElapsed + s.b_p + s.l_pq + s.b_q + s.b_r + s.b_s + s.l_st,
        };

        const tEnd = tElapsed + s.b_p + s.l_pq + s.b_q + s.b_r + s.b_s + s.l_st + s.b_t + s.l_tp;

        for (let t = tElapsed; t < tEnd; t += dt) {
          let v = 0;
          if (t < times.Q) v = raisedCosinePulse(t, p.h_p, s.b_p, times.P);
          else if (t < times.R) v = raisedCosinePulse(t, p.h_q, s.b_q, times.Q);
          else if (t < times.S) v = raisedCosinePulse(t, p.h_r, s.b_r, times.R);
          else if (t < times.T) v = raisedCosinePulse(t, p.h_s, s.b_s, times.S);
          else v = raisedCosinePulse(t, p.h_t, s.b_t, times.T);

          pts.push({ x: t * PIXELS_PER_SECOND, y: y0 - v * pixelsPerMv });
        }

        tElapsed = tEnd;
      }

      return pts;
    };

    const pointsToPath = (pts: { x: number; y: number }[]) =>
      pts.reduce((acc, p, i) => acc + (i ? " L" : "M") + `${p.x} ${p.y}`, "");

    const initSVG = () => {
      drawGrid();

      waveformPath = document.createElementNS(svg.namespaceURI, "path") as SVGPathElement;
      waveformPath.setAttribute("stroke", "#2c3e50");
      waveformPath.setAttribute("fill", "none");
      waveformPath.setAttribute("stroke-width", "2");
      svg.appendChild(waveformPath);

      pointerHead = document.createElementNS(svg.namespaceURI, "circle") as SVGCircleElement;
      pointerHead.setAttribute("r", `${POINTER_RADIUS}`);
      pointerHead.setAttribute("fill", "#fff");
      pointerHead.setAttribute("stroke", "#000");
      pointerHead.setAttribute("stroke-width", "1");
      svg.appendChild(pointerHead);
    };

    const animate = (ts: number) => {
      const w = svg.clientWidth;
      const dt = lastTimestamp ? (ts - lastTimestamp) / 1000 : 0;
      lastTimestamp = ts;
      pointerX += PIXELS_PER_SECOND * dt;

      let idx = pathPoints.findIndex(pt => pt.x >= pointerX);
      if (idx < 0) idx = pathPoints.length - 1;

      if (firstSweep) {
        drawnPoints = pathPoints.slice(0, idx + 1);
        waveformPath.setAttribute("d", pointsToPath(drawnPoints.filter((pt): pt is { x: number; y: number } => pt !== null)));
        if (pointerX > w) firstSweep = false;
      } else {
        if (pointerX > w) {
          pointerX = 0;
          pathPoints = generateWaveform();
        }
        const es = pointerX - ERASE_WIDTH / 2;
        const ee = pointerX + ERASE_WIDTH / 2;
        const si = drawnPoints.findIndex(pt => pt && pt.x >= es);
        const ei = drawnPoints.findIndex(pt => pt && pt.x > ee);
        for (let i = si < 0 ? 0 : si; i < (ei < 0 ? drawnPoints.length : ei); i++) {
          drawnPoints[i] = pathPoints[i];
        }
        waveformPath.setAttribute("d", pointsToPath(drawnPoints.filter((pt): pt is { x: number; y: number } => pt !== null)));
      }

      const cur = pathPoints[idx];
      if (cur) {
        pointerHead.setAttribute("cx", `${cur.x}`);
        pointerHead.setAttribute("cy", `${cur.y}`);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize SVG
    initSVG();
    pathPoints = generateWaveform();
    drawnPoints = Array(pathPoints.length).fill(null);
    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [applyTrigger]);

  return (
    <div className="ecg-wrapper">
      <div className="controls">
        <h2>ECG Controls</h2>
        <label>Heart Rate (bpm):
          <input type="number" value={heartRate} onChange={e => setHeartRate(+e.target.value)} />
        </label>
        <label>Pixels per mV:
          <input type="number" value={pixelsPerMv} onChange={e => setPixelsPerMv(+e.target.value)} />
        </label>
        {Object.entries(params).map(([key, value]) => (
          <label key={key}>
            {key}:
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={e => handleParamChange(key as keyof WaveParams, +e.target.value)}
            />
          </label>
        ))}
        <button onClick={() => setApplyTrigger(prev => prev + 1)}>Apply Changes</button>
      </div>
      <div className="canvas">
        <svg ref={svgRef} width={1000} height={400}></svg>
      </div>
    </div>
  );
};

export default ECGSimulator;
