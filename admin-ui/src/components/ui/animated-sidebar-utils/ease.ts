// Shared motion curves for animated-sidebar (the beui.dev source imports these
// from its own utils, which were not part of the copied component).

// Fast start, long soft landing: labels, submenus, fades.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// iOS-style sheet curve for panels sliding in and out.
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

// Layout moves (active pill, chevrons, reflowing items): settles without
// visible bounce.
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 500,
  damping: 40,
  mass: 0.8,
} as const;

// Press feedback: quick and slightly springy.
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 600,
  damping: 30,
} as const;
