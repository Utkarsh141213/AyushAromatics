export function getContactPhones(env) {
  return [...new Set([
    env.VITE_CONTACT_NUMBER || "+918267000606",
    env.VITE_CONTACT_SECONDARY_NUMBER || "+917017068468",
  ].map((phone) => phone.replace(/[^+\d]/g, "")).filter(Boolean))];
}

export function phoneLink(phone) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
