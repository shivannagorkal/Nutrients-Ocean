import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from './Drawer';
import { useMetadata } from '../api/meta';
import { useCreateExpense, useUpdateExpense, ExpenseRecord } from '../api/expenses';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const expenseFormSchema = z.object({
  expense_date: z.string().min(1, 'Date is required'),
  expense_type: z.enum(['Regular Business Expense', 'Initial Investment']),
  category_id: z.string().uuid('Please select a category'),
  description: z.string().trim().min(1, 'Description cannot be empty').max(200, 'Max 200 characters'),
  amount: z.coerce.number().min(0.01, 'Amount must be at least ₹0.01'),
  payment_method: z.enum(['UPI', 'Cash', 'Personal Payment']),
  paid_by: z.string().uuid('Please select who paid'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

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

  const [addAnother, setAddAnother] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const todayIST = format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_date: todayIST,
      expense_type: 'Regular Business Expense' as 'Regular Business Expense' | 'Initial Investment',
      category_id: '',
      description: '',
      amount: 0,
      payment_method: 'UPI' as 'UPI' | 'Cash' | 'Personal Payment',
      paid_by: '',
      notes: '',
    },
  });

  const selectedType = watch('expense_type');

  useEffect(() => {
    if (initialData) {
      reset({
        expense_date: initialData.expense_date ? String(initialData.expense_date).slice(0, 10) : todayIST,
        expense_type: initialData.expense_type,
        category_id: initialData.category_id,
        description: initialData.description,
        amount: initialData.amount,
        payment_method: initialData.payment_method,
        paid_by: initialData.paid_by,
        notes: initialData.notes || '',
      });
    } else {
      const userMember = meta?.members.find((m) => m.name === user?.member);
      reset({
        expense_date: todayIST,
        expense_type: 'Regular Business Expense',
        category_id: meta?.categories[0]?.id || '',
        description: '',
        amount: 0,
        payment_method: 'UPI',
        paid_by: userMember ? userMember.id : meta?.members[0]?.id || '',
        notes: '',
      });
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialData, isOpen, meta, user, reset]);

  // Section 6.9: "If Expense Type is Initial Investment, Category defaults to Other and payment method to Personal Payment."
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'Regular Business Expense' | 'Initial Investment';
    setValue('expense_type', val);
    if (val === 'Initial Investment') {
      const otherCat = meta?.categories.find((c) => c.name.toLowerCase() === 'other');
      if (otherCat) {
        setValue('category_id', otherCat.id);
      }
      setValue('payment_method', 'Personal Payment');
    }
  };

  const onSubmit = async (values: any) => {
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      ...values,
      expense_date: values.expense_date ? String(values.expense_date).slice(0, 10) : values.expense_date,
    };

    try {
      if (initialData) {
        await updateExpenseMutation.mutateAsync({ id: initialData.id, data: payload });
        onSuccessToast?.('Expense record updated successfully');
        onClose();
      } else {
        await createExpenseMutation.mutateAsync(payload);
        onSuccessToast?.('Expense recorded successfully');
        if (addAnother) {
          setSuccessMessage('Expense recorded. Ready for next entry.');
          setValue('description', '');
          setValue('amount', 0);
          setValue('notes', '');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save expense record');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Expense Record' : 'Record New Expense'}
      subtitle={
        initialData
          ? `ID: ${initialData.id.slice(0, 8)}...`
          : 'Log operational spending or initial capital investment'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {/* Date and Expense Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              {...register('expense_date')}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Type</label>
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Regular Business Expense">Regular Business Expense</option>
              <option value="Initial Investment">Initial Investment</option>
            </select>
          </div>
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
          <select
            {...register('category_id')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {meta?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-red-500 text-[11px] mt-1">{errors.category_id.message as string}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <input
            type="text"
            placeholder="e.g. Fresh strawberries, Stall maintenance repair"
            {...register('description')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.description && (
            <p className="text-red-500 text-[11px] mt-1">{errors.description.message as string}</p>
          )}
        </div>

        {/* Amount */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="block text-xs font-bold text-slate-800 mb-1">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
            className="w-full text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
          {errors.amount && (
            <p className="text-red-500 text-[11px] mt-1">{errors.amount.message as string}</p>
          )}
        </div>

        {/* Payment Method and Paid By */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              {...register('payment_method')}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Personal Payment">Personal Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
            <select
              {...register('paid_by')}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {meta?.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Optional additional notes..."
            {...register('notes')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Quick Add Another Toggle */}
        {!initialData && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addAnotherExpense"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="addAnotherExpense" className="text-xs text-slate-600 font-medium select-none">
              Keep open to add another expense
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{initialData ? 'Update Expense' : 'Save Expense'}</span>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
