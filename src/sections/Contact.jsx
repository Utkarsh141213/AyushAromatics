import { useState } from "react";
import {
  isEnquiryConnected,
  submitEnquiry,
  enquiryEmailHref,
} from "../services/enquiries";
import { business, emailHref } from "../config/business";
import { phoneLink } from "../config/phones";
import Icon from "../components/Icon";
import EmailLinks from "../components/EmailLinks";
const empty = {
  name: "",
  company: "",
  email: "",
  product: "",
  quantity: "",
  country: "",
  message: "",
  website: "",
};
const fields = [
  ["name", "Full name", "text", "Your full name"],
  ["company", "Company name", "text", "Your business"],
  ["email", "Business email", "email", "you@company.com"],
  ["product", "Product of interest", "text", "Oil or ingredient name"],
  ["quantity", "Approximate quantity", "text", "e.g. 100 kg"],
  ["country", "Destination country", "text", "Country of delivery"],
];
export default function Contact({ selectedProduct = "" }) {
  const [form, setForm] = useState({ ...empty, product: selectedProduct });
  const [status, setStatus] = useState("idle");
  const configured = isEnquiryConnected();
  async function submit(e) {
    e.preventDefault();
    if (form.website || status === "sending") return;
    if (!configured) {
      window.location.href = enquiryEmailHref(form);
      setStatus("email");
      return;
    }
    setStatus("sending");
    try {
      const result = await submitEnquiry(form);
      setStatus(result.status);
      setForm({ ...empty, product: selectedProduct });
    } catch {
      setStatus("error");
    }
  }
  return (
    <section className="section contact-section" id="contact">
      <div className="container contact-grid">
        <div className="contact-copy">
          <span className="eyebrow light">LET’S BUILD YOUR NEXT ORDER</span>
          <h2>Looking for a reliable bulk essential oils supplier?</h2>
          <p>
            Tell us your product requirements and our team will get in touch.
          </p>
          <div className="button-row">
            <a className="button button-gold" href="#enquiry-form">
              Request a quote <Icon name="arrow" />
            </a>
            {business.phones.map((phone) => (
              <a key={phone} className="button button-outline-light" href={phoneLink(phone)}>
                <Icon name="phone" />
                Call {phone}
              </a>
            ))}
          </div>
          <div className="contact-details">
            <div>
              <Icon name="mail" />
              <div className="contact-values">
                <small>EMAIL US</small>
                {business.emails.map((email) => (
                  <a key={email} href={`mailto:${email}`}>{email}</a>
                ))}
              </div>
            </div>
            <div>
              <Icon name="phone" />
              <div className="contact-values">
                <small>CALL OUR TEAM</small>
                {business.phones.map((phone) => (
                  <a key={phone} href={phoneLink(phone)}>{phone}</a>
                ))}
              </div>
            </div>
            <div>
              <Icon name="pin" />
              <span>
                <small>ADDRESS</small>
                {business.streetAddress}
                <br />
                {business.locality}, {business.region}
                , India
              </span>
            </div>
            <div>
              <Icon name="pin" />
              <span>
                <small>CORPORATE ADDRESS</small>
                {business.corporateAddress.streetAddress}
                <br />
                {business.corporateAddress.locality}, {business.corporateAddress.region}
                {" – "}{business.corporateAddress.postalCode}, India
              </span>
            </div>
          </div>
        </div>
        <form className="enquiry-form" id="enquiry-form" onSubmit={submit}>
          <h3>Tell us what you need.</h3>
          <p>A few details help us understand your requirement.</p>
          <div className="form-grid">
            {fields.map(([name, label, type, placeholder]) => (
              <div className="field" key={name}>
                <label htmlFor={`enquiry-${name}`}>
                  {label}
                  {name !== "quantity" ? " *" : ""}
                </label>
                <input
                  id={`enquiry-${name}`}
                  name={name}
                  type={type}
                  required={name !== "quantity"}
                  maxLength={name === "email" ? 254 : 150}
                  autoComplete={
                    {
                      name: "name",
                      company: "organization",
                      email: "email",
                      country: "country-name",
                    }[name] || "off"
                  }
                  value={form[name]}
                  placeholder={placeholder}
                  onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="enquiry-message">Additional requirements</label>
            <textarea
              id="enquiry-message"
              name="message"
              rows="3"
              maxLength="3000"
              value={form.message}
              placeholder="Specifications, packaging or documentation needed…"
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="enquiry-website">Leave this field empty</label>
            <input
              id="enquiry-website"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <p className="form-note">
            {configured
              ? "Your details are used to respond to this business enquiry."
              : "This opens your email app with your enquiry. Review it and send to our team."}
          </p>
          <button
            className="button"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending"
              ? "Sending enquiry…"
              : configured
                ? "Send enquiry"
                : "Prepare email enquiry"}
            <Icon name="arrow" />
          </button>
          <div className="form-feedback" role="status">
            {status === "sent" &&
              "Enquiry sent. Thank you for contacting our team."}
            {status === "email" && (
              <>
                Your email draft has been prepared. Send it from your email app,
                or email <EmailLinks /> directly.
              </>
            )}
            {status === "error" && (
              <>
                The enquiry could not be sent. Please try again or{" "}
                <a href={emailHref}>email our team directly</a>.
              </>
            )}
            {status === "limited" &&
              "Please wait one minute before sending another enquiry."}
          </div>
        </form>
      </div>
    </section>
  );
}
