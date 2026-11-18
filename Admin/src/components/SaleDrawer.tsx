import React, { useEffect, useState } from 'react';
import Drawer from './Drawer';
import { useMetadata, Product } from '../api/meta';
import { useCreateSale, useUpdateSale, useCreateSaleOrder, SaleRecord } from '../api/sales';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Plus, Minus, Trash2, ShoppingBag, User, Phone } from 'lucide-react';

interface OrderLineItem {
  id: string; // client temporary id
  product_id: string;
  quantity: number;
  price_per_item: number;
  total_amount: number;
  notes: string;
}

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
  const createSaleOrderMutation = useCreateSaleOrder();

  const todayIST = format(new Date(), 'yyyy-MM-dd');

  // Common Header State
  const [saleDate, setSaleDate] = useState(todayIST);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash'>('UPI');
  const [receivedBy, setReceivedBy] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Multi-Item State
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [addAnother, setAddAnother] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(false);

    if (initialData) {
      // Editing existing single sale record
      setSaleDate(initialData.sale_date ? String(initialData.sale_date).slice(0, 10) : todayIST);
      setPaymentMethod(initialData.payment_method);
      setReceivedBy(initialData.received_by);
      setCustomerName(initialData.customer_name || '');
      setCustomerPhone(initialData.customer_phone || '');
      setOrderNotes(initialData.notes || '');

      setItems([
        {
          id: initialData.id,
          product_id: initialData.product_id,
          quantity: initialData.quantity,
          price_per_item: initialData.price_per_item || 0,
          total_amount: initialData.total_amount,
          notes: initialData.notes || '',
        },
      ]);
    } else {
      // New multi-item order by default
      setSaleDate(todayIST);
      setPaymentMethod('UPI');
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');

      const userMember = meta?.members.find((m) => m.name === user?.member);
      setReceivedBy(userMember ? userMember.id : meta?.members[0]?.id || '');

      const defaultProduct = meta?.products[0];
      setItems([
        {
          id: `item-${Date.now()}-1`,
          product_id: defaultProduct ? defaultProduct.id : '',
          quantity: 1,
          price_per_item: defaultProduct ? defaultProduct.default_price : 0,
          total_amount: defaultProduct ? defaultProduct.default_price : 0,
          notes: '',
        },
      ]);
    }
  }, [initialData, isOpen, meta, user, todayIST]);

  // Add a new line item row
  const handleAddItem = () => {
    const defaultProduct = meta?.products[0];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        product_id: defaultProduct ? defaultProduct.id : '',
        quantity: 1,
        price_per_item: defaultProduct ? defaultProduct.default_price : 0,
        total_amount: defaultProduct ? defaultProduct.default_price : 0,
        notes: '',
      },
    ]);
  };

  // Remove a line item row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return; // Keep at least 1 item
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update item product
  const handleProductChange = (index: number, productId: string) => {
    const product = meta?.products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const unitPrice = product ? product.default_price : it.price_per_item;
        return {
          ...it,
          product_id: productId,
          price_per_item: unitPrice,
          total_amount: it.quantity * unitPrice,
        };
      })
    );
  };

  // Update item quantity
  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          quantity: validQty,
          total_amount: validQty * it.price_per_item,
        };
      })
    );
  };

  // Update item unit price
  const handlePriceChange = (index: number, price: number) => {
    const validPrice = Math.max(0, price);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          price_per_item: validPrice,
          total_amount: it.quantity * validPrice,
        };
      })
    );
  };

  // Update item notes
  const handleItemNotesChange = (index: number, notes: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, notes } : it))
    );
  };

  // Compute grand total
  const grandTotal = items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!receivedBy) {
      setErrorMessage('Please select who received payment');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Order must contain at least one item');
      return;
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_id) {
        setErrorMessage(`Please select a product for item #${i + 1}`);
        return;
      }
      const prod = meta?.products.find((p) => p.id === it.product_id);
      if (prod?.name.toLowerCase() === 'other' && (!it.notes || it.notes.trim().length < 3)) {
        setErrorMessage(`Item #${i + 1} (${prod.name}) requires notes (min 3 characters)`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        // Edit existing single sale
        const item = items[0];
        const payload = {
          sale_date: saleDate,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_item: item.price_per_item,
          total_amount: item.total_amount,
          payment_method: paymentMethod,
          received_by: receivedBy,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          notes: item.notes || orderNotes || null,
        };
        await updateSaleMutation.mutateAsync({ id: initialData.id, data: payload });
        onSuccessToast?.('Sale record updated successfully');
        onClose();
      } else {
        // Create multi-item order
        const payload = {
          sale_date: saleDate,
          payment_method: paymentMethod,
          received_by: receivedBy,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          notes: orderNotes.trim() || null,
          items: items.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            price_per_item: it.price_per_item,
            total_amount: it.total_amount,
            notes: it.notes || null,
          })),
        };

        const result: any = await createSaleOrderMutation.mutateAsync(payload);
        const receiptMsg = `Order #${result.receipt_number || 'SAVED'} recorded successfully (${result.items_count || items.length} items • ₹${grandTotal.toFixed(2)})`;
        onSuccessToast?.(receiptMsg);

        if (addAnother) {
          setSuccessMessage(receiptMsg + '. Ready for next entry.');
          setCustomerName('');
          setCustomerPhone('');
          setOrderNotes('');
          const defaultProduct = meta?.products[0];
          setItems([
            {
              id: `item-${Date.now()}-1`,
              product_id: defaultProduct ? defaultProduct.id : '',
              quantity: 1,
              price_per_item: defaultProduct ? defaultProduct.default_price : 0,
              total_amount: defaultProduct ? defaultProduct.default_price : 0,
              notes: '',
            },
          ]);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save order record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Sale Record' : 'Record Stall Order'}
      subtitle={initialData ? `ID: ${initialData.id.slice(0, 8)}...` : 'Multi-Item Order Entry'}
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

        {/* Order Header: Date & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`text-xs py-2 px-3 rounded-lg font-bold border transition-colors ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`text-xs py-2 px-3 rounded-lg font-bold border transition-colors ${
                  paymentMethod === 'Cash'
                    ? 'bg-sky-100 border-sky-400 text-sky-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
        </div>

        {/* Received By Partner */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Received By</label>
          <select
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          >
            <option value="">Select Partner / Member</option>
            {meta?.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Details (Optional) */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3 text-slate-400" /> Customer Details (Optional)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Mobile (e.g. 9876543210)"
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Order Items List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
              Order Items ({items.length})
            </label>
            {!initialData && (
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {items.map((it, idx) => {
              const selectedProd = meta?.products.find((p) => p.id === it.product_id);
              const isOther = selectedProd?.name.toLowerCase() === 'other';

              return (
                <div
                  key={it.id || idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 w-full min-w-0 box-border overflow-hidden"
                >
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <select
                        value={it.product_id}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold truncate block"
                        required
                      >
                        <option value="">Select Product</option>
                        {meta?.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.default_price > 0 ? `(₹${p.default_price})` : ''}
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

                  {/* Quantity & Unit Price & Subtotal */}
                  <div className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs w-full min-w-0">
                    {/* Qty Stepper */}
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-medium block mb-0.5">Quantity</span>
                      <div className="inline-flex items-center bg-white border border-slate-200 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, it.quantity - 1)}
                          className="px-1.5 py-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 py-0.5 font-bold text-center min-w-[18px]">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, it.quantity + 1)}
                          className="px-1.5 py-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-medium block mb-0.5">Price (₹)</span>
                      <input
                        type="number"
                        step="any"
                        value={it.price_per_item}
                        onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full min-w-0 text-xs px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-0">
                      <span className="text-[10px] text-slate-500 font-medium block mb-0.5">Line Total</span>
                      <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
                        ₹{(it.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Line Notes (required if product is 'Other') */}
                  {isOther && (
                    <div>
                      <input
                        type="text"
                        value={it.notes}
                        onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                        placeholder="Description / Notes (Required for 'Other')"
                        className="w-full text-xs px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-md text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!initialData && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full mt-2 py-2 text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> ＋ Add Another Item to this Order
            </button>
          )}
        </div>

        {/* General Order Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Order Notes (Optional)</label>
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. Less sugar, extra berries"
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Sticky Action Footer on Mobile */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 -mx-5 px-5 sm:-mx-6 sm:px-6 shadow-xs">
          <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between mb-2.5">
            <div>
              <span className="text-xs text-slate-500 font-medium">Order Total</span>
              <div className="text-xs font-bold text-slate-700">
                {items.length} item{items.length > 1 ? 's' : ''} ({totalUnits} unit{totalUnits > 1 ? 's' : ''})
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">Grand Total</span>
              <div className="text-lg font-black text-emerald-700">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {!initialData && (
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="checkbox"
                id="addAnotherOrder"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="addAnotherOrder" className="text-xs text-slate-600 select-none cursor-pointer">
                Add another order immediately after saving
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || grandTotal <= 0}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              'Saving Order...'
            ) : initialData ? (
              `Update Sale • ₹${grandTotal.toFixed(2)}`
            ) : (
              `Save Order (${items.length} item${items.length > 1 ? 's' : ''}) • ₹${grandTotal.toFixed(2)}`
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
