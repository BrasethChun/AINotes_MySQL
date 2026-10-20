import React, { useState, useEffect } from 'react';
import { RoutePath } from '../../types';
import { Button } from '../../components/ui/Button';
import { Plus, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/invoices', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (e) {
        console.error("Failed to fetch invoices", e);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-2">Manage and view your generated invoices.</p>
        </div>
        <Link to={RoutePath.CREATE_INVOICE}>
          <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus size={18} />
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ReceiptText size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">You haven't created any invoices. Start by creating your first professional invoice.</p>
            <Link to={RoutePath.CREATE_INVOICE}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Create your first invoice</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billed To</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {invoice.invoice_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="line-clamp-2">{invoice.billed_to}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                      ${invoice.total}
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-2 text-right">
                      <Link to={`/invoices/${invoice.id}/edit`}>
                        <Button variant="outline" size="sm">Edit / Print</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
