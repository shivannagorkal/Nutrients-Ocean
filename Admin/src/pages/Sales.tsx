import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Tag,
  Clock,
  User,
  PieChart as PieIcon,
  Download,
  Calendar,
} from 'lucide-react';

import { useDateRange } from '../context/DateRangeContext';
import { useSales, useSalesDashboard, useDeleteSale, SaleRecord } from '../api/sales';
import { useMetadata } from '../api/meta';
import { formatRupee, formatDate } from '../lib/format';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
import SaleDrawer from '../components/SaleDrawer';
import ConfirmDialog from '../components/ConfirmDialog';

const PAYMENT_COLORS: Record<string, string> = {
  UPI: '#10b981', // emerald-500
  Cash: '#0284c7', // sky-600
};

export default function Sales() {
  const { from, to, preset } = useDateRange();
  const { data: meta } = useMetadata();

  // Grouping state: 'day' | 'week' | 'month'
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day');

  // Filter and pagination states for log
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer & Dialog states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [deletingSale, setDeletingSale] = useState<{ id: string; label: string } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Queries
  const {
    data: dashboard,
    isLoading: isDashLoading,
    refetch: refetchDashboard,
  } = useSalesDashboard({ from, to, group });

  const {
    data: logData,
    isLoading: isLogLoading,
    refetch: refetchLog,
  } = useSales({
    from,
    to,
    product: productFilter || undefined,
    payment: paymentFilter || undefined,
    member: memberFilter || undefined,
    q: searchQuery || undefined,
    page,
    pageSize: 15,
  });

  const deleteSaleMutation = useDeleteSale();

  const handleEdit = (sale: SaleRecord) => {
    setEditingSale(sale);
    setIsDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSale) return;
    try {
      await deleteSaleMutation.mutateAsync(deletingSale.id);
      showToast('Sale record deleted successfully');
      setDeletingSale(null);
      refetchDashboard();
      refetchLog();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete sale');
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
          <p className="font-bold text-slate-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium text-slate-400">{entry.name}:</span>
              <span className="font-bold">
                {entry.name.toLowerCase().includes('order') || entry.name.toLowerCase().includes('unit')
                  ? entry.value
                  : entry.name.toLowerCase().includes('growth')
                  ? `${entry.value >= 0 ? '+' : ''}${entry.value}%`
                  : formatRupee(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Range Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Sales Analytics & Log</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {preset} ({from} to {to})
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Revenue trends, moving averages, order breakdown, and full transactions
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Day / Week / Month Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                  group === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingSale(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Sale</span>
          </button>
        </div>
      </div>

      {/* Cards Grid (6 Cards per Section 6.4) */}
      {isDashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Sales</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Receipt className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.sales)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Money received</span>
          </div>

          {/* 2. Orders */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Orders</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {dashboard?.cards.orders || 0}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Total orders count</span>
          </div>

          {/* 3. Items Sold */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Items Sold</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Tag className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {dashboard?.cards.itemsSold || 0}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sum of quantity</span>
          </div>

          {/* 4. Avg per Order */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Avg per Order</span>
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                <PieIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.avgPerOrder)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sales ÷ orders</span>
          </div>

          {/* 5. Best Day */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Best Day</span>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.bestDay?.sales)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">
              {dashboard?.cards.bestDay?.date ? formatDate(dashboard.cards.bestDay.date) : 'No sales'}
            </span>
          </div>

          {/* 6. Avg Daily Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Avg Daily</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.avgDailySales)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Per day in range</span>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Revenue line with 7-Day Moving Average overlay */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Revenue & 7-Day Moving Average
              </h3>
              <p className="text-xs text-slate-400 font-medium">Daily trend with trend smoothing</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard?.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={customTooltip} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Daily Sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAverage7Day"
                    name="7-Day Moving Avg"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Cumulative Revenue (Area) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Cumulative Revenue</h3>
              <p className="text-xs text-slate-400 font-medium">Running total of revenue over selected range</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={customTooltip} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeSales"
                    name="Cumulative Sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 6: Orders Per Day / Period (Bar) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Orders Volume</h3>
              <p className="text-xs text-slate-400 font-medium">Transaction counts per {group}</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 11: Growth % (Bar) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Period-over-Period Growth</h3>
              <p className="text-xs text-slate-400 font-medium">
                {group === 'day' ? 'Day-over-day' : group === 'week' ? 'Week-over-week' : 'Month-over-month'} % growth
              </p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="growthPct" name="Growth %" radius={[4, 4, 0, 0]}>
                    {dashboard?.chartSeries?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={(entry.growthPct || 0) >= 0 ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 7: Product Sales (₹) & Units (Horizontal Bar) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Product Sales & Units</h3>
              <p className="text-xs text-slate-400 font-medium">Comparing units and revenue per product</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboard?.productTable}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    width={110}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="sales" name="Sales (₹)" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="units" name="Units Sold" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 10: Sales by Hour of Day (0 to 23) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sales by Hour of Day</h3>
              <p className="text-xs text-slate-400 font-medium">Peak operational customer hours (IST)</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={2} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="sales" name="Hourly Sales" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Product Breakdown Table & Payment / Staff Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Product Breakdown</h3>
          <p className="text-xs text-slate-400 font-medium mb-4">Volume, revenue and % share in selected range</p>

          {isDashLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : !dashboard?.productTable || dashboard.productTable.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No products recorded in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-1 font-semibold">Product</th>
                    <th className="pb-3 text-right font-semibold">Units Sold</th>
                    <th className="pb-3 text-right font-semibold">Total Revenue</th>
                    <th className="pb-3 text-right pr-1 font-semibold">% Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.productTable.map((p) => {
                    const totalSales = dashboard.cards.sales || 0;
                    const sharePct = totalSales > 0 ? (p.sales / totalSales) * 100 : 0;
                    return (
                      <tr key={p.productId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 pl-1 font-semibold text-slate-800 flex items-center gap-2">
                          <span>{p.productName}</span>
                          {p.isMixed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Mixed / Other
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-700">{p.units}</td>
                        <td className="py-3 text-right font-bold text-slate-900">{formatRupee(p.sales)}</td>
                        <td className="py-3 text-right pr-1 text-slate-500 font-medium">{sharePct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                    <td className="pt-3 pl-1">Total</td>
                    <td className="pt-3 text-right">{dashboard.cards.itemsSold}</td>
                    <td className="pt-3 text-right">{formatRupee(dashboard.cards.sales)}</td>
                    <td className="pt-3 text-right pr-1">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Payment Split & Sales by Partner (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Cash vs UPI Split</h3>
            <p className="text-xs text-slate-400 font-medium mb-3">Breakdown by payment method</p>

            {isDashLoading ? (
              <ChartSkeleton height={180} />
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard?.paymentSplit?.filter((item) => item.amount > 0)}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={4}
                    >
                      {dashboard?.paymentSplit?.map((entry) => (
                        <Cell key={entry.method} fill={PAYMENT_COLORS[entry.method] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatRupee(val), 'Amount']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={30}
                      formatter={(value) => {
                        const item = dashboard?.paymentSplit.find((p) => p.method === value);
                        return (
                          <span className="text-[11px] font-semibold text-slate-700">
                            {value}: {formatRupee(item?.amount)} ({item?.percentage || 0}%)
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Sales by Member */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Sales Collected by Partner
            </span>
            <div className="space-y-2">
              {dashboard?.memberSplit?.map((m) => (
                <div key={m.memberId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{m.memberName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatRupee(m.amount)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({m.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Sales Log (Search, Filter, Pagination, Edit, Delete) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Full Sales Log</h2>
            <p className="text-xs text-slate-400 font-medium">
              Showing page {logData?.pagination.page || 1} of {logData?.pagination.totalPages || 1} (
              {logData?.pagination.total || 0} total records)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes / products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden focus:bg-white w-48 transition"
              />
            </div>

            {/* Product Filter */}
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Products</option>
              {meta?.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Payments</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
            </select>

            {/* Member Filter */}
            <select
              value={memberFilter}
              onChange={(e) => {
                setMemberFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Partners</option>
              {meta?.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Log Table */}
        {isLogLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : !logData?.records || logData.records.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No sales records found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4">Received By</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logData.records.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                      {formatDate(sale.sale_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{sale.product_name || 'Product'}</span>
                        {sale.is_mixed && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Mixed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{sale.quantity}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatRupee(sale.total_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.payment_method === 'UPI'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                        }`}
                      >
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {sale.received_by_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium max-w-xs truncate">{sale.notes || '-'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(sale)}
                          title="Edit Sale"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeletingSale({
                              id: sale.id,
                              label: `Sale of ${sale.product_name} (${formatRupee(sale.total_amount)})`,
                            })
                          }
                          title="Delete Sale"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {logData && logData.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Page {logData.pagination.page} of {logData.pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= logData.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <SaleDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingSale(null);
        }}
        initialData={editingSale}
        onSuccessToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingSale}
        title="Delete Sale Record"
        message={`Are you sure you want to delete ${deletingSale?.label}? This will soft-delete the transaction and preserve audit history.`}
        confirmText="Delete Record"
        isDangerous={true}
        isLoading={deleteSaleMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingSale(null)}
      />
    </div>
  );
}
