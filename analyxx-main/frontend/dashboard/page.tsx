"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pyq_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pyq_token");
    localStorage.removeItem("pyq_user");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-indigo-900 px-8 py-4 flex justify-between items-center">
        <div className="text-white font-bold text-xl">PYQ Analyzer</div>
        <div className="flex items-center gap-4">
          <span className="text-indigo-200 text-sm">
            Welcome, {user?.name}!
          </span>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Dashboard</h1>
        <p className="text-gray-500 mb-8">Upload exam papers to start analyzing</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {[
            { label: "Papers Uploaded", value: "0", icon: "P" },
            { label: "Topics Analyzed", value: "0", icon: "T" },
            { label: "Predictions Made", value: "0", icon: "A" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Upload CTA */}
        <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4" style={{ color: "#6366f1", fontWeight: 300 }}>+</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Upload Your First Paper</h2>
          <p className="text-gray-500 mb-6">Upload a PDF of any previous year question paper to get started</p>
          <a
            href="/upload"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-semibold transition inline-block"
          >
            Upload Paper →
          </a>
        </div>
      </div>
    </div>
  );
}