export function Button({
  children,
  loading,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "outline";
}) {
  return (
    <button
      disabled={loading || props.disabled}
      className={variant === "primary" ? "btn-primary" : "btn-outline"}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="spinner" />
          Please wait...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
