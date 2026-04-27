import { createPortal } from 'react-dom';

const ModalOverlay = ({ children, onClose, panelClassName = '' }) =>
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 sm:items-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close dialog" />
      <div className={`relative z-10 my-auto w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto bg-[#111116] border border-gray-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 ${panelClassName}`.trim()}>
        {children}
      </div>
    </div>,
    document.body
  );

export default ModalOverlay;
