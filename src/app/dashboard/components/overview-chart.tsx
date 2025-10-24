'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyOverview } from '../page';

interface OverviewChartProps {
  data: MonthlyOverview[];
}

export function OverviewChart({ data }: OverviewChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg bg-muted/50">
        <p className="text-muted-foreground">Không có dữ liệu để hiển thị biểu đồ.</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: format(new Date(item.month), 'MMM/yy', { locale: vi }),
  }));

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${formatCurrency(Number(value))}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value, name) => {
              if (name === 'Doanh thu') {
                return [formatCurrency(Number(value)), 'Doanh thu'];
              }
              if (name === 'Doanh số') {
                return [value, 'Doanh số'];
              }
              return [value, name];
            }}
          />
          <Legend iconType="circle" />
          <Bar yAxisId="left" dataKey="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="Doanh số" stroke="hsl(var(--accent))" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
