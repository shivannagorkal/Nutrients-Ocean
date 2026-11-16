import React, { useState } from 'react';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
  PieChart as PieIcon,
  Tag,
  Receipt,
  User,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { useToday, getTodayISTDate, MetricComparison } from '../api/today';
import { useDeleteSale, SaleRecord } from '../api/sales';
import { useDeleteExpense, ExpenseRecord } from '../api/expenses';
import { formatRupee, formatDate } from '../lib/format';
import { CardSkeleton, TableSkeleton, ChartSkeleton } from '../components/Skeleton';
import SaleDrawer from '../components/SaleDrawer';
import ExpenseDrawer from '../components/ExpenseDrawer';
import ConfirmDialog from '../components/ConfirmDialog';

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function ComparisonChip({
  comparison,
  label,
  isCurrency = false,
}: {
  comparison?: MetricComparison;
  label: string;
  isCurrency?: boolean;
}) {
  if (!comparison) return null;

  const { diff, percentChange } = comparison;
  const isZero = diff === 0;
  const isPositive = diff > 0;

  const colorClasses = isZero
    ? 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
    : isPositive
    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
    : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50';

  const formattedDiff = isCurrency
    ? `${isPositive ? '+' : isZero ? '' : '-'}${formatRupee(Math.abs(diff))}`
    : `${isPositive ? '+' : ''}${diff}`;

  const pctText =
    percentChange !== null
      ? ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`
      : ' (new)';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${colorClasses}`}
      >
        {isZero ? (
          <Minus className="h-3 w-3" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{formattedDiff}</span>
        {!isZero && <span className="font-normal opacity-90">{pctText}</span>}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
    </div>
  );
}

