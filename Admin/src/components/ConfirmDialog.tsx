import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onCancel} />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl flex-shrink-0 ${
                isDangerous ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ${
                isDangerous
                  ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
