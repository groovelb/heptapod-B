import React from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';

/**
 * LineGrid Component
 * MUI Grid with lines drawn between items (in spacing gaps)
 *
 * Usage 1 - Grid Container with items:
 * <LineGrid container gap={0}>
 *   <Grid item xs={7.5}>Content 1</Grid>
 *   <Grid item xs={4.5}>Content 2</Grid>
 * </LineGrid>
 *
 * Usage 2 - Stack Layout (vertical):
 * <LineGrid>
 *   <Section1 />
 *   <Section2 />
 * </LineGrid>
 *
 * Usage 3 - Equal Height Grid:
 * <LineGrid container gap={0} equalHeight>
 *   <Grid size={{ xs: 12 }}>Row 1</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 1</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 2</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 3</Grid>
 * </LineGrid>
 *
 * Usage 4 - Custom Row Heights (ratio-based):
 * <LineGrid container gap={0} rowHeights={[1, 2]}>
 *   <Grid size={{ xs: 12 }}>Row 1 (1/3 height)</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 1 (2/3 height)</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 2</Grid>
 *   <Grid size={{ xs: 4 }}>Row 2 Col 3</Grid>
 * </LineGrid>
 */
const LineGrid = React.forwardRef(({
  container,
  children,
  gap = 0,
  borderColor = 'text.primary',
  equalHeight = false,
  rowHeights = null, // [1, 2, 1] means row ratios
  sx,
  ...props
}, ref) => {
  const theme = useTheme();

  // Stack mode (no container prop)
  if (!container) {
    return (
      <Stack
        ref={ref}
        spacing={gap / 8}
        divider={
          <Divider
            sx={{
              borderColor,
              borderWidth: 1,
              transition: 'border-color 1s ease',
            }}
          />
        }
        {...props}
        sx={sx}
      >
        {children}
      </Stack>
    );
  }

  // Grid container mode
  const childrenArray = React.Children.toArray(children);

  // Resolve Grid sizes at every breakpoint, including inherited values. CSS
  // controls both item width and separators, so SSR and resizing stay aligned.
  const layouts = theme.breakpoints.keys.map((breakpoint, breakpointIndex) => {
    let row = 0;
    let column = 0;
    const items = childrenArray.map((child) => {
      let span = 12;
      if (React.isValidElement(child)) {
        const size = child.props.size ?? 12;
        if (typeof size === 'number') span = size;
        else for (const key of theme.breakpoints.keys.slice(0, breakpointIndex + 1)) {
          if (typeof size[key] === 'number') span = size[key];
        }
      }
      span = Math.max(1, Math.min(12, span));
      if (column + span > 12) { row++; column = 0; }
      const item = { row, column, span };
      column += span;
      if (column === 12) { row++; column = 0; }
      return item;
    });
    return { breakpoint, items, totalRows: items.length ? items.at(-1).row + 1 : 1 };
  });
  const responsive = (index, value) => Object.fromEntries(layouts.map(({ breakpoint, items, totalRows }) => [breakpoint, value(items[index], totalRows)]));

  // Calculate row height percentages from rowHeights
  const getRowHeight = (rowIndex, totalRows) => {
    if (rowHeights && Array.isArray(rowHeights)) {
      const totalRatio = rowHeights.reduce((sum, ratio) => sum + ratio, 0);
      const rowRatio = rowHeights[rowIndex] || 1;
      return `${(rowRatio / totalRatio) * 100}%`;
    }
    if (equalHeight) {
      return `calc(100% / ${totalRows})`;
    }
    return 'auto';
  };

  // Determine if container should have fixed height
  const shouldFixHeight = equalHeight || (rowHeights && Array.isArray(rowHeights));

  return (
    <Grid container spacing={gap / 8} ref={ref} {...props}
      sx={[{ width: '100%', height: shouldFixHeight ? '100%' : 'auto', alignItems: 'stretch' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          sx: [{
            position: 'relative',
            ...(shouldFixHeight && { height: responsive(index, (item, rows) => getRowHeight(item.row, rows)) }),
            '--line-grid-vertical': responsive(index, (item) => item.column > 0 ? 'block' : 'none'),
            '--line-grid-horizontal': responsive(index, (item) => item.row > 0 ? 'block' : 'none'),
            '&::before': {
              display: 'var(--line-grid-vertical)', content: '""', position: 'absolute',
              left: `-${gap / 2}px`, top: 0, bottom: 0, width: '1px', bgcolor: borderColor,
              pointerEvents: 'none', transition: 'background-color 1s ease', zIndex: 1,
            },
            '&::after': {
              display: 'var(--line-grid-horizontal)', content: '""', position: 'absolute',
              top: `-${gap / 2}px`, left: 0, right: 0, height: '1px', bgcolor: borderColor,
              pointerEvents: 'none', transition: 'background-color 1s ease', zIndex: 1,
            },
          }, ...(Array.isArray(child.props.sx) ? child.props.sx : [child.props.sx])],
        });
      })}
    </Grid>
  );
});

LineGrid.displayName = 'LineGrid';

export default LineGrid;
