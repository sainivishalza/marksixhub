'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function PicksChart({ data }: { data: { date: string; picks: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.picks, 0);
  return (
    <figure>
      <figcaption className="sr-only">Saved number sets per day over the last 30 days. {total} in total.</figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(212,175,55,0.12)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#A9B0C0', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis allowDecimals={false} tick={{ fill: '#A9B0C0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 12, color: '#F3EFE4' }}
              labelStyle={{ color: '#A9B0C0' }}
              formatter={(v) => [v, 'Saved sets']}
            />
            <Line type="monotone" dataKey="picks" stroke="#F5C542" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
