import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Tag,
  Info,
  DollarSign,
  User,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react';

import { useDateRange } from '../context/DateRangeContext';
import { useExpenses, useExpensesDashboard, useDeleteExpense, ExpenseRecord } from '../api/expenses';
import { useMetadata } from '../api/meta';
import { formatRupee, formatDate } from '../lib/format';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
import ExpenseDrawer from '../components/ExpenseDrawer';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORY_COLORS = [
  '#0284c7', // sky-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

const EXPENSE_PAYMENT_COLORS: Record<string, string> = {
  UPI: '#10b981',
  Cash: '#0284c7',
  'Personal Payment': '#8b5cf6',
};

export default function Expenses() {
  const { from, to, preset } = useDateRange();
  const { data: meta } = useMetadata();

  // Grouping state: 'day' | 'week' | 'month'
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day');

  // Filter and pagination states for log
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer & Dialog states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<{ id: string; label: string } | null>(null);
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
  } = useExpensesDashboard({ from, to, group });

  const {
    data: logData,
    isLoading: isLogLoading,
    refetch: refetchLog,
  } = useExpenses({
    from,
    to,
    category: categoryFilter || undefined,
    type: typeFilter || undefined,
    payment: paymentFilter || undefined,
    member: memberFilter || undefined,
    q: searchQuery || undefined,
    page,
    pageSize: 15,
  });

  const deleteExpenseMutation = useDeleteExpense();

  const handleEdit = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setIsDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpenseMutation.mutateAsync(deletingExpense.id);
      showToast('Expense record deleted successfully');
      setDeletingExpense(null);
      refetchDashboard();
      refetchLog();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense');
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
              <span className="font-bold">{formatRupee(entry.value)}</span>
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
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Expenses & Investments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {preset} ({from} to {to})
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Operating cost trends, category breakdowns, Net margins, and investment tracker
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
              setEditingExpense(null);
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Expense</span>
          </button>
        </div>
      </div>

      {/* Cards Grid (4 Cards per Section 6.5) */}
      {isDashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Expenses */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Expenses</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <Receipt className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.expenses)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Regular business only</span>
          </div>

          {/* 2. Total Investment */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Initial Investment</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.investmentTotal)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              All-time: {formatRupee(dashboard?.cards.investmentAllTime)}
            </span>
          </div>

          {/* 3. Net */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Net Profit</span>
              <span
                className={`p-1.5 rounded-lg ${
                  (dashboard?.cards.net || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span
                className={`text-xl font-black tracking-tight ${
                  (dashboard?.cards.net || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatRupee(dashboard?.cards.net)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sales − expenses in range</span>
          </div>

          {/* 4. Biggest Category */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Biggest Category</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Tag className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="my-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupee(dashboard?.cards.biggestCategory.amount)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">
              {dashboard?.cards.biggestCategory.categoryName} ({dashboard?.cards.biggestCategory.percentage}%)
            </span>
          </div>
        </div>
      )}

      {/* Net Disclaimer Note per Section 5 */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-slate-500 text-[11px] leading-relaxed">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Note:</strong>{' '}
          {dashboard?.cards.netNote ||
            'Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.'}
        </span>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 5: Sales vs Expenses by day/week/month (Grouped Bars) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sales vs Expenses</h3>
              <p className="text-xs text-slate-400 font-medium">Side-by-side revenue vs operating expenses per {group}</p>
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
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={customTooltip} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Daily Profit / Net (Bar, Green Positive and Red Negative) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Net Profit / Margin</h3>
              <p className="text-xs text-slate-400 font-medium">Positive profits in green, deficit days in red</p>
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
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                    {dashboard?.chartSeries?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry.net || 0) >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Cumulative Net Line with Payback Line */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Cumulative Net & Payback</h3>
              <p className="text-xs text-slate-400 font-medium">
                Running net profit against the total investment threshold
              </p>
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
                  {dashboard?.cards.investmentAllTime ? (
                    <ReferenceLine
                      y={dashboard.cards.investmentAllTime}
                      label={{
                        value: `Payback: ${formatRupee(dashboard.cards.investmentAllTime)}`,
                        position: 'insideTopRight',
                        fill: '#d97706',
                        fontSize: 10,
                      }}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="cumulativeNet"
                    name="Cumulative Net"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 9: Expenses by Category (Donut) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Expenses by Category</h3>
              <p className="text-xs text-slate-400 font-medium">Distribution across expense categories</p>
            </div>
          </div>
          {isDashLoading ? (
            <ChartSkeleton height={260} />
          ) : !dashboard?.categoryTable || dashboard.categoryTable.every((c) => c.amount === 0) ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-medium">
              No expenses recorded in this range.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard?.categoryTable.filter((c) => c.amount > 0)}
                    dataKey="amount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {dashboard?.categoryTable.map((entry, index) => (
                      <Cell key={entry.categoryId} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
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
                    height={36}
                    formatter={(value) => {
                      const item = dashboard?.categoryTable.find((c) => c.categoryName === value);
                      return (
                        <span className="text-[11px] font-semibold text-slate-700">
                          {value}: {formatRupee(item?.amount)} ({item?.percentage}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Investment List & Category Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Initial Investment List</h3>
              <p className="text-xs text-slate-400 font-medium">Capital investments per partner</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Total: {formatRupee(dashboard?.cards.investmentTotal)}
            </span>
          </div>

          {isDashLoading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : !dashboard?.investmentList || dashboard.investmentList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No initial investments recorded in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-1">Date</th>
                    <th className="pb-3">Partner</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-center">Payment</th>
                    <th className="pb-3 pr-1">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.investmentList.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 pl-1 font-semibold text-slate-700 whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{inv.memberName}</span>
                      </td>
                      <td className="py-3 text-right font-black text-slate-900">{formatRupee(inv.amount)}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 pr-1 text-slate-500 font-medium max-w-xs truncate">{inv.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses by Category Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Category Breakdown Table</h3>
              <p className="text-xs text-slate-400 font-medium">Operational expenditure per category</p>
            </div>
          </div>

          {isDashLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : !dashboard?.categoryTable || dashboard.categoryTable.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No expense categories recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-1">Category</th>
                    <th className="pb-3 text-center">Transactions</th>
                    <th className="pb-3 text-right">Total Amount</th>
                    <th className="pb-3 text-right pr-1">% Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.categoryTable.map((c) => (
                    <tr key={c.categoryId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 pl-1 font-semibold text-slate-800">{c.categoryName}</td>
                      <td className="py-3 text-center font-medium text-slate-600">{c.count}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{formatRupee(c.amount)}</td>
                      <td className="py-3 text-right pr-1 text-slate-500 font-medium">{c.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                    <td className="pt-3 pl-1">Total</td>
                    <td className="pt-3 text-center">
                      {dashboard.categoryTable.reduce((acc, c) => acc + c.count, 0)}
                    </td>
                    <td className="pt-3 text-right">{formatRupee(dashboard.cards.expenses)}</td>
                    <td className="pt-3 text-right pr-1">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Full Expense Log (Search, Filter, Pagination, Edit, Delete) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Full Expense Log</h2>
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
                placeholder="Search description / notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden focus:bg-white w-48 transition"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Categories</option>
              {meta?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-xs rounded-xl font-medium border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="Regular Business Expense">Regular Business</option>
              <option value="Initial Investment">Initial Investment</option>
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
              <option value="Personal Payment">Personal Payment</option>
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
            <TableSkeleton rows={6} cols={8} />
          </div>
        ) : !logData?.records || logData.records.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No expense records found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4">Paid By</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logData.records.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {expense.category_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate">
                      {expense.description}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatRupee(expense.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          expense.payment_method === 'Personal Payment'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            : expense.payment_method === 'UPI'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                        }`}
                      >
                        {expense.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {expense.paid_by_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          expense.expense_type === 'Initial Investment'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {expense.expense_type === 'Initial Investment' ? 'Investment' : 'Regular'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium max-w-xs truncate">
                      {expense.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          title="Edit Expense"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeletingExpense({
                              id: expense.id,
                              label: `Expense of ${expense.description} (${formatRupee(expense.amount)})`,
                            })
                          }
                          title="Delete Expense"
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
      <ExpenseDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingExpense(null);
        }}
        initialData={editingExpense}
        onSuccessToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Delete Expense Record"
        message={`Are you sure you want to delete ${deletingExpense?.label}? This will soft-delete the transaction and preserve audit history.`}
        confirmText="Delete Record"
        isDangerous={true}
        isLoading={deleteExpenseMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
}
