export function Alert({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div role="alert" className={type === "error" ? "alert-error" : "alert-success"}>
      {children}
    </div>
  );
}
