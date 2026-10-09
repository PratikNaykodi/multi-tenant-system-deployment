// Return one user-friendly message for toast/alert usage.
export function getApiError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const rawMessage = String(data?.message || error?.message || "");
  // Prisma P2002 / users_email_key means the email is already in use.
  if (/users_email_key|unique constraint failed.*email|P2002/i.test(rawMessage)) {
    return "This email address is already registered. Please use a different email address.";
  }
  if (/specialization is required/i.test(rawMessage)) {
    return "Specialization is required for a provider. Check the Specialization field and try again.";
  }
  if (status === 400) return data?.message || "Please check the entered data.";
  if (status === 401) return data?.message || "Your session has expired. Please login again.";
  if (status === 403) return data?.message || "You do not have permission to perform this action.";
  if (status === 404) return data?.message || "The requested resource was not found.";
  if (status === 409) return data?.message || "This record already exists or conflicts with another record.";
  if (status >= 500) return data?.message || "Server error. Please check the backend logs.";
  if (!error?.response) return "Cannot connect to the API. Check the backend URL and CORS settings.";
  return data?.message || error.message || "Something went wrong.";
}

// Convert backend validation structures into field-level errors when available.
export function getApiFieldErrors(error) {
  const data = error?.response?.data;
  const source = data?.errors || data?.validationErrors || data?.details;
  const result = {};

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const key = item?.field || item?.path || item?.param;
      const message = item?.message || item?.msg;
      if (key && message) result[key] = message;
    });
  } else if (source && typeof source === "object") {
    Object.entries(source).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? value[0] : String(value);
    });
  }

  return result;
}
