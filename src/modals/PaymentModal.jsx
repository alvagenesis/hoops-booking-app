import { useState } from 'react';
import { CreditCard, X } from 'lucide-react';
import Button from '../components/ui/Button';
import ModalOverlay from '../components/ui/ModalOverlay';

const PaymentModal = ({ bookingInfo, onClose, onConfirm }) => {
  const [paymentType, setPaymentType] = useState('full');
  const [paymentMethod, setPaymentMethod] = useState('gcash');

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
              { id: 'paymaya', name: 'Maya', color: 'bg-green-600' },
              { id: 'stripe', name: 'Credit/Debit Card (Stripe)', color: 'bg-indigo-600' }
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

        <div className="pt-4 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Back</Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm({
              paymentStatus: paymentType,
              paidAmount: amountToPay,
              paymentMethod,
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
