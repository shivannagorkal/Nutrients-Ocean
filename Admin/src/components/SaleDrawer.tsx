import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from './Drawer';
import { useMetadata, Product } from '../api/meta';
import { useCreateSale, useUpdateSale, SaleRecord } from '../api/sales';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const saleFormSchema = z
  .object({
    sale_date: z.string().min(1, 'Date is required'),
    product_id: z.string().uuid('Please select a product'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(1000),
    price_per_item: z.coerce.number().min(0, 'Price cannot be negative').optional(),
    total_amount: z.coerce.number().min(0.01, 'Total amount must be greater than 0'),
    payment_method: z.enum(['UPI', 'Cash']),
    received_by: z.string().uuid('Please select who received payment'),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  })
  .superRefine((data, ctx) => {
    // When product is "Other", notes is required and min 3 chars
    // This will be checked with product name lookup
  });

interface SaleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SaleRecord | null;
  onSuccessToast?: (msg: string) => void;
}

export default function SaleDrawer({
  isOpen,
  onClose,
  initialData,
  onSuccessToast,
}: SaleDrawerProps) {
  const { user } = useAuth();
  const { data: meta } = useMetadata();
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();

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
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      sale_date: todayIST,
      product_id: '',
      quantity: 1,
      price_per_item: 0,
      total_amount: 0,
      payment_method: 'UPI' as 'UPI' | 'Cash',
      received_by: '',
      notes: '',
    },
  });

  const selectedProductId = watch('product_id');
  const quantity = watch('quantity');
  const pricePerItem = watch('price_per_item');
  const notesValue = watch('notes');

  const selectedProduct = meta?.products.find((p) => p.id === selectedProductId);
  const isOtherProduct = selectedProduct?.name.toLowerCase() === 'other';

  // Set initial form state or defaults
  useEffect(() => {
    if (initialData) {
      reset({
        sale_date: initialData.sale_date ? String(initialData.sale_date).slice(0, 10) : todayIST,
        product_id: initialData.product_id,
        quantity: initialData.quantity,
        price_per_item: initialData.price_per_item || 0,
        total_amount: initialData.total_amount,
        payment_method: initialData.payment_method,
        received_by: initialData.received_by,
        notes: initialData.notes || '',
      });
    } else {
      // Find current user's member ID
      const userMember = meta?.members.find((m) => m.name === user?.member);
      reset({
        sale_date: todayIST,
        product_id: meta?.products[0]?.id || '',
        quantity: 1,
        price_per_item: meta?.products[0]?.default_price || 0,
        total_amount: meta?.products[0]?.default_price || 0,
        payment_method: 'UPI',
        received_by: userMember ? userMember.id : meta?.members[0]?.id || '',
        notes: '',
      });
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialData, isOpen, meta, user, reset]);

  // When product changes, auto-suggest price and total
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setValue('product_id', prodId);
    const prod = meta?.products.find((p) => p.id === prodId);
    if (prod) {
      const unitPrice = prod.default_price;
      setValue('price_per_item', unitPrice);
      setValue('total_amount', Number(quantity || 1) * unitPrice);
    }
  };

  // When quantity or unit price changes, auto-suggest total_amount
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = parseInt(e.target.value, 10) || 1;
    setValue('quantity', q);
    setValue('total_amount', q * Number(pricePerItem || 0));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = parseFloat(e.target.value) || 0;
    setValue('price_per_item', p);
    setValue('total_amount', Number(quantity || 1) * p);
  };

  const onSubmit = async (values: any) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (isOtherProduct && (!values.notes || values.notes.trim().length < 3)) {
      setErrorMessage('Notes are required (minimum 3 characters) when product is "Other"');
      return;
    }

    const payload = {
      ...values,
      sale_date: values.sale_date ? String(values.sale_date).slice(0, 10) : values.sale_date,
    };

    try {
      if (initialData) {
        await updateSaleMutation.mutateAsync({ id: initialData.id, data: payload });
        onSuccessToast?.('Sale record updated successfully');
        onClose();
      } else {
        await createSaleMutation.mutateAsync(payload);
        onSuccessToast?.('Sale recorded successfully');
        if (addAnother) {
          setSuccessMessage('Sale recorded. Ready for next entry.');
          setValue('quantity', 1);
          setValue('notes', '');
          const prod = meta?.products.find((p) => p.id === values.product_id);
          if (prod) {
            setValue('total_amount', prod.default_price);
          }
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save sale record');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Sale Record' : 'Record New Sale'}
      subtitle={initialData ? `ID: ${initialData.id.slice(0, 8)}...` : 'Enter customer order details'}
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

        {/* Sale Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
          <input
            type="date"
            {...register('sale_date')}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errors.sale_date && (
            <p className="text-red-500 text-[11px] mt-1">{errors.sale_date.message as string}</p>
          )}
        </div>

        {/* Product Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
          <select
            value={selectedProductId}
            onChange={handleProductChange}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {meta?.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.default_price > 0 ? `(₹${p.default_price})` : ''}
              </option>
            ))}
          </select>
          {errors.product_id && (
            <p className="text-red-500 text-[11px] mt-1">{errors.product_id.message as string}</p>
          )}
        </div>

        {/* Quantity and Price Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              max="1000"
              {...register('quantity', { valueAsNumber: true })}
              onChange={handleQuantityChange}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.quantity && (
              <p className="text-red-500 text-[11px] mt-1">{errors.quantity.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Price per item (₹)</label>
            <input
              type="number"
              step="0.01"
              {...register('price_per_item', { valueAsNumber: true })}
              onChange={handlePriceChange}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.price_per_item && (
              <p className="text-red-500 text-[11px] mt-1">{errors.price_per_item.message as string}</p>
            )}
          </div>
        </div>

        {/* Total Amount Received (Source of Truth!) */}
        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <label className="block text-xs font-bold text-emerald-900 mb-1">
            Total Amount Received (₹) <span className="font-normal text-[11px] text-emerald-700">— Source of Truth</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('total_amount', { valueAsNumber: true })}
            className="w-full text-sm font-bold px-3 py-2 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-900"
          />
          <p className="text-[10px] text-emerald-600 mt-1">
            Auto-suggested from quantity × price, but freely editable if customer paid a different amount.
          </p>
          {errors.total_amount && (
            <p className="text-red-500 text-[11px] mt-1">{errors.total_amount.message as string}</p>
          )}
        </div>

        {/* Payment Method and Received By */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              {...register('payment_method')}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Received By</label>
            <select
              {...register('received_by')}
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes {isOtherProduct && <span className="text-red-500">* (Required for "Other")</span>}
          </label>
          <textarea
            rows={3}
            placeholder={isOtherProduct ? 'Enter item details for this mixed order (required)' : 'Optional notes...'}
            {...register('notes')}
            className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 ${
              isOtherProduct && (!notesValue || notesValue.trim().length < 3)
                ? 'border-amber-300 focus:ring-amber-500'
                : 'border-slate-200 focus:ring-emerald-500'
            }`}
          />
          {errors.notes && (
            <p className="text-red-500 text-[11px] mt-1">{errors.notes.message as string}</p>
          )}
        </div>

        {/* Quick Add Another Toggle */}
        {!initialData && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="addAnotherSale"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="addAnotherSale" className="text-xs text-slate-600 font-medium select-none">
              Keep open to add another sale
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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{initialData ? 'Update Sale' : 'Save Sale'}</span>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
