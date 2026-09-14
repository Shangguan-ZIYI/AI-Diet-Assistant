"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

interface HealthRecord {
  id: string;
  recordDate: string;
  weightKg: number | null;
  bloodSugarMmol: number | null;
  bloodPressureSys: number | null;
  bloodPressureDia: number | null;
  note: string | null;
}

function getAnomalyHint(record: HealthRecord): string | null {
  const hints: string[] = [];
  if (record.bloodSugarMmol && record.bloodSugarMmol > 7) {
    hints.push("血糖偏高，建议关注饮食中的碳水摄入");
  }
  if (record.bloodPressureSys && record.bloodPressureSys > 140) {
    hints.push("收缩压偏高，建议减少高钠食物");
  }
  if (record.bloodPressureDia && record.bloodPressureDia > 90) {
    hints.push("舒张压偏高，建议注意饮食清淡");
  }
  if (hints.length === 0) return null;
  return hints.join("；") + "（仅供参考，请遵医嘱）";
}

export default function RecordsPage() {
  const [weight, setWeight] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [saved, setSaved] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Fetch recent records
  useEffect(() => {
    fetch("/api/health-records")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setRecords(data.data.slice(0, 7));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecords(false));
  }, []);

  async function handleSave() {
    try {
      const res = await fetch("/api/health-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordDate: new Date().toISOString().split("T")[0],
          weightKg: weight ? parseFloat(weight) : null,
          bloodSugarMmol: bloodSugar ? parseFloat(bloodSugar) : null,
          bloodPressureSys: bpSys ? parseInt(bpSys) : null,
          bloodPressureDia: bpDia ? parseInt(bpDia) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Refresh records
        setRecords((prev) => [data.data, ...prev].slice(0, 7));
        // Clear form
        setWeight("");
        setBloodSugar("");
        setBpSys("");
        setBpDia("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  const inputClass = "w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all";

  return (
    <>
      <TopBar title="健康记录" showBack />
      <PageContainer>
        <p className="text-sm text-warm-500 mb-5">
          {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} · 今日数据
        </p>

        {/* Input form */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-warm-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">体重</h3>
            <div className="relative">
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.0" className={cn(inputClass, "pr-10")} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">kg</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-warm-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">血糖</h3>
            <div className="relative">
              <input type="number" step="0.1" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} placeholder="5.6" className={cn(inputClass, "pr-20")} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">mmol/L</span>
            </div>
            <p className="text-xs text-warm-400">正常范围：3.9-6.1 mmol/L</p>
          </div>

          <div className="rounded-2xl bg-white border border-warm-100 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-warm-800">血压</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="120" className={cn(inputClass, "pr-12")} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-warm-400">收缩</span>
              </div>
              <span className="text-warm-400">/</span>
              <div className="relative flex-1">
                <input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="80" className={cn(inputClass, "pr-12")} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-warm-400">舒张</span>
              </div>
            </div>
            <p className="text-xs text-warm-400">正常范围：收缩压 90-139，舒张压 60-89 mmHg</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-6 w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200"
        >
          {saved ? "✓ 保存成功" : "保存记录"}
        </button>

        {/* Recent records */}
        <div className="mt-8">
          <h3 className="text-base font-semibold text-warm-900 mb-3">最近记录</h3>

          {loadingRecords && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-warm-50 p-3 animate-pulse">
                  <div className="h-4 w-20 bg-warm-100 rounded mb-2" />
                  <div className="h-3 w-40 bg-warm-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loadingRecords && records.length === 0 && (
            <div className="rounded-xl bg-warm-50 border border-warm-100 p-4 text-center">
              <p className="text-sm text-warm-400">还没有记录，保存今日数据后这里会显示历史</p>
            </div>
          )}

          {!loadingRecords && records.length > 0 && (
            <div className="space-y-2">
              {records.map((record) => {
                const anomaly = getAnomalyHint(record);
                const values: string[] = [];
                if (record.weightKg) values.push(`体重 ${record.weightKg}kg`);
                if (record.bloodSugarMmol) values.push(`血糖 ${record.bloodSugarMmol}`);
                if (record.bloodPressureSys && record.bloodPressureDia) {
                  values.push(`血压 ${record.bloodPressureSys}/${record.bloodPressureDia}`);
                }

                return (
                  <div key={record.id} className="rounded-xl bg-white border border-warm-100 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-warm-500">{record.recordDate}</span>
                    </div>
                    <p className="text-sm text-warm-800">
                      {values.length > 0 ? values.join(" · ") : "无数据"}
                    </p>
                    {anomaly && (
                      <p className="text-xs text-amber-600 mt-1">{anomaly}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Relationship hint */}
        <div className="mt-6 rounded-xl bg-primary-50 border border-primary-100 p-3 text-center">
          <p className="text-xs text-primary-600">
            您的健康数据会帮助 AI 生成更适合您的饮食推荐
          </p>
        </div>
      </PageContainer>
    </>
  );
}
