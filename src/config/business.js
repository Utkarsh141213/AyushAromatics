// Defaults verified against ayusharomatics.com on 18 October 2026.
import { getContactEmails } from "./emails";
import { getContactPhones, phoneLink } from "./phones";
const env = import.meta.env;
const emails = getContactEmails(env);
const phones = getContactPhones(env);
function officialUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
export const business = {
  name: env.VITE_COMPANY_NAME || "Ayush Aromatics",
  phone: phones[0],
  phones,
  email: emails[0],
  emails,
  streetAddress: env.VITE_COMPANY_STREET_ADDRESS || "Plot No.- 156, Ground Floor, Village Khajuria",
  locality: env.VITE_COMPANY_LOCALITY || "Bareilly",
  region: env.VITE_COMPANY_REGION || "Uttar Pradesh",
  corporateAddress: {
    streetAddress: env.VITE_CORPORATE_STREET_ADDRESS || "A-1 2604, Puranik Rumah Bali",
    locality: env.VITE_CORPORATE_LOCALITY || "Thane",
    region: env.VITE_CORPORATE_REGION || "Maharashtra",
    postalCode: env.VITE_CORPORATE_POSTAL_CODE || "400615",
  },
  siteUrl: officialUrl(env.VITE_SITE_URL) || "https://www.ayusharomatics.com/",
  logo:
    env.VITE_LOGO_URL ||
    "https://res.cloudinary.com/w33ctko3/image/upload/v1792229975/WhatsApp_Image_2026-10-16_at_12.54.01_PM.jpg",
  socials: [
    {
      name: "Facebook",
      icon: "facebook",
      url: officialUrl(env.VITE_FACEBOOK_URL),
    },
    {
      name: "Instagram",
      icon: "instagram",
      url: officialUrl(env.VITE_INSTAGRAM_URL),
    },
    {
      name: "LinkedIn",
      icon: "linkedin",
      url: officialUrl(env.VITE_LINKEDIN_URL),
    },
  ].filter((s) => s.url),
  privacyUrl: officialUrl(env.VITE_PRIVACY_URL),
  termsUrl: officialUrl(env.VITE_TERMS_URL),
};
export const phoneHref = phoneLink(business.phone);
export const emailHref = `mailto:${business.emails.join(",")}`;
export function whatsappHref(
  message = `Hello ${business.name}, I would like to enquire about bulk oils and ingredients.`,
) {
  return `https://wa.me/${business.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
export function quotePath(product = "") {
  return product
    ? `#contact?product=${encodeURIComponent(product)}`
    : "#contact";
}
