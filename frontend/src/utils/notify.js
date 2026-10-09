import Swal from "sweetalert2";

// SweetAlert2 gives us both confirmation dialogs and small toast messages.
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
});

export const notify = {
  success(message) {
    return Toast.fire({ icon: "success", title: message });
  },
  error(message) {
    return Toast.fire({ icon: "error", title: message });
  },
  info(message) {
    return Toast.fire({ icon: "info", title: message });
  },
  warning(message) {
    return Toast.fire({ icon: "warning", title: message });
  },
  async confirm({ title, text, confirmText = "Yes, delete it!" }) {
    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        confirmButton: "swal-confirm-btn",
        cancelButton: "swal-cancel-btn",
      },
    });
    return result.isConfirmed;
  },
};
