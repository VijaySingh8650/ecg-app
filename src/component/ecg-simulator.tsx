import React, { useEffect, useRef, useState } from "react";
import type { TypeOfWaveParams } from "../libs/type";
import { defaultWaveParams } from "../libs/constant";

const ECGSimulator: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  const [heartRate, setHeartRate] = useState(70);
  const [pixelsPerMv, setPixelsPerMv] = useState(100);
  const [params, setParams] = useState<TypeOfWaveParams[]>(defaultWaveParams);
  const [applyTrigger, setApplyTrigger] = useState(0);

  const [rWaveEnabled, setRWaveEnabled] = useState(false);
  const [rWaveCount, setRWaveCount] = useState(2);
  const [rWaveInterval, setRWaveInterval] = useState(5);

  const [pWaveEnabled, setPWaveEnabled] = useState(false);
  const [pWaveCount, setPWaveCount] = useState(0);
  const [pWaveInterval, setPWaveInterval] = useState(3);

  const [useCustomBeat, setUseCustomBeat] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState(10);
  const [customBeats, setCustomBeats] = useState<TypeOfWaveParams[][]>([]);
  
  const pointerX = useRef(0);
const drawnPoints = useRef<(null | { x: number; y: number })[]>([]);
const pathPoints = useRef<{ x: number; y: number }[]>([]);
const lastTimestamp = useRef(0);
const firstSweep = useRef(true);

