import { Resend } from "resend";

// ─── Resend Client ────────────────────────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "Pine <noreply@pinefinance.org>";

type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(params: {
  toEmail: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const { toEmail, subject, text, html } = params;

  if (!resend) {
    console.warn(
      "[Email] RESEND_API_KEY is not configured. Email was not sent."
    );

    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject,
      text,
      html,
    });

    if (error) {
      console.error(`[Email] Resend failed to send to ${toEmail}:`, error);

      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[Email] Sent to ${toEmail} via Resend: ${data?.id}`);

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    console.error(`[Email] Unexpected Resend error for ${toEmail}:`, err);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}

// ─── Send Candidate Invite Email ─────────────────────────────────────────────

export async function sendCandidateInviteEmail(params: {
  toEmail: string;
  candidateName?: string;
  campaignTitle: string;
  roleTemplate: string;
  timeLimitMinutes: number;
  assessmentUrl: string;
  recruiterName?: string;
}): Promise<EmailResult> {
  const {
    toEmail,
    candidateName,
    campaignTitle,
    roleTemplate,
    timeLimitMinutes,
    assessmentUrl,
    recruiterName,
  } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : "Hello,";
  const from = recruiterName
    ? `the team at Pine, on behalf of ${recruiterName}`
    : "the team at Pine";

  const subject = `Your Pine Assessment: ${campaignTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pine Assessment Invitation</title>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d9e7db;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#fff,#eef7ef);padding:32px 40px;border-bottom:1px solid #168a4a;">
              <span style="color:#168a4a;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-left:10px;vertical-align:middle;">PINE FINANCE</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="color:#168a4a;font-size:24px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">You've Been Invited</h1>
              <p style="color:#168a4a;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px;">AI Fluency Assessment</p>

              <p style="color:#2e4637;font-size:15px;line-height:1.7;margin:0 0 20px;">${greeting}</p>

              <p style="color:#2e4637;font-size:15px;line-height:1.7;margin:0 0 28px;">
                You have been invited by ${from} to complete an AI fluency assessment for the
                <strong style="color:#168a4a;">${campaignTitle}</strong> campaign.
                This assessment measures your ability to work effectively with AI tools in a
                <strong style="color:#168a4a;">${roleTemplate}</strong> context.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef7ef;border:1px solid #d9e7db;border-radius:8px;margin:0 0 32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d9e7db;">
                          <span style="color:#6f8274;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Role</span>
                          <span style="color:#168a4a;font-size:14px;font-weight:700;float:right;">${roleTemplate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d9e7db;">
                          <span style="color:#6f8274;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Time Limit</span>
                          <span style="color:#168a4a;font-size:14px;font-weight:700;float:right;">${timeLimitMinutes} minutes</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#6f8274;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Dimensions Scored</span>
                          <span style="color:#168a4a;font-size:12px;font-weight:700;float:right;">6 Dimensions</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${assessmentUrl}"
                       style="display:inline-block;background:#eef7ef;border:1px solid #168a4a;color:#168a4a;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;padding:16px 40px;border-radius:6px;text-decoration:none;">
                      BEGIN ASSESSMENT →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#6f8274;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy and paste this link into your browser:
              </p>

              <p style="color:#168a4a;font-size:12px;word-break:break-all;margin:0 0 32px;">
                ${assessmentUrl}
              </p>

              <div style="border-left:3px solid #168a4a;padding-left:20px;margin:0 0 32px;">
                <p style="color:#3f5847;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What to Expect</p>
                <p style="color:#2e4637;font-size:14px;line-height:1.7;margin:0 0 8px;">
                  You'll work through realistic finance tasks using an embedded AI assistant — just as you would on the job.
                  Your responses are evaluated across 6 dimensions: Accuracy, Efficiency, Judgment, Verification, Communication, and Tool Fluency.
                </p>
                <p style="color:#6f8274;font-size:13px;line-height:1.6;margin:0;">
                  Find a quiet environment and ensure you have ${timeLimitMinutes} uninterrupted minutes before starting.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fbf8;padding:24px 40px;border-top:1px solid #d9e7db;">
              <p style="color:#9db8a4;font-size:12px;margin:0;text-align:center;">
                Pine · The AI Fluency Standard for Finance<br>
                <span style="color:#cfe0d2;">This invitation was sent to ${toEmail}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Pine — Assessment Invitation

${greeting}

You have been invited by ${from} to complete an AI fluency assessment for the "${campaignTitle}" campaign.

Role: ${roleTemplate}
Time Limit: ${timeLimitMinutes} minutes
Dimensions Scored: Accuracy, Efficiency, Judgment, Verification, Communication, Tool Fluency

Begin your assessment here:
${assessmentUrl}

Find a quiet environment and ensure you have ${timeLimitMinutes} uninterrupted minutes before starting.

— Pine Team
`;

  return sendEmail({
    toEmail,
    subject,
    text,
    html,
  });
}

// ─── Send Score Ready Email ───────────────────────────────────────────────────

export async function sendScoreReadyEmail(params: {
  toEmail: string;
  candidateName?: string;
  campaignTitle: string;
  overallScore: number;
  benchmarkPercentile: number;
  reportUrl: string;
}): Promise<EmailResult> {
  const {
    toEmail,
    candidateName,
    campaignTitle,
    overallScore,
    benchmarkPercentile,
    reportUrl,
  } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : "Hello,";

  const subject = `Your Pine Score Report is Ready — ${Math.round(
    overallScore
  )}/100`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Pine Score Report</title>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d9e7db;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#fff,#eef7ef);padding:32px 40px;border-bottom:1px solid #168a4a;">
              <span style="color:#168a4a;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">PINE FINANCE</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="color:#168a4a;font-size:24px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Your Score Is Ready</h1>

              <p style="color:#168a4a;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px;">${campaignTitle}</p>

              <p style="color:#2e4637;font-size:15px;line-height:1.7;margin:0 0 28px;">
                ${greeting}<br><br>
                Your AI fluency assessment has been scored. Here's a summary:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef7ef;border:1px solid #168a4a33;border-radius:8px;margin:0 0 32px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <div style="font-size:72px;font-weight:900;color:#168a4a;line-height:1;">${Math.round(
                      overallScore
                    )}</div>
                    <div style="color:#3f5847;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Overall Score</div>
                    <div style="color:#2e4637;font-size:14px;margin-top:12px;">
                      Top <strong style="color:#168a4a;">${
                        100 - benchmarkPercentile
                      }%</strong> of your peer cohort
                    </div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${reportUrl}" style="display:inline-block;background:#eef7ef;border:1px solid #168a4a;color:#168a4a;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;padding:16px 40px;border-radius:6px;text-decoration:none;">
                      VIEW FULL REPORT →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fbf8;padding:24px 40px;border-top:1px solid #d9e7db;">
              <p style="color:#9db8a4;font-size:12px;margin:0;text-align:center;">
                Pine · The AI Fluency Standard for Finance
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
${greeting}

Your assessment for "${campaignTitle}" has been scored.

Overall Score: ${Math.round(overallScore)}/100
Peer Percentile: ${benchmarkPercentile}th

View your full report:
${reportUrl}

— Pine Team
`;

  return sendEmail({
    toEmail,
    subject,
    text,
    html,
  });
}

export async function sendDemoConfirmationEmail(params: {
  toEmail: string;
  name: string;
  company?: string;
  segment?: string;
}): Promise<EmailResult> {
  const { toEmail, name, company, segment } = params;
  const companyValue = company?.trim() ? company : "—";
  const segmentValue = segment?.trim() ? segment : "—";
  const htmlName = escapeHtml(name);
  const htmlEmail = escapeHtml(toEmail);
  const htmlCompany = escapeHtml(companyValue);
  const htmlSegment = escapeHtml(segmentValue);
  const subject = "We received your Pine demo request";

  const text = `
Hi ${name},

Thank you for requesting a demo of Pine. We received your request and our team will reach out within 24 hours.

Request recap:
- Name: ${name}
- Email: ${toEmail}
- Company: ${companyValue}
- Segment: ${segmentValue}

— Pine Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>We received your Pine demo request</title>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d9e7db;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#fff,#eef7ef);padding:32px 40px;border-bottom:1px solid #168a4a;">
              <span style="color:#168a4a;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">PINE FINANCE</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="color:#168a4a;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Demo Request Received</h1>
              <p style="color:#2e4637;font-size:15px;line-height:1.7;margin:0 0 18px;">Hi ${htmlName},</p>
              <p style="color:#2e4637;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Thank you for requesting a demo of Pine. We received your request and our team will reach out within 24 hours.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef7ef;border:1px solid #d9e7db;border-radius:8px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="color:#6f8274;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Request Recap</div>
                    <div style="color:#2e4637;font-size:14px;line-height:1.8;"><strong>Name:</strong> ${htmlName}</div>
                    <div style="color:#2e4637;font-size:14px;line-height:1.8;"><strong>Email:</strong> ${htmlEmail}</div>
                    <div style="color:#2e4637;font-size:14px;line-height:1.8;"><strong>Company:</strong> ${htmlCompany}</div>
                    <div style="color:#2e4637;font-size:14px;line-height:1.8;"><strong>Segment:</strong> ${htmlSegment}</div>
                  </td>
                </tr>
              </table>
              <p style="color:#2e4637;font-size:14px;line-height:1.7;margin:24px 0 0;">— Pine Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    toEmail,
    subject,
    text,
    html,
  });
}

export async function sendDemoNotificationEmail(params: {
  name: string;
  email: string;
  company?: string;
  role?: string;
  segment?: string;
  message?: string;
}): Promise<EmailResult> {
  const { name, email, company, role, segment, message } = params;
  const toEmail = process.env.DEMO_NOTIFY_EMAIL ?? "sales@pinefinance.org";
  const companyValue = company?.trim() ? company : "—";
  const roleValue = role?.trim() ? role : "—";
  const segmentValue = segment?.trim() ? segment : "—";
  const messageValue = message?.trim() ? message : "—";
  const htmlName = escapeHtml(name);
  const htmlEmail = escapeHtml(email);
  const htmlCompany = escapeHtml(companyValue);
  const htmlRole = escapeHtml(roleValue);
  const htmlSegment = escapeHtml(segmentValue);
  const htmlMessage = escapeHtml(messageValue);
  const subject = `New Pine demo request from ${name}${company ? ` (${company})` : ""}`;

  const text = `
New Pine demo request

Name: ${name}
Email: ${email}
Company: ${companyValue}
Role: ${roleValue}
Segment: ${segmentValue}
Message: ${messageValue}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Pine demo request</title>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:30px 20px;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d9e7db;border-radius:10px;overflow:hidden;max-width:680px;">
          <tr>
            <td style="background:#eef7ef;padding:20px 24px;border-bottom:1px solid #d9e7db;">
              <h1 style="margin:0;color:#168a4a;font-size:18px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">New Pine Demo Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:170px;">Name</td><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#2e4637;font-size:14px;">${htmlName}</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Email</td><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#2e4637;font-size:14px;">${htmlEmail}</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Company</td><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#2e4637;font-size:14px;">${htmlCompany}</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Role</td><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#2e4637;font-size:14px;">${htmlRole}</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Segment</td><td style="padding:10px;border-bottom:1px solid #eef7ef;color:#2e4637;font-size:14px;">${htmlSegment}</td></tr>
                <tr><td style="padding:10px;color:#6f8274;font-size:12px;letter-spacing:1px;text-transform:uppercase;vertical-align:top;">Message</td><td style="padding:10px;color:#2e4637;font-size:14px;white-space:pre-wrap;">${htmlMessage}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    toEmail,
    subject,
    text,
    html,
  });
}
