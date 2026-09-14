"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password, name }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message ?? "注册失败");
          return;
        }
        // Auto-login after register
        const signInResult = await signIn("credentials", {
          identifier,
          password,
          redirect: false,
        });
        if (signInResult?.error) {
          setError("注册成功，请手动登录");
          router.push("/login");
          return;
        }
        router.push("/profile-setup");
      } else {
        const result = await signIn("credentials", {
          identifier,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError("手机号/邮箱或密码错误");
          return;
        }
        router.push("/home");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1.5">
            姓名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入您的姓名"
            className={inputClass}
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-warm-700 mb-1.5">
          手机号或邮箱
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="请输入手机号或邮箱"
          required
          className={inputClass}
          autoComplete="username"
          inputMode="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-warm-700 mb-1.5">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "请设置密码（至少6位）" : "请输入密码"}
          required
          minLength={mode === "register" ? 6 : undefined}
          className={inputClass}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-3.5 rounded-xl font-semibold text-white transition-all",
          "bg-primary-500 hover:bg-primary-600 active:scale-[0.98]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-sm shadow-primary-200"
        )}
      >
        {loading ? "请稍候…" : mode === "register" ? "立即注册" : "登录"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all";
