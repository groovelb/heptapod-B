import { alpha } from '@mui/material/styles';

// Shared by the landing handoff and the Create/Archive chamber. Samples come
// from frame 1128 of the currently selected desktop and portrait landing videos.
function surface(colors) {
  return {
    backgroundColor: colors.fog,
    backgroundImage: [
      `radial-gradient(ellipse 55% 45% at 35% 28%, ${alpha(colors.fogHi, 0.28)} 0%, ${alpha(colors.fogHi, 0)} 100%)`,
      `linear-gradient(to right, ${alpha(colors.edge, 0)} 55%, ${alpha(colors.edge, 0.3)} 100%)`,
      `linear-gradient(to bottom, ${colors.fogTop} 0%, ${colors.fogCenter} 35%, ${colors.fog} 60%, ${colors.fogBottom} 100%)`,
    ].join(', '),
  };
}

export function chamberSurfaceSx(theme) {
  const colors = theme.palette.custom.chamber;
  return {
    ...surface(colors.mobile),
    [theme.breakpoints.up('md')]: surface(colors),
  };
}
