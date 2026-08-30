import Swal from "sweetalert2";

const popupClass = "swal-app";

const baseStyle = {
  customClass: {
    popup: popupClass,
  },
};

export const swalTheme = {
  success: Swal.mixin({
    background: "linear-gradient(160deg,#6b0a22,#b31244)",
    color: "#fff",
    confirmButtonColor: "#ff6b35",
    ...baseStyle,
  }),
  error: Swal.mixin({
    background: "linear-gradient(160deg,#4a0416,#6b0a22)",
    color: "#fff",
    confirmButtonColor: "#b31244",
    ...baseStyle,
  }),
  info: Swal.mixin({
    background: "linear-gradient(160deg,#6b0a22,#8a1231)",
    color: "#fff",
    confirmButtonColor: "#ffd166",
    ...baseStyle,
  }),
};

export async function showSuccess(title: string, text?: string) {
  return swalTheme.success.fire({
    icon: "success",
    title,
    text,
    confirmButtonText: "OK",
  });
}

export async function showError(title: string, text?: string) {
  return swalTheme.error.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "OK",
  });
}

export async function showInfo(title: string, text?: string) {
  return swalTheme.info.fire({
    icon: "info",
    title,
    text,
    confirmButtonText: "OK",
  });
}

export async function confirmAction(
  title: string,
  text: string,
  confirmText = "Yes, confirm"
) {
  const result = await swalTheme.info.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ff6b35",
    cancelButtonColor: "#6b0a22",
  });
  return result.isConfirmed;
}
