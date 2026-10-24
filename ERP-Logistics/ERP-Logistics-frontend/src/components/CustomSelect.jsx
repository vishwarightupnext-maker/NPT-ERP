import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_CLS = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// Custom dropdown (not a native <select>) — some embedded/webview environments
// swallow clicks on the native OS dropdown popup, making options unclickable.
// This renders the option list as regular DOM buttons so clicks always register.
export default function CustomSelect({ value, onChange, options, placeholder = 'Select…', className = DEFAULT_CLS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${className} text-left flex items-center justify-between gap-2`}
      >
        <span className={`truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${!value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-400'}`}
          >
            {placeholder}
          </button>
          {options.map(o => (
            <button
              type="button"
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${o.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
