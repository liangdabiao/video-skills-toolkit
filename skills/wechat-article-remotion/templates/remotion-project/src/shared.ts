import {Easing, interpolate} from "remotion";

export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const progress = (
  frame: number,
  start: number,
  duration: number,
): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const frameFromSeconds = (seconds: number, fps: number) =>
  Math.round(seconds * fps);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
