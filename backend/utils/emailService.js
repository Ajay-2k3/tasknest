// Mock email service - replace with actual email provider (SendGrid, Mailgun, etc.)
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // In production, replace this with actual email service
    console.log('📧 Email would be sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', text || html);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, messageId: 'mock-' + Date.now() };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #3B82F6;">Reset Your Password</h2>
      <p>You requested a password reset for your TaskNest account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your TaskNest Password',
    html,
    text: `Reset your password: ${resetUrl}`
  });
};

export const sendUserInviteEmail = async (email, token, inviterName) => {
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #3B82F6;">You're Invited to TaskNest!</h2>
      <p>${inviterName} has invited you to join their team on TaskNest.</p>
      <p>Click the button below to accept the invitation and create your account:</p>
      <a href="${inviteUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Accept Invitation</a>
      <p>This invitation will expire in 7 days.</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Invitation to Join TaskNest',
    html,
    text: `Accept invitation: ${inviteUrl}`
  });
};