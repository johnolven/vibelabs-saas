interface Section {
  title: string;
  content: string;
}

interface TemplateData {
  newsletterName: string;
  subject: string;
  sections: Section[];
  accentColor: string;
  unsubscribeUrl: string;
  appUrl: string;
}

export function generateEmailHtml(data: TemplateData): string {
  const { newsletterName, sections, accentColor, unsubscribeUrl } = data;

  const sectionsHtml = sections.map((section) => {
    const paragraphs = section.content
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.7; color: #374151;">${p.trim()}</p>`)
      .join('');

    return `
      <tr>
        <td style="padding: 24px 32px 8px 32px;">
          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">${section.title}</h2>
          ${paragraphs}
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: ${accentColor}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${newsletterName}</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${sectionsHtml}
                <!-- Divider -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">You received this email because you subscribed to ${newsletterName}.</p>
              <a href="${unsubscribeUrl}" style="font-size: 13px; color: ${accentColor}; text-decoration: underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generatePlainText(data: { newsletterName: string; subject: string; sections: Section[]; unsubscribeUrl: string }): string {
  let text = `${data.newsletterName}\n${'='.repeat(data.newsletterName.length)}\n\n`;
  text += `${data.subject}\n\n`;

  for (const section of data.sections) {
    text += `## ${section.title}\n\n${section.content}\n\n---\n\n`;
  }

  text += `\nUnsubscribe: ${data.unsubscribeUrl}\n`;
  return text;
}
