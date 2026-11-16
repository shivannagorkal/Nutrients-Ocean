import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from './Drawer';
import { useMetadata } from '../api/meta';
import { useCreateSettlement, useUpdateSettlement, SettlementRecord } from '../api/settlements';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const settlementFormSchema = z
  .object({
    settlement_date: z.string().min(1, 'Date is required'),
    paid_by: z.string().uuid('Please select who paid'),
    paid_to: z.string().uuid('Please select who was reimbursed'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  })
  .refine((data) => data.paid_by !== data.paid_to, {
    message: 'Paid By and Paid To cannot be the same member',
    path: ['paid_to'],
  });

interface SettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SettlementRecord | null;
  onSuccessToast?: (msg: string) => void;
}

export default function SettlementDrawer({
  isOpen,
  onClose,
  initialData,
  onSuccessToast,
}: SettlementDrawerProps) {
  const { data: meta } = useMetadata();
  const createSettlementMutation = useCreateSettlement();
  const updateSettlementMutation = useUpdateSettlement();

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const todayIST = format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      settlement_date: todayIST,
      paid_by: '',
      paid_to: '',
      amount: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        settlement_date: initialData.settlement_date ? String(initialData.settlement_date).slice(0, 10) : todayIST,
        paid_by: initialData.paid_by,
        paid_to: initialData.paid_to,
        amount: initialData.amount,
        notes: initialData.notes || '',
      });
    } else {
      reset({
        settlement_date: todayIST,
        paid_by: meta?.members[0]?.id || '',
        paid_to: meta?.members[1]?.id || '',
        amount: 0,
        notes: '',
      });
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialData, isOpen, meta, reset]);

  const onSubmit = async (values: any) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (values.paid_by === values.paid_to) {
      setErrorMessage('Paid By and Paid To cannot be the same member');
      return;
    }

    const payload = {
      ...values,
      settlement_date: values.settlement_date ? String(values.settlement_date).slice(0, 10) : values.settlement_date,
    };

    try {
      if (initialData) {
        await updateSettlementMutation.mutateAsync({ id: initialData.id, data: payload });
        onSuccessToast?.('Settlement updated successfully');
        onClose();
      } else {
        await createSettlementMutation.mutateAsync(payload);
        onSuccessToast?.('Settlement recorded successfully');
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settlement');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Settlement' : 'Record Reimbursement / Settlement'}
      subtitle="Record partner repayments and personal expense settlements"
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

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
          <input
            type="date"
            {...register('settlement_date')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Paid By and Paid To */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By (Payer)</label>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid To (Recipient)</label>
            <select
              {...register('paid_to')}
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
        {errors.paid_to && (
          <p className="text-red-500 text-[11px] mt-1">{errors.paid_to.message as string}</p>
        )}

        {/* Amount */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="block text-xs font-bold text-slate-800 mb-1">Amount Reimbursed (₹)</label>
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

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. Reimbursement for Oct 25 - Nov 5 ingredients"
            {...register('notes')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{initialData ? 'Update Settlement' : 'Save Settlement'}</span>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
