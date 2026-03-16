import { useMemo, useCallback } from 'react';
import { CreditCard, Download, Search, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { useReservations } from '../hooks/useReservations';
import { formatDate } from '../lib/utils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function exportToCsv(rows, filename) {
    const headers = ['Date', 'Title', 'Court', 'Method', 'Total Amount', 'Paid Amount', 'Balance', 'Status'];
    const csvRows = [
        headers.join(','),
        ...rows.map(tx => [
            new Date(tx.created_at).toLocaleDateString(),
            `"${(tx.title || 'Reservation').replace(/"/g, '""')}"`,
            `"${(tx.courts?.name || 'N/A').replace(/"/g, '""')}"`,
            tx.payment_method || 'N/A',
            tx.total_amount || 0,
            tx.paid_amount || 0,
            (tx.total_amount || 0) - (tx.paid_amount || 0),
            tx.payment_status || 'pending',
        ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const TransactionsPage = () => {
    const { reservations, loading } = useReservations();

    // Filter to only reservations that have payments
    const transactions = useMemo(() => {
        return reservations
            .filter(r => (r.paid_amount > 0 || r.payment_status === 'full'))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [reservations]);

    const stats = useMemo(() => {
        const total = transactions.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
        const pending = transactions.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.paid_amount || 0)), 0);
        return { total, pending };
    }, [transactions]);

    const handleExport = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        exportToCsv(transactions, `ymca-transactions-${today}.csv`);
    }, [transactions]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-7 w-64 bg-gray-800/60 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-gray-800/60 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-32 bg-gray-800/60 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-800/60 animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                                    <div className="h-6 w-16 bg-gray-800/60 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4">
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="h-4 flex-1 bg-gray-800/60 rounded animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-400" /> Revenue & Transactions
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Track payments and manage facility financial records.</p>
                </div>
                <Button variant="secondary" className="gap-2" onClick={handleExport} disabled={transactions.length === 0}>
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p>
                            <h3 className="text-xl font-bold text-gray-100">₱{stats.total.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Pending Collection</p>
                            <h3 className="text-xl font-bold text-gray-100">₱{stats.pending.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Transactions</p>
                            <h3 className="text-xl font-bold text-gray-100">{transactions.length} entries</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-medium text-gray-200">Recent Payment Records</h3>
                    <div className="text-xs text-gray-500">Real-time sync from Supabase</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#16161c] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Transaction Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Paid</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-[#1a1a24] transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {formatDate(new Date(tx.created_at))}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-200">{tx.title || 'Reservation'}</div>
                                        <div className="text-xs text-gray-500">ID: {tx.id.slice(0, 8)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 uppercase">
                                        {tx.payment_method || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-200">
                                        ₱{tx.total_amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-green-400 font-medium">
                                        ₱{tx.paid_amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${tx.payment_status === 'full' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                                            }`}>
                                            {tx.payment_status || 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm">
                                        No recent transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;
