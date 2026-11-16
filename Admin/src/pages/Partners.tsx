import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Info,
  DollarSign,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { usePartnersDashboard } from '../api/partners';
import { useDeleteSettlement, SettlementRecord } from '../api/settlements';
import { formatRupee, formatDate } from '../lib/format';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import SettlementDrawer from '../components/SettlementDrawer';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Partners() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<SettlementRecord | null>(null);
  const [deletingSettlement, setDeletingSettlement] = useState<{ id: string; label: string } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const { data, isLoading, refetch } = usePartnersDashboard();
  const deleteMutation = useDeleteSettlement();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleEdit = (settlement: SettlementRecord) => {
    setEditingSettlement(settlement);
    setIsDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSettlement) return;
    try {
      await deleteMutation.mutateAsync(deletingSettlement.id);
      showToast('Settlement record deleted successfully');
      setDeletingSettlement(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete settlement');
    }
  };

  const paybackPct = data?.payback?.percentage ?? 0;
  const isNetNegative = (data?.payback?.netAllTime ?? 0) < 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Partner Equity & Settlements</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Capital recovery progress, individual partner balances, and settlement ledger
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSettlement(null);
            setIsDrawerOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Settlement</span>
        </button>
      </div>

      {/* Payback Progress Bar & Estimated Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payback Progress Bar Card (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Capital Payback Progress (All Time)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Net profit towards total initial investment</p>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900">
                {isNetNegative ? '0.0%' : `${paybackPct.toFixed(1)}%`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 overflow-hidden my-4 border border-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  paybackPct >= 100
                    ? 'bg-emerald-500'
                    : isNetNegative
                    ? 'w-0'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, paybackPct))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Net Profit (All Time)</span>
              <span
                className={`text-sm font-black ${
                  (data?.payback?.netAllTime ?? 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatRupee(data?.payback?.netAllTime)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Total Investment</span>
              <span className="text-sm font-black text-slate-900">
                {formatRupee(data?.payback?.totalInvestment)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Remaining to Payback</span>
              <span className="text-sm font-black text-amber-700">
                {formatRupee(
                  Math.max(
                    0,
                    (data?.payback?.totalInvestment ?? 0) - Math.max(0, data?.payback?.netAllTime ?? 0)
                  )
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Estimated Revenue Balance Card (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Revenue Balance</h3>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Estimate
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Estimated cash in Shivanna's account</p>
                </div>
              </div>
            </div>

            <div className="my-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupee(data?.estimatedRevenueBalance?.estimatedBalance)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Total Sales:</span>
              <span className="font-bold text-slate-800">
                {formatRupee(data?.estimatedRevenueBalance?.totalSales)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>− Business-Paid Expenses:</span>
              <span className="font-bold text-rose-600">
                {formatRupee(data?.estimatedRevenueBalance?.businessPaidExpenses)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>− Total Reimbursed:</span>
              <span className="font-bold text-rose-600">
                {formatRupee(data?.estimatedRevenueBalance?.totalReimbursed)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium pt-2 italic leading-relaxed">
              All sale money is held in Shivanna’s account.
            </p>
          </div>
        </div>
      </div>

      {/* Per-Member Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-5">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Partner Balances</h3>
        <p className="text-xs text-slate-400 font-medium mb-4">
          Personal out-of-pocket contributions, reimbursements, and outstanding dues (All Time)
        </p>

        {isLoading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-1 font-semibold">Partner</th>
                  <th className="pb-3 text-right font-semibold">Invested</th>
                  <th className="pb-3 text-right font-semibold">Paid Personally</th>
                  <th className="pb-3 text-right font-semibold">Reimbursed</th>
                  <th className="pb-3 text-right pr-1 font-semibold">Still Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.partners?.map((partner) => (
                  <tr key={partner.memberId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 pl-1 font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {partner.memberName.charAt(0)}
                      </div>
                      <span>{partner.memberName}</span>
                    </td>
                    <td className="py-3.5 text-right font-semibold text-slate-700">
                      {formatRupee(partner.invested)}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-slate-700">
                      {formatRupee(partner.paidPersonally)}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-slate-700">
                      {formatRupee(partner.reimbursed)}
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      {partner.isOverpaid ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="font-bold text-rose-600">
                            {formatRupee(partner.stillOwed)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Overpaid
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900">
                          {formatRupee(partner.stillOwed)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlements Ledger List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Settlements Ledger</h3>
            <p className="text-xs text-slate-400 font-medium">Recorded reimbursements and transfers between partners</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {data?.settlements?.length || 0} total settlements
          </span>
        </div>

        {isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : !data?.settlements || data.settlements.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No settlement records found. Click "+ Settlement" to record a reimbursement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Paid By (Sender)</th>
                  <th className="py-3 px-4 text-center">Direction</th>
                  <th className="py-3 px-4">Paid To (Receiver)</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.settlements.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                      {formatDate(settlement.settlement_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {settlement.paid_by_name}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      <ArrowRight className="h-3.5 w-3.5 mx-auto" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {settlement.paid_to_name}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatRupee(settlement.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium max-w-xs truncate">
                      {settlement.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(settlement)}
                          title="Edit Settlement"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeletingSettlement({
                              id: settlement.id,
                              label: `Settlement of ${formatRupee(settlement.amount)} from ${
                                settlement.paid_by_name
                              } to ${settlement.paid_to_name}`,
                            })
                          }
                          title="Delete Settlement"
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
      </div>

      {/* Settlement Drawer */}
      <SettlementDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingSettlement(null);
        }}
        initialData={editingSettlement}
        onSuccessToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingSettlement}
        title="Delete Settlement Record"
        message={`Are you sure you want to delete ${deletingSettlement?.label}? This will soft-delete the transaction and restore partner balances.`}
        confirmText="Delete Record"
        isDangerous={true}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingSettlement(null)}
      />
    </div>
  );
}
