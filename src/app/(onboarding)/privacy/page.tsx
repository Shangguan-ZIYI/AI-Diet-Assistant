import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
      <h1 className="text-xl font-bold text-warm-900 mb-2">隐私与使用说明</h1>
      <p className="text-sm text-warm-500 mb-6">在使用前请了解以下重要信息</p>

      <div className="flex-1 overflow-y-auto space-y-4 text-sm text-warm-700 leading-relaxed">
        <div className="rounded-2xl bg-primary-50 p-4 border border-primary-100">
          <h3 className="font-semibold text-primary-800 mb-2">📋 产品定位</h3>
          <p>本产品是健康饮食建议助手，提供个性化饮食参考建议，<strong>不提供医疗诊断或治疗意见</strong>，不替代医生处方。</p>
        </div>

        <div className="rounded-2xl bg-warm-50 p-4">
          <h3 className="font-semibold text-warm-800 mb-2">🔒 数据安全</h3>
          <p>您的健康数据（血糖、血压等）仅用于生成个性化推荐，经加密存储，不会分享给第三方。您可随时申请删除账号数据。</p>
        </div>

        <div className="rounded-2xl bg-warm-50 p-4">
          <h3 className="font-semibold text-warm-800 mb-2">⚕️ 医疗建议</h3>
          <p>若您有慢性病（如糖尿病、高血压等），请在遵医嘱的基础上参考本产品建议，涉及用药请咨询医生。</p>
        </div>

        <div className="rounded-2xl bg-warm-50 p-4">
          <h3 className="font-semibold text-warm-800 mb-2">🤖 AI 生成内容</h3>
          <p>餐单由 AI 生成，经安全规则校验。如发现推荐内容不适合您的情况，请通过反馈功能告知，系统将持续优化。</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/register"
          className="block w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-center hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200"
        >
          同意并继续
        </Link>
        <Link
          href="/welcome"
          className="block w-full py-3 rounded-xl text-warm-500 font-medium text-center text-sm hover:text-warm-700"
        >
          返回
        </Link>
      </div>
    </div>
  );
}