const waveformPathRef = useRef<SVGPathElement | null>(null);
const pointerHeadRef = useRef<SVGCircleElement | null>(null);


  const handleParamChange = (value: number, index: number) => {
    const updatedParams = params.map((param, i) =>
      i === index ? { ...param, value } : param
    );
    setParams(updatedParams);
  };

  const addCustomBeat = () => {
    setCustomBeats((prev) => [...prev, [...params]]);
  };

  const updateCustomBeat = (
    beatIndex: number,
    value: number,
    paramIndex: number
  ) => {
    const newBeats = [...customBeats];
    newBeats[beatIndex][paramIndex] = {
      ...newBeats[beatIndex][paramIndex],
      value,
    };
    setCustomBeats(newBeats);
  };

  const removeCustomBeat = (index: number) => {
    setCustomBeats((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    console.log("dskhfkhkf");
    const svg = svgRef.current;
    if (!svg) return;

    const PIXELS_PER_SECOND = 150;
    const POINTER_RADIUS = 6;
    const ERASE_WIDTH = 12;

    let animationFrameId: number;
      firstSweep.current = true;





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

    const toParamObject = (paramList: TypeOfWaveParams[]) =>
      Object.fromEntries(paramList.map((el) => [el.name, el.value]));

    const generateWaveform = () => {
      const y0 = svg.clientHeight / 2;
      const totalTime = svg.clientWidth / PIXELS_PER_SECOND;
      const dt = 1 / PIXELS_PER_SECOND;
      const pts: { x: number; y: number }[] = [];

      const baseParam = toParamObject(params);
      let tElapsed = 0;
      let rCounter = 0,
        pCounter = 0;
      let beatIndex = 0;
      let normalBeats = 0;

      while (tElapsed < totalTime) {
        let current = { ...baseParam };

        // Custom Beat logic
        if (useCustomBeat && customBeats.length > 0) {
          if (normalBeats === 0) {
            const beatParams = toParamObject(customBeats[beatIndex]);
            current = { ...current, ...beatParams };
            beatIndex = (beatIndex + 1) % customBeats.length;
            normalBeats = repeatInterval;
          } else {
            normalBeats--;
          }
        }

        // Dynamic R wave
        let curR = 1;
        if (rWaveEnabled && rWaveInterval > 0 && ++rCounter >= rWaveInterval) {
          curR = rWaveCount;
          rCounter = 0;
        }

        // Dynamic P wave
        let curP = current.n_p || 1;
        if (pWaveEnabled && pWaveInterval > 0 && ++pCounter >= pWaveInterval) {
          curP = pWaveCount;
          pCounter = 0;
        }

        const base =
          Number(curP) * (Number(current.b_p) + Number(current.l_pq)) +
          (Number(current.b_q) + Number(current.b_r) + Number(current.b_s)) *
            curR +
          Number(current.l_st) +
          Number(current.b_t) +
          Number(current.l_tp);

        const heartPeriod = 60 / Math.max(heartRate, 1);
        const sf = heartPeriod / base;

        const s = {
          b_p: Number(current.b_p) * sf,
          l_pq: Number(current.l_pq) * sf,
          b_q: Number(current.b_q) * sf,
          b_r: Number(current.b_r) * sf,
          b_s: Number(current.b_s) * sf,
          l_st: Number(current.l_st) * sf,
          b_t: Number(current.b_t) * sf,
          l_tp: Number(current.l_tp) * sf,
        };

        const times = {
          P: Array.from(
            { length: Number(curP) },
            (_, i) => tElapsed + i * (s.b_p + s.l_pq)
          ),
          Q: tElapsed + Number(curP) * (s.b_p + s.l_pq),
          R: tElapsed + Number(curP) * (s.b_p + s.l_pq) + s.b_q,
          S: tElapsed + Number(curP) * (s.b_p + s.l_pq) + s.b_q + s.b_r,
          T:
            tElapsed +
            Number(curP) * (s.b_p + s.l_pq) +
            s.b_q +
            s.b_r +
            s.b_s +
            s.l_st,
        };

        const tEnd =
          tElapsed +
          Number(curP) * (s.b_p + s.l_pq) +
          s.b_q +
          s.b_r +
          s.b_s +
          s.l_st +
          s.b_t +
          s.l_tp;

        for (let t = tElapsed; t < tEnd; t += dt) {
          let v = 0;
          for (const tp of times.P) {
            if (t >= tp && t < tp + s.b_p) {
              v = raisedCosinePulse(t, Number(current.h_p), s.b_p, Number(tp));
              break;
            }
          }
          if (!v && t < times.R)
            v = raisedCosinePulse(t, Number(current.h_q), s.b_q, times.Q);
          else if (!v && t < times.S)
            v = raisedCosinePulse(t, Number(current.h_r), s.b_r, times.R);
          else if (!v && t < times.T)
            v = raisedCosinePulse(t, Number(current.h_s), s.b_s, times.S);
          else if (!v)
            v = raisedCosinePulse(t, Number(current.h_t), s.b_t, times.T);

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

      waveformPathRef.current = document.createElementNS(
        svg.namespaceURI,
        "path"
      ) as SVGPathElement;
      waveformPathRef.current.setAttribute("stroke", "#2c3e50");
      waveformPathRef.current.setAttribute("fill", "none");
      waveformPathRef.current.setAttribute("stroke-width", "2");
      svg.appendChild(waveformPathRef.current);

      pointerHeadRef.current = document.createElementNS(
        svg.namespaceURI,
        "circle"
      ) as SVGCircleElement;
      pointerHeadRef.current.setAttribute("r", `${POINTER_RADIUS}`);
      pointerHeadRef.current.setAttribute("fill", "#fff");
      pointerHeadRef.current.setAttribute("stroke", "#000");
      pointerHeadRef.current.setAttribute("stroke-width", "1");
      svg.appendChild(pointerHeadRef.current);
    };

    const animate = (ts: number) => {
      const w = svg.clientWidth;
      const dt = lastTimestamp.current ? (ts - lastTimestamp.current) / 1000 : 0;
      lastTimestamp.current = ts;
      pointerX.current += PIXELS_PER_SECOND * dt;

      let idx = pathPoints.current.findIndex((pt) => pt.x >= pointerX.current);
      if (idx < 0) idx = pathPoints.current.length - 1;

      if (firstSweep.current) {
        drawnPoints.current = pathPoints.current.slice(0, idx + 1);
        if (waveformPathRef.current) {
          if (waveformPathRef.current) {
            waveformPathRef.current.setAttribute(
              "d",
              pointsToPath(
                drawnPoints.current.filter(
                  (pt): pt is { x: number; y: number } => pt !== null
                )
              )
            );
          }
        }
        if (pointerX.current > w) firstSweep.current = false;
      } else {
        if (pointerX.current > w) {
          pointerX.current = 0;
          pathPoints.current = generateWaveform();
        }
        const es = pointerX.current - ERASE_WIDTH / 2;
        const ee = pointerX.current + ERASE_WIDTH / 2;
        const si = drawnPoints.current.findIndex((pt) => pt && pt.x >= es);
        const ei = drawnPoints.current.findIndex((pt) => pt && pt.x > ee);
        for (
          let i = si < 0 ? 0 : si;
          i < (ei < 0 ? drawnPoints.current.length : ei);
          i++
        ) {
          drawnPoints.current[i] = pathPoints.current[i];
        }
        if (waveformPathRef.current) {
          waveformPathRef.current.setAttribute(
            "d",
            pointsToPath(
              drawnPoints.current.filter(Boolean) as { x: number; y: number }[]
            )
          );
        }
      }

      const cur = pathPoints.current[idx];
      if (cur && pointerHeadRef.current) {
        pointerHeadRef.current.setAttribute("cx", `${cur.x}`);
        pointerHeadRef.current.setAttribute("cy", `${cur.y}`);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    if (firstSweep.current) {

      initSVG();
    }

    const currentPointerX = pointerX.current;
    // const currentDrawnPoints = drawnPoints.current.length
    //   ? drawnPoints.current
    //   : Array(pathPoints.current.length).fill(null);


    const frozenDrawnPoints = drawnPoints.current.map(pt => pt ? { ...pt } : null);

    pathPoints.current = generateWaveform();
    drawnPoints.current = frozenDrawnPoints;
    pointerX.current = currentPointerX;
    animationFrameId = requestAnimationFrame(animate);

    return () => {
        cancelAnimationFrame(animationFrameId);
        lastTimestamp.current = 0;
    }
  }, [applyTrigger,
  params,
  heartRate,
  customBeats,
  useCustomBeat,
  repeatInterval,
  rWaveEnabled,
  rWaveCount,
  rWaveInterval,
  pWaveEnabled,
  pWaveCount,
  pWaveInterval,
  pixelsPerMv]);

  return (
    <div className="container">
      <div className="controls">
        <h3>ECG Parameters</h3>
        <div className="param-group">
          <label htmlFor="heart_rate">Heart Rate (bpm):</label>
          <input
            id="heart_rate"
            type="number"
            value={heartRate}
            onChange={(e) => setHeartRate(+e.target.value)}
          />
        </div>
        <div className="param-group">
          <label htmlFor="pixelsPerMv">Pixels per mV:</label>
          <input
            id="pixelsPerMv"
            type="number"
            value={pixelsPerMv}
            onChange={(e) => setPixelsPerMv(+e.target.value)}
          />
        </div>

        <h3>Wave Parameters (mV, sec)</h3>
        {params.map((el, index) => (
          <div className="param-group" key={el.id}>
            <label htmlFor={el.name as string}>{el.title}:</label>
            <input
              id={el.name as string}
              type="number"
              step={el.step}
              value={el.value}
              onChange={(e) => handleParamChange(+e.target.value, index)}
            />
          </div>
        ))}

        <h3>Dynamic R Wave Pattern</h3>
        <div className="param-group">
          <label htmlFor="rWaveEnabled">
            <input
              id="rWaveEnabled"
              type="checkbox"
              checked={rWaveEnabled}
              onChange={(e) => setRWaveEnabled(e.target.checked)}
            />{" "}
            Enable R Wave Pattern
          </label>
        </div>

        <div className="param-group">
          <label htmlFor="rWaveCount">R Waves in Pattern:</label>
          <input
            id="rWaveCount"
            type="number"
            value={rWaveCount}
            onChange={(e) => setRWaveCount(+e.target.value)}
          />
        </div>

        <div className="param-group">
          <label htmlFor="rWaveInterval">Apply After N QRS:</label>
          <input
            id="rWaveInterval"
            type="number"
            value={rWaveInterval}
            onChange={(e) => setRWaveInterval(+e.target.value)}
          />
        </div>

        <h3>Dynamic P Wave Pattern</h3>
        <div className="param-group">
          <label htmlFor="pWaveEnabled">
            <input
              id="pWaveEnabled"
              type="checkbox"
              checked={pWaveEnabled}
              onChange={(e) => setPWaveEnabled(e.target.checked)}
            />{" "}
            Enable P Wave Pattern
          </label>
        </div>

        <div className="param-group">
          <label htmlFor="pWaveCount">P Waves in Pattern:</label>
          <input
            id="pWaveCount"
            type="number"
            value={pWaveCount}
            onChange={(e) => setPWaveCount(+e.target.value)}
          />
        </div>

        <div className="param-group">
          <label htmlFor="pWaveInterval">Apply After N QRS:</label>
          <input
            id="pWaveInterval"
            type="number"
            value={pWaveInterval}
            onChange={(e) => setPWaveInterval(+e.target.value)}
          />
        </div>

        <h3>Custom Beat Sequence</h3>
        <div className="param-group">
          <label htmlFor="useCustomBeatParameters">
            <input
              id="useCustomBeatParameters"
              type="checkbox"
              checked={useCustomBeat}
              onChange={(e) => setUseCustomBeat(e.target.checked)}
            />{" "}
            Enable Custom Beat Sequence
          </label>
        </div>

        <div className="param-group">
          <label htmlFor="repeatInterval">Normal Beats Before Repeat:</label>
          <input
            id="repeatInterval"
            type="number"
            value={repeatInterval}
            onChange={(e) => setRepeatInterval(+e.target.value)}
          />
        </div>
        <div id="customBeatsContainer">
          {customBeats.map((beat, bIdx) => (
            <div key={beat[0].id as string} className="custom-beat-row">
              {beat.map((param, pIdx) => (
                <div key={param.id} className="param-group">
                  <label>{param.title}:</label>
                  <input
                    type="number"
                    value={param.value}
                    step={param.step}
                    onChange={(e) =>
                      updateCustomBeat(bIdx, +e.target.value, pIdx)
                    }
                  />
                </div>
              ))}
              <button id="removeBtn" onClick={() => removeCustomBeat(bIdx)}>
                Remove Beat
              </button>
            </div>
          ))}
        </div>

        <button id="addCustomBeatBtn" onClick={addCustomBeat}>
          + Add Custom Beat
        </button>

        <button
          id="applyBtn"
          onClick={() => setApplyTrigger((prev) => prev + 1)}
        >
          Apply Changes
        </button>
      </div>

      <div className="canvas-container">
        <svg ref={svgRef} width={1000} height={400}></svg>
      </div>
    </div>
  );
};

export default ECGSimulator;
