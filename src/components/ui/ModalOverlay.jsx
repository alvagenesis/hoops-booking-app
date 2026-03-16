const ModalOverlay = ({ children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
    <div className="absolute inset-0" onClick={onClose} aria-label="Close dialog" />
    <div className="relative z-10 w-full max-w-lg bg-[#111116] border border-gray-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
      {children}
    </div>
  </div>
);

export default ModalOverlay;
