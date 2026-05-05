# Job Applier

Automate your job applications by dynamically finding HR and Career emails for a list of companies and sending your resume with a custom cover letter as the email body.

## Optimized for direct recruiter engagement:
> **Bypasses portal ghosting; targets HR inboxes directly.**

> Live Link: https://applycation.vercel.app/

## Completely Open Source and FREE
This application is **completely open source and free to use**. It is designed with privacy and simplicity in mind:
- **No Data Collection:** None of your data, emails, or resumes are stored on any external server.
- **No Database:** The app runs entirely by connecting the frontend directly to the required APIs. There is no backend database connected.
- **Bring Your Own Keys:** You can use your own Gmail credentials and API keys. These can be configured in the `.env.local` file or entered directly into the UI on the frontend.


## Important Security Note
When using Gmail to send emails through this application, you **MUST** use a **Google App Password**, not your regular Gmail password.

### Why an App Password is Required
1. **Security:** Google does not allow direct SMTP connections using your standard account password, especially for applications that are not officially verified by Google.
2. **2-Step Verification:** If you have 2-Step Verification enabled (which you should), you **cannot** use your main password. You must generate a specific password for this app.

### **How to Generate an App Password**
Refer to Video Guide:
https://www.youtube.com/watch?v=MkLX85XU5rU

1. Go to your [Google Account](https://myaccount.google.com/).
2. Navigate to **Security**.
3. Under "Signing in to Google", select **2-Step Verification** (if not already enabled, you'll need to enable it first).
4. Select **App passwords**.
5. In the "Select app" dropdown, choose **Other (Custom name)**.
6. Enter a name for this application (e.g., "Job Applier").
7. Click **Generate**.
8. Google will display a **16-character password**.
9. **Copy this password immediately** and paste it into the "App Password" field in the Job Applier interface or your `.env.local` file.

### **How to GET A SERP API Key for free:**
Video Guide:
https://www.youtube.com/watch?v=zN7aDuq0c9A

1. Sign Up here: https://serper.dev
2. You will see your free API key with 2500 searches remaining
3. Copy it and paste it into the SERP API Key field in the app.


## OPTIONAL and NOT REQUIRED in 99% of the cases : How to GET A GEMINI API Key for free:
Refer to Video Guide: https://www.youtube.com/watch?v=6BRyynZkvf0

1. Sign Up here: https://aistudio.google.com/
2. You will see your free API key with 60 queries per minute
3. Copy it and paste it into the GEMINI API Key field in the app.

### Features
1. **Find Emails:** Uses Serper.dev (and optionally Gemini) to intelligently search the web for public HR and Career emails of a given company.
2. **Send Emails:** Uses Nodemailer connected to your Gmail account to send out your application automatically.

### Configuration
If you don't want to enter your credentials in the UI every time, OPTIONALLY: you can create a `.env.local` file in the root of the project with the following variables:

```env
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
SERP_API_KEY=your_serper_dev_api_key
GEMINI_API_KEY=your_gemini_api_key  # Optional fallback
```

*Note: For `EMAIL_PASS`, you must use a Google App Password, not your regular Gmail password.*

### Running Locally
1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
