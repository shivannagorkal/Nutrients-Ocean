import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Truck,
  Check,
  RefreshCw,
  Search,
  Filter,
  Flame,
  ChevronRight,
  Package,
} from 'lucide-react';
import { useOrders, useUpdateOrderStatus, AdminOrder } from '../api/orders';
import { formatRupee } from '../lib/format';

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [slotFilter, setSlotFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: orders = [], isLoading, isRefetching, refetch } = useOrders({
    status: statusFilter,
    slot: slotFilter,
  });

  const updateStatusMutation = useUpdateOrderStatus();

  // Metrics
  const metrics = useMemo(() => {
    let received = 0;
    let preparing = 0;
    let ready = 0;
    let delivered = 0;
    let todayRevenuePaise = 0;

    orders.forEach((o) => {
      if (o.order_status === 'RECEIVED') received++;
      else if (o.order_status === 'PREPARING') preparing++;
      else if (o.order_status === 'READY') ready++;
      else if (o.order_status === 'DELIVERED') {
        delivered++;
        todayRevenuePaise += o.total_paise || 0;
      }
    });

    return { received, preparing, ready, delivered, todayRevenuePaise };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const q = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
    );
  }, [orders, searchTerm]);

  const handleStatusChange = (orderId: string, newStatus: string, paymentStatus?: string) => {
    updateStatusMutation.mutate({
      orderId,
      payload: {
        orderStatus: newStatus,
        ...(paymentStatus ? { paymentStatus } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
            Live Online Orders & Kitchen Display
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time customer orders from storefront with instant preparation & delivery tracking
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">New Received</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{metrics.received}</p>
          <span className="text-xs text-amber-700">Needs preparation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">In Kitchen</span>
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">{metrics.preparing}</p>
          <span className="text-xs text-blue-700">Currently cooking</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Ready / Out</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{metrics.ready}</p>
          <span className="text-xs text-emerald-700">Waiting collection</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivered Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {formatRupee(metrics.todayRevenuePaise / 100)}
          </p>
          <span className="text-xs text-gray-500">{metrics.delivered} orders completed</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'RECEIVED', label: 'New Received' },
            { id: 'PREPARING', label: 'Preparing' },
            { id: 'READY', label: 'Ready' },
            { id: 'DELIVERED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Slot Filter & Search */}
        <div className="flex items-center gap-3">
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="text-xs font-semibold border border-gray-300 rounded-lg px-2.5 py-2 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Slots</option>
            <option value="MORNING">Morning (6:30 - 8:20 AM)</option>
            <option value="EVENING">Evening (5:00 - 9:30 PM)</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg pl-8 pr-3 py-2 w-48 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading live orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No active orders</h3>
          <p className="text-xs text-gray-500 mt-1">Orders placed by customers will automatically appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map((ord) => {
            const isReceived = ord.order_status === 'RECEIVED';
            const isPreparing = ord.order_status === 'PREPARING';
            const isReady = ord.order_status === 'READY';
            const isDelivered = ord.order_status === 'DELIVERED';
            const isCancelled = ord.order_status === 'CANCELLED';

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-2xl border transition shadow-sm overflow-hidden flex flex-col ${
                  isReceived
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : isPreparing
                    ? 'border-blue-400'
                    : isReady
                    ? 'border-emerald-400'
                    : 'border-gray-200 opacity-90'
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900">#{ord.order_number}</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isReceived
                          ? 'bg-amber-100 text-amber-800'
                          : isPreparing
                          ? 'bg-blue-100 text-blue-800'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDelivered
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ord.order_status}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-gray-500">
                    {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Customer Details & Slot */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">{ord.customer_name}</span>
                      <a
                        href={`tel:${ord.customer_phone}`}
                        className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        <span>+91 {ord.customer_phone}</span>
                      </a>
                    </div>

                    <div className="text-right">
                      <span className="inline-block text-[11px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {ord.collection_slot === 'MORNING' ? '🌅 Morning (6:30 - 8:20 AM)' : '🌆 Evening (5:00 - 9:30 PM)'}
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment mode */}
                  <div className="bg-gray-50 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        {ord.fulfillment_type === 'PICKUP' ? (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Stall Pickup
                          </>
                        ) : (
                          <>
                            <Truck className="w-3.5 h-3.5 text-emerald-600" /> Doorstep Delivery
                          </>
                        )}
                      </span>
                      {ord.delivery_fee_paise === 0 ? (
                        <span className="text-emerald-600 font-extrabold text-[11px]">FREE DELIVERY</span>
                      ) : (
                        <span className="text-gray-600">Fee: ₹{ord.delivery_fee_paise / 100}</span>
                      )}
                    </div>
                    {ord.fulfillment_type === 'DELIVERY' && ord.delivery_address && (
                      <p className="text-gray-600 text-[11px] font-medium leading-relaxed">
                        📍 {ord.delivery_address}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Items Ordered
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {ord.items?.map((it) => (
                        <li key={it.id} className="flex justify-between items-center text-gray-800">
                          <div>
                            <span className="font-bold text-emerald-700 mr-2">{it.quantity}x</span>
                            <span>{it.product_name}</span>
                            {it.flavor && (
                              <span className="text-gray-500 text-[11px] ml-1.5">({it.flavor})</span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-600">
                            ₹{(it.total_price_paise / 100).toFixed(0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Payment Info */}
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Payment</span>
                      <span className="font-bold text-gray-800">
                        {ord.payment_method === 'UPI_DIRECT'
                          ? 'Direct UPI'
                          : ord.payment_method === 'PAY_AT_STALL'
                          ? 'Pay at Stall (Cash/UPI)'
                          : 'Razorpay Online'}
                      </span>
                      <span
                        className={`inline-block ml-1.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          ord.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.payment_status}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-500 block text-[11px]">Total Amount</span>
                      <span className="text-lg font-black text-emerald-700">
                        ₹{(ord.total_paise / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Workflow Buttons */}
                {!isDelivered && !isCancelled && (
                  <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center gap-2">
                    {isReceived && (
                      <button
                        onClick={() => handleStatusChange(ord.id, 'PREPARING')}
                        disabled={updateStatusMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Flame className="w-3.5 h-3.5" /> Start Preparing
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleStatusChange(ord.id, 'READY')}
                        disabled={updateStatusMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Package className="w-3.5 h-3.5" /> Mark Ready
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleStatusChange(ord.id, 'DELIVERED', 'PAID')}
                        disabled={updateStatusMutation.isPending}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Delivered & Paid
                      </button>
                    )}

                    <button
                      onClick={() => handleStatusChange(ord.id, 'CANCELLED')}
                      disabled={updateStatusMutation.isPending}
                      className="px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
