import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-200">
          <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-warm-900">健康饮食助理</h1>
          <p className="text-sm text-warm-500 mt-1">AI 个性化三餐推荐</p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <h2 className="text-lg font-semibold text-warm-800 mb-6">登录账号</h2>
        <AuthForm mode="login" />

        <div className="mt-6 text-center text-sm text-warm-500">
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:underline">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
}
