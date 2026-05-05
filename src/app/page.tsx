"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [serpApiKey, setSerpApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [senderName, setSenderName] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [subject, setSubject] = useState(
    "Application for Software Developer Opportunities at {{company}}"
  );

  const [emailBody, setEmailBody] = useState(`Dear Hiring Team at {{company}},

I hope you are doing well.

I am writing to express my interest in opportunities at your company. Please find my resume attached for your review.

Thank you for your time.

Best regards,
{{name}}`);



  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const parseCompanies = async () => {
    if (!selectedFile) {
      alert("Choose TXT file first.");
      return;
    }

    const text = await selectedFile.text();

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+\s*/, ""));

    setCompanies(lines);

    setLogs((prev) => [
      `Loaded ${lines.length} companies.`,
      ...prev,
    ]);
  };

  const clearAll = () => {
    setCompanies([]);
    setSelectedFile(null);
    setResumeFile(null);
    setSentCount(0);
    setFailedCount(0);
    setCurrentIndex(0);
    setLogs([]);
    setIsRunning(false);
  };

  const startCampaign = async () => {
    if (!resumeFile) {
      alert("Upload resume first.");
      return;
    }

    if (companies.length === 0) {
      alert("Upload companies first.");
      return;
    }

    /* -------------------------
        REAL CAMPAIGN MODE
    --------------------------*/
    setIsRunning(true);
    setSentCount(0);
    setFailedCount(0);
    setCurrentIndex(0);
    setLogs((prev) => ["Campaign started.", ...prev]);

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      setCurrentIndex(i + 1);

      try {
        const lookupRes = await fetch("/api/find-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company, serpApiKey, geminiApiKey }),
        });

        // 🛑 HANDLE FREE TIER RATE LIMITS
        if (lookupRes.status === 429) {
          setLogs((prev) => [`Rate limit hit for ${company}. Waiting 45s...`, ...prev]);
          await sleep(45000); // Wait for quota to reset
          i--; // RETRY this company by decrementing index
          continue;
        }

        const lookupData = await lookupRes.json();

        if (lookupRes.status === 400 && lookupData.message?.toLowerCase().includes("api key")) {
          alert("Missing Serper API Key! Please add it in Settings or .env.local");
          setIsRunning(false);
          return;
        }

        if (!lookupData.success || !lookupData.emails || lookupData.emails.length === 0) {
          setFailedCount((prev) => prev + 1);
          setLogs((prev) => [`No emails found for ${company}`, ...prev]);
          await sleep(6000);
          continue;
        }

        const emails = lookupData.emails;
        const finalSubject = subject.replace(/{{company}}/g, company);
        const finalBody = emailBody
          .replace(/{{company}}/g, company)
          .replace(/{{name}}/g, senderName || "[Your Name]");

        const formData = new FormData();
        emails.forEach((email: string) => formData.append("to", email));
        formData.append("subject", finalSubject);
        formData.append("text", finalBody);
        formData.append("resume", resumeFile);
        formData.append("emailUser", emailUser);
        formData.append("emailPass", emailPass);

        const sendRes = await fetch("/api/send-email", {
          method: "POST",
          body: formData,
        });

        const sendData = await sendRes.json();

        if (sendRes.status === 400 && sendData.message?.toLowerCase().includes("credentials")) {
          alert("Missing Email Credentials! Please add them in Settings or .env.local");
          setIsRunning(false);
          return;
        }

        if (sendData.success) {
          setSentCount((prev) => prev + 1);
          setLogs((prev) => [`Sent to ${company}: ${emails.join(", ")}`, ...prev]);
        } else {
          throw new Error("SMTP Error");
        }

      } catch (err) {
        setFailedCount((prev) => prev + 1);
        setLogs((prev) => [`Failed for ${company}`, ...prev]);
      }

      // 🕒 Mandatory delay between requests
      await sleep(6000);
    }

    setIsRunning(false);
    setLogs((prev) => ["Campaign completed.", ...prev]);
  };

  const progress = useMemo(() => {
    if (companies.length === 0) return 0;
    return Math.round(
      ((sentCount + failedCount) / companies.length) * 100
    );
  }, [companies.length, sentCount, failedCount]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-zinc-900 border-r border-zinc-800 flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <img src="/icon.svg" alt="ApplyCation Logo" className="w-8 h-8" />
          <h1 className="text-2xl font-bold">
            ApplyCation
          </h1>
        </div>

        <nav className="space-y-3">
          <div
            onClick={() => setActiveTab("dashboard")}
            className={`${activeTab === "dashboard" ? "bg-blue-600/20 border border-blue-500 text-blue-300" : "hover:bg-zinc-800 text-zinc-300"} px-4 py-3 rounded-xl cursor-pointer transition-colors`}
          >
            Dashboard
          </div>
          <div
            onClick={() => setActiveTab("settings")}
            className={`${activeTab === "settings" ? "bg-blue-600/20 border border-blue-500 text-blue-300" : "hover:bg-zinc-800 text-zinc-300"} px-4 py-3 rounded-xl cursor-pointer transition-colors`}
          >
            Settings
          </div>
          <div
            onClick={() => setActiveTab("instructions")}
            className={`${activeTab === "instructions" ? "bg-blue-600/20 border border-blue-500 text-blue-300" : "hover:bg-zinc-800 text-zinc-300"} px-4 py-3 rounded-xl cursor-pointer transition-colors`}
          >
            Getting Started
          </div>
        </nav>
      </aside>

      {/* Main */}
      <section className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === "dashboard" && (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-4xl font-bold">
                    Dashboard
                  </h2>
                  <a
                    href="https://github.com/Akshais97/JobApplier/blob/main/README.md"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-zinc-950 text-blue-400 hover:bg-blue-900/30 font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  >
                    Setup Guide
                  </a>
                </div>
                <p className="text-zinc-400">
                  Apply smarter. Automate outreach.
                  <br />
                  Fully Open Source. No Data Tracking/Collection.
                  <br />
                  Use your own free API Keys to unlock the future.
                </p>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <Card title="Companies" value={companies.length} />
                <Card title="Sent" value={sentCount} color="text-emerald-400" />
                <Card title="Failed" value={failedCount} color="text-red-400" />
                <Card title="Progress" value={`${progress}%`} color="text-blue-400" />
              </div>

              {/* Progress */}
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-8">
                <div className="flex justify-between mb-3">
                  <span>Sending Progress</span>
                  <span>{progress}%</span>
                </div>

                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-8">
                {/* Left */}
                <div className="space-y-8">
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-semibold mb-4">
                      Upload Companies
                    </h3>

                    <label className="inline-block bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl cursor-pointer">
                      Choose TXT File
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={(e) =>
                          setSelectedFile(
                            e.target.files?.[0] || null
                          )
                        }
                      />
                    </label>

                    {selectedFile && (
                      <p className="text-zinc-400 mt-3 text-sm">
                        {selectedFile.name}
                      </p>
                    )}

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={parseCompanies}
                        className="bg-white text-black px-5 py-3 rounded-xl font-semibold"
                      >
                        Load Companies
                      </button>

                      <button
                        onClick={clearAll}
                        className="border border-zinc-700 px-5 py-3 rounded-xl"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-semibold mb-4">
                      Upload Resume
                    </h3>

                    <label className="inline-block bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl cursor-pointer">
                      Choose Resume
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          setResumeFile(
                            e.target.files?.[0] || null
                          )
                        }
                      />
                    </label>

                    {resumeFile && (
                      <p className="text-zinc-400 mt-3 text-sm">
                        {resumeFile.name}
                      </p>
                    )}
                  </div>

                  {/* Move Live Logs to Left Side */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-semibold mb-4">
                      Live Logs
                    </h3>

                    <div className="space-y-2 max-h-80 overflow-auto">
                      {logs.map((log, i) => (
                        <div
                          key={i}
                          className="bg-zinc-800 rounded-xl px-4 py-3 text-sm"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="space-y-8">
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-semibold mb-4">
                      Enter Your Name
                    </h3>
                    <input
                      placeholder="Your Name (Replaces {{name}})"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3"
                    />
                  </div>

                  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-semibold mb-4">
                      Email Composer
                    </h3>

                    <input
                      value={subject}
                      placeholder="Subject"
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 mb-4"
                    />

                    <textarea
                      rows={8}
                      placeholder="Email"
                      value={emailBody}
                      onChange={(e) =>
                        setEmailBody(e.target.value)
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3"
                    />
                  </div>

                  <button
                    onClick={startCampaign}
                    disabled={isRunning}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
                  >
                    {isRunning
                      ? "Sending Applications..."
                      : "Send Applications"}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "settings" && (
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold mb-2">
                Settings
              </h2>
              <p className="text-zinc-400 mb-8">
                Configure your API keys and email credentials.
              </p>

              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-2xl font-semibold mb-4">
                  Credentials & API Keys
                </h3>
                <h4>Easy Config</h4>
                <p className="text-zinc-400 text-sm mb-6">
                  (Use this only if .env file is not configured)
                </p>
                <br></br>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Gmail Address (Required if not in .env)</label>
                    <input
                      placeholder="e.g. user@gmail.com"
                      value={emailUser}
                      onChange={(e) => setEmailUser(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">App Password (Required if not in .env)</label>
                    <input
                      placeholder="16-character App Password"
                      type="password"
                      value={emailPass}
                      onChange={(e) => setEmailPass(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Serper API Key (Required if not in .env)</label>
                    <input
                      placeholder="Serper API Key"
                      type="password"
                      value={serpApiKey}
                      onChange={(e) => setSerpApiKey(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Gemini API Key (Optional)</label>
                    <input
                      placeholder="Gemini API Key"
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between border-t border-zinc-800 pt-8 pb-2 gap-6">
                  <p className={`text-sm ${settingsSaved ? "text-emerald-400" : "text-zinc-500"}`}>
                    {settingsSaved ? "✅ Settings applied successfully!" : "Ensure all required keys are provided."}
                  </p>
                  <div className="flex sm:justify-end">
                    <button
                      onClick={() => {
                        setSettingsSaved(true);
                        setTimeout(() => setSettingsSaved(false), 3000);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg"
                    >
                      Apply Settings
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "instructions" && (
            <div className="max-w-3xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-4xl font-bold">
                  Instructions
                </h2>
                <a
                  href="https://github.com/Akshais97/JobApplier/blob/main/README.md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-zinc-950 text-blue-400 hover:bg-blue-900/30 font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                  Setup Guide
                </a>
              </div>
              <p className="text-zinc-400 mb-8">
                Follow these steps to set up and start your campaign.
              </p>

              <div className="space-y-6 mb-8">
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">1. Configure Settings</h3>
                  <p className="text-zinc-400 mb-2">Go to Settings and add:</p>
                  <ul className="list-disc pl-5 text-zinc-400 space-y-1">
                    <li>Gmail Address</li>
                    <li>Google App Password (NOT Gmail password, Refer to <a href="https://github.com/Akshais97/JobApplier/blob/main/README.md" style={{ color: "blue", textDecoration: "underline" }}>Setup Guide</a>. One time setup only.)</li>
                    <li>Serper API Key (Refer to <a href="https://github.com/Akshais97/JobApplier/blob/main/README.md" style={{ color: "blue", textDecoration: "underline" }}>Setup Guide</a>. One time setup only.)</li>
                    <li>(Optional) Gemini API Key</li>
                  </ul>
                  <p className="text-zinc-400 mt-2">Click <strong>Apply Settings</strong>.</p>
                </div>

                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">2. Go to Dashboard: <br></br><br></br>Upload Companies</h3>
                  <p className="text-zinc-400 mb-2">Upload a <code className="bg-zinc-800 px-1 rounded">.txt</code> file containing company names (one company per line), then click <strong>Load Companies</strong>.<br></br>(Load Company Button will Automatically fetch company HR Emails, don't forget this step)</p>
                  <p className="text-zinc-400">Example:</p>
                  <div className="bg-zinc-950 p-3 rounded-xl mt-2 text-sm text-zinc-300 font-mono leading-relaxed">
                    Google<br />Microsoft<br />Adobe<br />Stripe
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">3. Upload Resume</h3>
                  <p className="text-zinc-400">Upload your latest resume file using <strong>Choose Resume</strong>.</p>
                </div>

                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">4. Customize Name, Subject and Body in the Email</h3>
                  <p className="text-zinc-400 mb-2">Enter your name and edit the email subject/body template.</p>
                  <p className="text-zinc-400 mb-1">Use:</p>
                  <ul className="list-disc pl-5 text-zinc-400 space-y-1">
                    <li><code className="bg-zinc-800 px-1 rounded">{"{{company}}"}</code> → automaticlly fetches and inserts company name</li>
                    <li><code className="bg-zinc-800 px-1 rounded">{"{{name}}"}</code> → automatically inserts your name</li>
                  </ul>
                </div>

                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">5. Send Applications</h3>
                  <p className="text-zinc-400 mb-2">Click <strong>Send Applications</strong> to send applications automatically:</p>
                  <ul className="list-disc pl-5 text-zinc-400 space-y-1">
                    <li>Finding HR/career emails</li>
                    <li>Sending personalized applications with your resume attached</li>
                  </ul>
                </div>

                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold mb-3 text-white">6. Track Progress if you'd like</h3>
                  <p className="text-zinc-400 mb-2">Monitor in Live Logs:</p>
                  <ul className="list-disc pl-5 text-zinc-400 space-y-1 mb-4">
                    <li>Sent emails</li>
                    <li>Failed attempts</li>
                    <li>Progress percentage</li>
                    <li>Live Logs in real time</li>
                  </ul>
                  <p className="text-blue-400 font-medium">That's it: Upload, Configure, and Automate your outreach.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  value,
  color = "text-white",
}: {
  title: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <p className="text-zinc-400 text-sm mb-2">{title}</p>
      <h3 className={`text-4xl font-bold ${color}`}>
        {value}
      </h3>
    </div>
  );
}