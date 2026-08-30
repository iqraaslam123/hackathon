export function Input({
  label,
  id,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-white/85">
        {label}
      </label>
      <input id={id} className="input-outline" {...props} />
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
