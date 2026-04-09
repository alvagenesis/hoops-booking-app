import { useState } from 'react';
import { CreditCard, X, Upload, FileImage, Info } from 'lucide-react';
import Button from '../components/ui/Button';
import ModalOverlay from '../components/ui/ModalOverlay';
import { venueConfig } from '../lib/venueConfig';

const DIGITAL_METHODS = ['gcash', 'maya', 'bank_transfer'];

function PaymentInstructions({ method }) {
    const cfg = venueConfig.payments[method];
    if (!cfg) return null;

    const lines = method === 'bank_transfer'
        ? [`${cfg.bank} · ${cfg.accountNumber}`, `Account name: ${cfg.accountName}`]
        : [`${method === 'gcash' ? 'GCash' : 'Maya'}: ${cfg.number}`, `Account name: ${cfg.accountName}`];

    return (
        <div className="flex gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg text-xs text-gray-300">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
                <p className="font-medium text-blue-300">Send payment to:</p>
                {lines.map((line, i) => <p key={i} className="text-gray-400">{line}</p>)}
                <p className="text-gray-500 mt-1">Include your booking date as reference when sending.</p>
            </div>
        </div>
    );
}

const PaymentModal = ({ bookingInfo, onClose, onConfirm }) => {
  const [paymentType, setPaymentType] = useState('partial');
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState(null);

  const partialAmount = Math.round(bookingInfo.totalAmount / 2);
  const amountToPay = paymentType === 'full' ? bookingInfo.totalAmount : partialAmount;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#16161c] rounded-t-2xl">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-400" /> Payment Options
        </h3>
        <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-6 space-y-6">
        {/* Payment Amount Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Payment Plan</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentType('full')}
              className={`flex flex-col p-3 rounded-xl border text-left transition-colors ${paymentType === 'full' ? 'bg-blue-900/20 border-blue-500' : 'bg-[#1a1a24] border-gray-800 hover:border-gray-700'
                }`}
            >
              <span className={`text-xs font-medium ${paymentType === 'full' ? 'text-blue-400' : 'text-gray-400'}`}>Pay in Full</span>
              <span className="text-lg font-bold text-gray-100">₱{bookingInfo.totalAmount.toLocaleString()}</span>
            </button>

            <button
              onClick={() => setPaymentType('partial')}
              className={`flex flex-col p-3 rounded-xl border text-left transition-colors relative overflow-hidden ${paymentType === 'partial' ? 'bg-blue-900/20 border-blue-500' : 'bg-[#1a1a24] border-gray-800 hover:border-gray-700'
                }`}
            >
              {paymentType === 'partial' && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rounded-bl-full"></div>}
              <span className={`text-xs font-medium ${paymentType === 'partial' ? 'text-blue-400' : 'text-gray-400'}`}>Partial (50% Deposit)</span>
              <span className="text-lg font-bold text-gray-100">₱{partialAmount.toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Select Method</label>
          <div className="space-y-2">
            {[
              { id: 'gcash', name: 'GCash', color: 'bg-blue-600' },
              { id: 'maya', name: 'Maya', color: 'bg-green-600' },
              { id: 'bank_transfer', name: 'Bank Transfer', color: 'bg-indigo-600' },
              { id: 'cash', name: 'Cash', color: 'bg-amber-600' },
              { id: 'walk_in', name: 'Walk-in', color: 'bg-slate-600' }
            ].map(method => (
              <label key={method.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === method.id ? 'bg-[#1a1a24] border-gray-600' : 'bg-[#14141a] border-gray-800 hover:bg-[#1a1a24]'
                }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="text-purple-600 focus:ring-blue-500 bg-[#0a0a0c] border-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-200">{method.name}</span>
                </div>
                <div className={`w-8 h-5 rounded ${method.color} opacity-80`}></div>
              </label>
            ))}
          </div>
        </div>

        {DIGITAL_METHODS.includes(paymentMethod) && (
          <PaymentInstructions method={paymentMethod} />
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Payment Proof <span className="text-gray-500">(optional but recommended)</span></label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-gray-700 rounded-lg px-4 py-4 bg-[#14141a] hover:border-blue-500 transition-colors cursor-pointer text-sm text-gray-300">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>{paymentProofFile ? paymentProofFile.name : 'Upload screenshot or receipt image'}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
            />
          </label>
          {paymentProofFile && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#101015] border border-gray-800 rounded-lg px-3 py-2">
              <FileImage className="w-3.5 h-3.5" /> {paymentProofFile.name}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Payment Notes <span className="text-gray-500">(optional)</span></label>
          <textarea
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            rows={3}
            placeholder="Reference number, who received payment, or payment instructions..."
            className="w-full bg-[#14141a] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Back</Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm({
              paymentStatus: paymentProofFile ? 'for_verification' : (paymentType === 'full' ? 'paid' : 'partial'),
              paidAmount: amountToPay,
              paymentMethod,
              paymentNotes,
              paymentProofFile,
            })}
          >
            Pay ₱{amountToPay.toLocaleString()}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
};

export default PaymentModal;
