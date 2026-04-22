"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [subject, setSubject] = useState(
    "Application for Software Developer Opportunities at {{company}}"
  );

  const [emailBody, setEmailBody] = useState(`Dear Hiring Team at {{company}},

I hope you are doing well.

I am writing to express my interest in opportunities at your company. Please find my resume attached for your review.

Thank you for your time.

Best regards,
Name`);

  const [testEmail, setTestEmail] = useState(
    "test@gmail.com"
  );

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

    /* -------------------------
        TEST MODE
    --------------------------*/
    if (companies.length === 0) {
      if (!testEmail.trim()) {
        alert("Upload companies or enter a test email.");
        return;
      }

      try {
        setIsRunning(true);
        const formData = new FormData();
        formData.append("to", testEmail);
        formData.append("subject", "Test Email from Job Applier");
        formData.append("text", "This is a successful test email from Job Applier.");
        formData.append("resume", resumeFile);

        const res = await fetch("/api/send-email", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setLogs((prev) => [`Test email sent to ${testEmail}`, ...prev]);
        } else {
          alert("Failed to send test email.");
        }
      } catch {
        alert("Failed to send test email.");
      }
      setIsRunning(false);
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
          body: JSON.stringify({ company }),
        });

        // 🛑 HANDLE FREE TIER RATE LIMITS
        if (lookupRes.status === 429) {
          setLogs((prev) => [`Rate limit hit for ${company}. Waiting 45s...`, ...prev]);
          await sleep(45000); // Wait for quota to reset
          i--; // RETRY this company by decrementing index
          continue;
        }

        const lookupData = await lookupRes.json();

        if (!lookupData.success || !lookupData.emails || lookupData.emails.length === 0) {
          setFailedCount((prev) => prev + 1);
          setLogs((prev) => [`No emails found for ${company}`, ...prev]);
          await sleep(6000);
          continue;
        }

        const emails = lookupData.emails;
        const finalSubject = subject.replace("{{company}}", company);
        const finalBody = emailBody.replace(/{{company}}/g, company);

        const formData = new FormData();
        emails.forEach((email: string) => formData.append("to", email));
        formData.append("subject", finalSubject);
        formData.append("text", finalBody);
        formData.append("resume", resumeFile);

        const sendRes = await fetch("/api/send-email", {
          method: "POST",
          body: formData,
        });

        const sendData = await sendRes.json();

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
        <h1 className="text-2xl font-bold mb-10">
          Job Applier
        </h1>

        <nav className="space-y-3">
          <div className="bg-blue-600/20 border border-blue-500 text-blue-300 px-4 py-3 rounded-xl">
            Dashboard
          </div>
          <div className="px-4 py-3 rounded-xl hover:bg-zinc-800 cursor-pointer">
            Campaigns
          </div>
          <div className="px-4 py-3 rounded-xl hover:bg-zinc-800 cursor-pointer">
            Logs
          </div>
          <div className="px-4 py-3 rounded-xl hover:bg-zinc-800 cursor-pointer">
            Settings
          </div>
        </nav>
      </aside>

      {/* Main */}
      <section className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-2">
            Dashboard
          </h2>
          <p className="text-zinc-400 mb-8">
            Apply smarter. Automate outreach.
          </p>

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
              <span>Campaign Progress</span>
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
            </div>

            {/* Right */}
            <div className="space-y-8">
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
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 mb-4"
                />

                <input
                  placeholder="Test Email"
                  value={testEmail}
                  onChange={(e) =>
                    setTestEmail(e.target.value)
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
                  ? "Running Campaign..."
                  : "Start Campaign"}
              </button>

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
          </div>
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