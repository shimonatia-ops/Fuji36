import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import '../../styles/App.css'

const CHART_COLORS = {
  light: {
    grid: '#e2e8f0',
    axis: '#64748b',
    accent: '#f97316',
  },
  dark: {
    grid: 'rgba(249, 115, 22, 0.2)',
    axis: 'rgba(249, 115, 22, 0.8)',
    accent: '#f97316',
  },
}

/* Dummy chart data - replace with real API data later */
const DUMMY_WEEKLY_PROGRESS = [
  { week: 'Week 1', completion: 65 },
  { week: 'Week 2', completion: 72 },
  { week: 'Week 3', completion: 68 },
  { week: 'Week 4', completion: 78 },
  { week: 'Week 5', completion: 85 },
  { week: 'Week 6', completion: 82 },
]

const DUMMY_TASK_STATUS = [
  { name: 'Completed', value: 42 },
  { name: 'In Progress', value: 18 },
  { name: 'Not Started', value: 12 },
]

const TASK_STATUS_COLORS = ['#10b981', '#f59e0b', '#94a3b8']

const DUMMY_PATIENT_ACTIVITY = [
  { name: 'Patient A', completed: 24, pending: 6 },
  { name: 'Patient B', completed: 18, pending: 8 },
  { name: 'Patient C', completed: 12, pending: 4 },
  { name: 'Patient D', completed: 8, pending: 10 },
]

export type TherapistDashboardProps = {
  patientCount?: number
  totalTasks?: number
  /** Optional: use real patient names for activity chart */
  patientActivityData?: Array<{ name: string; completed: number; pending: number }>
  /** Optional: compact layout for embedding in RoleDashboardPage */
  compact?: boolean
}

export default function TherapistDashboard({
  patientCount = 0,
  totalTasks = 0,
  patientActivityData,
  compact = false,
}: TherapistDashboardProps) {
  const { theme } = useTheme()
  const colors = CHART_COLORS[theme]
  const activityData = patientActivityData ?? DUMMY_PATIENT_ACTIVITY

  return (
    <div className={`therapist-dashboard ${compact ? 'therapist-dashboard-compact' : ''}`}>
      <h1>Patient Progress Dashboard</h1>
      <p className="section-intro">
        Monitor your patients' progress and engagement at a glance.
      </p>
      <div className="therapist-dashboard-stats">
        <div className="therapist-stat-card">
          <div className="therapist-stat-number">{patientCount}</div>
          <div className="therapist-stat-label">Total Patients</div>
        </div>
        <div className="therapist-stat-card">
          <div className="therapist-stat-number">{totalTasks}</div>
          <div className="therapist-stat-label">Total Tasks</div>
        </div>
        <div className="therapist-stat-card">
          <div className="therapist-stat-number">78%</div>
          <div className="therapist-stat-label">Avg. Completion Rate</div>
        </div>
        <div className="therapist-stat-card">
          <div className="therapist-stat-number">12</div>
          <div className="therapist-stat-label">Sessions This Week</div>
        </div>
      </div>
      <div className="therapist-dashboard-charts">
        <div className="therapist-chart-card">
          <h3>Weekly Completion Rate</h3>
          <div className="therapist-chart-container">
            <ResponsiveContainer width="100%" height={compact ? 220 : 280}>
              <AreaChart data={DUMMY_WEEKLY_PROGRESS}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="week" stroke={colors.axis} fontSize={12} tick={{ fill: colors.axis }} />
                <YAxis stroke={colors.axis} fontSize={12} tick={{ fill: colors.axis }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [v != null ? `${v}%` : '', 'Completion']} contentStyle={{ backgroundColor: 'var(--fuji36-bg-secondary)', border: '1px solid var(--fuji36-border)' }} labelStyle={{ color: 'var(--fuji36-text)' }} />
                <Area type="monotone" dataKey="completion" stroke={colors.accent} fillOpacity={1} fill="url(#colorProgress)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="therapist-chart-card">
          <h3>Tasks by Status</h3>
          <div className="therapist-chart-container">
            <ResponsiveContainer width="100%" height={compact ? 220 : 280}>
              <PieChart>
                <Pie
                  data={DUMMY_TASK_STATUS}
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 45 : 60}
                  outerRadius={compact ? 75 : 100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent, cx, cy, midAngle, outerRadius }) => {
                    const radian = (midAngle * Math.PI) / 180
                    const x = cx + (outerRadius + 20) * Math.cos(radian)
                    const y = cy + (outerRadius + 20) * Math.sin(radian)
                    return (
                      <text x={x} y={y} fill={colors.axis} textAnchor="middle" fontSize={12}>
                        {name} {percent != null ? (percent * 100).toFixed(0) : 0}%
                      </text>
                    )
                  }}
                >
                  {DUMMY_TASK_STATUS.map((_, index) => (
                    <Cell key={index} fill={TASK_STATUS_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v ?? 0, name]} contentStyle={{ backgroundColor: 'var(--fuji36-bg-secondary)', border: '1px solid var(--fuji36-border)' }} labelStyle={{ color: 'var(--fuji36-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="therapist-chart-card therapist-chart-card-wide">
          <h3>Patient Activity (Tasks Completed)</h3>
          <div className="therapist-chart-container">
            <ResponsiveContainer width="100%" height={compact ? 220 : 280}>
              <BarChart data={activityData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis type="number" stroke={colors.axis} fontSize={12} tick={{ fill: colors.axis }} />
                <YAxis type="category" dataKey="name" stroke={colors.axis} fontSize={12} width={70} tick={{ fill: colors.axis }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--fuji36-bg-secondary)', border: '1px solid var(--fuji36-border)' }} labelStyle={{ color: 'var(--fuji36-text)' }} />
                <Legend wrapperStyle={{ color: 'var(--fuji36-text)' }} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