export default function Today() {
  const todayIST = getTodayISTDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayIST);
  const [comparisonMode, setComparisonMode] = useState<'yesterday' | 'lastWeek'>('yesterday');
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');

  // Drawers & Dialogs
  const [saleDrawerOpen, setSaleDrawerOpen] = useState(false);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<SaleRecord | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'sale' | 'expense';
    id: string;
    label: string;
  }>({
    isOpen: false,
    type: 'sale',
    id: '',
    label: '',
  });

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Queries & Mutations
  const { data, isLoading, isError, error, refetch } = useToday(selectedDate);
  const deleteSaleMutation = useDeleteSale();
  const deleteExpenseMutation = useDeleteExpense();

  const isToday = selectedDate === todayIST;

  const handlePrevDay = () => {
    setSelectedDate((prev) => offsetDateStr(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => offsetDateStr(prev, 1));
  };

  const handleGoToToday = () => {
    setSelectedDate(todayIST);
  };

  const handleOpenSaleEdit = (sale: SaleRecord) => {
    setSaleToEdit(sale);
    setSaleDrawerOpen(true);
  };

  const handleOpenExpenseEdit = (expense: ExpenseRecord) => {
    setExpenseToEdit(expense);
    setExpenseDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteConfirm.type === 'sale') {
        await deleteSaleMutation.mutateAsync(deleteConfirm.id);
        showToast('Sale deleted successfully');
      } else {
        await deleteExpenseMutation.mutateAsync(deleteConfirm.id);
        showToast('Expense deleted successfully');
      }
      setDeleteConfirm({ isOpen: false, type: 'sale', id: '', label: '' });
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete record');
    }
  };

  // Payment method colors
  const PAYMENT_COLORS: Record<string, string> = {
    UPI: '#10b981', // emerald-500
    Cash: '#0284c7', // sky-600
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Date Navigation & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Today's Operations</h1>
            {isToday && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE TODAY
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational day summary & quick transaction entry (IST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker Controls */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-inner">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative flex items-center px-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400 mr-1.5 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                max={offsetDateStr(todayIST, 1)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>
            <button
              onClick={handleNextDay}
              title="Next Day"
              disabled={selectedDate >= offsetDateStr(todayIST, 1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Today
            </button>
          )}

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                setSaleToEdit(null);
                setSaleDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ Sale</span>
            </button>
            <button
              onClick={() => {
                setExpenseToEdit(null);
                setExpenseDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Switcher Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <span>Comparison Baseline:</span>
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setComparisonMode('yesterday')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                comparisonMode === 'yesterday'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              vs Yesterday ({data?.comparisons?.yesterday?.date || 'previous'})
            </button>
            <button
              onClick={() => setComparisonMode('lastWeek')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                comparisonMode === 'lastWeek'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              vs Same Day Last Week ({data?.comparisons?.lastWeek?.date || '7 days ago'})
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Error loading metrics: {(error as any)?.message || 'Internal server error'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Sales</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {formatRupee(data?.cards.sales)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.sales}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
                isCurrency
              />
              <span className="text-[10px] text-slate-400 font-medium">Money received</span>
            </div>
          </div>

          {/* 2. Orders */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Orders</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {data?.cards.orders || 0}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.orders}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
              />
              <span className="text-[10px] text-slate-400 font-medium">Total sales rows</span>
            </div>
          </div>

          {/* 3. Items Sold */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Items Sold</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Tag className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {data?.cards.itemsSold || 0}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.itemsSold}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
              />
              <span className="text-[10px] text-slate-400 font-medium">Sum of quantity</span>
            </div>
          </div>

          {/* 4. Avg per Order */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Avg Order</span>
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <PieIcon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {formatRupee(data?.cards.avgPerOrder)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.avgPerOrder}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
                isCurrency
              />
              <span className="text-[10px] text-slate-400 font-medium">Sales ÷ orders</span>
            </div>
          </div>

          {/* 5. Expenses */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Expenses</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {formatRupee(data?.cards.expenses)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.expenses}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
                isCurrency
              />
              <span className="text-[10px] text-slate-400 font-medium">Regular business only</span>
            </div>
          </div>

          {/* 6. Net */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Net Profit</span>
                <span
                  className={`p-1.5 rounded-lg ${
                    (data?.cards.net || 0) >= 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 mb-1">
                <span
                  className={`text-xl font-black tracking-tight ${
                    (data?.cards.net || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                  }`}
                >
                  {formatRupee(data?.cards.net)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonChip
                comparison={data?.comparisons[comparisonMode]?.net}
                label={comparisonMode === 'yesterday' ? 'vs yest' : 'vs last wk'}
                isCurrency
              />
              <span className="text-[10px] text-slate-400 font-medium">Sales − expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Net Disclaimer Note per Section 5 */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-slate-500 text-[11px] leading-relaxed">
        <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Note:</strong> {data?.cards.netNote || 'Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.'}
        </span>
      </div>

      {/* Middle Section: Product Breakdown & Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Breakdown Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Product Breakdown</h2>
              <p className="text-xs text-slate-400 font-medium">Sales volume and revenue per item</p>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : !data?.products || data.products.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No products sold on this date
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
                  {data.products.map((p) => {
                    const totalSales = data.cards.sales || 0;
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
                        <td className="py-3 text-right font-semibold text-slate-700">
                          {p.units}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          {formatRupee(p.sales)}
                        </td>
                        <td className="py-3 text-right pr-1 text-slate-500 font-medium">
                          {sharePct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                    <td className="pt-3 pl-1">Total</td>
                    <td className="pt-3 text-right">{data.cards.itemsSold}</td>
                    <td className="pt-3 text-right">{formatRupee(data.cards.sales)}</td>
                    <td className="pt-3 text-right pr-1">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Payment Split & Received-By Split (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Payment & Received By</h2>
            <p className="text-xs text-slate-400 font-medium mb-3">Cash vs UPI distribution</p>

            {isLoading ? (
              <ChartSkeleton height={180} />
            ) : !data?.paymentSplit || (data.cards.sales === 0 && data.paymentSplit.every((p) => p.amount === 0)) ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium">
                No payment transactions recorded
              </div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentSplit.filter((item) => item.amount > 0)}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={4}
                    >
                      {data.paymentSplit.map((entry) => (
                        <Cell
                          key={entry.method}
                          fill={PAYMENT_COLORS[entry.method] || '#64748b'}
                        />
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
                      formatter={(value, entry: any) => {
                        const item = data.paymentSplit.find((p) => p.method === value);
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

          {/* Received by breakdown */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Payment Received By
            </span>
            <div className="space-y-2">
              {data?.receivedBySplit?.map((m) => (
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

      {/* Bottom Section: Today's Transactions Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'sales'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Today's Sales</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'sales'
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {data?.sales?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'expenses'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Today's Expenses</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'expenses'
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {data?.expenses?.length || 0}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing records for <span className="font-semibold text-slate-700">{selectedDate}</span>
          </div>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : activeTab === 'sales' ? (
          // Sales Table
          !data?.sales || data.sales.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              No sales recorded for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Time</th>
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
                  {data.sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-400 font-medium whitespace-nowrap">
                        {sale.timestamp ? format(new Date(sale.timestamp), 'hh:mm a') : '-'}
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
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {sale.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatRupee(sale.total_amount)}
                      </td>
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
                      <td className="py-3 px-4 text-slate-500 font-medium max-w-xs truncate">
                        {sale.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenSaleEdit(sale)}
                            title="Edit Sale"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'sale',
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
          )
        ) : (
          // Expenses Table
          !data?.expenses || data.expenses.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              No expenses recorded for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Time</th>
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
                  {data.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-400 font-medium whitespace-nowrap">
                        {expense.timestamp ? format(new Date(expense.timestamp), 'hh:mm a') : '-'}
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
                            onClick={() => handleOpenExpenseEdit(expense)}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'expense',
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
          )
        )}
      </div>

      {/* Drawers */}
      <SaleDrawer
        isOpen={saleDrawerOpen}
        onClose={() => {
          setSaleDrawerOpen(false);
          setSaleToEdit(null);
        }}
        initialData={saleToEdit}
        onSuccessToast={showToast}
      />
      <ExpenseDrawer
        isOpen={expenseDrawerOpen}
        onClose={() => {
          setExpenseDrawerOpen(false);
          setExpenseToEdit(null);
        }}
        initialData={expenseToEdit}
        onSuccessToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type === 'sale' ? 'Sale Record' : 'Expense Record'}`}
        message={`Are you sure you want to delete ${deleteConfirm.label}? This will soft-delete the record and preserve audit history.`}
        confirmText="Delete Record"
        isDangerous={true}
        isLoading={deleteSaleMutation.isPending || deleteExpenseMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'sale', id: '', label: '' })}
      />
    </div>
  );
}
