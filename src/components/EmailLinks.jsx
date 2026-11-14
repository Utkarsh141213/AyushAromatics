import { Fragment } from "react";
import { business } from "../config/business";

export default function EmailLinks() {
  return business.emails.map((email, index) => (
    <Fragment key={email}>
      {index > 0 && " / "}
      <a href={`mailto:${email}`}>{email}</a>
    </Fragment>
  ));
}
