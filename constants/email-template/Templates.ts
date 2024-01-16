export const verifyCodeHTML = (code: string) =>
	`
  <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
    <div style="margin:50px auto;width:70%;padding:20px 0">
      <div style="border-bottom:1px solid #eee">
	  	<img style="width:300px;height:58px" src="https://cdn.fyp.fans/misc/fyp-fans-logo-email.png" />
      </div>
      <p style="font-size:1.1em">Hello!</p>
      <p>You are receiving this email because we received a password reset request for your account.</p>
      <p>Here is your verification code: <span style="font-size:1.1em;color:#00466a;">${code}</span></p>
      <p>Regards, <br />FYP.Fans Team</p>
      <div style="border-top:1px solid #eee">
        <p style="color:#444;font-size:0.8em;">If you didn't request password request, then please contact our support team: <a href="mailto:support@fyp.fans">support@fyp.fans</a> <br />This code will be expired in 5 minutes!</p>
      </div>
    </div>
  </div>
  `;

export const RegisterEmailContent = (code: string) =>
	`
  <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
    <div style="margin:50px auto;width:70%;padding:20px 0">
      <div style="border-bottom:1px solid #eee">
	  	<img style="width:300px;height:58px" src="https://cdn.fyp.fans/misc/fyp-fans-logo-email.png" />
      </div>
      <p style="font-size:1.1em">Hello!</p>
      <p>Welcome to FYP.Fans.</p>
      <p>Here is your verification code: <span style="font-size:1.1em;color:#00466a;">${code}</span></p>
      <p>Regards, <br />FYP.Fans Team</p>
      <div style="border-top:1px solid #eee">
        <p style="color:#444;font-size:0.8em;">If you didn't request create account, then contact our <a href="mailto:support@fyp.fans">support@fyp.fans</a> <br />This code will be expired in 5 minutes!</p>
      </div>
    </div>
  </div>
  `;

export const updateEmailContent = (code: string) =>
	`
  <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
    <div style="margin:50px auto;width:70%;padding:20px 0">
      <div style="border-bottom:1px solid #eee">
	  	<img style="width:300px;height:58px" src="https://cdn.fyp.fans/misc/fyp-fans-logo-email.png" />
      </div>
      <p style="font-size:1.1em">Hello!</p>
      <p>You are receiving this email because we received a email update request for your account.</p>
      <p>Here is your verification code: <span style="font-size:1.1em;color:#00466a;">${code}</span></p>
      <p>Regards, <br />FYP.Fans Team</p>
      <div style="border-top:1px solid #eee">
        <p style="color:#444;font-size:0.8em;">If you didn't request email update, then please contact our support team: <a href="mailto:support@fyp.fans">support@fyp.fans</a> <br />This code will be expired in 5 minutes!</p>
      </div>
    </div>
  </div>
  `;

// define email templates
export const deleteAccountEmailTemplate = (code: string) =>
	`
  <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
    <div style="margin:50px auto;width:70%;padding:20px 0">
      <div style="border-bottom:1px solid #eee">
	  	<img style="width:300px;height:58px" src="https://cdn.fyp.fans/misc/fyp-fans-logo-email.png" />
      </div>
      <p style="font-size:1.1em">Hello!</p>
      <p>You are receiving this email because we received a delete account request for your account.</p>
      <p>Here is your verification code: <span style="font-size:1.1em;color:#00466a;">${code}</span></p>
      <p>Regards, <br />FYP.Fans Team</p>
      <div style="border-top:1px solid #eee">
        <p style="color:#444;font-size:0.8em;">If you didn't request email update, then please contact our support team: <a href="mailto:support@fyp.fans">support@fyp.fans</a> <br />This code will be expired in 5 minutes!</p>
      </div>
    </div>
  </div>
  `;
