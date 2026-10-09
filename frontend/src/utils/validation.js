export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function validateUserForm(form, editing) {
  const errors = {};
  const name = String(form.name || "").trim();
  const email = String(form.email || "").trim();
  const roleId = String(form.role_id || "").trim();

  if (!name) errors.name = "Name is required.";
  else if (name.length < 2) errors.name = "Name must contain at least 2 characters.";

  if (!email) errors.email = "Email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  if (!editing && !String(form.password || "").trim()) errors.password = "Password is required.";
  else if (form.password && String(form.password).length < 6) errors.password = "Password must contain at least 6 characters.";

  if (!roleId) errors.role_id = "Please select a role.";

  const role = String(form.role_name || "").toLowerCase();
  if (role === "provider") {
    if (!String(form.provider?.specialization || "").trim()) errors.specialization = "Specialization is required for a provider.";
    if (String(form.provider?.experience_years ?? "").trim() === "") errors.experience_years = "Experience is required for a provider.";
    else if (Number(form.provider.experience_years) < 0) errors.experience_years = "Experience cannot be negative.";
    if (!String(form.provider?.provider_phone || "").trim()) errors.provider_phone = "Provider phone is required.";
  }

  if (role === "patient") {
    if (!String(form.patient?.date_of_birth || "").trim()) errors.date_of_birth = "Date of birth is required for a patient.";
    if (!String(form.patient?.gender || "").trim()) errors.gender = "Gender is required for a patient.";
    if (!String(form.patient?.patient_phone || "").trim()) errors.patient_phone = "Patient phone is required.";
  }

  return errors;
}

export function validateAppointmentForm(form) {
  const errors = {};
  if (!String(form.provider_id || "").trim()) errors.provider_id = "Provider is required.";
  if (!String(form.patient_id || "").trim()) errors.patient_id = "Patient is required.";
  if (!String(form.appointment_date || "").trim()) errors.appointment_date = "Appointment date is required.";
  if (!String(form.start_time || "").trim()) errors.start_time = "Start time is required.";
  if (!String(form.end_time || "").trim()) errors.end_time = "End time is required.";

  if (form.start_time && form.end_time && form.start_time >= form.end_time) {
    errors.end_time = "End time must be later than start time.";
  }

  return errors;
}
