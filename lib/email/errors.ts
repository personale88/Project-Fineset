export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("SMTP is not configured");
    this.name = "SmtpNotConfiguredError";
  }
}

export class SmtpAuthError extends Error {
  constructor(message = "SMTP authentication failed") {
    super(message);
    this.name = "SmtpAuthError";
  }
}

export class SmtpConnectionError extends Error {
  constructor(message = "Could not connect to SMTP server") {
    super(message);
    this.name = "SmtpConnectionError";
  }
}

export class SmtpSendError extends Error {
  constructor(message = "Failed to send email") {
    super(message);
    this.name = "SmtpSendError";
  }
}

export function mapNodemailerError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new SmtpSendError("Unknown email error");
  }

  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EAUTH") {
    return new SmtpAuthError(error.message);
  }
  if (
    code === "ECONNECTION" ||
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    code === "ECONNREFUSED"
  ) {
    return new SmtpConnectionError(error.message);
  }

  return new SmtpSendError(error.message);
}
