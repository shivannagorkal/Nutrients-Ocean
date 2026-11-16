import React, { useState } from 'react';
import {
  Package,
  Layers,
  Users,
  Download,
  Info,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useProducts, useCreateProduct, useUpdateProduct, ProductItem } from '../api/products';
import { useCategories, useCreateCategory, useUpdateCategory, CategoryItem } from '../api/categories';
import { useMetadata } from '../api/meta';
import { downloadExportFile } from '../api/export';
import { TableSkeleton, CardSkeleton } from '../components/Skeleton';
import { formatRupee, formatDate } from '../lib/format';
import api from '../api/client';

type TabType = 'products' | 'categories' | 'members' | 'export' | 'system';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('products');

  // Products
  const { data: productsData, isLoading: loadingProducts } = useProducts();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  // Categories
  const { data: categoriesData, isLoading: loadingCategories } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();

  // Meta (Members)
  const { data: metaData, isLoading: loadingMeta } = useMetadata();

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productForm, setProductForm] = useState({ name: '', default_price: '', is_active: true });
  const [productError, setProductError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // CSV Export State
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const [exportFrom, setExportFrom] = useState(`${currentYear}-${currentMonthStr}-01`);
  const [exportTo, setExportTo] = useState(
    new Date(currentYear, now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );
  const [exportingSales, setExportingSales] = useState(false);
  const [exportingExpenses, setExportingExpenses] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // Health ping state
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'error' | null>(null);

  // Handlers for Product Modal
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', default_price: '', is_active: true });
    setProductError(null);
    setProductModalOpen(true);
  };

  const openEditProduct = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      default_price: prod.default_price !== null ? String(prod.default_price) : '',
      is_active: prod.is_active,
    });
    setProductError(null);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductError(null);

    if (!productForm.name.trim()) {
      setProductError('Product name is required');
      return;
    }

    const priceNum = productForm.default_price ? parseFloat(productForm.default_price) : null;
    if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) {
      setProductError('Default price must be a valid positive number');
      return;
    }

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          data: {
            name: productForm.name.trim(),
            default_price: priceNum,
            is_active: productForm.is_active,
          },
        });
      } else {
        await createProductMutation.mutateAsync({
          name: productForm.name.trim(),
          default_price: priceNum,
          is_active: productForm.is_active,
        });
      }
      setProductModalOpen(false);
    } catch (err: any) {
      setProductError(err.message || 'Failed to save product');
    }
  };

  const handleToggleProductActive = async (prod: ProductItem) => {
    try {
      await updateProductMutation.mutateAsync({
        id: prod.id,
        data: {
          is_active: !prod.is_active,
        },
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update product status');
    }
  };

  // Handlers for Category Modal
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '' });
    setCategoryError(null);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name });
    setCategoryError(null);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);

    if (!categoryForm.name.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: { name: categoryForm.name.trim() },
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: categoryForm.name.trim(),
        });
      }
      setCategoryModalOpen(false);
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to save category');
    }
  };

  // CSV Export Handlers
  const handleExportSales = async () => {
    setExportingSales(true);
    setExportSuccessMsg(null);
    setExportErrorMsg(null);
    try {
      await downloadExportFile('sales', exportFrom, exportTo);
      setExportSuccessMsg(`Successfully exported sales records (${exportFrom} to ${exportTo})`);
    } catch (err: any) {
      setExportErrorMsg(err.message || 'Failed to export sales CSV');
    } finally {
      setExportingSales(false);
    }
  };

  const handleExportExpenses = async () => {
    setExportingExpenses(true);
    setExportSuccessMsg(null);
    setExportErrorMsg(null);
    try {
      await downloadExportFile('expenses', exportFrom, exportTo);
      setExportSuccessMsg(`Successfully exported expense records (${exportFrom} to ${exportTo})`);
    } catch (err: any) {
      setExportErrorMsg(err.message || 'Failed to export expenses CSV');
    } finally {
      setExportingExpenses(false);
    }
  };

  const handlePingHealth = async () => {
    setHealthStatus('checking');
    try {
      const res: any = await api.get('/health');
      if (res && res.ok) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('error');
      }
    } catch {
      setHealthStatus('error');
    }
  };

  const setRangeQuick = (preset: 'month' | 'last_month' | 'year' | 'all') => {
    const d = new Date();
    if (preset === 'month') {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      setExportFrom(`${y}-${m}-01`);
      setExportTo(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const y = lastMonth.getFullYear();
      const m = String(lastMonth.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, lastMonth.getMonth() + 1, 0).getDate();
      setExportFrom(`${y}-${m}-01`);
      setExportTo(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'year') {
      const y = d.getFullYear();
      setExportFrom(`${y}-01-01`);
      setExportTo(`${y}-12-31`);
    } else if (preset === 'all') {
      setExportFrom('2024-01-01');
      setExportTo('2026-12-31');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & Catalog</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage products, default prices, expense categories, partnership members, and CSV exports
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'products'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Products</span>
          {productsData && (
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
              {productsData.products.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'categories'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Categories</span>
          {categoriesData && (
            <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
              {categoriesData.categories.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'members'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'export'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>CSV Export</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'system'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Info className="h-4 w-4" />
          <span>System & Health</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Products & Catalog</h2>
              <p className="text-xs text-slate-500">
                Products available for daily sales. To discontinue an item, deactivate it rather than deleting to preserve sales history.
              </p>
            </div>
            <button
              onClick={openAddProduct}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Product</span>
            </button>
          </div>

          {loadingProducts ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Default Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {productsData?.products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span>{prod.name}</span>
                          {prod.name === 'Other' && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium">
                              Mixed Orders Catch-All
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {prod.default_price !== null ? formatRupee(prod.default_price) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {prod.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditProduct(prod)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleProductActive(prod)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                                prod.is_active
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={prod.is_active ? 'Deactivate product' : 'Activate product'}
                            >
                              {prod.is_active ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-slate-400" />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSE CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Expense Categories</h2>
              <p className="text-xs text-slate-500">
                Categories used to group and classify business expenditures and investments.
              </p>
            </div>
            <button
              onClick={openAddCategory}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Category</span>
            </button>
          </div>

          {loadingCategories ? (
            <TableSkeleton rows={6} cols={3} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Category Name</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {categoriesData?.categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">{cat.name}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(cat.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit category"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Partnership Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Founding partners of Nutrients Ocean with equity, investment records, and reimbursement tracking.
            </p>
          </div>

          {loadingMeta ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metaData?.members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                      <p className="text-xs text-slate-500">{member.email || 'Partner'}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Role</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Partner / Owner
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CSV EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">CSV Data Export</h2>
            <p className="text-xs text-slate-500 mb-4">
              Export transactional data to standard RFC 4180 CSV files. Easily import into Excel, Google Sheets, or business accounting software.
            </p>

            {/* Date filter & Quick Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Date Range:</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
                <button
                  type="button"
                  onClick={() => setRangeQuick('month')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setRangeQuick('last_month')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setRangeQuick('year')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  Year {currentYear}
                </button>
                <button
                  type="button"
                  onClick={() => setRangeQuick('all')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {exportSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{exportSuccessMsg}</span>
              </div>
            )}
            {exportErrorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{exportErrorMsg}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sales Export Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <h3 className="text-sm font-bold text-slate-900">Sales Records CSV</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Includes sale date, timestamp, product name, quantity sold, price per item, total amount received, payment method (UPI/Cash), receiving member, and notes.
                </p>
              </div>
              <button
                onClick={handleExportSales}
                disabled={exportingSales}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                {exportingSales ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Preparing Sales CSV...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Sales CSV</span>
                  </>
                )}
              </button>
            </div>

            {/* Expenses Export Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-indigo-700 mb-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <h3 className="text-sm font-bold text-slate-900">Expense Records CSV</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Includes expense date, timestamp, expense category, description, amount, payment method (UPI/Cash/Personal Payment), paying partner, expense type, and notes.
                </p>
              </div>
              <button
                onClick={handleExportExpenses}
                disabled={exportingExpenses}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                {exportingExpenses ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Preparing Expenses CSV...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Expenses CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM & HEALTH */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">System Environment & Health</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Server Timezone
                </span>
                <span className="text-sm font-bold text-slate-800">Asia/Kolkata (IST)</span>
                <p className="text-[11px] text-slate-500 mt-1">UTC+05:30 midnight boundaries</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Database
                </span>
                <span className="text-sm font-bold text-slate-800">PostgreSQL 18</span>
                <p className="text-[11px] text-slate-500 mt-1">Hosted on Neon Serverless</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Security
                </span>
                <span className="text-sm font-bold text-emerald-700">Strict CSP & Cookies</span>
                <p className="text-[11px] text-slate-500 mt-1">HttpOnly, SameSite=Strict</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    API Health Check
                  </span>
                  <div className="flex items-center gap-1.5">
                    {healthStatus === 'healthy' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 200 OK
                      </span>
                    )}
                    {healthStatus === 'error' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                        <XCircle className="h-3.5 w-3.5" /> Offline / Error
                      </span>
                    )}
                    {healthStatus === 'checking' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...
                      </span>
                    )}
                    {healthStatus === null && (
                      <span className="text-xs font-medium text-slate-500">Not checked</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePingHealth}
                  className="mt-2 text-[11px] text-slate-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <Activity className="h-3 w-3 text-emerald-600" />
                  <span>Ping /api/health</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
              <strong>Architectural Standards:</strong> All monetary calculations use authoritative single-source metrics (`metrics.ts`). Soft deletion protects transaction audit history. Rate limits are set to 100 requests/minute per client and 5 login attempts per 15 minutes.
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure product details and standard menu price
            </p>

            {productError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{productError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Peanut Butter Oats"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 99.00"
                  value={productForm.default_price}
                  onChange={(e) => setProductForm({ ...productForm, default_price: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Pre-fills in daily sales entry drawer, can still be overridden per transaction.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="prod_active" className="text-xs font-medium text-slate-700">
                  Active (available in daily sales dropdown)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  {(createProductMutation.isPending || updateProductMutation.isPending) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingCategory ? 'Edit Expense Category' : 'Add New Category'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create categories to organize business expenses and initial capital investments
            </p>

            {categoryError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{categoryError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Milk & Dairy Products"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
