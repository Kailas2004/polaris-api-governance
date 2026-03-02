import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const BAR_CHART_WIDTH = 560;
const BAR_CHART_HEIGHT = 340;
const BAR_WIDTH = 52;
const GROUP_SPACING = 190;
const START_X = 100;
const BASE_Y = 280;
const SCALE_HEIGHT = 210;

const colorFor = {
  allowed: 'var(--success)',
  blocked: 'var(--danger)'
};

const formatRatio = (value, total) => {
  if (!total) {
    return '0.0%';
  }
  return `${((value / total) * 100).toFixed(1)}%`;
};

const sumByPlan = (metrics, plan) => {
  return metrics
    .filter((row) => row.plan === plan)
    .reduce(
      (acc, row) => ({
        allowed: acc.allowed + row.allowed,
        blocked: acc.blocked + row.blocked
      }),
      { allowed: 0, blocked: 0 }
    );
};

const MetricsOverviewChart = ({ metrics }) => {
  const chartData = useMemo(() => {
    const free = sumByPlan(metrics, 'FREE');
    const pro = sumByPlan(metrics, 'PRO');
    const maxValue = Math.max(1, free.allowed, free.blocked, pro.allowed, pro.blocked);
    const freeTotal = free.allowed + free.blocked;
    const proTotal = pro.allowed + pro.blocked;
    return [
      { plan: 'FREE', ...free, total: freeTotal, maxValue },
      { plan: 'PRO', ...pro, total: proTotal, maxValue }
    ];
  }, [metrics]);

  return (
    <Card className="metrics-chart-card">
      <CardHeader>
        <CardTitle>Traffic Distribution</CardTitle>
        <CardDescription>Allowed vs blocked totals by plan (live from Micrometer counters)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="chart-legend">
          <span><i className="legend-dot legend-dot--allowed" /> Allowed</span>
          <span><i className="legend-dot legend-dot--blocked" /> Blocked</span>
        </div>

        <svg viewBox={`0 0 ${BAR_CHART_WIDTH} ${BAR_CHART_HEIGHT}`} className="metrics-chart" role="img" aria-label="Allowed versus blocked requests by plan">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="56"
              y1={BASE_Y - SCALE_HEIGHT * ratio}
              x2={BAR_CHART_WIDTH - 28}
              y2={BASE_Y - SCALE_HEIGHT * ratio}
              className="chart-grid"
            />
          ))}
          <line x1="60" y1={BASE_Y} x2={BAR_CHART_WIDTH - 30} y2={BASE_Y} className="chart-axis" />

          {chartData.map((row, index) => {
            const groupX = START_X + index * GROUP_SPACING;
            const allowedHeight = (row.allowed / row.maxValue) * SCALE_HEIGHT;
            const blockedHeight = (row.blocked / row.maxValue) * SCALE_HEIGHT;
            const noTraffic = row.allowed === 0 && row.blocked === 0;

            return (
              <g key={row.plan}>
                <rect
                  className="chart-bar chart-bar--allowed"
                  x={groupX}
                  y={BASE_Y - allowedHeight}
                  width={BAR_WIDTH}
                  height={Math.max(2, allowedHeight)}
                  fill={colorFor.allowed}
                  rx="8"
                >
                  <title>{`Allowed: ${row.allowed} (${formatRatio(row.allowed, row.total)})`}</title>
                </rect>
                <rect
                  className="chart-bar chart-bar--blocked"
                  x={groupX + BAR_WIDTH + 12}
                  y={BASE_Y - blockedHeight}
                  width={BAR_WIDTH}
                  height={Math.max(2, blockedHeight)}
                  fill={colorFor.blocked}
                  rx="8"
                >
                  <title>{`Blocked: ${row.blocked} (${formatRatio(row.blocked, row.total)})`}</title>
                </rect>

                <text x={groupX + BAR_WIDTH / 2} y={BASE_Y - allowedHeight - 8} className="chart-value">{row.allowed}</text>
                <text x={groupX + BAR_WIDTH + 12 + BAR_WIDTH / 2} y={BASE_Y - blockedHeight - 8} className="chart-value">{row.blocked}</text>
                <text x={groupX + BAR_WIDTH + 6} y={BASE_Y + 18} className="chart-label">{row.plan}</text>
                {noTraffic && <text x={groupX + BAR_WIDTH + 6} y={BASE_Y - 14} className="chart-empty-label">No traffic</text>}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
};

export default MetricsOverviewChart;
