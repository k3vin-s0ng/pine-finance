import { Resend } from "resend";

// ─── Resend Client ────────────────────────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "Pine Finance <noreply@pineshopping.com>";

type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

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
    ? `the team at Pine Finance, on behalf of ${recruiterName}`
    : "the team at Pine Finance";

  const subject = `Your Pine Finance Assessment: ${campaignTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pine Finance Assessment Invitation</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#0d0d0d,#111);padding:32px 40px;border-bottom:1px solid #c9a84c;">
              <div style="display:inline-block;background:#c9a84c;color:#000;font-size:11px;font-weight:900;letter-spacing:3px;padding:6px 12px;border-radius:4px;text-transform:uppercase;">P</div>
              <span style="color:#c9a84c;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-left:10px;vertical-align:middle;">PINE FINANCE</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">You've Been Invited</h1>
              <p style="color:#c9a84c;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px;">AI Fluency Assessment</p>

              <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">${greeting}</p>

              <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 28px;">
                You have been invited by ${from} to complete an AI fluency assessment for the
                <strong style="color:#fff;">${campaignTitle}</strong> campaign.
                This assessment measures your ability to work effectively with AI tools in a
                <strong style="color:#fff;">${roleTemplate}</strong> context.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1a1a1a;border-radius:8px;margin:0 0 32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                          <span style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Role</span>
                          <span style="color:#fff;font-size:14px;font-weight:700;float:right;">${roleTemplate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                          <span style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Time Limit</span>
                          <span style="color:#fff;font-size:14px;font-weight:700;float:right;">${timeLimitMinutes} minutes</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Dimensions Scored</span>
                          <span style="color:#c9a84c;font-size:12px;font-weight:700;float:right;">6 Dimensions</span>
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
                       style="display:inline-block;background:#c9a84c;color:#000;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;padding:16px 40px;border-radius:6px;text-decoration:none;">
                      BEGIN ASSESSMENT →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy and paste this link into your browser:
              </p>

              <p style="color:#c9a84c;font-size:12px;word-break:break-all;margin:0 0 32px;">
                ${assessmentUrl}
              </p>

              <div style="border-left:3px solid #c9a84c;padding-left:20px;margin:0 0 32px;">
                <p style="color:#888;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What to Expect</p>
                <p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 8px;">
                  You'll work through realistic finance tasks using an embedded AI assistant — just as you would on the job.
                  Your responses are evaluated across 6 dimensions: Accuracy, Efficiency, Judgment, Verification, Communication, and Tool Fluency.
                </p>
                <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
                  Find a quiet environment and ensure you have ${timeLimitMinutes} uninterrupted minutes before starting.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#080808;padding:24px 40px;border-top:1px solid #1a1a1a;">
              <p style="color:#333;font-size:12px;margin:0;text-align:center;">
                Pine Finance · The AI Fluency Standard for Finance<br>
                <span style="color:#222;">This invitation was sent to ${toEmail}</span>
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
Pine Finance — Assessment Invitation

${greeting}

You have been invited by ${from} to complete an AI fluency assessment for the "${campaignTitle}" campaign.

Role: ${roleTemplate}
Time Limit: ${timeLimitMinutes} minutes
Dimensions Scored: Accuracy, Efficiency, Judgment, Verification, Communication, Tool Fluency

Begin your assessment here:
${assessmentUrl}

Find a quiet environment and ensure you have ${timeLimitMinutes} uninterrupted minutes before starting.

— Pine Finance Team
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

  const subject = `Your Pine Finance Score Report is Ready — ${Math.round(
    overallScore
  )}/100`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Pine Finance Score Report</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#0d0d0d,#111);padding:32px 40px;border-bottom:1px solid #c9a84c;">
              <span style="color:#c9a84c;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">PINE FINANCE</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Your Score Is Ready</h1>

              <p style="color:#c9a84c;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 28px;">${campaignTitle}</p>

              <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 28px;">
                ${greeting}<br><br>
                Your AI fluency assessment has been scored. Here's a summary:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #c9a84c33;border-radius:8px;margin:0 0 32px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <div style="font-size:72px;font-weight:900;color:#c9a84c;line-height:1;">${Math.round(
                      overallScore
                    )}</div>
                    <div style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Overall Score</div>
                    <div style="color:#aaa;font-size:14px;margin-top:12px;">
                      Top <strong style="color:#fff;">${
                        100 - benchmarkPercentile
                      }%</strong> of your peer cohort
                    </div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${reportUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;padding:16px 40px;border-radius:6px;text-decoration:none;">
                      VIEW FULL REPORT →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#080808;padding:24px 40px;border-top:1px solid #1a1a1a;">
              <p style="color:#333;font-size:12px;margin:0;text-align:center;">
                Pine Finance · The AI Fluency Standard for Finance
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

— Pine Finance Team
`;

  return sendEmail({
    toEmail,
    subject,
    text,
    html,
  });
}