import React, { useEffect, useState } from 'react';
import Drawer from './Drawer';
import { useMetadata } from '../api/meta';
import { useCreateExpense, useUpdateExpense, useCreateExpenseBill, ExpenseRecord } from '../api/expenses';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Plus, Trash2, Receipt } from 'lucide-react';

interface ExpenseLineItem {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  notes: string;
}

interface ExpenseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ExpenseRecord | null;
  onSuccessToast?: (msg: string) => void;
}

export default function ExpenseDrawer({
  isOpen,
  onClose,
  initialData,
  onSuccessToast,
}: ExpenseDrawerProps) {
  const { user } = useAuth();
  const { data: meta } = useMetadata();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const createExpenseBillMutation = useCreateExpenseBill();

  const todayIST = format(new Date(), 'yyyy-MM-dd');

  // Header State
  const [expenseDate, setExpenseDate] = useState(todayIST);
  const [expenseType, setExpenseType] = useState<'Regular Business Expense' | 'Initial Investment'>(
    'Regular Business Expense'
  );
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Personal Payment'>('UPI');
  const [paidBy, setPaidBy] = useState('');
  const [billNotes, setBillNotes] = useState('');

  // Multi-Item Lines
  const [items, setItems] = useState<ExpenseLineItem[]>([]);
  const [addAnother, setAddAnother] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(false);

    if (initialData) {
      // Edit existing single expense
      setExpenseDate(initialData.expense_date ? String(initialData.expense_date).slice(0, 10) : todayIST);
      setExpenseType(initialData.expense_type);
      setPaymentMethod(initialData.payment_method);
      setPaidBy(initialData.paid_by);
      setBillNotes(initialData.notes || '');

      setItems([
        {
          id: initialData.id,
          category_id: initialData.category_id,
          description: initialData.description,
          amount: initialData.amount,
          notes: initialData.notes || '',
        },
      ]);
    } else {
      // New multi-line expense bill
      setExpenseDate(todayIST);
      setExpenseType('Regular Business Expense');
      setPaymentMethod('UPI');
      setBillNotes('');

      const userMember = meta?.members.find((m) => m.name === user?.member);
      setPaidBy(userMember ? userMember.id : meta?.members[0]?.id || '');

      const defaultCategory = meta?.categories[0];
      setItems([
        {
          id: `exp-${Date.now()}-1`,
          category_id: defaultCategory ? defaultCategory.id : '',
          description: '',
          amount: 0,
          notes: '',
        },
      ]);
    }
  }, [initialData, isOpen, meta, user, todayIST]);

  // Handle Type Change rule: "If Expense Type is Initial Investment, Category defaults to Other and payment method to Personal Payment."
  const handleTypeChange = (type: 'Regular Business Expense' | 'Initial Investment') => {
    setExpenseType(type);
    if (type === 'Initial Investment') {
      setPaymentMethod('Personal Payment');
      const otherCat = meta?.categories.find((c) => c.name.toLowerCase() === 'other');
      if (otherCat) {
        setItems((prev) => prev.map((it) => ({ ...it, category_id: otherCat.id })));
      }
    }
  };

  // Add line item
  const handleAddItem = () => {
    const defaultCategory = meta?.categories[0];
    setItems((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}-${prev.length + 1}`,
        category_id: defaultCategory ? defaultCategory.id : '',
        description: '',
        amount: 0,
        notes: '',
      },
    ]);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update line category
  const handleCategoryChange = (index: number, categoryId: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, category_id: categoryId } : it))
    );
  };

  // Update line description
  const handleDescriptionChange = (index: number, description: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, description } : it))
    );
  };

  // Update line amount
  const handleAmountChange = (index: number, amount: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, amount: Math.max(0, amount) } : it))
    );
  };

  // Compute bill total
  const billTotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!paidBy) {
      setErrorMessage('Please select who paid for this expense');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Bill must contain at least one expense line');
      return;
    }

    // Validate line items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.category_id) {
        setErrorMessage(`Please select a category for expense item #${i + 1}`);
        return;
      }
      if (!it.description.trim()) {
        setErrorMessage(`Description cannot be empty for item #${i + 1}`);
        return;
      }
      if (Number(it.amount) <= 0) {
        setErrorMessage(`Amount must be greater than ₹0 for item #${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        // Edit existing single expense
        const item = items[0];
        const payload = {
          expense_date: expenseDate,
          expense_type: expenseType,
          category_id: item.category_id,
          description: item.description.trim(),
          amount: Number(item.amount),
          payment_method: paymentMethod,
          paid_by: paidBy,
          notes: item.notes || billNotes || null,
        };
        await updateExpenseMutation.mutateAsync({ id: initialData.id, data: payload });
        onSuccessToast?.('Expense record updated successfully');
        onClose();
      } else {
        // Multi-line expense bill
        const payload = {
          expense_date: expenseDate,
          expense_type: expenseType,
          payment_method: paymentMethod,
          paid_by: paidBy,
          notes: billNotes.trim() || null,
          items: items.map((it) => ({
            category_id: it.category_id,
            description: it.description.trim(),
            amount: Number(it.amount),
            notes: it.notes || null,
          })),
        };

        const result: any = await createExpenseBillMutation.mutateAsync(payload);
        const receiptMsg = `Expense Bill #${result.receipt_number || 'SAVED'} recorded successfully (${result.items_count || items.length} lines • ₹${billTotal.toFixed(2)})`;
        onSuccessToast?.(receiptMsg);

        if (addAnother) {
          setSuccessMessage(receiptMsg + '. Ready for next entry.');
          setBillNotes('');
          const defaultCategory = meta?.categories[0];
          setItems([
            {
              id: `exp-${Date.now()}-1`,
              category_id: defaultCategory ? defaultCategory.id : '',
              description: '',
              amount: 0,
              notes: '',
            },
          ]);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save expense bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Expense Record' : 'Record Expense Bill'}
      subtitle={initialData ? `ID: ${initialData.id.slice(0, 8)}...` : 'Multi-Line Expense Entry'}
      width="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Date & Expense Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Type</label>
            <select
              value={expenseType}
              onChange={(e) =>
                handleTypeChange(e.target.value as 'Regular Business Expense' | 'Initial Investment')
              }
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="Regular Business Expense">Regular Business</option>
              <option value="Initial Investment">Initial Investment</option>
            </select>
          </div>
        </div>

        {/* Paid By & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select Partner</option>
              {meta?.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Personal Payment">Personal Payment</option>
            </select>
          </div>
        </div>

        {/* Dynamic Expense Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-emerald-600" />
              Expense Items ({items.length})
            </label>
            {!initialData && (
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Line
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <div
                key={it.id || idx}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 w-full min-w-0 box-border overflow-hidden"
              >
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="shrink-0 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    #{idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <select
                      value={it.category_id}
                      onChange={(e) => handleCategoryChange(idx, e.target.value)}
                      className="w-full min-w-0 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold truncate block"
                      required
                    >
                      <option value="">Select Category</option>
                      {meta?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {items.length > 1 && !initialData && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 items-center w-full min-w-0">
                  <div className="col-span-2 min-w-0">
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                      placeholder="Item description (e.g. Rolled Oats 5kg)"
                      className="w-full min-w-0 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="any"
                        value={it.amount || ''}
                        onChange={(e) => handleAmountChange(idx, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full min-w-0 text-xs pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!initialData && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full mt-2 py-2 text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> ＋ Add Another Expense Line
            </button>
          )}
        </div>

        {/* General Bill Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Notes / Vendor (Optional)</label>
          <input
            type="text"
            value={billNotes}
            onChange={(e) => setBillNotes(e.target.value)}
            placeholder="e.g. D-Mart weekly grocery run"
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Sticky Action Footer on Mobile */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 -mx-5 px-5 sm:-mx-6 sm:px-6 shadow-xs">
          <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between mb-2.5">
            <div>
              <span className="text-xs text-slate-500 font-medium">Bill Total</span>
              <div className="text-xs font-bold text-slate-700">
                {items.length} expense line{items.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">Grand Total</span>
              <div className="text-lg font-black text-rose-700">
                ₹{billTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {!initialData && (
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="checkbox"
                id="addAnotherExpense"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="addAnotherExpense" className="text-xs text-slate-600 select-none cursor-pointer">
                Add another bill immediately after saving
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || billTotal <= 0}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              'Saving Bill...'
            ) : initialData ? (
              `Update Expense • ₹${billTotal.toFixed(2)}`
            ) : (
              `Save Expense Bill (${items.length} line${items.length > 1 ? 's' : ''}) • ₹${billTotal.toFixed(2)}`
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
