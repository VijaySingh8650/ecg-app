import type { TypeOfWaveParams } from "./type";




export const defaultWaveParams: TypeOfWaveParams[] = [
  { id: 1, title: "P Wave Height", name: "h_p", value: 0.15, step: 0.01 },
  { id: 2, title: "P Wave Breadth", name: "b_p", value: 0.08, step: 0.01 },
  { id: 3, title: "Q Wave Height", name: "h_q", value: -0.1, step: 0.01 },
  { id: 4, title: "Q Wave Breadth", name: "b_q", value: 0.025, step: 0.005 },
  { id: 5, title: "R Wave Height", name: "h_r", value: 1.2, step: 0.1 },
  { id: 6, title: "R Wave Breadth", name: "b_r", value: 0.05, step: 0.01 },
  { id: 7, title: "S Wave Height", name: "h_s", value: -0.25, step: 0.01 },
  { id: 8, title: "S Wave Breadth", name: "b_s", value: 0.025, step: 0.005 },
  { id: 9, title: "T Wave Height", name: "h_t", value: 0.2, step: 0.01 },
  { id: 10, title: "T Wave Breadth", name: "b_t", value: 0.16, step: 0.01 },
  { id: 11, title: "PQ Segment Length", name: "l_pq", value: 0.08, step: 0.01 },
  { id: 12, title: "ST Segment Length", name: "l_st", value: 0.12, step: 0.01 },
  { id: 13, title: "TP Segment Length", name: "l_tp", value: 0.3, step: 0.01 },
  { id: 14, title: "Default P Waves per QRS", name: "n_p", value: 1, step: 1 },
];