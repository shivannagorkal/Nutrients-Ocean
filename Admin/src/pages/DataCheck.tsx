import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Filter,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useDataCheck, DataCheckIssue } from '../api/dataCheck';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import SaleDrawer from '../components/SaleDrawer';
import ExpenseDrawer from '../components/ExpenseDrawer';
import SettlementDrawer from '../components/SettlementDrawer';
import { SaleRecord } from '../api/sales';
import { ExpenseRecord } from '../api/expenses';
import { SettlementRecord } from '../api/settlements';

export default function DataCheck() {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [toastMessage, setToastMessage] = useState('');

  // Edit Drawer states
  const [saleDrawerOpen, setSaleDrawerOpen] = useState(false);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [settlementDrawerOpen, setSettlementDrawerOpen] = useState(false);

  const [saleToEdit, setSaleToEdit] = useState<SaleRecord | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null);
  const [settlementToEdit, setSettlementToEdit] = useState<SettlementRecord | null>(null);

  const { data, isLoading, isRefetching, refetch } = useDataCheck();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenEditDrawer = (issue: DataCheckIssue) => {
    if (!issue.record) return;

    if (issue.entity === 'sale') {
      setSaleToEdit(issue.record);
      setSaleDrawerOpen(true);
    } else if (issue.entity === 'expense') {
      setExpenseToEdit(issue.record);
      setExpenseDrawerOpen(true);
    } else if (issue.entity === 'settlement') {
      setSettlementToEdit(issue.record);
      setSettlementDrawerOpen(true);
    }
  };

  const filteredIssues = data?.issues.filter((issue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Data Quality & Anomaly Check</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Automated pure verification rules detecting duplicates, overpayments, pricing discrepancies, and gaps
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Re-scan Database</span>
        </button>
      </div>

      {/* Summary KPI Cards (3 Cards) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Errors */}
          <div
            onClick={() => setFilterSeverity('error')}
            className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex items-center gap-3.5 ${
              filterSeverity === 'error'
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
                : 'bg-white border-slate-200/80 hover:border-rose-200'
            }`}
          >
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {data?.summary.errors || 0}
              </div>
              <div className="text-xs font-bold text-rose-700">Errors (Action Required)</div>
            </div>
          </div>

          {/* 2. Warnings */}
          <div
            onClick={() => setFilterSeverity('warning')}
            className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex items-center gap-3.5 ${
              filterSeverity === 'warning'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
                : 'bg-white border-slate-200/80 hover:border-amber-200'
            }`}
          >
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {data?.summary.warnings || 0}
              </div>
              <div className="text-xs font-bold text-amber-700">Warnings (Review Suggested)</div>
            </div>
          </div>

          {/* 3. Info */}
          <div
            onClick={() => setFilterSeverity('info')}
            className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex items-center gap-3.5 ${
              filterSeverity === 'info'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200'
                : 'bg-white border-slate-200/80 hover:border-blue-200'
            }`}
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {data?.summary.info || 0}
              </div>
              <div className="text-xs font-bold text-blue-700">Informational Items</div>
            </div>
          </div>
        </div>
      )}

      {/* Issues List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Tabs Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                filterSeverity === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Anomalies ({data?.summary.total || 0})
            </button>
            <button
              onClick={() => setFilterSeverity('error')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                filterSeverity === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Errors ({data?.summary.errors || 0})
            </button>
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                filterSeverity === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Warnings ({data?.summary.warnings || 0})
            </button>
            <button
              onClick={() => setFilterSeverity('info')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                filterSeverity === 'info'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Info ({data?.summary.info || 0})
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredIssues?.length || 0} items
          </span>
        </div>

        {/* Issues List Content */}
        {isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : !filteredIssues || filteredIssues.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">All data quality rules pass cleanly</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No anomalies detected for the selected filter. Every transaction matches canonical integrity standards.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                      issue.severity === 'error'
                        ? 'bg-rose-50 text-rose-600'
                        : issue.severity === 'warning'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {issue.severity === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{issue.rule}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          issue.severity === 'error'
                            ? 'bg-rose-100 text-rose-800'
                            : issue.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                        {issue.entity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{issue.message}</p>
                  </div>
                </div>

                {issue.record && (
                  <button
                    onClick={() => handleOpenEditDrawer(issue)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 shadow-xs transition flex-shrink-0 self-start sm:self-auto"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Open in Drawer</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Drawers linked to problem rows */}
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
      <SettlementDrawer
        isOpen={settlementDrawerOpen}
        onClose={() => {
          setSettlementDrawerOpen(false);
          setSettlementToEdit(null);
        }}
        initialData={settlementToEdit}
        onSuccessToast={showToast}
      />
    </div>
  );
}
